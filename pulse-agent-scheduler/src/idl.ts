// Simplified IDL for the PULSE program (matches the new MVP contract)
export const IDL = {
  "version": "0.1.0",
  "name": "pulse",
  "instructions": [
    {
      "name": "buyTicketWithEscrow",
      "accounts": [
        { "name": "event", "isMut": true, "isSigner": false },
        { "name": "tier", "isMut": true, "isSigner": false },
        { "name": "agent", "isMut": true, "isSigner": false },
        { "name": "escrow", "isMut": true, "isSigner": false },
        { "name": "organizer", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "tierId", "type": "string" }
      ]
    }
  ],
  "accounts": [
    {
      "name": "Event",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "organizer", "type": "publicKey" },
          { "name": "eventId", "type": "string" },
          { "name": "organizerFeeBps", "type": "u16" },
          { "name": "totalTicketsSold", "type": "u64" },
          { "name": "totalRevenue", "type": "u64" },
          { "name": "isActive", "type": "bool" },
          { "name": "createdAt", "type": "i64" },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "TicketTier",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "event", "type": "publicKey" },
          { "name": "tierId", "type": "string" },
          { "name": "price", "type": "u64" },
          { "name": "maxSupply", "type": "u64" },
          { "name": "currentSupply", "type": "u64" },
          { "name": "isActive", "type": "bool" },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "AIAgent",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "owner", "type": "publicKey" },
          { "name": "agentId", "type": "string" },
          { "name": "isActive", "type": "bool" },
          { "name": "maxBudgetPerTicket", "type": "u64" },
          { "name": "totalBudget", "type": "u64" },
          { "name": "spentBudget", "type": "u64" },
          { "name": "ticketsPurchased", "type": "u64" },
          { "name": "createdAt", "type": "i64" },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "AgentEscrow",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "agent", "type": "publicKey" },
          { "name": "owner", "type": "publicKey" },
          { "name": "balance", "type": "u64" },
          { "name": "totalDeposited", "type": "u64" },
          { "name": "totalWithdrawn", "type": "u64" },
          { "name": "totalSpent", "type": "u64" },
          { "name": "createdAt", "type": "i64" },
          { "name": "lastActivity", "type": "i64" },
          { "name": "bump", "type": "u8" }
        ]
      }
    }
  ]
} as const;
