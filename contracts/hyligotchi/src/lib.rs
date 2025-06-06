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
use rand::{Rng, SeedableRng};
use rand_seeder::{SipHasher, SipRng};
use sdk::tracing::info;
use serde::{Deserialize, Serialize};

use sdk::{BlockHash, Identity, RunResult};

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
                self.new_gotchi(user, name, &tx_ctx.block_hash, tx_ctx.block_height.0)?
            }
            HyliGotchiAction::CleanPoop(_nonce) => self.clean_poop(user, &tx_ctx.block_hash)?,
            HyliGotchiAction::FeedFood(food_amount) => {
                self.feed_food(user, food_amount, tx_ctx.block_height.0, &tx_ctx.block_hash)?
            }
            HyliGotchiAction::FeedSweets(sweets_amount) => self.feed_sweets(
                user,
                sweets_amount,
                tx_ctx.block_height.0,
                &tx_ctx.block_hash,
            )?,
            HyliGotchiAction::FeedVitamins(vitamins_amount) => self.feed_vitamins(
                user,
                vitamins_amount,
                tx_ctx.block_height.0,
                &tx_ctx.block_hash,
            )?,
            HyliGotchiAction::Tick(_nonce) => {
                self.tick(&tx_ctx.block_hash, tx_ctx.block_height.0)?
            }
            HyliGotchiAction::Resurrect(_nonce) => {
                self.resurrect_gotchi(user, tx_ctx.block_height.0)?
            }
        };

        Ok((res.as_bytes().to_vec(), ctx, alloc::vec![]))
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
    pub death_count: u64,
    pub pooped: bool,
    pub born_at: u64,
    pub food: u64,
    pub last_food_block_height: u64,
    pub sweets: u64,
    pub last_sweets_at: u64,
    pub vitamins: u64,
    pub last_vitamins_at: u64,
}

impl HyliGotchi {
    pub fn new(name: String, block_height: u64) -> Self {
        HyliGotchi {
            name,
            activity: HyliGotchiActivity::Idle,
            health: HyliGotchiHealth::Healthy,
            death_count: 0,
            pooped: false,
            born_at: block_height,
            food: MAX_FOOD,
            last_food_block_height: block_height,
            sweets: MAX_SWEETS,
            last_sweets_at: block_height,
            vitamins: MAX_VITAMINS,
            last_vitamins_at: block_height,
        }
    }

    pub fn is_hungry(&self) -> bool {
        self.food < MAX_FOOD || self.sweets < MAX_SWEETS || self.vitamins < MAX_FOOD
    }

    pub fn random_sick(&mut self, rng: &mut impl Rng, block_height: u64) {
        if matches!(self.health, HyliGotchiHealth::Healthy)
            && (self.food < MAX_FOOD / 2 || self.sweets < MAX_SWEETS / 2)
        {
            // If the gotchi has less than half of the maximum food, sweets, or vitamins,
            // it becomes sick
            if rng.random_range(0..=1) == 0 {
                // Randomly decide if the gotchi becomes sick
                self.health = HyliGotchiHealth::Sick(block_height);
            }
        }
    }

    fn random_death(&mut self, rng: &mut SipRng, block_height: u64) {
        if let HyliGotchiHealth::Sick(since) = self.health {
            if block_height - since > 100 && rng.random_range(0..=1) == 0 {
                // If the gotchi has been sick for more than 100 blocks, it has a chance to die
                self.health = HyliGotchiHealth::Dead;
                self.death_count += 1;
            }
        }
    }
    fn resurrect(&mut self, block_height: u64) {
        // Resurrect the gotchi if it has been dead for more than 200 blocks
        if matches!(self.health, HyliGotchiHealth::Dead) && block_height - self.born_at > 100 {
            self.health = HyliGotchiHealth::Healthy;
            self.born_at = block_height;
            self.pooped = false;
            self.food = MAX_FOOD;
            self.sweets = MAX_SWEETS;
            self.vitamins = MAX_VITAMINS;
            self.last_food_block_height = block_height;
            self.last_sweets_at = block_height;
            self.last_vitamins_at = block_height;
            self.activity = HyliGotchiActivity::Idle;
        }
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
    Sick(u64), // Block height when the gotchi got sick
    Dead,
}

impl Display for HyliGotchiHealth {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}",
            match self {
                HyliGotchiHealth::Healthy => "Healthy".to_string(),
                HyliGotchiHealth::Sick(since) => format!("Sick since block {}", since),
                HyliGotchiHealth::Dead => "Dead".to_string(),
            },
        )
    }
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
    pub last_block_height: u64,
    pub people: BTreeMap<Identity, HyliGotchi>,
}

impl Display for HyliGotchiWorld {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        for (user, gotchi) in &self.people {
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

        write!(
            f,
            "Last tick: {}, Total gotchis: {}",
            self.last_block_height,
            self.people.len()
        )
    }
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
    CleanPoop(u128),
    Tick(u128),
    Resurrect(u128),
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

    fn resurrect_gotchi(&mut self, user: &Identity, block_height: u64) -> Result<String, String> {
        let Some(gotchi) = self.people.get_mut(user) else {
            return Err(format!("No gotchi found for user {user}"));
        };

        if gotchi.health != HyliGotchiHealth::Dead {
            return Err(format!(
                "Gotchi {} is not dead and cannot be resurrected",
                gotchi.name
            ));
        }

        gotchi.resurrect(block_height);

        Ok(format!("Gotchi {} has been resurrected", gotchi.name))
    }

