use anchor_lang::prelude::*;

/// =====================================
/// EVENT (Minimal - rest offchain in Supabase)
/// =====================================

#[account]
pub struct Event {
    pub organizer: Pubkey,
    pub event_id: String,      // max 50
    pub name: String,          // max 100
    pub description: String,   // max 200
    pub image_url: String,     // max 200
    pub location: String,      // max 100
    pub event_start: i64,
    pub event_end: i64,
    pub sale_start: i64,
    pub sale_end: i64,
    pub max_tickets_per_user: u32,
    pub organizer_fee_bps: u16,
    pub total_tickets_sold: u64,
    pub total_revenue: u64,
    pub is_active: bool,
    pub created_at: i64,
    pub bump: u8,
}

impl Event {
    pub const SPACE: usize = 8   // discriminator
        + 32                      // organizer (Pubkey)
        + (4 + 50)                // event_id string
        + (4 + 100)               // name string
        + (4 + 500)               // description string (kasih lebih lebar)
        + (4 + 200)               // image_url string
        + (4 + 100)               // location string
        + 8                       // event_start (i64)
        + 8                       // event_end (i64)
        + 8                       // sale_start (i64)
        + 8                       // sale_end (i64)
        + 4                       // max_tickets_per_user (u32)
        + 2                       // organizer_fee_bps (u16)
        + 8                       // total_tickets_sold (u64)
        + 8                       // total_revenue (u64)
        + 1                       // is_active (bool)
        + 8                       // created_at (i64)
        + 1;                      // bump
}

/// =====================================
/// TICKET TIER
/// =====================================

#[account]
pub struct TicketTier {
    pub event: Pubkey,
    pub tier_id: String,
    pub name: String,        
    pub description: String, 
    pub price: u64,
    pub max_supply: u64,
    pub current_supply: u64,
    pub is_active: bool,
    pub bump: u8,
}

impl TicketTier {
    pub const SPACE: usize = 8 + 32 + (4 + 20) + (4 + 50) + (4 + 100) + 8 + 8 + 8 + 1 + 1;
}

/// =====================================
/// AI AGENT (Simplified)
/// =====================================

#[account]
pub struct AIAgent {
    pub owner: Pubkey,
    pub agent_id: String,
    pub name: String,                
    pub is_active: bool,
    pub auto_purchase_enabled: bool,
    pub auto_purchase_threshold: u16,
    pub max_budget_per_ticket: u64,
    pub total_budget: u64,
    pub spent_budget: u64,
    pub max_tickets_per_event: u32,  
    pub tickets_purchased: u64,
    pub created_at: i64,
    pub bump: u8,
}

impl AIAgent {
    pub const SPACE: usize = 8 + 32 + (4 + 30) + (4 + 50) + 1 + 1 + 2 + 8 + 8 + 8 + 4 + 8 + 8 + 1;
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
