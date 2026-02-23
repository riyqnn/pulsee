# 🎭 PULSE - AI-Powered Ticket Marketplace on Solana

**PULSE** is a decentralized ticket marketplace platform built on Solana, featuring autonomous AI agents for intelligent ticket purchasing, real-time marketplace dynamics, and a striking **Neobrutalist UI design**.

> Transform how tickets are bought, sold, and managed with AI-powered agents and decentralized innovation.

---

## 🎯 Core Features

### 🤖 AI Agent System
- **Autonomous Ticket Purchasing**: Create AI agents that automatically buy tickets based on your preferences
- **Budget Management**: Set total budgets and per-ticket limits for precise spending control
- **Auto-Purchase Enabled**: Toggle automatic purchasing on/off per agent
- **Smart Preferences**: Configure agent behavior with customizable purchase thresholds
- **Real-time Monitoring**: Track agent activity and spending in real-time

### 🎪 Event Management
- **Event Creation**: Organizers can list events with custom details (venue, dates, images)
- **Multiple Ticket Tiers**: Support for different ticket categories with varying prices
- **Dynamic Pricing**: Set tier-specific prices and availability
- **Event Status Control**: Activate, cancel, or manage event lifecycles
- **Organizer Revenue Tracking**: Monitor ticket sales and royalties

### 🏪 Primary Market (Direct Sales)
- **Browse Events**: Explore all active events with beautiful card layouts
- **Instant Purchase**: Buy tickets directly from the primary market
- **Agent-Assisted Buying**: Use AI agents to purchase tickets on your behalf
- **Multi-Tier Support**: Choose from multiple ticket tiers per event
- **Stock Management**: Real-time availability tracking

### 🔄 Secondary Market (Peer-to-Peer)
- **Ticket Listing**: Resell your tickets at custom prices
- **Time-Limited Listings**: Set expiration windows for your listings
- **Royalty System**: Organizers earn fees on secondary sales
- **Seller Protection**: Secure transactions with confirmation
- **Price Discovery**: Market-driven ticket pricing

### 💰 Wallet Integration
- **Solana Wallet Support**: Connect any Solana wallet (Phantom, Backpack, etc.)
- **Balance Display**: View SOL balance and transaction history
- **Fee Transparency**: See all fees before confirming transactions
- **Real-time Updates**: Live balance updates after transactions

---

## 🎨 Design System - Neobrutalist UI

PULSE features a **bold Neobrutalist design** aesthetic:

### Visual Characteristics
- **Heavy Typography**: Large, bold font-display text for impact
- **Black & White Palette**: Stark contrasts with vibrant accent colors
- **Bold Borders**: 4px solid black borders on major elements
- **Raw Materials Feel**: Unrefined, geometric shapes
- **Neon Accents**: Vibrant lime (`#00FF00`) and pink (`#FF00FF`) highlights
- **Grid-Based Layout**: Rigid, structured component arrangement

### Color Palette
```
Primary: #000000 (Black)
Contrast: #FFFFFF (White)
Accent Green: #00FF00 (Neon Lime)
Accent Pink: #FF00FF (Magenta)
Background: #F5F5F5 (Off-white)
Text: #1F1F1F (Near-black)
```

### Key Design Elements
- **NeoButton**: Oversized CTA buttons with bold hover states
- **NeoCard**: Cards with thick borders and strong shadows
- **NeoToggle**: Binary state switches with high contrast
- **NeoInput**: Form inputs with minimal styling, bold focus states
- **NeoTab Navigation**: Tab system with thick underlines

---

## 🔄 Application Flow

### User Journey

```
┌─────────────────────────────────────────────────────────┐
│                    CONNECT WALLET                        │
│              (Phantom, Backpack, etc.)                   │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    AGENTS          MARKETPLACE      TICKETS
    ▼                   ▼               ▼
┌────────────┐  ┌──────────────┐  ┌──────────────┐
│ Create AI  │  │ Browse Events│  │ View Owned   │
│ Agent      │  │ & Tiers      │  │ Tickets      │
└─────┬──────┘  └──────┬───────┘  └──────┬───────┘
      │                │                 │
      ▼                ▼                 ▼
┌─────────────────────────────────────────────┐
│  SELECT ACTION                              │
│  ├─ Buy directly (wallet)                   │
│  ├─ Buy with agent (auto-purchase)          │
│  └─ List for resale (secondary market)      │
└─────────────┬───────────────────────────────┘
              │
              ▼
        ┌──────────────┐
        │ TRANSACTION  │
        │ CONFIRMATION │
        └──────┬───────┘
               │
        ┌──────▼──────┐
        │ ✅ SUCCESS  │
        │ 💾 HISTORY  │
        └─────────────┘
```

