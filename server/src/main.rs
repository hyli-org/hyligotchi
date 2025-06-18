use anyhow::{Context, Result};
use app::{AppModule, AppModuleCtx};
use axum::Router;
use clap::Parser;
use client_sdk::rest_client::{IndexerApiHttpClient, NodeApiHttpClient};
use client_sdk::transaction_builder::TxExecutorHandler;
use conf::Conf;
use contracts::HYLI_GOTCHI_ELF;
use hyle_modules::{
    bus::{metrics::BusMetrics, SharedMessageBus},
    modules::{
        contract_state_indexer::{ContractStateIndexer, ContractStateIndexerCtx},
        da_listener::{DAListener, DAListenerConf},
        prover::{AutoProver, AutoProverCtx},
        rest::{RestApi, RestApiRunContext},
        BuildApiContextInner, ModulesHandler,
    },
    utils::logger::setup_tracing,
};
use hyligotchi::client::{HyliGotchiWorld, HyliGotchiWorldConstructor};
use prometheus::Registry;
use sdk::api::NodeInfo;
use secp256k1::{PublicKey, Secp256k1, SecretKey};
use sp1_sdk::{Prover, ProverClient};
use std::sync::Arc;
use tracing::{error, info, warn};

use crate::app::CryptoContext;
use crate::ticker_module::TickerModule;

mod app;
mod conf;
mod init;
mod ticker_module;
mod utils;

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
pub struct Args {
    #[arg(long, default_value = "config.toml")]
    pub config_file: Vec<String>,

    #[arg(long, default_value = "hyligotchi")]
    pub contract_name: String,

    #[clap(long, action)]
    pub pg: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();
    let config = Conf::new(args.config_file).context("reading config file")?;

    setup_tracing(&config.log_format, "hyligotchi".to_string()).context("setting up tracing")?;

    let config = Arc::new(config);

    info!("Starting app with config: {:?}", &config);

    let node_client =
        Arc::new(NodeApiHttpClient::new(config.node_url.clone()).context("build node client")?);
    let indexer_client = Arc::new(
        IndexerApiHttpClient::new(config.indexer_url.clone()).context("build indexer client")?,
    );

    let local_client = ProverClient::builder().mock().build();
    let (pk, _) = local_client.setup(HYLI_GOTCHI_ELF);

    info!("Building Proving Key");
    let prover = client_sdk::helpers::sp1::SP1Prover::new(pk).await;

    let secp = Secp256k1::new();
    let secret_key =
        hex::decode(std::env::var("HYLIGOTCHI_PUBKEY").unwrap_or(
            "0000000000000001000000000000000100000000000000010000000000000001".to_string(),
        ))
        .expect("HYLIGOTCHI_PUBKEY must be a hex string");
    let secret_key = SecretKey::from_slice(&secret_key).expect("32 bytes, within curve order");
    let public_key = PublicKey::from_secret_key(&secp, &secret_key);

    let constructor = HyliGotchiWorldConstructor {
        backend_pubkey: public_key.serialize(),
    };
    let world = HyliGotchiWorld::new(&constructor);

    let contracts = vec![init::ContractInit {
        name: args.contract_name.clone().into(),
        program_id: prover.program_id().expect("getting program id").0,
        initial_state: world.get_state_commitment(),
        constructor_metadata: Some(borsh::to_vec(&constructor).context("encoding constructor")?),
    }];

    match init::init_node(node_client.clone(), indexer_client.clone(), contracts).await {
        Ok(_) => {}
        Err(e) => {
            error!("Error initializing node: {:?}", e);
            return Ok(());
        }
    }

    let bus = SharedMessageBus::new(BusMetrics::global("hyligotchi".to_string()));

    std::fs::create_dir_all(&config.data_directory).context("creating data directory")?;

    let mut handler = ModulesHandler::new(&bus).await;

    let build_api_ctx = Arc::new(BuildApiContextInner {
        router: std::sync::Mutex::new(Some(Router::new())),
        openapi: std::sync::Mutex::new(Default::default()),
    });

    let crypto_context = CryptoContext {
        secp: secp.clone(),
        secret_key,
        public_key,
    };

    // To setup before autoprover module

    let registry = Registry::new();
    // Init global metrics meter we expose as an endpoint
    let provider = opentelemetry_sdk::metrics::SdkMeterProvider::builder()
        .with_reader(
            opentelemetry_prometheus::exporter()
                .with_registry(registry.clone())
                .build()
                .context("starting prometheus exporter")?,
        )
        .build();

    opentelemetry::global::set_meter_provider(provider.clone());

    let app_ctx = Arc::new(AppModuleCtx {
        api: build_api_ctx.clone(),
        node_client,
        indexer_client,
        hyligotchi_cn: args.contract_name.into(),
        crypto_context: Arc::new(crypto_context),
    });

    handler.build_module::<AppModule>(app_ctx.clone()).await?;
    handler
        .build_module::<ContractStateIndexer<HyliGotchiWorld>>(ContractStateIndexerCtx {
            contract_name: app_ctx.hyligotchi_cn.clone(),
            data_directory: config.data_directory.clone(),
            api: build_api_ctx.clone(),
        })
        .await?;

    handler
        .build_module::<AutoProver<HyliGotchiWorld>>(
            AutoProverCtx {
                data_directory: config.data_directory.clone(),
                prover: Arc::new(prover),
                contract_name: app_ctx.hyligotchi_cn.clone(),
                node: app_ctx.node_client.clone(),
                default_state: world.clone(),
                buffer_blocks: config.buffer_blocks,
                max_txs_per_proof: config.max_txs_per_proof,
                tx_working_window_size: config.tx_working_window_size,
            }
            .into(),
        )
        .await?;

    handler
        .build_module::<DAListener>(DAListenerConf {
            start_block: None,
            data_directory: config.data_directory.clone(),
            da_read_from: config.da_read_from.clone(),
        })
        .await?;

    // Should come last so the other modules have nested their own routes.
    #[allow(clippy::expect_used, reason = "Fail on misconfiguration")]
    let router = build_api_ctx
        .router
        .lock()
        .expect("Context router should be available")
        .take()
        .expect("Context router should be available");
    #[allow(clippy::expect_used, reason = "Fail on misconfiguration")]
    let openapi = build_api_ctx
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
                id: "hyligotchi".to_string(),
                da_address: config.da_read_from.clone(),
                pubkey: None,
            },
        })
        .await?;

    handler
        .build_module::<TickerModule>((app_ctx.node_client.clone(), app_ctx.crypto_context.clone()))
        .await?;

    #[cfg(unix)]
    {
        use tokio::signal::unix;
        let mut terminate = unix::signal(unix::SignalKind::interrupt())?;
        tokio::select! {
            Err(e) = handler.start_modules() => {
                error!("Error running modules: {:?}", e);
            }
            _ = tokio::signal::ctrl_c() => {
                info!("Ctrl-C received, shutting down");
            }
            _ = terminate.recv() =>  {
                info!("SIGTERM received, shutting down");
            }
        }
        _ = handler.shutdown_modules().await;
    }
    #[cfg(not(unix))]
    {
        tokio::select! {
            Err(e) = handler.start_modules() => {
                error!("Error running modules: {:?}", e);
            }
            _ = tokio::signal::ctrl_c() => {
                info!("Ctrl-C received, shutting down");
            }
        }
        _ = handler.shutdown_modules().await;
    }

    if args.pg {
        warn!("--pg option given. Postgres server will stop. Cleaning data dir");
        std::fs::remove_dir_all(&config.data_directory).context("removing data directory")?;
    }

    Ok(())
}
