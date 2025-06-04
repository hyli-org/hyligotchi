mod metadata {
    use sp1_sdk::include_elf;

    pub const HYLI_GOTCHI_ELF: &[u8] = include_elf!("hyligotchi");
}

pub use metadata::*;