### AI Agent Purchase Flow

```
┌──────────────────────────────────────┐
│ 1. CREATE AGENT                      │
│    - Agent ID                        │
│    - Display Name                    │
│    - Max Budget Per Ticket (SOL)     │
│    - Total Budget (SOL)              │
│    - Enable Auto-Purchase            │
│    - Preference Settings             │
└────────────────┬─────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ 2. AGENT CREATED   │
        │ Status: Inactive   │
        │ Budget: Set ✓      │
        └────────┬───────────┘
                 │
                 ▼
        ┌─────────────────────────┐
        │ 3. ACTIVATE AGENT       │
        │    Status: ACTIVE ✓     │
        └────────┬────────────────┘
                 │
                 ▼
        ┌──────────────────────────────┐
        │ 4. BUY WITH AGENT            │
        │    - Select Event            │
        │    - Choose Ticket Tier      │
        │    - Confirm Price           │
        └────────┬─────────────────────┘
                 │
                 ▼
        ┌────────────────────────────────────┐
        │ 5. AUTO-PURCHASE PROCESSING        │
        │    ✓ User account check/create     │
        │    ✓ Budget verification           │
        │    ✓ Tier availability check       │
        │    ✓ Execute purchase              │
        │    ✓ Deduct budget                 │
        │    ✓ Mint ticket NFT               │
        └────────┬─────────────────────────┘
                 │
                 ▼
        ┌──────────────────────┐
        │ 6. TICKET PURCHASED  │
        │    • Added to wallet │
        │    • Budget updated  │
        │    • History logged  │
        └──────────────────────┘
```

---

## 🏗️ Architecture

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS + Custom Neobrutalist components
- **State Management**: React Context API
- **Animation**: Framer Motion (smooth transitions)
- **Blockchain**: Solana Web3.js + Anchor Framework
- **Build Tool**: Vite

### Smart Contract Stack
- **Language**: Rust
- **Framework**: Anchor Framework v0.30.x
- **Network**: Solana Devnet/Testnet
- **Program ID**: `5fQA4eCdUtCJPDhjGfb6nn47RhVfKJT2dW5iHuQaeH2n`

### Data Structure

#### 🤖 AI Agent Account
```rust
pub struct AIAgent {
    pub owner: Pubkey,                      // Agent owner
    pub agent_id: String,                   // Unique identifier
    pub name: String,                       // Display name
    pub is_active: bool,                    // Active status
    pub max_budget_per_ticket: u64,         // Max per purchase
    pub total_budget: u64,                  // Total budget
    pub spent_budget: u64,                  // Amount spent
    pub auto_purchase_enabled: bool,        // Auto-purchase toggle
    pub auto_purchase_threshold: u16,       // Confidence threshold (bps)
    pub max_tickets_per_event: u8,          // Tickets per event limit
    // ... additional coordination fields
}
```

#### 🎪 Event Account
```rust
pub struct Event {
    pub organizer: Pubkey,                  // Event creator
    pub event_id: String,                   // Unique ID
    pub name: String,                       // Event name
    pub description: String,                // Details
    pub image_url: String,                  // Event image
    pub venue: String,                      // Location
    pub event_start_time: i64,              // Start timestamp
    pub sale_start_time: i64,               // Sales open
    pub sale_end_time: i64,                 // Sales close
    pub is_active: bool,                    // Active status
    pub is_cancelled: bool,                 // Cancelled flag
    pub total_tickets_sold: u64,            // Sales counter
    pub total_revenue: u64,                 // Revenue tracker
}
```

#### 🎟️ Ticket Tier Account
```rust
pub struct TicketTier {
    pub event: Pubkey,                      // Parent event
    pub tier_id: String,                    // Tier identifier
    pub name: String,                       // Tier name
    pub price: u64,                         // Price in lamports
    pub max_supply: u64,                    // Total supply
    pub current_supply: u64,                // Remaining tickets
    pub is_active: bool,                    // Tier status
}
```

#### 👤 User Account
```rust
pub struct User {
    pub owner: Pubkey,                      // Account owner
    pub username: String,                   // Display name
    pub email: String,                      // Contact email
    pub tickets_purchased: u64,             // Purchase count
    pub total_spent: u64,                   // Total spending
}
```

