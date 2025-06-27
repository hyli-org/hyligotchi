use sp1_helper::{build_program_with_args, BuildArgs};

fn main() {
    if std::env::var("CARGO_FEATURE_BUILD").is_ok() {
        println!("cargo:warning=Building SP1 program with build feature enabled");
        build_program_with_args(
            "./hyligotchi",
            BuildArgs {
                features: vec!["sp1".to_string()],
                output_directory: Some("../elf".to_string()),
                ..Default::default()
            },
        );
    } else {
        println!("cargo:warning=Skipping SP1 program build - 'build' feature not enabled");
    }
}
