# PULSE - Real-time Revenue Split Smart Contract

A Solana smart contract built with Anchor that enables real-time revenue splitting between event organizers and NFT investors with claim-based distribution.

## Architecture

### Core Components

1. **Event Account (PDA)** - Manages event configuration and cumulative revenue tracking
2. **Revenue Vault (PDA)** - Holds investor's share of ticket revenue
3. **Investor Position (PDA)** - Tracks NFT holdings and reward debt per investor
4. **Revenue NFT Mint** - Represents ownership shares in the event

### Mathematical Model

The contract uses a cumulative reward per share model:
- `total_revenue_per_share` (u128) - Accumulates revenue per NFT in nano-lamports (1e9 precision)
- `reward_debt` (u128) - Tracks already claimed rewards per investor
- `pending = nft_amount * total_revenue_per_share - reward_debt`

This ensures O(1) claim complexity and prevents double-counting.

## Instructions

### 1. Create Event
Initializes a new event with revenue split configuration.

```rust
pub fn create_event(
    ctx: Context<CreateEvent>,
    event_id: String,
    revenue_split_bps: u16,    // 3000 = 30%
    revenue_nft_supply: u64
)
```

### 2. Buy Revenue NFT
Investors buy NFTs to get revenue share. Creates/updates investor position.

```rust
pub fn buy_revenue_nft(
    ctx: Context<BuyRevenueNft>,
    amount: u64
)
```

### 3. Buy Ticket
When someone buys a ticket, revenue is automatically split:
- Investor cut → Vault (based on `revenue_split_bps`)
- Organizer cut → Event Authority

```rust
pub fn buy_ticket(
    ctx: Context<BuyTicket>,
    ticket_price: u64
)
```

### 4. Claim
Investors claim their accumulated rewards from the vault.

```rust
pub fn claim(ctx: Context<Claim>)
```

## Setup & Deployment

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Install Node.js dependencies
npm install
```

### Configuration

Update `Anchor.toml`:

```toml
[provider]
cluster = "devnet"  # or "localnet"
wallet = "~/.config/solana/id.json"
```

### Build

```bash
anchor build
```

### Deploy to Devnet

```bash
# Configure Solana to devnet
solana config set --url devnet

# Ensure you have SOL in your wallet
solana airdrop 2

# Deploy
anchor deploy
```

After deployment, update `programs/pulse/src/lib.rs`:
```rust
declare_id!("YOUR_PROGRAM_ID_HERE");
```

### Run Tests

```bash
# Local validator (in separate terminal)
solana-test-validator

# Run tests
anchor test
# or for devnet
anchor test --skip-local-validator
```

## PDAs (Program Derived Addresses)

### Event PDA
```
seeds = ["event", authority_pubkey, event_id]
```

### Vault PDA
```
seeds = ["vault", event_pubkey]
```

### Investor Position PDA
```
seeds = ["investor", event_pubkey, investor_pubkey]
```

## Example Flow

1. Organizer creates event with 30% investor split:
   ```bash
   create_event(event_id="concert-2024", revenue_split_bps=3000, revenue_nft_supply=100)
   ```

2. Investors buy NFT shares:
   ```bash
   buy_revenue_nft(amount=5)  // Owns 5% of investor pool
   ```

3. Attendees buy tickets (1 SOL each):
   ```bash
   buy_ticket(ticket_price=1_000_000_000)
   // 0.7 SOL → Organizer
   // 0.3 SOL → Vault (divided among NFT holders)
   ```

4. Investors claim rewards:
   ```bash
   claim()  // Transfers proportional share from vault
   ```

## Security Features

- **No Loops**: O(1) operations for all instructions
- **Checked Math**: Uses `checked_*` operations to prevent overflows
- **PDA Validation**: All PDAs validated with canonical bumps
- **Vault Balance Check**: Claims fail if vault is insufficient
- **Precision**: Uses u128 with 1e9 multiplier for nano-lamport precision

## Error Codes

| Code | Description |
|------|-------------|
| `InvalidBps` | Basis points must be 0-10000 |
| `InvalidSupply` | NFT supply must be > 0 |
| `InvalidEventId` | Event ID max 50 chars |
| `InvalidAmount` | Amount must be > 0 |
| `MathOverflow` | Arithmetic overflow |
| `MathUnderflow` | Arithmetic underflow |
| `NothingToClaim` | No pending rewards |
| `InsufficientVaultBalance` | Vault balance too low |

## Project Structure

```
smart-contract/
├── Anchor.toml              # Anchor configuration
├── Cargo.toml               # Workspace dependencies
├── package.json             # Node.js dependencies
├── tsconfig.json            # TypeScript config
├── programs/
│   └── pulse/
│       ├── Cargo.toml
│       └── src/
│           └── lib.rs       # Main program logic
└── tests/
    └── pulse.ts             # Test suite
```

## License

MIT
