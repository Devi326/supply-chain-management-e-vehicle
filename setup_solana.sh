#!/bin/bash
set -e

echo "Starting silent installation..."

# Install Rust
if ! command -v rustc &> /dev/null; then
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
fi

# Install Solana
if ! command -v solana &> /dev/null; then
    echo "Installing Solana..."
    sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"
fi

export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"

# Install Anchor CLI directly via compiled Github Release to avoid compilation time
if ! command -v anchor &> /dev/null; then
    echo "Downloading pre-compiled Anchor CLI..."
    wget -q https://github.com/coral-xyz/anchor/releases/download/v0.30.1/anchor-cli-linux-x86_64 -O anchor
    chmod +x anchor
    mv anchor $HOME/.cargo/bin/anchor
fi

echo "Building Solana Program in devnet..."
cd "/mnt/c/Users/devij/Downloads/supplychain.devi/supplychain/supply management/evehicle-web3/blockchain/solana-program"

export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:~/.cargo/bin:$PATH"

# Set up local keypair for deployment if it doesn't exist
solana config set --url devnet
if [ ! -f ~/.config/solana/id.json ]; then
    solana-keygen new --no-bip39-passphrase -s
    solana airdrop 2 || true # Get some devnet sol
fi

anchor build
echo "Deploying Solana Program to Devnet..."
anchor deploy > deploy_output.txt
cat deploy_output.txt
