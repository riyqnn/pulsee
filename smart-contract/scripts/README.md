# Pulse Demo Setup Scripts

This directory contains scripts for initializing the Pulse smart contract and creating demo data for testing and demonstration purposes.

## Prerequisites

1. **Solana CLI installed** with a configured wallet
   ```bash
   solana-keygen new  # If you don't have a wallet yet
   ```

2. **Wallet funded with SOL** (for Devnet, get from [faucet](https://faucet.quicknode.com/solana))

3. **Program deployed** to your chosen cluster

4. **Dependencies installed**
   ```bash
   cd ../
   npm install
   ```

## Available Scripts

### `init:config` - Initialize GlobalConfig (REQUIRED - Run Once)

This creates the GlobalConfig account that is required for all other features to work.

```bash
npm run init:config
```

**What it does:**
- Creates GlobalConfig PDA account
- Sets protocol fees (5%)
- Sets default price cap (10%)
- Configures listing durations (1h - 24h)
- Disables agent coordination (for safety)
- Makes verification optional

**Expected output:**
```
🚀 Initializing GlobalConfig...
📡 Cluster: devnet
👤 Admin: [your-public-key]
📋 Config PDA: [config-pda-address]
📝 Config Parameters:
  - Protocol Fee: 5%
  - Default Price Cap: 10%
  - Min Listing Duration: 1 hour
  - Max Listing Duration: 24 hours
  - Agent Coordination: Disabled
  - Verification: Optional
✅ Config initialized successfully!
📝 Transaction signature: [tx-signature]
🔍 View on Solscan: https://solscan.io/tx/[signature]?cluster=devnet
```

### `create:demo` - Create Sample Demo Data

Creates sample events, ticket tiers, and AI agents for demonstration.

```bash
npm run create:demo
```

**What it creates:**
- **2 Events:**
  - Neon Music Festival 2025 (Tokyo)
  - Future Tech Conference 2025 (San Francisco)

- **4 Ticket Tiers:**
  - GA (General Admission) - 0.1 SOL
  - VIP Access - 0.5 SOL
  - Early Bird - 0.2 SOL
  - Standard - (defined in script)

- **2 AI Agents:**
  - Pulse Bot (2 SOL budget)
  - Sniper Bot (5 SOL budget)

**Expected output:**
```
🎨 Creating demo data...
📡 Cluster: devnet
👤 Organizer: [your-public-key]

🎵 Creating Event 1: Neon Music Festival 2025
  📍 Event PDA: [event-pda]
  ✅ Event created!
  📝 TX: https://solscan.io/tx/[signature]?cluster=devnet

🎫 Creating ticket tiers for Neon Music Festival 2025
  ✅ GA Tier created (0.1 SOL, 1000 tickets)
  ✅ VIP Tier created (0.5 SOL, 100 tickets)

💻 Creating Event 2: Tech Conference 2025
  📍 Event PDA: [event-pda]
  ✅ Event created!
  📝 TX: https://solscan.io/tx/[signature]?cluster=devnet

🤖 Creating AI Agents
  ✅ Pulse Bot created!
     - Budget: 2 SOL
     - Max per ticket: 0.5 SOL
     - Auto-purchase: Enabled
  ✅ Sniper Bot created!
     - Budget: 5 SOL
     - Max per ticket: 1 SOL
     - Auto-purchase: Enabled

🎉 Demo data created successfully!
```

### `setup:demo` - Full Setup (Both Commands)

Runs both `init:config` and `create:demo` in sequence.

```bash
npm run setup:demo
```

Use this for initial setup. After the first time, you can run `create:demo` independently to add more data.

## Environment Variables

### `CLUSTER` - Target Cluster

Set which Solana cluster to operate on.

```bash
# Devnet (default)
CLUSTER=devnet npm run init:config

# Testnet
CLUSTER=testnet npm run init:config

# Mainnet (BE CAREFUL!)
CLUSTER=mainnet-beta npm run init:config
```

## Troubleshooting

### "Wallet file not found"

**Solution:** Create a Solana wallet:
```bash
solana-keygen new
```

### "IDL not found"

**Solution:** Build the contract first:
```bash
cd ../pulse
anchor build
```

### "Config already initialized"

**Solution:** This is expected if you've already run the script. You can skip it or verify on Solscan.

### "Transaction failed"

**Check:**
1. Wallet has enough SOL balance
2. Correct cluster selected (Devnet for testing)
3. Program ID matches your deployed program

### "Event already exists"

**Solution:** This is expected if you've run the script before. The script will continue and create other items.

## Verification

After running the scripts, verify on Solscan:

### Check Config
```
https://solscan.io/account/[CONFIG_PDA]?cluster=devnet
```

### Check Events
Look for transactions from your wallet with "CreateEvent" instructions.

### Check Agents
Look for transactions from your wallet with "CreateAiAgent" instructions.

## Customization

You can modify the scripts to create different demo data:

### Edit `create-demo-data.ts`:

```typescript
// Change event details
eventId1 = 'YOUR_EVENT_ID';
'Your Event Name',
'Your event description',

// Change prices (in lamports, 1 SOL = 1,000,000,000 lamports)
new BN(100_000_000), // 0.1 SOL

// Change ticket quantities
new BN(1000) // 1000 tickets

// Add more tiers by copying the createTicketTier block
// Add more agents by copying the createAiAgent block
```

## Next Steps

After setup:

1. **Start the frontend:**
   ```bash
   cd ../../pulse-ui
   pnpm install
   pnpm dev
   ```

2. **Open browser:** http://localhost:5173

3. **Connect wallet** (Phantom, Solflare, etc.)

4. **Test features:**
   - Browse events in Marketplace
   - Buy tickets
   - Create agents
   - List tickets on secondary market
   - Test Dutch auctions

## Production Deployment

For production, create a `.env.production` file in `pulse-ui/`:

```env
VITE_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
VITE_SOLANA_WS_URL=wss://api.mainnet-beta.solana.com
VITE_PROGRAM_ID=YOUR_PROGRAM_ID
VITE_CLUSTER=mainnet-beta
```

Then deploy:
```bash
cd ../pulse-ui
pnpm build
netlify deploy --prod
```

## Support

For issues or questions:
1. Check Solscan for transaction details
2. Review the main README in the project root
3. Check contract logs: `solana logs`
