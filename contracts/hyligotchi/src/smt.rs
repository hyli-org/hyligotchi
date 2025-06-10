use borsh::{BorshDeserialize, BorshSerialize};
use sdk::{merkle_utils::SHA256Hasher, Identity};
use serde::ser::{Serialize, SerializeSeq, Serializer};
use sha2::{Digest, Sha256};
use sparse_merkle_tree::{default_store::DefaultStore, traits::Value, SparseMerkleTree, H256};

use crate::HyliGotchi;

#[derive(Debug, Default)]
pub struct HyliGotchiWorldSMT(
    pub SparseMerkleTree<SHA256Hasher, HyliGotchi, DefaultStore<HyliGotchi>>,
);

impl Clone for HyliGotchiWorldSMT {
    fn clone(&self) -> Self {
        let store = self.0.store().clone();
        let root = *self.0.root();
        let trie = SparseMerkleTree::new(root, store);
        Self(trie)
    }
}

// For the API
impl Serialize for HyliGotchiWorldSMT {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let store = self.0.store();
        let map = store.leaves_map();
        let mut seq = serializer.serialize_seq(Some(map.len()))?;
        for (_, leaf_value) in map.iter() {
            seq.serialize_element(leaf_value)?;
        }
        seq.end()
    }
}

impl BorshSerialize for HyliGotchiWorldSMT {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        let store = self.0.store();
        let map = store.leaves_map();
        let len = map.len() as u32;
        borsh::BorshSerialize::serialize(&len, writer)?;
        for (leaf_key, leaf_value) in map.iter() {
            borsh::BorshSerialize::serialize(&leaf_key.as_slice().to_vec(), writer)?;
            borsh::BorshSerialize::serialize(leaf_value, writer)?;
        }
        Ok(())
    }
}

impl BorshDeserialize for HyliGotchiWorldSMT {
    fn deserialize_reader<R: std::io::Read>(reader: &mut R) -> std::io::Result<Self> {
        let len: u32 = borsh::BorshDeserialize::deserialize_reader(reader)?;
        let mut gotchis = SparseMerkleTree::default();
        for _ in 0..len {
            let key: Vec<u8> = borsh::from_reader(reader)?;
            let key: [u8; 32] = key.try_into().map_err(|_| {
                std::io::Error::new(std::io::ErrorKind::InvalidData, "Invalid key length")
            })?;
            let key = H256::from(key);
            let gotchi: HyliGotchi = borsh::BorshDeserialize::deserialize_reader(reader)?;
            gotchis
                .update(key, gotchi)
                .expect("Failed to deserialize gotchi");
        }

        Ok(HyliGotchiWorldSMT(gotchis))
    }
}

impl HyliGotchi {
    pub fn compute_key(owner: &Identity) -> H256 {
        let mut hasher = Sha256::new();
        hasher.update(owner.0.as_bytes());
        let result = hasher.finalize();
        let mut h = [0u8; 32];
        h.copy_from_slice(&result);
        H256::from(h)
    }
}

impl Value for HyliGotchi {
    fn to_h256(&self) -> H256 {
        if self.name.is_empty() {
            return H256::zero();
        }

        let serialized = borsh::to_vec(self).unwrap();
        let mut hasher = Sha256::new();
        hasher.update(&serialized);
        let result = hasher.finalize();
        let mut h = [0u8; 32];
        h.copy_from_slice(&result);
        H256::from(h)
    }

    fn zero() -> Self {
        HyliGotchi::default()
    }
}
