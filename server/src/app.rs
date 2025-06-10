use std::{sync::Arc, time::Duration};

use crate::utils::AppError;
use anyhow::Result;
use axum::{
    extract::{Json, Query, State},
    http::{HeaderMap, Method, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use client_sdk::rest_client::{IndexerApiHttpClient, NodeApiClient, NodeApiHttpClient};

use hyle_modules::{
    bus::{BusClientReceiver, SharedMessageBus},
    module_bus_client, module_handle_messages,
    modules::{prover::AutoProverEvent, BuildApiContextInner, Module},
};
use hyligotchi::{client::HyliGotchiWorld, HyliGotchi, HyliGotchiAction};
use sdk::{verifiers::Secp256k1Blob, Blob, BlobTransaction, ContractName, Identity};
use secp256k1::Message;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tokio::sync::Mutex;
use tower_http::cors::{Any, CorsLayer};

pub struct AppModule {
    bus: AppModuleBusClient,
}

pub struct AppModuleCtx {
    pub api: Arc<BuildApiContextInner>,
    pub node_client: Arc<NodeApiHttpClient>,
    pub indexer_client: Arc<IndexerApiHttpClient>,
    pub hyligotchi_cn: ContractName,
    pub crypto_context: CryptoContext,
}

module_bus_client! {
#[derive(Debug)]
pub struct AppModuleBusClient {
    receiver(AutoProverEvent<HyliGotchiWorld>),
}
}

impl Module for AppModule {
    type Context = Arc<AppModuleCtx>;

    async fn build(bus: SharedMessageBus, ctx: Self::Context) -> Result<Self> {
        let state = RouterCtx {
            hyligotchi_cn: ctx.hyligotchi_cn.clone(),
            app: Arc::new(Mutex::new(HyleOofCtx {
                bus: bus.new_handle(),
            })),
            client: ctx.node_client.clone(),
            indexer_client: ctx.indexer_client.clone(),
            crypto_context: ctx.crypto_context.clone(),
        };

        // Créer un middleware CORS
        let cors = CorsLayer::new()
            .allow_origin(Any) // Permet toutes les origines (peut être restreint)
            .allow_methods(vec![Method::GET, Method::POST]) // Permet les méthodes nécessaires
            .allow_headers(Any); // Permet tous les en-têtes

        let api = Router::new()
            .route("/_health", get(health))
            .route("/api/init", post(init))
            .route("/api/tick", post(tick))
            .route("/api/poop/clean", post(clean_poop))
            .route("/api/resurrect", post(resurrect))
            .route("/api/feed/food", post(feed_food))
            .route("/api/feed/sweets", post(feed_sweets))
            .route("/api/feed/vitamins", post(feed_vitamins))
            .route("/api/config", get(get_config))
            .with_state(state)
            .layer(cors); // Appliquer le middleware CORS

        if let Ok(mut guard) = ctx.api.router.lock() {
            if let Some(router) = guard.take() {
                guard.replace(router.merge(api));
            }
        }
        let bus = AppModuleBusClient::new_from_bus(bus.new_handle()).await;

        Ok(AppModule { bus })
    }

    async fn run(&mut self) -> Result<()> {
        module_handle_messages! {
            on_bus self.bus,
        };

        Ok(())
    }
}

#[derive(Clone)]
pub struct CryptoContext {
    pub secp: secp256k1::Secp256k1<secp256k1::All>,
    pub secret_key: secp256k1::SecretKey,
    pub public_key: secp256k1::PublicKey,
}

#[derive(Clone)]
struct RouterCtx {
    pub app: Arc<Mutex<HyleOofCtx>>,
    pub client: Arc<NodeApiHttpClient>,
    pub indexer_client: Arc<IndexerApiHttpClient>,
    pub hyligotchi_cn: ContractName,
    pub crypto_context: CryptoContext,
}

pub struct HyleOofCtx {
    pub bus: SharedMessageBus,
}

async fn health() -> impl IntoResponse {
    Json("OK")
}

// --------------------------------------------------------
//     Headers
// --------------------------------------------------------

const IDENTITY_HEADER: &str = "x-identity";

#[derive(Debug)]
struct AuthHeaders {
    identity: String,
}

impl AuthHeaders {
    fn from_headers(headers: &HeaderMap) -> Result<Self, AppError> {
        let identity = headers
            .get(IDENTITY_HEADER)
            .and_then(|v| v.to_str().ok())
            .ok_or_else(|| {
                AppError(
                    StatusCode::UNAUTHORIZED,
                    anyhow::anyhow!("Missing identity"),
                )
            })?
            .to_string();

        Ok(AuthHeaders { identity })
    }
}

// --------------------------------------------------------
//     Types
// --------------------------------------------------------

#[derive(Serialize, Debug, Clone)]
pub struct ApiGotchi {
    pub name: String,
    pub activity: String,
    pub food: u64,
    pub sweets: u64,
    pub vitamins: u64,
}

impl From<HyliGotchi> for ApiGotchi {
    fn from(hyligotchi: HyliGotchi) -> Self {
        ApiGotchi {
            name: hyligotchi.name,
            activity: hyligotchi.activity.to_string(),
            food: hyligotchi.food,
            sweets: hyligotchi.sweets,
            vitamins: hyligotchi.vitamins,
        }
    }
}

#[derive(Serialize)]
struct ConfigResponse {
    contract_name: String,
}

#[derive(Deserialize)]
struct InitWithName {
    name: String,
}

// --------------------------------------------------------
//     Routes
// --------------------------------------------------------

async fn init(
    State(ctx): State<RouterCtx>,
    headers: HeaderMap,
    Query(init_with_name): Query<InitWithName>,
    Json(wallet_blobs): Json<[Blob; 2]>,
) -> Result<impl IntoResponse, AppError> {
    let auth = AuthHeaders::from_headers(&headers)?;
    send(
        ctx,
        HyliGotchiAction::Init(Identity(auth.identity.clone()), init_with_name.name),
        auth,
        wallet_blobs.to_vec(),
    )
    .await
}

async fn resurrect(
    State(ctx): State<RouterCtx>,
    headers: HeaderMap,
    Json(wallet_blobs): Json<[Blob; 2]>,
) -> Result<impl IntoResponse, AppError> {
    let auth = AuthHeaders::from_headers(&headers)?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| {
            AppError(
                StatusCode::INTERNAL_SERVER_ERROR,
                anyhow::anyhow!("Time error"),
            )
        })?
        .as_millis();
    send(
        ctx,
        HyliGotchiAction::Resurrect(Identity(auth.identity.clone()), now),
        auth,
        wallet_blobs.to_vec(),
    )
    .await
}

async fn clean_poop(
    State(ctx): State<RouterCtx>,
    headers: HeaderMap,
    Json(wallet_blobs): Json<[Blob; 2]>,
) -> Result<impl IntoResponse, AppError> {
    let auth = AuthHeaders::from_headers(&headers)?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| {
            AppError(
                StatusCode::INTERNAL_SERVER_ERROR,
                anyhow::anyhow!("Time error"),
            )
        })?
        .as_millis();

    send(
        ctx,
        HyliGotchiAction::CleanPoop(Identity(auth.identity.clone()), now),
        auth,
        wallet_blobs.to_vec(),
    )
    .await
}

