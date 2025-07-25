use config::{Config, Environment, File};
use hyle_modules::modules::websocket::WebSocketConfig;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct Conf {
    pub id: String,
    /// The log format to use - "json", "node" or "full" (default)
    pub log_format: String,
    /// Directory name to store node state.
    pub data_directory: PathBuf,
    /// When running only the indexer, the address of the DA server to connect to
    /// Warning: This NEEDS to be the Rollup node address
    pub da_read_from: String,

    pub node_url: String,
    pub indexer_url: String,

    pub prover: bool,

    pub rest_server_port: u16,
    pub rest_server_max_body_size: usize,

    pub buffer_blocks: u32,
    pub max_txs_per_proof: usize,
    pub tx_working_window_size: usize,

    pub tick_interval_secs: u64,

    /// Websocket configuration
    pub websocket: WebSocketConfig,
}

impl Conf {
    pub fn new(config_files: Vec<String>) -> Result<Self, anyhow::Error> {
        let mut s = Config::builder().add_source(File::from_str(
            include_str!("conf_defaults.toml"),
            config::FileFormat::Toml,
        ));
        // Priority order: config file, then environment variables
        for config_file in config_files {
            s = s.add_source(File::with_name(&config_file).required(false));
        }
        let conf: Self = s
            .add_source(
                Environment::with_prefix("hyle")
                    .separator("__")
                    .prefix_separator("_"),
            )
            .build()?
            .try_deserialize()?;
        Ok(conf)
    }
}
