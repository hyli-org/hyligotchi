use crate::app::CryptoContext;
use client_sdk::rest_client::{NodeApiClient, NodeApiHttpClient};
use hyle_modules::modules::Module;
use hyligotchi::HyliGotchiAction;
use sdk::{verifiers::Secp256k1Blob, BlobTransaction, Identity};
use secp256k1::Message;
use sha2::{Digest, Sha256};
use std::sync::Arc;
use tracing::info;

pub struct TickerModule {
    interval: u64,
    node_client: Arc<NodeApiHttpClient>,
    crypto_context: Arc<CryptoContext>,
}

impl Module for TickerModule {
    type Context = (Arc<NodeApiHttpClient>, Arc<CryptoContext>);

    fn build(
        _bus: hyle_modules::bus::SharedMessageBus,
        ctx: Self::Context,
    ) -> impl futures::Future<Output = anyhow::Result<Self>> + Send {
        async move {
            Ok(TickerModule {
                interval: 600, // 10 minutes in seconds
                node_client: ctx.0,
                crypto_context: ctx.1,
            })
        }
    }

    fn run(&mut self) -> impl futures::Future<Output = anyhow::Result<()>> + Send {
        let interval = self.interval;
        let node_client = self.node_client.clone();
        let crypto_context = self.crypto_context.clone();

        async move {
            loop {
                tokio::time::sleep(tokio::time::Duration::from_secs(interval)).await;

                info!("Executing Tick action");
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map_err(|_| anyhow::anyhow!("Time error"))?
                    .as_millis();

                // Create the data to sign
                let mut data_to_sign = now.to_le_bytes().to_vec();
                data_to_sign.extend_from_slice("HyliGotchiWorldTick".as_bytes());

                // Hash the data
                let mut hasher = Sha256::new();
                hasher.update(data_to_sign.clone());
                let message_hash: [u8; 32] = hasher.finalize().into();

                // Sign the hash
                let signature = crypto_context.secp.sign_ecdsa(
                    Message::from_digest(message_hash),
                    &crypto_context.secret_key,
                );

                // Create the secp256k1 blob
                let blob = Secp256k1Blob::new(
                    Identity("hyligtochi_server@secp256k1".to_string()),
                    &data_to_sign,
                    &hex::encode(crypto_context.public_key.serialize()),
                    &signature.to_string(),
                )?;

                // Create the Tick action blob
                let action_blob = HyliGotchiAction::Tick(now).as_blob("hyligotchi".into());

                // Send the transaction
                let tx_hash = node_client
                    .send_tx_blob(BlobTransaction::new(
                        Identity("hyligtochi_server@secp256k1".to_string()),
                        vec![blob.as_blob(), action_blob],
                    ))
                    .await?;

                info!("Tick transaction sent with hash: {}", tx_hash);
            }
        }
    }
}
