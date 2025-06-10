use alloc::{
    string::{String, ToString},
    vec::Vec,
};
use anyhow::{anyhow, Context, Result};
use client_sdk::contract_indexer::{
    axum::{
        extract::State,
        http::{HeaderMap, StatusCode},
        response::IntoResponse,
        Json, Router,
    },
    utoipa::openapi::OpenApi,
    utoipa_axum::{router::OpenApiRouter, routes},
    AppError, ContractHandler, ContractHandlerStore,
};
use client_sdk::transaction_builder::TxExecutorHandler;
use sdk::{utils::as_hyle_output, Blob, Calldata, RegisterContractEffect};

use client_sdk::contract_indexer::axum;
use client_sdk::contract_indexer::utoipa;

use crate::{smt::HyliGotchiWorldSMT, *};

#[serde_with::serde_as]
#[derive(BorshSerialize, BorshDeserialize, Serialize, Debug, Clone)]
pub struct HyliGotchiWorld {
    // NOT VERIFIED ONCHAIN
    pub last_block_height: u64,

    #[serde_as(as = "[_; 33]")]
    pub backend_pubkey: BackendPubKey,
    pub gotchis: HyliGotchiWorldSMT,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct HyliGotchiWorldConstructor {
    pub backend_pubkey: BackendPubKey,
}

impl TxExecutorHandler for HyliGotchiWorld {
    fn construct_state(
        _register_blob: &RegisterContractEffect,
        metadata: &Option<Vec<u8>>,
    ) -> anyhow::Result<Self> {
        let Some(metadata) = metadata else {
            return Err(anyhow!("Metadata is missing"));
        };
        let args: HyliGotchiWorldConstructor =
            borsh::from_slice(metadata).context("Failed to decode Orderbook state")?;
        Ok(Self::new(&args))
    }

    fn build_commitment_metadata(&self, blob: &Blob) -> anyhow::Result<Vec<u8>> {
        let action: HyliGotchiAction = HyliGotchiAction::from_blob_data(&blob.data)?;
        let zk_view = match action {
            HyliGotchiAction::UpdateInviteCodePublicKey { .. } => WalletZkView {
                commitment: get_state_commitment(*self.smt.0.root(), self.invite_code_public_key),
                invite_code_public_key: self.invite_code_public_key,
                partial_data: vec![],
            },
            HyliGotchiAction::Init(ident, ..)
            | HyliGotchiAction::CleanPoop(ident, ..)
            | HyliGotchiAction::FeedFood(ident, ..)
            | HyliGotchiAction::FeedSweets(ident, ..)
            | HyliGotchiAction::FeedVitamins(ident, ..)
            | HyliGotchiAction::Resurrect(ident, ..) => {
                let mut account_info = self.smt.0.get(&AccountInfo::compute_key(&account))?;
                account_info.identity = account.clone();
                WalletZkView {
                    commitment: self.get_state_commitment(),
                    invite_code_public_key: self.invite_code_public_key,
                    partial_data: vec![PartialWalletData {
                        proof: BorshableMerkleProof(
                            self.smt
                                .0
                                .merkle_proof(vec![AccountInfo::compute_key(&account)])
                                .expect("Failed to generate proof"),
                        ),
                        account_info,
                    }],
                }
            }
        };
        borsh::to_vec(&zk_view).context("Failed to serialize WalletZkView for commitment metadata")
    }

