use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use sp1_sdk::{Prover, SP1ProvingKey};
use std::path::Path;
use tracing::{error, info};

use contracts::HYLI_GOTCHI_ELF;

// Make our own error that wraps `anyhow::Error`.
pub struct AppError(pub StatusCode, pub anyhow::Error);

// Tell axum how to convert `AppError` into a response.
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        tracing::error!("{:#}", self.1);
        let body = json!({
            "error": self.1.to_string(),
            "status": self.0.as_u16()
        });
        (self.0, Json(body)).into_response()
    }
}

// This enables using `?` on functions that return `Result<_, anyhow::Error>` to turn them into
// `Result<_, AppError>`. That way you don't need to do that manually.
impl<E> From<E> for AppError
where
    E: Into<anyhow::Error>,
{
    fn from(err: E) -> Self {
        Self(StatusCode::INTERNAL_SERVER_ERROR, err.into())
    }
}

pub fn load_pk(data_directory: &Path) -> SP1ProvingKey {
    let pk_path = data_directory.join("proving_key.bin");

    if pk_path.exists() {
        info!("Loading proving key from disk");
        return std::fs::read(&pk_path)
            .map(|bytes| serde_json::from_slice(&bytes).expect("Failed to deserialize proving key"))
            .expect("Failed to read proving key from disk");
    } else if let Err(e) = std::fs::create_dir_all(data_directory) {
        error!("Failed to create data directory: {}", e);
    }

    info!("Building proving key");

    let client = sp1_sdk::ProverClient::builder().cpu().build();
    let (pk, _) = client.setup(HYLI_GOTCHI_ELF);

    if let Err(e) = std::fs::write(
        &pk_path,
        serde_json::to_vec(&pk).expect("Failed to serialize proving key"),
    ) {
        error!("Failed to save proving key to disk: {}", e);
    }

    pk
}
