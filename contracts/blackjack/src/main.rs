#![no_main]

use blackjack::BlackJack;
use sdk::{
    guest::{execute, GuestEnv, Risc0Env},
    Calldata,
};

risc0_zkvm::guest::entry!(main);

fn main() {
    let env = Risc0Env {};
    let (commitment_metadata, calldata): (Vec<u8>, Vec<Calldata>) = env.read();

    let outputs = execute::<BlackJack>(&commitment_metadata, &calldata);

    risc0_zkvm::guest::env::commit(&outputs);
}