fn create_secp256k1_blob(
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

async fn tick(
    State(ctx): State<RouterCtx>,
    headers: HeaderMap,
    Json(wallet_blobs): Json<[Blob; 2]>,
) -> Result<impl IntoResponse, AppError> {
    let auth = AuthHeaders::from_headers(&headers)?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| {
            AppError(
                StatusCode::INTERNAL_SERVER_ERROR,
                anyhow::anyhow!("Time error"),
            )
        })?
        .as_millis();

    let blob = create_secp256k1_blob(&ctx.crypto_context, &Identity(auth.identity.clone()), now)
        .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e))?;

    let mut blobs = vec![blob];
    blobs.extend(wallet_blobs);

    send(ctx, HyliGotchiAction::Tick(now), auth, blobs).await
}

#[derive(Deserialize)]
struct FeedAmount {
    amount: u64,
}

async fn feed_food(
    State(ctx): State<RouterCtx>,
    headers: HeaderMap,
    Query(feed_amount): Query<FeedAmount>,
    Json(wallet_blobs): Json<[Blob; 2]>,
) -> Result<impl IntoResponse, AppError> {
    let auth = AuthHeaders::from_headers(&headers)?;
    send(
        ctx,
        HyliGotchiAction::FeedFood(Identity(auth.identity.clone()), feed_amount.amount),
        auth,
        wallet_blobs.to_vec(),
    )
    .await
}

async fn feed_sweets(
    State(ctx): State<RouterCtx>,
    headers: HeaderMap,
    Query(feed_amount): Query<FeedAmount>,
    Json(wallet_blobs): Json<[Blob; 2]>,
) -> Result<impl IntoResponse, AppError> {
    let auth = AuthHeaders::from_headers(&headers)?;
    send(
        ctx,
        HyliGotchiAction::FeedSweets(Identity(auth.identity.clone()), feed_amount.amount),
        auth,
        wallet_blobs.to_vec(),
    )
    .await
}

async fn feed_vitamins(
    State(ctx): State<RouterCtx>,
    headers: HeaderMap,
    Query(feed_amount): Query<FeedAmount>,
    Json(wallet_blobs): Json<[Blob; 2]>,
) -> Result<impl IntoResponse, AppError> {
    let auth = AuthHeaders::from_headers(&headers)?;
    send(
        ctx,
        HyliGotchiAction::FeedVitamins(Identity(auth.identity.clone()), feed_amount.amount),
        auth,
        wallet_blobs.to_vec(),
    )
    .await
}

async fn get_config(State(ctx): State<RouterCtx>) -> impl IntoResponse {
    Json(ConfigResponse {
        contract_name: ctx.hyligotchi_cn.0,
    })
}

async fn send(
    ctx: RouterCtx,
    action: HyliGotchiAction,
    auth: AuthHeaders,
    mut blobs: Vec<Blob>,
) -> Result<impl IntoResponse, AppError> {
    let identity = Identity(auth.identity);

    blobs.push(action.as_blob(ctx.hyligotchi_cn.clone()));

    let tx_hash = ctx
        .client
        .send_tx_blob(BlobTransaction::new(identity.clone(), blobs))
        .await?;

    let mut bus = {
        let app = ctx.app.lock().await;
        AppModuleBusClient::new_from_bus(app.bus.new_handle()).await
    };

    tokio::time::timeout(Duration::from_secs(5), async {
        loop {
            let a = bus.recv().await?;
            match a {
                AutoProverEvent::SuccessTx(sequenced_tx_hash, state) => {
                    if sequenced_tx_hash == tx_hash {
                        // let balance = state.balances.get(&identity).copied().unwrap_or(0);
                        let gotchi: ApiGotchi = state.get(&identity).unwrap_or_default().into();
                        return Ok(Json(gotchi));
                    }
                }
                AutoProverEvent::FailedTx(sequenced_tx_hash, error) => {
                    if sequenced_tx_hash == tx_hash {
                        return Err(AppError(StatusCode::BAD_REQUEST, anyhow::anyhow!(error)));
                    }
                }
            }
        }
    })
    .await?
}
