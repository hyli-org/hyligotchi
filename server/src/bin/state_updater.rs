use std::{sync::Arc, time::Duration};

use anyhow::{Context, Result};
use clap::Parser;
use client_sdk::rest_client::{IndexerApiHttpClient, NodeApiClient, NodeApiHttpClient};
use hyle_modules::utils::logger::setup_tracing;
use hyligotchi::{client::Metadata, HyliGotchiAction, HyliGotchiWorldZkView};
use sdk::{
    info, BlobIndex, BlobTransaction, BlockHeight, Calldata, ConsensusProposalHash, ContractName,
    Hashed, Identity, ProofTransaction, StateCommitment, TxContext, HYLE_TESTNET_CHAIN_ID,
};
use secp256k1::{PublicKey, Secp256k1, SecretKey};
use server::{conf::Conf, utils::load_pk};
use tokio::time::timeout;

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
pub struct Args {
    #[arg(long, default_value = "config.toml")]
    pub config_file: Vec<String>,

    #[arg(long, default_value = "hyligotchi")]
    pub contract_name: String,

    #[arg(long, default_value = "http://localhost:4008")]
    pub rest_url: String,

    #[arg(long, required = true)]
    pub commitment: String,
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

    let node_client = NodeApiHttpClient::new(config.node_url.clone())?;
    let indexer_client = IndexerApiHttpClient::new(config.node_url.clone())?;

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

    let crypto_context = server::app::CryptoContext {
        secp: secp.clone(),
        secret_key,
        public_key,
    };

    let initial_state = indexer_client
        .get_indexer_contract(&ContractName::new(args.contract_name.clone()))
        .await?
        .state_commitment;

    let metadata = reqwest::get(format!(
        "{}/v1/indexer/contract/{}/metadata",
        args.rest_url, args.contract_name
    ))
    .await?
    .json::<Metadata>()
    .await?;

    let commitment_metadata = build_commitment_metadata(
        StateCommitment(initial_state),
        StateCommitment(hex::decode(args.commitment).unwrap()),
        metadata,
    )?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| anyhow::anyhow!("Time error"))?
        .as_millis();

    let secp_blob = server::ticker_module::create_secp256k1_blob(
        &crypto_context,
        &Identity("hyligtochi_server@secp256k1".to_string()),
        now,
    )?;

    // Create the Tick action blob
    let action_blob = HyliGotchiAction::Tick(now).as_blob(args.contract_name.clone().into());

    let blobs = vec![secp_blob, action_blob];

    let identity = Identity::new("hyligtochi_server@secp256k1");

    let blob_tx = BlobTransaction::new(identity.clone(), blobs.clone());

    let tx_hash = node_client.send_tx_blob(blob_tx.clone()).await?;
    tracing::info!("Blob TX hash: {}", tx_hash);

    timeout(Duration::from_secs(30), async {
        loop {
            let resp = indexer_client.get_transaction_with_hash(&tx_hash).await;
            if resp.is_err() {
                info!("⏰ Waiting for tx {tx_hash} to be sequenced");
                tokio::time::sleep(Duration::from_millis(500)).await;
            } else {
                let tx = resp.unwrap();
                let block = indexer_client
                    .get_block_by_hash(&tx.block_hash.unwrap())
                    .await?;

                let tx_ctx = TxContext {
                    lane_id: tx.lane_id.unwrap(),
                    block_hash: ConsensusProposalHash(block.hash.0),
                    block_height: BlockHeight(block.height),
                    timestamp: tx.timestamp.unwrap(),
                    chain_id: HYLE_TESTNET_CHAIN_ID,
                };

                let calldata = Calldata {
                    identity,
                    tx_hash: blob_tx.hashed(),
                    blobs: blobs.clone().into(),
                    tx_blob_count: blobs.len(),
                    index: BlobIndex(1),
                    tx_ctx: Some(tx_ctx),
                    private_input: vec![],
                };

                let proof = prover
                    .prove(commitment_metadata.clone(), vec![calldata])
                    .await?;

                let proof_tx = ProofTransaction {
                    contract_name: args.contract_name.into(),
                    proof,
                };

                let proof_tx_hash = node_client.send_tx_proof(proof_tx).await?;
                tracing::info!("Proof TX hash: {}", proof_tx_hash);
                return Ok(());
            }
        }
    })
    .await?
}

fn build_commitment_metadata(
    initial_state: sdk::StateCommitment,
    commitment: sdk::StateCommitment,
    metadata: Metadata,
) -> anyhow::Result<Vec<u8>> {
    let tick_data = Some((
        commitment,
        metadata.last_block_hash.clone(),
        metadata.last_block_height,
    ));
    let zk_view = HyliGotchiWorldZkView {
        commitment: initial_state,
        backend_pubkey: metadata.backend_pubkey,
        tick_data,
        partial_data: vec![],
    };
    borsh::to_vec(&zk_view).context("Failed to serialize WalletZkView for commitment metadata")
}
