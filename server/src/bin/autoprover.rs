use std::sync::{Arc, Mutex};

use anyhow::{Context, Result};
use axum::Router;
use clap::Parser;
use client_sdk::rest_client::NodeApiHttpClient;
use hyle_modules::{
    bus::{metrics::BusMetrics, SharedMessageBus},
    modules::{
        da_listener::{DAListener, DAListenerConf},
        prover::{AutoProver, AutoProverCtx},
        rest::{RestApi, RestApiRunContext},
        BuildApiContextInner, ModulesHandler,
    },
    utils::logger::setup_tracing,
};
use hyligotchi::client::{HyliGotchiWorld, HyliGotchiWorldConstructor};
use prometheus::Registry;
use sdk::{api::NodeInfo, info, ContractName};
use secp256k1::{PublicKey, Secp256k1, SecretKey};
use server::{conf::Conf, utils::load_pk};

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
pub struct Args {
    #[arg(long, default_value = "config.toml")]
    pub config_file: Vec<String>,

    #[arg(long, default_value = "hyligotchi")]
    pub contract_name: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();
    let config = Conf::new(args.config_file).context("reading config file")?;
    setup_tracing(
        &config.log_format,
        format!("{}(autoprover)", config.id.clone(),),
    )
    .context("setting up tracing")?;
    let config = Arc::new(config);
    info!("Starting autoprover with config: {:?}", &config);

    let bus = SharedMessageBus::new(BusMetrics::global(config.id.clone()));
    std::fs::create_dir_all(&config.data_directory).context("creating data directory")?;

    let registry = Registry::new();
    let provider = opentelemetry_sdk::metrics::SdkMeterProvider::builder()
        .with_reader(
            opentelemetry_prometheus::exporter()
                .with_registry(registry.clone())
                .build()
                .context("starting prometheus exporter")?,
        )
        .build();
    opentelemetry::global::set_meter_provider(provider.clone());

    let mut handler = ModulesHandler::new(&bus).await;

    let api_ctx = Arc::new(BuildApiContextInner {
        router: Mutex::new(Some(Router::new())),
        openapi: Default::default(),
    });

    let pk = load_pk(&config.data_directory);
    let prover = client_sdk::helpers::sp1::SP1Prover::new(pk).await;

    let secp = Secp256k1::new();
    let secret_key =
        hex::decode(std::env::var("HYLIGOTCHI_PUBKEY").unwrap_or(
            "0000000000000001000000000000000100000000000000010000000000000001".to_string(),
        ))
        .expect("HYLIGOTCHI_PUBKEY must be a hex string");
    let secret_key = SecretKey::from_byte_array(secret_key.try_into().expect("32 bytes"))
        .expect("32 bytes, within curve order");
    let public_key = PublicKey::from_secret_key(&secp, &secret_key);

    let constructor = HyliGotchiWorldConstructor {
        backend_pubkey: public_key.serialize(),
    };

    let world = HyliGotchiWorld::new(&constructor);

    handler
        .build_module::<AutoProver<HyliGotchiWorld>>(
            AutoProverCtx {
                data_directory: config.data_directory.clone(),
                prover: Arc::new(prover),
                contract_name: ContractName(args.contract_name.clone()),
                node: Arc::new(
                    NodeApiHttpClient::new(config.node_url.clone()).context("build node client")?,
                ),
                default_state: world.clone(),
                buffer_blocks: config.buffer_blocks,
                max_txs_per_proof: config.max_txs_per_proof,
                tx_working_window_size: config.tx_working_window_size,
                api: Some(api_ctx.clone()),
            }
            .into(),
        )
        .await?;

    // This module connects to the da_address and receives all the blocks
    handler
        .build_module::<DAListener>(DAListenerConf {
            start_block: None,
            data_directory: config.data_directory.clone(),
            da_read_from: config.da_read_from.clone(),
            timeout_client_secs: 10,
        })
        .await
        .expect("Failed to build DAListener module");

    // REST API
    let router = api_ctx
        .router
        .lock()
        .expect("Context router should be available.")
        .take()
        .unwrap_or_default();
    let openapi = api_ctx
        .openapi
        .lock()
        .expect("OpenAPI should be available")
        .clone();
    handler
        .build_module::<RestApi>(RestApiRunContext {
            port: config.rest_server_port,
            max_body_size: config.rest_server_max_body_size,
            registry,
            router,
            openapi,
            info: NodeInfo {
                id: config.id.clone(),
                da_address: config.da_read_from.clone(),
                pubkey: None,
            },
        })
        .await?;

    handler.start_modules().await?;

    // Run until shut down or an error occurs
    handler.exit_process().await?;

    Ok(())
}