---

## 📊 Key Mechanisms

### RPC Request Queue
- **Problem**: Devnet rate limiting (429 errors)
- **Solution**: Sequential RPC call processing
- **Implementation**: RequestQueue class with exponential backoff
- **Details**:
  - Base delay: 500ms
  - Max retries: 3
  - Backoff: 500ms → 1s → 2s
  - Applies to all `getProgramAccounts` calls

### Account Parsing
- **Borsh Serialization**: Manual parsing for complex types
- **Variable-Length Strings**: Handle 4-byte length prefixes
- **No Alignment**: Direct sequential reads after bool fields
- **Parsers**:
  - `parseAgentAccount()` - Deserialize AIAgent struct
  - `parseEventAccount()` - Deserialize Event struct
  - `parseUserAccount()` - Deserialize User struct

### Transaction Flow
1. **User initiates action** (buy, create agent, etc.)
2. **Validation checks** (budget, tier availability, etc.)
3. **PDA derivation** for all required accounts
4. **Instruction assembly** with proper account list
5. **Transaction signing** by wallet
6. **On-chain execution** by Solana validator
7. **Confirmation polling** (max 30 retries)
8. **Frontend state update** with results

---

## 🚀 Getting Started

### Prerequisites
```bash
# Node.js 18+
node --version

# pnpm package manager
npm install -g pnpm

# Solana CLI
solana --version

# Anchor Framework
anchor --version
```

### Setup

#### 1. Clone & Install
```bash
cd /path/to/pulse
pnpm install
```

#### 2. Configure Environment

Create `.env.development` in `pulse-ui/`:
```env
# Solana RPC Configuration
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_SOLANA_WS_URL=wss://api.devnet.solana.com

# Pulse Program Configuration
VITE_PROGRAM_ID=5fQA4eCdUtCJPDhjGfb6nn47RhVfKJT2dW5iHuQaeH2n

# Environment
VITE_CLUSTER=devnet
```

#### 3. Build Smart Contract
```bash
cd smart-contract
anchor build
anchor deploy
```

#### 4. Start Frontend
```bash
cd pulse-ui
pnpm dev
```

Open http://localhost:5173 in your browser.

---

## 📋 Available Commands

### Frontend
```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Lint & format
pnpm lint

# Type checking
pnpm typecheck
```

### Smart Contract
```bash
cd smart-contract

# Build program
anchor build

# Deploy to Devnet
anchor deploy

# Run tests
anchor test

# Generate IDL
anchor idl init --filepath idl/pulse.json
```

---

## 🎮 How to Use

### Step 1: Connect Wallet
1. Click **"CONNECT WALLET"** button (top right)
2. Select your wallet provider
3. Approve connection in wallet extension

### Step 2: Create an AI Agent
1. Go to **"AGENT COMMAND"** tab
2. Click **"+ CREATE AGENT"**
3. Fill in agent details:
   - **Agent ID**: Unique identifier (e.g., `agent-001`)
   - **Name**: Display name (e.g., `Smart Buyer`)
   - **Max Per Ticket**: Max spend per ticket (0.5 SOL)
   - **Total Budget**: Total agent budget (1-10 SOL)
   - **Auto-Purchase**: Enable automatic purchasing
4. Click **"CREATE"**
5. **ACTIVATE** the agent (status: Inactive → Active)

### Step 3: Browse & Buy Tickets

#### Direct Purchase (Your Wallet)
1. Go to **"MARKETPLACE"** tab
2. Browse events on sale
3. Click event card to see details
4. Select ticket tier
5. Click **"BUY NOW"**
6. Review transaction
7. Approve in wallet

#### Agent-Assisted Purchase
1. Go to **"MARKETPLACE"** tab
2. Click event card
3. Select ticket tier
4. Click **"BUY WITH AGENT"**
5. Choose agent from dropdown
6. Confirm transaction
7. Agent handles purchase automatically ✨

### Step 4: Resell Tickets
1. Go to **"MY TICKETS"** tab
2. Click ticket you want to resell
3. Click **"LIST FOR SALE"**
4. Set price (SOL)
5. Set listing duration (hours)
6. Click **"LIST"**

---

## 💡 Advanced Features

### Agent Management
- **Add Budget**: Increase total agent budget
- **Toggle Auto-Purchase**: Enable/disable automatic buying
- **Activate/Deactivate**: Control agent status
- **View Stats**: Monitor tickets purchased and spending
- **Real-time Updates**: Live agent account monitoring

