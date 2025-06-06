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
use sdk::{utils::as_hyle_output, Blob, Calldata, RegisterContractEffect, ZkContract};
use serde::Serialize;

use client_sdk::contract_indexer::axum;
use client_sdk::contract_indexer::utoipa;

use crate::*;

impl TxExecutorHandler for HyliGotchiWorld {
    fn build_commitment_metadata(&self, _blob: &Blob) -> anyhow::Result<Vec<u8>> {
        borsh::to_vec(self).context("Failed to encode Orderbook")
    }

    fn handle(&mut self, calldata: &Calldata) -> anyhow::Result<sdk::HyleOutput> {
        let initial_state_commitment = <Self as ZkContract>::commit(self);
        let mut res = <Self as ZkContract>::execute(self, calldata);
        let next_state_commitment = <Self as ZkContract>::commit(self);
        Ok(as_hyle_output(
            initial_state_commitment,
            next_state_commitment,
            calldata,
            &mut res,
        ))
    }

    fn construct_state(
        register_blob: &RegisterContractEffect,
        _metadata: &Option<Vec<u8>>,
    ) -> anyhow::Result<Self> {
        borsh::from_slice(&register_blob.state_commitment.0)
            .context("Failed to decode Orderbook state")
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
        .and_then(|s| s.people.get(&Identity(auth_headers.identity)).cloned())
        .map(Json)
        .ok_or(AppError(
            StatusCode::NOT_FOUND,
            anyhow!("No state found for contract '{}'", store.contract_name),
        ))
}
