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
use rand::seq::IteratorRandom;
use rand::{Rng, SeedableRng};
use rand_seeder::{SipHasher, SipRng};
use sdk::hyle_model_utils::TimestampMs;
use sdk::tracing::info;
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
            HyliGotchiAction::Init(name) => {
                self.new_gotchi(user, name, &tx_ctx.block_hash, tx_ctx.timestamp.0)?
            }
            HyliGotchiAction::FeedFood(food_amount) => {
                self.feed_food(user, food_amount, &tx_ctx.block_hash)?
            }
            HyliGotchiAction::FeedSweets(sweets_amount) => {
                self.feed_sweets(user, sweets_amount, &tx_ctx.block_hash)?
            }
            HyliGotchiAction::FeedVitamins(vitamins_amount) => {
                self.feed_vitamins(user, vitamins_amount, &tx_ctx.block_hash)?
            }
            HyliGotchiAction::Tick => self.tick(&tx_ctx.block_hash, tx_ctx.timestamp.0)?,
        };

        Ok((res, ctx, alloc::vec![]))
    }

    /// In this example, we serialize the full state on-chain.
    fn commit(&self) -> sdk::StateCommitment {
        sdk::StateCommitment(self.as_bytes().expect("Failed to encode Balances"))
    }
}

pub const MAX_FOOD: u64 = 10;
pub const MAX_SWEETS: u64 = 10;
pub const MAX_VITAMINS: u64 = 10;

/// The state of the contract, that is totally serialized on-chain
#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Debug, Clone, Default)]
pub struct HyliGotchi {
    pub name: String,
    pub activity: HyliGotchiActivity,
    pub health: HyliGotchiHealth,
    pub food: u64,
    pub last_food: u128,
    pub sweets: u64,
    pub last_sweets: u128,
    pub vitamins: u64,
    pub last_vitamins: u128,
}

impl HyliGotchi {
    pub fn new(name: String, current_timestamp: u128) -> Self {
        HyliGotchi {
            name,
            activity: HyliGotchiActivity::Idle,
            health: HyliGotchiHealth::Healthy,
            food: MAX_FOOD,
            last_food: current_timestamp,
            sweets: MAX_SWEETS,
            last_sweets: current_timestamp,
            vitamins: MAX_VITAMINS,
            last_vitamins: current_timestamp,
        }
    }

    pub fn is_hungry(&self) -> bool {
        self.food < MAX_FOOD || self.sweets < MAX_SWEETS || self.vitamins < MAX_FOOD
    }

    pub fn become_sick(&mut self, rng: &mut impl Rng) {
        if self.food < MAX_FOOD / 2
            || self.sweets < MAX_SWEETS / 2
            || self.vitamins < MAX_VITAMINS / 2
        {
            // If the gotchi has less than half of the maximum food, sweets, or vitamins,
            // it becomes sick
            if rng.random_range(0..=1) == 0 {
                // Randomly decide if the gotchi becomes sick
                self.health = HyliGotchiHealth::Sick;
            } else {
                // If the gotchi is not hungry, it remains healthy
                self.health = HyliGotchiHealth::Healthy;
            }
        }
    }

    fn is_sick(&self) -> bool {
        self.health == HyliGotchiHealth::Sick
    }
}

#[derive(
    Serialize, Deserialize, BorshSerialize, BorshDeserialize, Debug, Clone, PartialEq, Default,
)]
pub enum HyliGotchiActivity {
    #[default]
    Idle,
    Playing,
}

#[derive(
    Serialize, Deserialize, BorshSerialize, BorshDeserialize, Debug, Clone, PartialEq, Default,
)]
pub enum HyliGotchiHealth {
    #[default]
    Healthy,
    Sick,
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
    pub last_tick: u128,
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
    GotchiFedFood {
        user: Identity,
        name: String,
        amount: u64,
    },
    GotchiFedSweets {
        user: Identity,
        name: String,
        amount: u64,
    },
    GotchiFedVitamins {
        user: Identity,
        name: String,
        amount: u64,
    },
}

/// Enum representing possible calls to the contract functions.
#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Debug, Clone, PartialEq)]
pub enum HyliGotchiAction {
    Init(String),
    FeedFood(u64),
    FeedSweets(u64),
    FeedVitamins(u64),
    Tick,
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

