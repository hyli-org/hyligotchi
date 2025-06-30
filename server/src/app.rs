use std::sync::Arc;

use crate::{ticker_module::create_secp256k1_blob, utils::AppError};
use anyhow::Result;
use axum::{
    extract::{Json, Query, State},
    http::{HeaderMap, Method, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use client_sdk::rest_client::{IndexerApiHttpClient, NodeApiClient, NodeApiHttpClient};

use axum::extract::Path;
use hyle_modules::{
    bus::SharedMessageBus,
    module_bus_client, module_handle_messages,
    modules::{prover::AutoProverEvent, BuildApiContextInner, Module},
};
use hyle_smt_token::SmtTokenAction;
use hyligotchi::{client::HyliGotchiWorld, HyliGotchi, HyliGotchiAction};
use sdk::{Blob, BlobTransaction, ContractAction, ContractName, Identity};
use serde::{Deserialize, Serialize};
use tower_http::cors::{Any, CorsLayer};

pub struct AppModule {
    bus: AppModuleBusClient,
}

pub struct AppModuleCtx {
    pub api: Arc<BuildApiContextInner>,
    pub node_client: Arc<NodeApiHttpClient>,
    pub indexer_client: Arc<IndexerApiHttpClient>,
    pub hyligotchi_cn: ContractName,
    pub crypto_context: Arc<CryptoContext>,
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
            .route("/api/poop/clean", post(clean_poop))
            .route("/api/resurrect", post(resurrect))
            .route("/api/feed/food", post(feed_food))
            .route("/api/feed/sweets", post(feed_sweets))
            .route("/api/feed/vitamins", post(feed_vitamins))
            .route("/api/config", get(get_config))
            .route("/api/tick/{secret}", post(trigger_tick))
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
            on_self self,
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
pub struct RouterCtx {
    pub client: Arc<NodeApiHttpClient>,
    pub indexer_client: Arc<IndexerApiHttpClient>,
    pub hyligotchi_cn: ContractName,
    pub crypto_context: Arc<CryptoContext>,
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

#[derive(Serialize, Debug)]
pub struct ApiResponse {
    pub gotchi: ApiGotchi,
    pub tx_hash: String,
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

#[derive(Deserialize)]
struct FeedAmount {
    amount: u64,
}

#[derive(Debug, Clone)]
pub enum FeedType {
    Food,
    Sweets,
    Vitamin,
}

impl FeedType {
    fn token_name(&self) -> &'static str {
        match self {
            FeedType::Food => "oranj",
            FeedType::Sweets => "oxygen",
            FeedType::Vitamin => "vitamin",
        }
    }

    fn to_action(&self, identity: Identity, amount: u64) -> HyliGotchiAction {
        match self {
            FeedType::Food => HyliGotchiAction::FeedFood(identity, amount),
            FeedType::Sweets => HyliGotchiAction::FeedSweets(identity, amount),
            FeedType::Vitamin => HyliGotchiAction::FeedVitamins(identity, amount),
        }
    }
}

async fn feed_food(
    State(ctx): State<RouterCtx>,
    headers: HeaderMap,
    Query(feed_amount): Query<FeedAmount>,
    Json(wallet_blobs): Json<[Blob; 2]>,
) -> Result<impl IntoResponse, AppError> {
    feed_generic(ctx, headers, feed_amount, wallet_blobs, FeedType::Food).await
}

async fn feed_sweets(
    State(ctx): State<RouterCtx>,
    headers: HeaderMap,
    Query(feed_amount): Query<FeedAmount>,
    Json(wallet_blobs): Json<[Blob; 2]>,
) -> Result<impl IntoResponse, AppError> {
    feed_generic(ctx, headers, feed_amount, wallet_blobs, FeedType::Sweets).await
}

async fn feed_vitamins(
    State(ctx): State<RouterCtx>,
    headers: HeaderMap,
    Query(feed_amount): Query<FeedAmount>,
    Json(wallet_blobs): Json<[Blob; 2]>,
) -> Result<impl IntoResponse, AppError> {
    feed_generic(ctx, headers, feed_amount, wallet_blobs, FeedType::Vitamin).await
}

async fn feed_generic(
    ctx: RouterCtx,
    headers: HeaderMap,
    feed_amount: FeedAmount,
    wallet_blobs: [Blob; 2],
    feed_type: FeedType,
) -> Result<impl IntoResponse, AppError> {
    let auth = AuthHeaders::from_headers(&headers)?;
    let identity = Identity(auth.identity.clone());
    let action = feed_type.to_action(identity, feed_amount.amount);

    send(ctx, action, auth, wallet_blobs.to_vec()).await
}

async fn trigger_tick(
    State(ctx): State<RouterCtx>,
    headers: HeaderMap,
    Path(secret): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    // Get the expected secret from env or default to "test"
    let expected_secret = std::env::var("TICK_SECRET").unwrap_or_else(|_| "test".to_string());

    if secret != expected_secret {
        return Err(AppError(
            StatusCode::UNAUTHORIZED,
            anyhow::anyhow!("Invalid secret"),
        ));
    }

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| anyhow::anyhow!("Time error"))?
        .as_millis();

    let blob = create_secp256k1_blob(
        &ctx.crypto_context,
        &Identity("hyligtochi_server@secp256k1".to_string()),
        now,
    )?;

    send(
        ctx,
        HyliGotchiAction::Tick(now),
        AuthHeaders::from_headers(&headers)?,
        vec![blob],
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

    match action {
        HyliGotchiAction::FeedFood(ref identity, amount) => {
            handle_feed_action(amount, &ctx, identity, &mut blobs, FeedType::Food).await?;
        }
        HyliGotchiAction::FeedSweets(ref identity, amount) => {
            handle_feed_action(amount, &ctx, identity, &mut blobs, FeedType::Sweets).await?;
        }
        HyliGotchiAction::FeedVitamins(ref identity, amount) => {
            handle_feed_action(amount, &ctx, identity, &mut blobs, FeedType::Vitamin).await?;
        }
        _ => {
            blobs.push(action.as_blob(ctx.hyligotchi_cn.clone()));
        }
    }

    let tx_hash = ctx
        .client
        .send_tx_blob(BlobTransaction::new(identity.clone(), blobs))
        .await?;

    Ok(tx_hash.0.into_response())
}

async fn handle_feed_action(
    amount: u64,
    ctx: &RouterCtx,
    identity: &Identity,
    blobs: &mut Vec<Blob>,
    feed_type: FeedType,
) -> Result<(), AppError> {
    /*
    let balance = get_user_token_balance(ctx, identity, feed_type.token_name()).await?;

    if balance < amount as u128 {
        return Err(AppError(
            StatusCode::BAD_REQUEST,
            anyhow::anyhow!(
                "Insufficient balance. Current balance is {} while deposit is {}",
                balance,
                amount
            ),
        ));
    }
    */

    let transfer_action = SmtTokenAction::Transfer {
        sender: identity.clone(),
        recipient: ctx.hyligotchi_cn.0.clone().into(),
        amount: amount as u128,
    };

    let feed_action = feed_type.to_action(identity.clone(), amount);
    blobs.push(feed_action.as_blob(ctx.hyligotchi_cn.clone()));
    blobs.push(transfer_action.as_blob(feed_type.token_name().into(), None, None));

    Ok(())
}

#[derive(Deserialize)]
struct Balance {
    #[allow(dead_code)]
    address: String,
    #[allow(dead_code)]
    balance: u128,
}

#[allow(dead_code)]
async fn get_user_token_balance(
    ctx: &RouterCtx,
    identity: &Identity,
    token_name: &str,
) -> Result<u128, AppError> {
    let balance = reqwest::get(&format!(
        "{}/v1/indexer/contract/{}/balance/{}",
        ctx.indexer_client.url, token_name, &identity.0
    ))
    .await
    .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, anyhow::anyhow!(e)))?
    .json::<Balance>()
    .await?;

    Ok(balance.balance)
}