    fn handle(&mut self, calldata: &Calldata) -> anyhow::Result<sdk::HyleOutput> {
        let initial_state_commitment =
            get_state_commitment(*self.gotchis.0.root(), self.backend_pubkey);

        let (action, ctx) = sdk::utils::parse_raw_calldata::<HyliGotchiAction>(calldata)
            .map_err(|e| anyhow!("Failed to parse calldata: {}", e))?;

        let Some(tx_ctx) = &calldata.tx_ctx else {
            return Err(anyhow!("Transaction context is missing"));
        };

        if let HyliGotchiAction::Tick(nonce) = &action {
            let tick_ok = check_tick_commitment(calldata, *nonce, &self.backend_pubkey)
                .and(self.tick(&tx_ctx.block_hash, tx_ctx.block_height.0));
            return Ok(as_hyle_output(
                initial_state_commitment,
                get_state_commitment(*self.gotchis.0.root(), self.backend_pubkey),
                calldata,
                &mut match tick_ok {
                    Ok(_) => Ok(("Tick".as_bytes().to_vec(), ctx, alloc::vec![])),
                    Err(e) => Err(e.to_string()),
                },
            ));
        }

        let user = match &action {
            HyliGotchiAction::Init(ident, ..) => ident,
            HyliGotchiAction::CleanPoop(ident, ..) => ident,
            HyliGotchiAction::FeedFood(ident, ..) => ident,
            HyliGotchiAction::FeedSweets(ident, ..) => ident,
            HyliGotchiAction::FeedVitamins(ident, ..) => ident,
            HyliGotchiAction::Tick(..) => unreachable!(),
            HyliGotchiAction::Resurrect(ident, ..) => ident,
        }
        .clone();

        let mut gotchi = self
            .gotchis
            .0
            .get(&HyliGotchi::compute_key(&user))
            .context("Gotchi not found in the state")?;

        let res = handle_nontick_action(&mut gotchi, &user, action, tx_ctx);

        self.gotchis
            .0
            .update(HyliGotchi::compute_key(&user), gotchi)
            .context("Failed to update gotchi")?;

        let next_state_commitment =
            get_state_commitment(*self.gotchis.0.root(), self.backend_pubkey);

        Ok(as_hyle_output(
            initial_state_commitment,
            next_state_commitment,
            calldata,
            &mut match &res {
                Ok(str) => Ok((str.as_bytes().to_vec(), ctx, alloc::vec![])),
                Err(e) => Err(e.to_string()),
            },
        ))
    }
}

impl ContractHandler for HyliGotchiWorld {
    async fn api(store: ContractHandlerStore<HyliGotchiWorld>) -> (Router<()>, OpenApi) {
        let (router, api) = OpenApiRouter::default()
            .routes(routes!(get_state))
            .split_for_parts();

        (router.with_state(store), api)
    }
}

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

#[utoipa::path(
    get,
    path = "/state",
    tag = "Contract",
    responses(
        (status = OK, description = "Get json state of contract")
    )
)]
pub async fn get_state(
    State(state): State<ContractHandlerStore<HyliGotchiWorld>>,
    headers: HeaderMap,
) -> Result<impl IntoResponse, AppError> {
    let auth_headers = AuthHeaders::from_headers(&headers)?;
    let store = state.read().await;
    store
        .state
        .clone()
        .and_then(|s| {
            match s
                .gotchis
                .0
                .get(&HyliGotchi::compute_key(&Identity(auth_headers.identity)))
            {
                Ok(gotchi) => match gotchi.name.is_empty() {
                    true => None, // No gotchi found for this identity
                    false => Some(s),
                },
                Err(_) => None, // Error retrieving gotchi
            }
        })
        .map(Json)
        .ok_or(AppError(
            StatusCode::NOT_FOUND,
            anyhow!("No state found for contract '{}'", store.contract_name),
        ))
}

impl HyliGotchiWorld {
    pub fn new(args: &HyliGotchiWorldConstructor) -> Self {
        Self {
            last_block_height: 0,
            backend_pubkey: args.backend_pubkey,
            gotchis: HyliGotchiWorldSMT::default(),
        }
    }
    pub fn get(&self, user: &Identity) -> Option<HyliGotchi> {
        self.gotchis.0.get(&HyliGotchi::compute_key(user)).ok()
    }
    pub fn get_state_commitment(&self) -> StateCommitment {
        get_state_commitment(*self.gotchis.0.root(), self.backend_pubkey)
    }
}

impl Display for HyliGotchiWorld {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        for gotchi in self.gotchis.0.store().leaves_map().values() {
            writeln!(
                f,
                "Gotchi: {}, Born at: {}, Activity: {}, Health: {}, Food: {}, Sweets: {}, Vitamins: {}",
                gotchi.name,
                gotchi.born_at,
                gotchi.activity,
                gotchi.health,
                gotchi.food,
                gotchi.sweets,
                gotchi.vitamins
            )?;
        }

        let size = self.gotchis.0.store().leaves_map().iter().count();
        write!(
            f,
            "Last tick: {}, Total gotchis: {}",
            self.last_block_height, size
        )
    }
}
