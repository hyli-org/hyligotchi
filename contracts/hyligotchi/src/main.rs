#![no_main]

extern crate alloc;

use hyligotchi::HyliGotchiWorldZkView;
use sdk::{
    guest::{execute, GuestEnv, SP1Env},
    Calldata,
};
sp1_zkvm::entrypoint!(main);

fn main() {
    let env = SP1Env {};
    let (commitment_metadata, calldata): (Vec<u8>, Vec<Calldata>) = env.read();

    let outputs = execute::<HyliGotchiWorldZkView>(&commitment_metadata, &calldata);

    let vec = borsh::to_vec(&outputs).unwrap();

    sp1_zkvm::io::commit_slice(&vec);
}