### Event Organization
- **Create Events**: Set up new events with custom details
- **Manage Tiers**: Create multiple ticket categories
- **Track Revenue**: Monitor ticket sales and earnings
- **Cancel Events**: Remove events from marketplace

### Secondary Market
- **Price Discovery**: See market rates for tickets
- **Listing Management**: View all active listings
- **Seller Fees**: Automatic royalty distribution
- **Time Decay**: Listings expire after set duration

---

## 🔐 Security Features

### Smart Contract Security
- **PDA-based Accounts**: Secure account derivation
- **Owner Verification**: Auth checks on all privileged operations
- **Budget Enforcement**: Hard limits on agent spending
- **Tier Availability**: Stock management prevents overselling
- **Signature Verification**: Transaction signing required

### Frontend Security
- **Wallet Integration**: Uses standard Solana wallets
- **No Private Keys**: Keys never touch frontend
- **Environment Isolation**: RPC URL configuration
- **Error Handling**: Graceful failure with user feedback

---

## 🧪 Testing

### Manual Testing Checklist
```
[ ] Wallet Connection
    [ ] Connect Phantom
    [ ] Connect Backpack
    [ ] Disconnect & Reconnect

[ ] Agent Creation
    [ ] Create agent with valid inputs
    [ ] Activate agent
    [ ] Add budget to agent
    [ ] Toggle auto-purchase

[ ] Ticket Purchasing
    [ ] Buy with wallet (direct)
    [ ] Buy with agent (assisted)
    [ ] Verify ticket in My Tickets
    [ ] Check budget deduction

[ ] Secondary Market
    [ ] List ticket for sale
    [ ] View listings
    [ ] Cancel listing
    [ ] Purchase listed ticket

[ ] Edge Cases
    [ ] Insufficient balance
    [ ] Tier sold out
    [ ] Agent budget exceeded
    [ ] Invalid tier selection
```

---

## 📱 Responsive Design

PULSE UI works across all screen sizes:
- **Desktop**: Full Neobrutalist layout with multi-column grids
- **Tablet**: Optimized card layouts (2-column)
- **Mobile**: Stacked single-column with touch-friendly controls

---

## 🐛 Troubleshooting

### "Insufficient Agent Budget"
- Agent doesn't have enough budget for purchase
- **Solution**: Add more budget or reduce ticket price

### "Account Not Initialized"
- User account doesn't exist yet
- **Solution**: Auto-created on first purchase, or initialize manually

### "RPC Rate Limited (429)"
- Too many requests to Solana RPC
- **Solution**: RequestQueue throttles calls automatically (wait 30 seconds)

### "Transaction Failed"
- Check browser console for detailed error
- Verify wallet has SOL for transaction fees
- Ensure event is still active and tiers available

### "Wallet Not Connecting"
- Try different wallet provider
- Clear browser cache and retry
- Check that Solana wallet extension is installed

---

## 📞 Support

For issues, questions, or feedback:
1. Check this README first
2. Review browser console for error details
3. Verify Solana wallet connection
4. Check Solana Devnet status

---

## 📄 License

PULSE is an experimental project for educational purposes.

---

## 🌟 Features Roadmap

### Upcoming
- [ ] Event creator dashboard with analytics
- [ ] Agent performance metrics & historical tracking
- [ ] Multi-wallet agent support (share agents across wallets)
- [ ] Custom agent strategies (bid algorithms)
- [ ] Ticket verification QR codes
- [ ] Event notifications & alerts
- [ ] Social features (follow events, share tickets)
- [ ] Mainnet deployment

### Tech Improvements
- [ ] Migrate to mainnet (avoid rate limiting)
- [ ] Implement WebSocket subscriptions for real-time updates
- [ ] Add caching layer (Redis)
- [ ] GraphQL API for faster queries
- [ ] IPFS integration for event images

---

## 🎨 Design Credits

PULSE UI is inspired by **Neobrutalism** design philosophy:
- Bold typography and heavy use of borders
- High contrast black and white with neon accents
- Raw, unrefined aesthetic
- Functional and unapologetic design
- Strong geometric shapes and grids

---

<div align="center">

### ⚡ Built on Solana | Powered by Anchor | Styled with Neobrutalism

**PULSE** - Transform Ticket Transactions

[GitHub](#) • [Docs](#) • [Devnet](#)

</div>