    /// Feed vitamins to the gotchi
    fn feed_vitamins(
        &mut self,
        user: &Identity,
        vitamins_amount: u64,
        _block_hash: &sdk::ConsensusProposalHash,
    ) -> Result<String, String> {
        let Some(gotchi) = self.people.get_mut(user) else {
            return Err(format!("No gotchi found for user {user}"));
        };

        gotchi.vitamins = gotchi
            .vitamins
            .saturating_add(vitamins_amount)
            .min(MAX_VITAMINS);

        Ok(format!(
            "Gotchi {} fed {} vitamins. New vitamin level: {}",
            gotchi.name, vitamins_amount, gotchi.vitamins
        ))
    }

    /// Feed sweets to the gotchi
    fn feed_sweets(
        &mut self,
        user: &Identity,
        sweets_amount: u64,
        _block_hash: &sdk::ConsensusProposalHash,
    ) -> Result<String, String> {
        let Some(gotchi) = self.people.get_mut(user) else {
            return Err(format!("No gotchi found for user {user}"));
        };

        gotchi.sweets = gotchi.sweets.saturating_add(sweets_amount).min(MAX_SWEETS);

        Ok(format!(
            "Gotchi {} fed {} sweets. New sweets level: {}",
            gotchi.name, sweets_amount, gotchi.sweets
        ))
    }

    /// Feed food to the gotchi
    fn feed_food(
        &mut self,
        user: &Identity,
        food_amount: u64,
        _block_hash: &sdk::ConsensusProposalHash,
    ) -> Result<String, String> {
        let Some(gotchi) = self.people.get_mut(user) else {
            return Err(format!("No gotchi found for user {user}"));
        };

        gotchi.food = gotchi.food.saturating_add(food_amount).min(MAX_FOOD);

        Ok(format!(
            "Gotchi {} fed {} food. New food level: {}",
            gotchi.name, food_amount, gotchi.food
        ))
    }

    fn new_gotchi(
        &mut self,
        user: &Identity,
        name: String,
        blockhash: &BlockHash,
        current_timestamp: u128,
    ) -> Result<String, String> {
        if self.people.contains_key(user) {
            return Err(format!("Gotchi already exists for user {user}"));
        }

        self.people.insert(
            user.clone(),
            HyliGotchi::new(name.clone(), current_timestamp),
        );

        Ok(format!(
            "New gotchi created for user {user} with blockhash {blockhash}",
            user = user,
            blockhash = blockhash.0
        ))
    }

    fn tick(
        &mut self,
        block_hash: &sdk::ConsensusProposalHash,
        current_timestamp: u128,
    ) -> Result<String, String> {
        info!(
            current_timestamp = current_timestamp,
            block_hash = %block_hash.0,
            diff = current_timestamp - self.last_tick,
            "Processing tick"
        );

        if current_timestamp - self.last_tick < 60 * 1000 {
            return Err("Tick too soon, please wait".to_string());
        }

        let mut hash = SipHasher::new();
        hash.write(block_hash.0.as_ref());
        let seed = hash.finish();

        let mut rng = SipRng::seed_from_u64(seed);

        for (user, gotchi) in self.people.iter_mut() {
            // Simulate some random activity
            let activity: HyliGotchiActivity = if rng.random_range(0..=1) == 0 {
                HyliGotchiActivity::Idle
            } else {
                HyliGotchiActivity::Playing
            };

            if gotchi.last_food + 600 * 1000 < current_timestamp {
                // time to decrease food points
                let food_decrease = rng.random_range(0..=1);
                gotchi.food = gotchi.food.saturating_sub(food_decrease);
                gotchi.last_food = current_timestamp;
            }

            if gotchi.last_sweets + 600 * 1000 < current_timestamp {
                // time to decrease sweets points
                let sweets_decrease = rng.random_range(0..=1);
                gotchi.sweets = gotchi.sweets.saturating_sub(sweets_decrease);
                gotchi.last_sweets = current_timestamp;
            }

            if gotchi.last_vitamins + 600 * 1000 < current_timestamp {
                // time to decrease vitamins points
                let vitamins_decrease = rng.random_range(0..=1);
                gotchi.vitamins = gotchi.vitamins.saturating_sub(vitamins_decrease);
                gotchi.last_vitamins = current_timestamp;
            }

            if gotchi.vitamins == MAX_VITAMINS && gotchi.health == HyliGotchiHealth::Sick {
                // If the gotchi has full vitamins, it recovers from sickness
                gotchi.health = HyliGotchiHealth::Healthy;
            }

            if gotchi.is_sick() {
                // If the gotchi is hungry, it may become sick
                gotchi.become_sick(&mut rng);
            }
        }

        self.last_tick = current_timestamp;

        Ok(format!(
            "Tick processed successfully. Block hash: {}, Timestamp: {}",
            block_hash.0, current_timestamp
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
