# PULSE Agent Scheduler (Simplified MVP)

Autonomous AI agent ticket purchasing service for Solana.

## Overview

The scheduler is a lightweight service that calls `buy_ticket_with_escrow` - the core function that allows AI agents to automatically purchase tickets using their pre-funded escrow balance.

## Key Features

- **Autonomous Buying**: Anyone (scheduler service) can trigger ticket purchases
- **Escrow-Only**: Only uses escrow balance, not user's main wallet
- **Budget Control**: Enforced max_budget_per_ticket limits
- **Simplified**: No complex preferences - just event + tier matching

## Setup

### 1. Install Dependencies

```bash
cd pulse-agent-scheduler
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# RPC URL (use devnet for testing)
RPC_URL=https://api.devnet.solana.com

# Scheduler Authority Keypair (base64)
# Generate: solana-keypair new | base64
SCHEDULER_KEYPAIR=

# Agent Owner (wallet that owns the agent)
AGENT_OWNER=

# Agent ID to purchase tickets for
AGENT_ID=my-agent

# Event Creator Wallet
EVENT_ORGANIZER=

# Event ID
EVENT_ID=event-1

# Ticket Tier ID to purchase
TIER_ID=VIP
```

### 3. Generate Scheduler Keypair

**IMPORTANT**: Create a dedicated keypair for the scheduler:

```bash
# Generate new keypair
solana-keypair new --outfile ~/.config/solana/scheduler.json

# Encode to base64
cat ~/.config/solana/scheduler.json | base64

# Copy output to SCHEDULER_KEYPAIR in .env
```

## Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  PULSE Scheduler Service                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Read configuration from .env                             │
│  2. Derive PDAs (event, tier, agent, escrow)                 │
│  3. Call buy_ticket_with_escrow                               │
│  4. Transaction confirmed on-chain                           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Smart Contract  │
                    │  - Event        │
                    │  - TicketTier   │
                    │  - AIAgent      │
                    │  - AgentEscrow  │
                    └─────────────────┘
```

## How It Works

1. **User creates agent** via UI
2. **User creates escrow** and deposits SOL
3. **Scheduler** (or anyone) calls `buy_ticket_with_escrow`
4. **Smart contract** validates:
   - Event is active
   - Tier has supply
   - Agent is active
   - Escrow has sufficient balance
   - Price ≤ max_budget_per_ticket
5. **Ticket purchased** - SOL transferred from escrow to organizer

## Security

1. **Scheduler Authority**: Only signs transactions, can't withdraw funds
2. **Escrow Protection**: Scheduler can't access user's main wallet
3. **Budget Limits**: Smart contract enforces spending limits
4. **Single Purpose**: Scheduler only calls `buy_ticket_with_escrow`

## Example Output

```
🤖 PULSE Agent Scheduler Starting...
Network: https://api.devnet.solana.com
Scheduler Authority: [SIGNER_PUBKEY]
Program ID: EXZ9u1aF8gvHeUsKM8eTRzWDo88WGMKWZJLbvM8bYetJ

=== Buying Ticket with Agent Escrow ===
Event PDA: [EVENT_PDA]
Tier PDA: [TIER_PDA]
Agent PDA: [AGENT_PDA]
Escrow PDA: [ESCROW_PDA]
✅ Ticket purchased! TX: [SIGNATURE]
✨ Success! Transaction signature: [SIGNATURE]
```

## Deployment

### PM2 (Recommended)

```bash
npm run build
pm2 start dist/index.js --name pulse-scheduler
pm2 save
pm2 startup
```

### Systemd

```bash
# Create service file
sudo nano /etc/systemd/system/pulse-scheduler.service

# Add content:
[Unit]
Description=PULSE Agent Scheduler
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/pulse-agent-scheduler
ExecStart=/usr/bin/node dist/index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl enable pulse-scheduler
sudo systemctl start pulse-scheduler
```

## Smart Contract Integration

The scheduler calls this function:

```rust
pub fn buy_ticket_with_escrow(
    ctx: Context<BuyTicketWithEscrow>,
    tier_id: String,
) -> Result<()> {
    // Validations:
    // - Event is active
    // - Tier has supply
    // - Agent is active
    // - Escrow balance >= price
    // - price <= max_budget_per_ticket
    // - price <= remaining_budget

    // Transfer SOL from escrow to organizer
    // Update agent, escrow, tier, event state
}
```

## License

MIT
