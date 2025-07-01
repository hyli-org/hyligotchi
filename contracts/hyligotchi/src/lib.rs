extern crate alloc;

use core::hash::Hasher;
use std::fmt::Display;

use alloc::vec::Vec;
use alloc::{
    format,
    string::{String, ToString},
};
use borsh::{io::Error, BorshDeserialize, BorshSerialize};
use hyle_smt_token::SmtTokenAction;
use rand::{Rng, SeedableRng};
use rand_seeder::{SipHasher, SipRng};
use sdk::merkle_utils::{BorshableMerkleProof, SHA256Hasher};
use sdk::secp256k1::CheckSecp256k1;
use sdk::tracing::info;
use sdk::{
    BlobIndex, BlockHash, ConsensusProposalHash, ContractName, Identity, RunResult, StateCommitment,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sparse_merkle_tree::traits::Value;
use sparse_merkle_tree::H256;

#[cfg(feature = "client")]
pub mod client;
pub mod smt;

pub type BackendPubKey = [u8; 33];
pub const DEFAULT_BACKEND_PUBLIC_KEY: BackendPubKey = [
    2, 82, 222, 37, 58, 251, 184, 56, 112, 182, 255, 255, 252, 221, 235, 53, 107, 2, 98, 178, 4,
    234, 13, 218, 118, 136, 8, 202, 95, 190, 184, 177, 226,
];

/// Partial state of the HyliGotchiWorld contract, for proof generation and verification
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct HyliGotchiWorldZkView {
    pub commitment: sdk::StateCommitment,
    pub tick_data: Option<(sdk::StateCommitment, ConsensusProposalHash, u64)>,
    pub backend_pubkey: BackendPubKey,
    pub partial_data: Vec<PartialHyliGotchiWorldData>,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct PartialHyliGotchiWorldData {
    pub proof: BorshableMerkleProof,
    pub gotchi: HyliGotchi,
}

fn get_state_commitment(root: H256, pubkey: BackendPubKey) -> StateCommitment {
    let mut hasher = Sha256::new();
    hasher.update(root.as_slice());
    hasher.update(pubkey);
    let result = hasher.finalize();
    StateCommitment(result.to_vec())
}

impl sdk::ZkContract for HyliGotchiWorldZkView {
    /// Entry point of the contract's logic
    fn execute(&mut self, calldata: &sdk::Calldata) -> RunResult {
        // Parse contract inputs
        let (action, ctx) = sdk::utils::parse_raw_calldata::<HyliGotchiAction>(calldata)?;

        let Some(tx_ctx) = calldata.tx_ctx.as_ref() else {
            return Err("Missing tx context necessary for this contract".to_string());
        };

        // Special case tick
        if let HyliGotchiAction::Tick(nonce) = action {
            // This is a trusted action, just update the commitment.
            check_tick_commitment(calldata, nonce, &self.backend_pubkey)?;
            let Some(tick_data) = &self.tick_data else {
                return Err("Tick data must be set for tick action".to_string());
            };
            self.commitment = tick_data.0.clone();
            return Ok(("Tick".as_bytes().to_vec(), ctx, alloc::vec![]));
        }

        // Not an identity contract.
        if calldata.identity.0.ends_with(ctx.contract_name.0.as_str()) {
            return Err("This contract does not support identity actions".to_string());
        }

        // If we don't have state for this calldata, then the proof cannot be generated and we must panic.
        let PartialHyliGotchiWorldData { proof, mut gotchi } = self
            .partial_data
            .pop()
            .expect("No partial data available for the contract state");

        let user = &calldata.identity;
        let account_key = HyliGotchi::compute_key(user);
        let leaves = vec![(account_key, gotchi.to_h256())];

        // Validate internal consistency, then check hash.
        let root = proof
            .0
            .clone()
            .compute_root::<SHA256Hasher>(leaves.clone())
            .expect("Failed to compute root from proof");
        let verified = proof
            .0
            .clone()
            .verify::<SHA256Hasher>(&root, leaves.clone())
            .map_err(|e| format!("Failed to verify proof: {e}"))?;
        if self.commitment != get_state_commitment(root, self.backend_pubkey) {
            panic!(
                "State commitment mismatch: expected {:?}, got {:?}",
                self.commitment,
                get_state_commitment(root, self.backend_pubkey)
            );
        }

        if !verified {
            // Proof is invalid and we must panic.
            panic!("Proof verification failed for the contract state");
        }

        // Execute the given action
        let res = handle_nontick_action(&mut gotchi, user, action, tx_ctx, calldata)?;

        // Now update the commitment
        let leaves = vec![(account_key, gotchi.to_h256())];
        let new_root = proof
            .0
            .compute_root::<SHA256Hasher>(leaves)
            .expect("Failed to compute new root");

        self.commitment = get_state_commitment(new_root, self.backend_pubkey);

        Ok((res.as_bytes().to_vec(), ctx, alloc::vec![]))
    }

    /// In this example, we serialize the full state on-chain.
    fn commit(&self) -> sdk::StateCommitment {
        self.commitment.clone()
    }
}

impl sdk::TransactionalZkContract for HyliGotchiWorldZkView {
    type State = sdk::StateCommitment;

    fn initial_state(&self) -> Self::State {
        self.commitment.clone()
    }

    fn revert(&mut self, initial_state: Self::State) {
        self.commitment = initial_state;
    }
}

pub fn handle_nontick_action(
    gotchi: &mut HyliGotchi,
    user: &Identity,
    action: HyliGotchiAction,
    tx_ctx: &sdk::TxContext,
    calldata: &sdk::Calldata,
) -> Result<String, String> {
    match action {
        HyliGotchiAction::Init(ident, name) => {
            if ident != *user {
                return Err("You can only initialize your own gotchi".to_string());
            }
            if !gotchi.name.is_empty() {
                return Err(format!("Gotchi already exists for user {}", ident.0));
            }
            gotchi.new_gotchi(name, &tx_ctx.block_hash, tx_ctx.block_height.0)
        }
        HyliGotchiAction::CleanPoop(ident, _nonce) => {
            if ident != *user {
                return Err("You can only initialize your own gotchi".to_string());
            }
            if gotchi.name.is_empty() {
                return Err(format!("Gotchi does not exist for user {}", ident.0));
            }
            gotchi.clean_poop(&tx_ctx.block_hash)
        }
        HyliGotchiAction::FeedFood(ident, food_amount) => {
            if ident != *user {
                return Err("You can only initialize your own gotchi".to_string());
            }
            if gotchi.name.is_empty() {
                return Err(format!("Gotchi does not exist for user {}", ident.0));
            }
            // Find the oranj transfer blob
            let oranj_transfer_blob_index = calldata
                .blobs
                .iter()
                .position(|(_, b)| b.contract_name == ContractName("oranj".to_string()))
                .ok_or_else(|| "Missing Oranj transfer blob".to_string())?;

            let transfer_action = sdk::utils::parse_structured_blob::<SmtTokenAction>(
                &calldata.blobs,
                &sdk::BlobIndex(oranj_transfer_blob_index),
            )
            .ok_or_else(|| "Failed to decode Oranj transfer action".to_string())?
            .data
            .parameters;

            let SmtTokenAction::Transfer {
                sender,
                recipient,
                amount,
            } = transfer_action
            else {
                return Err("Failed to decode Oranj transfer action".to_string());
            };
            if sender != *user {
                return Err("You can only feed your own gotchi".to_string());
            }
            if recipient != "hyligotchi2".into() {
                return Err("You have to send oranj to the hyligotchi2 contract".to_string());
            }
            if amount != food_amount as u128 {
                return Err(format!(
                    "Invalid amount in Oranj blob. Expected {food_amount}, got {amount}"
                ));
            }

            gotchi.feed_food(food_amount, tx_ctx.block_height.0, &tx_ctx.block_hash)
        }
        HyliGotchiAction::FeedSweets(ident, sweets_amount) => {
            if ident != *user {
                return Err("You can only initialize your own gotchi".to_string());
            }
            if gotchi.name.is_empty() {
                return Err(format!("Gotchi does not exist for user {}", ident.0));
            }

            // Find the oxygen transfer blob
            let oxygen_transfer_blob_index = calldata
                .blobs
                .iter()
                .position(|(_, b)| b.contract_name == ContractName("oxygen".to_string()))
                .ok_or_else(|| "Missing oxygen transfer blob".to_string())?;

            let transfer_action = sdk::utils::parse_structured_blob::<SmtTokenAction>(
                &calldata.blobs,
                &sdk::BlobIndex(oxygen_transfer_blob_index),
            )
            .ok_or_else(|| "Failed to decode oxygen transfer action".to_string())?
            .data
            .parameters;

            let SmtTokenAction::Transfer {
                sender,
                recipient,
                amount,
            } = transfer_action
            else {
                return Err("Failed to decode oxygen transfer action".to_string());
            };
            if sender != *user {
                return Err("You can only feed your own gotchi".to_string());
            }
            if recipient != "hyligotchi2".into() {
                return Err("You have to send oxygen to the hyligotchi2 contract".to_string());
            }
            if amount != sweets_amount as u128 {
                return Err(format!(
                    "Invalid amount in oxygen blob. Expected {sweets_amount}, got {amount}"
                ));
            }

            gotchi.feed_sweets(sweets_amount, tx_ctx.block_height.0, &tx_ctx.block_hash)
        }
        HyliGotchiAction::FeedVitamins(ident, vitamins_amount) => {
            if ident != *user {
                return Err("You can only initialize your own gotchi".to_string());
            }
            if gotchi.name.is_empty() {
                return Err(format!("Gotchi does not exist for user {}", ident.0));
            }

            // Find the vitamin transfer blob
            let vitamin_transfer_blob_index = calldata
                .blobs
                .iter()
                .position(|(_, b)| b.contract_name == ContractName("vitamin".to_string()))
                .ok_or_else(|| "Missing vitamin transfer blob".to_string())?;

            let transfer_action = sdk::utils::parse_structured_blob::<SmtTokenAction>(
                &calldata.blobs,
                &sdk::BlobIndex(vitamin_transfer_blob_index),
            )
            .ok_or_else(|| "Failed to decode vitamin transfer action".to_string())?
            .data
            .parameters;

            let SmtTokenAction::Transfer {
                sender,
                recipient,
                amount,
            } = transfer_action
            else {
                return Err("Failed to decode vitamin transfer action".to_string());
            };
            if sender != *user {
                return Err("You can only feed your own gotchi".to_string());
            }
            if recipient != "hyligotchi2".into() {
                return Err("You have to send vitamins to the hyligotchi2 contract".to_string());
            }
            if amount != vitamins_amount as u128 {
                return Err(format!(
                    "Invalid amount in vitamin blob. Expected {vitamins_amount}, got {amount}"
                ));
            }
            gotchi.feed_vitamins(vitamins_amount, tx_ctx.block_height.0, &tx_ctx.block_hash)
        }
        HyliGotchiAction::Tick(..) => {
            Err("Tick action is not supported in this context".to_string())
        }
        HyliGotchiAction::Resurrect(ident, _nonce) => {
            if ident != *user {
                return Err("You can only resurrect your own gotchi".to_string());
            }
            if gotchi.name.is_empty() {
                return Err(format!("Gotchi does not exist for user {}", ident.0));
            }
            gotchi.resurrect_gotchi(tx_ctx.block_height.0)
        }
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
            if block_height - since > 50_000 && rng.random_range(0..=1) == 0 {
                // If the gotchi has been sick for more than 50.000 blocks, it has a chance to die
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
                HyliGotchiHealth::Sick(since) => format!("Sick since block {since}"),
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
    Init(Identity, String),
    FeedFood(Identity, u64),
    FeedSweets(Identity, u64),
    FeedVitamins(Identity, u64),
    CleanPoop(Identity, u128),
    Resurrect(Identity, u128),
    Tick(u128),
}

impl HyliGotchiAction {
    pub fn as_blob(&self, contract_name: sdk::ContractName) -> sdk::Blob {
        sdk::Blob {
            contract_name,
            data: sdk::BlobData(borsh::to_vec(self).expect("Failed to encode HyliGotchiAction")),
        }
    }
    pub fn from_blob_data(blob_data: &sdk::BlobData) -> anyhow::Result<Self> {
        borsh::from_slice(&blob_data.0).map_err(|e| {
            anyhow::anyhow!(
                "Failed to decode WalletAction from blob data: {}",
                e.to_string()
            )
        })
    }
}

impl HyliGotchi {
    pub fn as_bytes(&self) -> Result<Vec<u8>, Error> {
        borsh::to_vec(self)
    }

    fn resurrect_gotchi(&mut self, block_height: u64) -> Result<String, String> {
        if self.health != HyliGotchiHealth::Dead {
            return Err(format!(
                "Gotchi {} is not dead and cannot be resurrected",
                self.name
            ));
        }

        self.resurrect(block_height);

        Ok(format!("Gotchi {} has been resurrected", self.name))
    }

    fn clean_poop(&mut self, _block_hash: &sdk::ConsensusProposalHash) -> Result<String, String> {
        if self.health == HyliGotchiHealth::Dead {
            return Err(format!(
                "Gotchi {} is dead and cannot be cleaned",
                self.name
            ));
        }

        if !self.pooped {
            return Err(format!("Gotchi {} has no poop to clean", self.name));
        }

        self.pooped = false;

        Ok(format!("Gotchi {} cleaned up poop", self.name))
    }

    /// Feed vitamins to the gotchi
    fn feed_vitamins(
        &mut self,
        vitamins_amount: u64,
        block_height: u64,
        _block_hash: &sdk::ConsensusProposalHash,
    ) -> Result<String, String> {
        if self.health == HyliGotchiHealth::Dead {
            return Err(format!(
                "Gotchi {} is dead and cannot be fed vitamins",
                self.name
            ));
        }

        self.vitamins = self
            .vitamins
            .saturating_add(vitamins_amount)
            .min(MAX_VITAMINS);
        self.last_vitamins_at = block_height;

        if self.vitamins == MAX_VITAMINS && matches!(self.health, HyliGotchiHealth::Sick(_)) {
            // If the gotchi has full vitamins, it recovers from sickness
            self.health = HyliGotchiHealth::Healthy;
            self.vitamins = 0;
        }

        Ok(format!(
            "Gotchi {} fed {} vitamins. New vitamin level: {}",
            self.name, vitamins_amount, self.vitamins
        ))
    }

    /// Feed sweets to the gotchi
    fn feed_sweets(
        &mut self,
        sweets_amount: u64,
        block_height: u64,
        _block_hash: &sdk::ConsensusProposalHash,
    ) -> Result<String, String> {
        if self.health == HyliGotchiHealth::Dead {
            return Err(format!(
                "Gotchi {} is dead and cannot be fed sweets",
                self.name
            ));
        }

        self.sweets = self.sweets.saturating_add(sweets_amount).min(MAX_SWEETS);
        self.last_sweets_at = block_height;

        Ok(format!(
            "Gotchi {} fed {} sweets. New sweets level: {}",
            self.name, sweets_amount, self.sweets
        ))
    }

    /// Feed food to the gotchi
    fn feed_food(
        &mut self,
        food_amount: u64,
        block_height: u64,
        _block_hash: &sdk::ConsensusProposalHash,
    ) -> Result<String, String> {
        if self.health == HyliGotchiHealth::Dead {
            return Err(format!(
                "Gotchi {} is dead and cannot be fed food",
                self.name
            ));
        }

        self.food = self.food.saturating_add(food_amount).min(MAX_FOOD);
        self.last_food_block_height = block_height;

        Ok(format!(
            "Gotchi {} fed {} food. New food level: {}",
            self.name, food_amount, self.food
        ))
    }

    fn new_gotchi(
        &mut self,
        name: String,
        blockhash: &BlockHash,
        block_height: u64,
    ) -> Result<String, String> {
        if !self.name.is_empty() {
            return Err(format!("Gotchi already exists for user {}", self.name));
        }

        *self = HyliGotchi::new(name.clone(), block_height);

        Ok(format!(
            "New gotchi {name} created with blockhash {blockhash}",
            blockhash = blockhash.0
        ))
    }
}

fn check_tick_commitment(
    calldata: &sdk::Calldata,
    nonce: u128,
    backend_pubkey: &BackendPubKey,
) -> Result<(), String> {
    let mut data_to_sign = nonce.to_le_bytes().to_vec();
    data_to_sign.extend_from_slice("HyliGotchiWorldTick".as_bytes());
    // Check if the calldata contains a secp256k1 blob with the expected data
    let blob = CheckSecp256k1::new(calldata, &data_to_sign)
        .with_blob_index(BlobIndex(0))
        .expect()?;
    if blob.public_key != *backend_pubkey {
        return Err("Invalid public key".to_string());
    }
    Ok(())
}

// Permissioned and run only on the handler.
#[cfg(feature = "client")]
impl crate::client::HyliGotchiWorld {
    pub fn tick(
        &mut self,
        block_hash: &sdk::ConsensusProposalHash,
        block_height: u64,
    ) -> Result<String, String> {
        info!(
            current_timestamp = block_height,
            block_hash = %block_hash.0,
            "Processing tick"
        );

        //if block_height - self.last_block_height < 2 {
        //    return Err("Tick too soon, please wait".to_string());
        //}

        let mut hash = SipHasher::new();
        hash.write(block_hash.0.as_ref());
        let seed = hash.finish();

        let mut rng = SipRng::seed_from_u64(seed);

        let mut keys = self
            .gotchis
            .0
            .store()
            .leaves_map()
            .keys()
            .cloned()
            .collect::<Vec<_>>();
        keys.sort(); // Need deterministic ordering.

        for key in keys {
            let Ok(mut gotchi) = self.gotchis.0.get(&key) else {
                continue;
            };
            info!("gotchi: {} {:?}", gotchi.name, gotchi);
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

            self.gotchis
                .0
                .update(key, gotchi)
                .map_err(|e| format!("Failed to update gotchi: {e}"))?;
        }

        info!("Random: {}", rng.random::<u8>());

        Ok(format!(
            "Tick processed successfully. Block hash: {}, Timestamp: {}, world state updated. {}",
            block_hash.0, block_height, self
        ))
    }
}
