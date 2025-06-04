extern crate alloc;

use core::hash::Hasher;
use std::fmt::Display;

use alloc::vec::Vec;
use alloc::{
    collections::btree_map::BTreeMap,
    format,
    string::{String, ToString},
};
use borsh::{io::Error, BorshDeserialize, BorshSerialize};
use rand::Rng;
use rand_seeder::{SipHasher, SipRng};
use serde::{Deserialize, Serialize};

use sdk::{BlockHash, ContractName, Identity, RunResult};

#[cfg(feature = "client")]
pub mod client;

impl sdk::ZkContract for HyliGotchiWorld {
    /// Entry point of the contract's logic
    fn execute(&mut self, calldata: &sdk::Calldata) -> RunResult {
        // Parse contract inputs
        let (action, ctx) = sdk::utils::parse_raw_calldata::<HyliGotchiAction>(calldata)?;

        let user = &calldata.identity;

        let Some(tx_ctx) = calldata.tx_ctx.as_ref() else {
            return Err("Missing tx context necessary for this contract".to_string());
        };

        // Execute the given action
        let res = match action {
            HyliGotchiAction::Init(name) => self.new_gotchi(user, name, &tx_ctx.block_hash)?,
        };

        Ok((res, ctx, alloc::vec![]))
    }

    /// In this example, we serialize the full state on-chain.
    fn commit(&self) -> sdk::StateCommitment {
        sdk::StateCommitment(self.as_bytes().expect("Failed to encode Balances"))
    }
}

/// The state of the contract, that is totally serialized on-chain
#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Debug, Clone, Default)]
pub struct HyliGotchi {
    pub name: String,
    pub activity: HyliGotchiActivity,
}

#[derive(
    Serialize, Deserialize, BorshSerialize, BorshDeserialize, Debug, Clone, PartialEq, Default,
)]
pub enum HyliGotchiActivity {
    #[default]
    Idle,
    Playing,
}

impl Display for HyliGotchiActivity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}",
            match self {
                HyliGotchiActivity::Idle => "Idle",
                HyliGotchiActivity::Playing => "Playing",
            },
        )
    }
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Debug, Clone, Default)]
pub struct HyliGotchiWorld {
    pub people: BTreeMap<Identity, HyliGotchi>,
}

/// Enum representing possible events emitted by the contract.
#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Debug, Clone, PartialEq)]
pub enum HyliGotchiEvent {
    GotchiCreated {
        user: Identity,
        name: String,
        activity: HyliGotchiActivity,
        blockhash: BlockHash,
    },
}

/// Enum representing possible calls to the contract functions.
#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Debug, Clone, PartialEq)]
pub enum HyliGotchiAction {
    Init(String),
}

impl HyliGotchiAction {
    pub fn as_blob(&self, contract_name: sdk::ContractName) -> sdk::Blob {
        sdk::Blob {
            contract_name,
            data: sdk::BlobData(borsh::to_vec(self).expect("Failed to encode HyliGotchiAction")),
        }
    }
}

impl HyliGotchiWorld {
    pub fn as_bytes(&self) -> Result<Vec<u8>, Error> {
        borsh::to_vec(self)
    }
}

impl HyliGotchiWorld {
    pub fn new_gotchi(
        &mut self,
        user: &Identity,
        name: String,
        blockhash: &BlockHash,
    ) -> Result<String, String> {
        if self.people.contains_key(user) {
            return Err(format!("Gotchi already exists for user {user}"));
        }

        self.people.insert(
            user.clone(),
            HyliGotchi {
                name,
                activity: HyliGotchiActivity::Idle,
            },
        );

        Ok(format!(
            "New gotchi created for user {user} with blockhash {blockhash}",
            user = user,
            blockhash = blockhash.0
        ))
    }
}

impl From<sdk::StateCommitment> for HyliGotchiWorld {
    fn from(state: sdk::StateCommitment) -> Self {
        borsh::from_slice(&state.0)
            .map_err(|_| "Could not decode hyllar state".to_string())
            .unwrap()
    }
}
