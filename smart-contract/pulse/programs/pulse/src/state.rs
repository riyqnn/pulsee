use anchor_lang::prelude::*;

/// =====================================
/// EVENT (Minimal - rest offchain in Supabase)
/// =====================================

#[account]
pub struct Event {
    pub organizer: Pubkey,
    pub event_id: String,              // max 50 chars
    pub organizer_fee_bps: u16,        // Fee on sales (basis points)
    pub total_tickets_sold: u64,
    pub total_revenue: u64,
    pub is_active: bool,
    pub created_at: i64,
    pub bump: u8,
}

impl Event {
    pub const SPACE: usize = 8   // discriminator
        + 32                      // organizer
        + 4 + 50                  // event_id (string)
        + 2                       // organizer_fee_bps
        + 8                       // total_tickets_sold
        + 8                       // total_revenue
        + 1                       // is_active
        + 8                       // created_at
        + 1;                      // bump
}

/// =====================================
/// TICKET TIER
/// =====================================

#[account]
pub struct TicketTier {
    pub event: Pubkey,
    pub tier_id: String,              // max 20 chars
    pub price: u64,
    pub max_supply: u64,
    pub current_supply: u64,
    pub is_active: bool,
    pub bump: u8,
}

impl TicketTier {
    pub const SPACE: usize = 8   // discriminator
        + 32                      // event
        + 4 + 20                  // tier_id (string)
        + 8                       // price
        + 8                       // max_supply
        + 8                       // current_supply
        + 1                       // is_active
        + 1;                      // bump
}

/// =====================================
/// AI AGENT (Simplified)
/// =====================================

#[account]
pub struct AIAgent {
    pub owner: Pubkey,
    pub agent_id: String,             // max 30 chars
    pub is_active: bool,
    pub auto_purchase_enabled: bool,  // Enable/disable auto-purchase
    pub auto_purchase_threshold: u16, // Price threshold (basis points, 10000 = 100%)

    // Budget
    pub max_budget_per_ticket: u64,
    pub total_budget: u64,
    pub spent_budget: u64,

    // Statistics
    pub tickets_purchased: u64,

    pub created_at: i64,
    pub bump: u8,
}

impl AIAgent {
    pub const SPACE: usize = 8   // discriminator
        + 32                      // owner
        + 4 + 30                  // agent_id (string)
        + 1                       // is_active
        + 1                       // auto_purchase_enabled
        + 2                       // auto_purchase_threshold
        + 8                       // max_budget_per_ticket
        + 8                       // total_budget
        + 8                       // spent_budget
        + 8                       // tickets_purchased
        + 8                       // created_at
        + 1;                      // bump
}

/// =====================================
/// AGENT ESCROW
/// =====================================

#[account]
pub struct AgentEscrow {
    pub agent: Pubkey,              // The AI agent this escrow belongs to
    pub owner: Pubkey,              // Agent owner (who can withdraw)
    pub balance: u64,               // Current escrow balance (lamports)
    pub total_deposited: u64,       // Total lifetime deposits
    pub total_withdrawn: u64,       // Total lifetime withdrawals
    pub total_spent: u64,           // Total spent on tickets
    pub created_at: i64,
    pub last_activity: i64,
    pub bump: u8,
}

impl AgentEscrow {
    pub const SPACE: usize = 8   // discriminator
        + 32                      // agent
        + 32                      // owner
        + 8                       // balance
        + 8                       // total_deposited
        + 8                       // total_withdrawn
        + 8                       // total_spent
        + 8                       // created_at
        + 8                       // last_activity
        + 1;                      // bump
}