    fn clean_poop(
        &mut self,
        user: &Identity,
        _block_hash: &sdk::ConsensusProposalHash,
    ) -> Result<String, String> {
        let Some(gotchi) = self.people.get_mut(user) else {
            return Err(format!("No gotchi found for user {user}"));
        };

        if gotchi.health == HyliGotchiHealth::Dead {
            return Err(format!(
                "Gotchi {} is dead and cannot be cleaned",
                gotchi.name
            ));
        }

        if !gotchi.pooped {
            return Err(format!("Gotchi {} has no poop to clean", gotchi.name));
        }

        gotchi.pooped = false;

        Ok(format!("Gotchi {} cleaned up poop", gotchi.name))
    }

    /// Feed vitamins to the gotchi
    fn feed_vitamins(
        &mut self,
        user: &Identity,
        vitamins_amount: u64,
        block_height: u64,
        _block_hash: &sdk::ConsensusProposalHash,
    ) -> Result<String, String> {
        let Some(gotchi) = self.people.get_mut(user) else {
            return Err(format!("No gotchi found for user {user}"));
        };

        if gotchi.health == HyliGotchiHealth::Dead {
            return Err(format!(
                "Gotchi {} is dead and cannot be fed vitamins",
                gotchi.name
            ));
        }

        gotchi.vitamins = gotchi
            .vitamins
            .saturating_add(vitamins_amount)
            .min(MAX_VITAMINS);
        gotchi.last_vitamins_at = block_height;

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
        block_height: u64,
        _block_hash: &sdk::ConsensusProposalHash,
    ) -> Result<String, String> {
        let Some(gotchi) = self.people.get_mut(user) else {
            return Err(format!("No gotchi found for user {user}"));
        };

        if gotchi.health == HyliGotchiHealth::Dead {
            return Err(format!(
                "Gotchi {} is dead and cannot be fed sweets",
                gotchi.name
            ));
        }

        gotchi.sweets = gotchi.sweets.saturating_add(sweets_amount).min(MAX_SWEETS);
        gotchi.last_sweets_at = block_height;

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
        block_height: u64,
        _block_hash: &sdk::ConsensusProposalHash,
    ) -> Result<String, String> {
        let Some(gotchi) = self.people.get_mut(user) else {
            return Err(format!("No gotchi found for user {user}"));
        };

        if gotchi.health == HyliGotchiHealth::Dead {
            return Err(format!(
                "Gotchi {} is dead and cannot be fed food",
                gotchi.name
            ));
        }

        gotchi.food = gotchi.food.saturating_add(food_amount).min(MAX_FOOD);
        gotchi.last_food_block_height = block_height;

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
        block_height: u64,
    ) -> Result<String, String> {
        if self.people.contains_key(user) {
            return Err(format!("Gotchi already exists for user {user}"));
        }

        self.people
            .insert(user.clone(), HyliGotchi::new(name.clone(), block_height));

        Ok(format!(
            "New gotchi created for user {user} with blockhash {blockhash}",
            user = user,
            blockhash = blockhash.0
        ))
    }

    fn tick(
        &mut self,
        block_hash: &sdk::ConsensusProposalHash,
        block_height: u64,
    ) -> Result<String, String> {
        info!(
            current_timestamp = block_height,
            block_hash = %block_hash.0,
            diff = block_height - self.last_block_height,
            "Processing tick"
        );

        if block_height - self.last_block_height < 2 {
            return Err("Tick too soon, please wait".to_string());
        }

        let mut hash = SipHasher::new();
        hash.write(block_hash.0.as_ref());
        let seed = hash.finish();

        let mut rng = SipRng::seed_from_u64(seed);

        for (user, gotchi) in self.people.iter_mut() {
            // Simulate some random activity
            gotchi.activity = if rng.random_range(0..=1) == 0 {
                HyliGotchiActivity::Idle
            } else {
                HyliGotchiActivity::Playing
            };

            if gotchi.last_food_block_height + 1 < block_height {
                // time to decrease food points
                let food_decrease = rng.random_range(0..=1);
                gotchi.food = gotchi.food.saturating_sub(food_decrease);
                gotchi.last_food_block_height = block_height;
            }

            if gotchi.last_sweets_at + 1 < block_height {
                // time to decrease sweets points
                let sweets_decrease = rng.random_range(0..=1);
                gotchi.sweets = gotchi.sweets.saturating_sub(sweets_decrease);
                gotchi.last_sweets_at = block_height;
            }

            if gotchi.vitamins == MAX_VITAMINS && matches!(gotchi.health, HyliGotchiHealth::Sick(_))
            {
                // If the gotchi has full vitamins, it recovers from sickness
                gotchi.health = HyliGotchiHealth::Healthy;
                gotchi.vitamins = 0;
            }

            if !gotchi.pooped && rng.random_range(0..=10) == 0 {
                // Randomly decide if the gotchi poops
                gotchi.pooped = true;
            }

            gotchi.random_sick(&mut rng, block_height);

            gotchi.random_death(&mut rng, block_height);
        }

        self.last_block_height = block_height;

        Ok(format!(
            "Tick processed successfully. Block hash: {}, Timestamp: {}, world state updated. {}",
            block_hash.0, block_height, self
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
