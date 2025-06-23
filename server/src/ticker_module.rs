use crate::app::CryptoContext;
use client_sdk::rest_client::{NodeApiClient, NodeApiHttpClient};
use hyle_modules::{
    module_bus_client,
    modules::{signal::shutdown_aware, Module},
};
use hyligotchi::HyliGotchiAction;
use sdk::{verifiers::Secp256k1Blob, Blob, BlobTransaction, Identity};
use secp256k1::Message;
use sha2::{Digest, Sha256};
use std::sync::Arc;
use tracing::info;

module_bus_client!(
    struct TickerBusClient {}
);

pub struct TickerModule {
    bus: TickerBusClient,
    interval: u64,
    node_client: Arc<NodeApiHttpClient>,
    crypto_context: Arc<CryptoContext>,
}

impl Module for TickerModule {
    type Context = (Arc<NodeApiHttpClient>, Arc<CryptoContext>);

    async fn build(
        bus: hyle_modules::bus::SharedMessageBus,
        ctx: Self::Context,
    ) -> anyhow::Result<Self> {
        Ok(TickerModule {
            bus: TickerBusClient::new_from_bus(bus).await,
            interval: 600, // 10 minutes in seconds
            node_client: ctx.0,
            crypto_context: ctx.1,
        })
    }

    fn run(&mut self) -> impl futures::Future<Output = anyhow::Result<()>> + Send {
        let interval = self.interval;
        let node_client = self.node_client.clone();
        let crypto_context = self.crypto_context.clone();

        async move {
            loop {
                if shutdown_aware::<(), _>(
                    &mut self.bus,
                    tokio::time::sleep(tokio::time::Duration::from_secs(interval)),
                )
                .await
                .is_err()
                {
                    return Ok(());
                }

                info!("Executing Tick action");
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map_err(|_| anyhow::anyhow!("Time error"))?
                    .as_millis();

                let blob = create_secp256k1_blob(
                    &crypto_context,
                    &Identity("hyligtochi_server@secp256k1".to_string()),
                    now,
                )?;

                // Create the Tick action blob
                let action_blob = HyliGotchiAction::Tick(now).as_blob("hyligotchi".into());

                // Send the transaction
                let tx_hash = node_client
                    .send_tx_blob(BlobTransaction::new(
                        Identity("hyligtochi_server@secp256k1".to_string()),
                        vec![blob, action_blob],
                    ))
                    .await?;

                info!("Tick transaction sent with hash: {}", tx_hash);
            }
        }
    }
}

pub fn create_secp256k1_blob(
    crypto: &CryptoContext,
    identity: &Identity,
    nonce: u128,
) -> anyhow::Result<Blob> {
    // Let's create a secp2561k1 blob signing the data
    let mut data_to_sign = nonce.to_le_bytes().to_vec();
    data_to_sign.extend_from_slice("HyliGotchiWorldTick".as_bytes());

    let mut hasher = Sha256::new();
    hasher.update(data_to_sign.clone());
    let message_hash: [u8; 32] = hasher.finalize().into();
    let signature = crypto
        .secp
        .sign_ecdsa(Message::from_digest(message_hash), &crypto.secret_key);

    Ok(Secp256k1Blob::new(
        identity.clone(),
        &data_to_sign,
        &crypto.public_key.to_string(),
        &signature.to_string(),
    )?
    .as_blob())
}
