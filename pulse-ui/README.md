# PULSE – Autonomous AI Ticket Protocol

<div align="center">

**Neo-Brutalist Command & Control Interface for AI-Powered Ticket Acquisition on Solana**

[![Status](https://img.shields.io/badge/status-active-brightgreen?style=flat-square)]()
[![Solana](https://img.shields.io/badge/solana-devnet-9945FF?style=flat-square&logo=solana)]()
[![React](https://img.shields.io/badge/react-19.2-61DAFB?style=flat-square&logo=react)]()
[![TypeScript](https://img.shields.io/badge/typescript-5.9-3178C6?style=flat-square&logo=typescript)]()

</div>
5174
---

## Overview

PULSE is a Web3 ticket marketplace that puts **AI agents in control** of ticket acquisition. Users don't refresh Ticketmaster—they configure autonomous agents that analyze, match, and purchase tickets based on predefined preferences and budgets.

This is the **frontend interface** built with a distinctive **Neo-Brutalist** aesthetic.

## Design Philosophy

### Neo-Brutalism (Digital Utilitarian)

- **High Contrast**: White background (#FFFFFF), Acid Green (#00FF41), Cyber Pink (#FF00F5), Pure Black (#000000)
- **Hard Shadows**: No blur, solid 8px bottom-right offsets
- **Thick Borders**: 4px solid black borders everywhere
- **Typography**: Syne (display), JetBrains Mono (code)
- **Industrial Feel**: Toggle switches look like breaker panels, terminals show raw data

### What Makes It Unforgettable

The **Live Action Terminal** — a real-time log feed showing agents "thinking":

```
[14:32:01] AGENT_01: Analyzing LPR inventory...
[14:32:03] AGENT_01: Price Match Found (95%)
[14:32:05] AGENT_01: Executing Buy...
[14:32:07] AGENT_01: Ticket Purchased! Saved 2.5 SOL
```

## Features

### Agent Command Center
- **Agent Status Panel**: Real-time monitoring of all active agents
- **Live Activity Log**: Terminal-style feed of agent actions
- **Configuration Panel**: Set budgets, thresholds, and preference flags
- **Statistics Dashboard**: Track purchases, savings, and success rates

### On-Chain Marketplace
- **Event Discovery**: Browse ticket NFTs with metadata
- **Tier Selection**: Multiple ticket tiers per event
- **Sold Out Stamps**: Dramatic overlay for unavailable events
- **Real-Time Availability**: Live supply tracking

### Secondary Market
- **Dutch Auction**: Real-time price decay visualization
- **Countdown Timers**: Expiry clocks for each listing
- **Savings Calculator**: Show how much user saved vs. original price
- **Live Price Updates**: Prices update every second

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | React 19.2 + TypeScript 5.9 |
| **Build Tool** | Vite 7.3 |
| **Styling** | Tailwind CSS 4.2 |
| **Animation** | Framer Motion 12.34 |
| **Blockchain** | Solana Web3.js 1.98, Anchor 0.32 |
| **Wallet** | Solana Wallet Adapter |

## Project Structure

```
pulse-ui/
├── src/
│   ├── components/
│   │   ├── neo/              # Neo-brutalist UI kit
│   │   │   ├── NeoButton.tsx
│   │   │   ├── NeoCard.tsx
│   │   │   ├── NeoInput.tsx
│   │   │   ├── NeoToggle.tsx
│   │   │   └── NeoBadge.tsx
│   │   ├── agent/            # Agent Management
│   │   │   ├── AgentCommandCenter.tsx
│   │   │   ├── AgentSettings.tsx
│   │   │   └── LiveLog.tsx
│   │   ├── marketplace/      # TixProtocol Marketplace
│   │   │   ├── MarketplaceGrid.tsx
│   │   │   ├── EventCard.tsx
│   │   │   └── SecondaryMarket.tsx
│   │   ├── WalletProvider.tsx
│   │   └── WalletButton.tsx
│   ├── hooks/
│   │   └── useProgram.ts     # Solana program hooks
│   ├── styles/
│   │   └── index.css         # Global styles & CSS variables
│   ├── idl/                  # Anchor IDL (to be added)
│   └── main.tsx
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Solana CLI (for development)
- Phantom Wallet (or compatible Solana wallet)

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview
```

### Wallet Connection

1. Open the app at `http://localhost:5173`
2. Click "CONNECT WALLET" in the header
3. Select Phantom (or your preferred wallet)
4. Approve the connection request

### Configuration

Update the Solana RPC endpoint in `src/hooks/useProgram.ts`:

```typescript
const connection = useMemo(() => {
  // Devnet (for testing)
  return new Connection('https://api.devnet.solana.com', 'confirmed');

  // Mainnet (for production)
  // return new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
}, []);
```

## Smart Contract Integration

The frontend connects to the PULSE smart contract:

```
Program ID: 46AaMsoX9xU6Ydeohp5YgWnK7PT3b4hPiw8s7L3GsskH
```

To integrate the IDL:

1. Export the IDL from your Anchor program: `anchor idl build`
2. Copy the JSON to `src/idl/pulse.json`
3. Update `src/hooks/useProgram.ts` to load the IDL

## Design System

### Colors

| Name | Hex | Usage |
|------|-----|-------|
| Neo Green | `#00FF41` | Primary actions, success states |
| Neo Pink | `#FF00F5` | Accents, warnings, live indicators |
| Neo Black | `#000000` | Text, borders, shadows |
| Neo White | `#FFFFFF` | Backgrounds |
| Neo Gray | `#F5F5F5` | Subtle backgrounds |

### Components

All Neo-Brutalist components follow these patterns:
- 4px solid black borders
- 8px bottom-right hard shadow (no blur)
- No rounded corners (or minimal 2px)
- Pop-up effect on hover (`-translate-y-1 -translate-x-1`)

### Typography

```css
/* Display Headers */
font-family: 'Syne', sans-serif;
font-weight: 700, 800;

/* Mono / Code */
font-family: 'JetBrains Mono', monospace;
```

## License

MIT

---

**Built with** ❤️ **for the Solana ecosystem**
