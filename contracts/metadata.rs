mod metadata {
    pub const HYLI_GOTCHI_ELF: &[u8] = include_bytes!("../elf/hyligotchi");
}

pub use metadata::*;
