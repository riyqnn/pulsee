use anchor_lang::prelude::*;

/// =====================================
/// GLOBAL CONFIGURATION
/// =====================================

#[account]
pub struct GlobalConfig {
    pub admin: Pubkey,
    pub protocol_fee_bps: u16,          // Protocol fee on secondary sales
    pub default_price_cap_bps: u16,     // Default max price increase (anti-scalping)
    pub min_listing_duration: i64,      // Minimum listing duration (seconds)
    pub max_listing_duration: i64,      // Maximum listing duration (seconds)
    pub allow_agent_coordination: bool, // Feature flag
    pub require_verification: bool,     // KYC requirement flag
    pub treasury: Pubkey,               // Protocol treasury for fee collection
    pub bump: u8,
}

impl GlobalConfig {
    pub const SPACE: usize = 8   // discriminator
        + 32                      // admin
        + 2                       // protocol_fee_bps
        + 2                       // default_price_cap_bps
        + 8                       // min_listing_duration
        + 8                       // max_listing_duration
        + 1                       // allow_agent_coordination
        + 1                       // require_verification
        + 32                      // treasury
        + 1;                      // bump
}

/// =====================================
/// EVENT
/// =====================================

#[account]
pub struct Event {
    pub organizer: Pubkey,
    pub event_id: String,              // max 50 chars
    pub name: String,                  // max 100 chars
    pub description: String,           // max 200 chars
    pub image_url: String,             // max 100 chars
    pub venue: String,                 // max 100 chars
    pub event_start_time: i64,
    pub event_end_time: i64,
    pub sale_start_time: i64,
    pub sale_end_time: i64,
    pub is_active: bool,
    pub is_cancelled: bool,
    pub max_tickets_per_user: u32,
    pub royalty_bps: u16,              // Secondary market royalty for organizer
    pub total_tickets_sold: u64,
    pub total_revenue: u64,
    pub bump: u8,
}

impl Event {
    pub const SPACE: usize = 8   // discriminator
        + 32                      // organizer
        + 4 + 50                  // event_id (string)
        + 4 + 100                 // name (string)
        + 4 + 200                 // description (string)
        + 4 + 100                 // image_url (string)
        + 4 + 100                 // venue (string)
        + 8                       // event_start_time
        + 8                       // event_end_time
        + 8                       // sale_start_time
        + 8                       // sale_end_time
        + 1                       // is_active
        + 1                       // is_cancelled
        + 4                       // max_tickets_per_user
        + 2                       // royalty_bps
        + 8                       // total_tickets_sold
        + 8                       // total_revenue
        + 1;                      // bump
}

/// =====================================
/// TICKET TIER
/// =====================================

#[account]
pub struct TicketTier {
    pub event: Pubkey,
    pub tier_id: String,              // max 20 chars
    pub name: String,                  // max 50 chars
    pub description: String,           // max 100 chars
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
        + 4 + 50                  // name (string)
        + 4 + 100                 // description (string)
        + 8                       // price
        + 8                       // max_supply
        + 8                       // current_supply
        + 1                       // is_active
        + 1;                      // bump
}

/// =====================================
/// USER PROFILE
/// =====================================

#[account]
pub struct User {
    pub owner: Pubkey,
    pub username: String,             // max 30 chars
    pub email: String,                 // max 100 chars
    pub tickets_owned: u64,
    pub total_spent: u64,
    pub tickets_purchased: u64,
    pub is_verified: bool,
    pub bump: u8,
}

impl User {
    pub const SPACE: usize = 8   // discriminator
        + 32                      // owner
        + 4 + 30                  // username (string)
        + 4 + 100                 // email (string)
        + 8                       // tickets_owned
        + 8                       // total_spent
        + 8                       // tickets_purchased
        + 1                       // is_verified
        + 1;                      // bump
}

/// =====================================
/// AI AGENT
/// =====================================

#[account]
pub struct AIAgent {
    pub owner: Pubkey,
    pub agent_id: String,             // max 30 chars
    pub name: String,                 // max 50 chars
    pub is_active: bool,

    // Budget
    pub max_budget_per_ticket: u64,
    pub total_budget: u64,
    pub spent_budget: u64,

    // Preferences (bitflags for efficiency)
    pub preference_flags: u64,        // Category, amenities, budget strategy
    pub preferred_genres: [u8; 10],   // Music genre IDs
    pub preferred_venues: [Pubkey; 5],// Favorite venues (default to [Pubkey::default(); 5])
    pub min_event_duration: u32,
    pub max_event_duration: u32,

    // Location
    pub allowed_locations: [Pubkey; 5],
    pub max_distance: u32,            // km

    // Time preferences
    pub preferred_days: u8,           // Bitflag: Mon=1, Tue=2, Wed=4, etc.
    pub preferred_time_start: u32,    // Minutes from midnight (0-1439)
    pub preferred_time_end: u32,

    // Auto-purchase
    pub auto_purchase_enabled: bool,
    pub auto_purchase_threshold: u16, // Buy if price below X% of market
    pub max_tickets_per_event: u8,
    pub require_verification: bool,

    // Coordination
    pub allow_agent_coordination: bool,
    pub coordination_group_id: Option<String>, // max 30 chars

    // Statistics
    pub tickets_purchased: u64,
    pub money_saved: u64,

    pub created_at: i64,
    pub last_active: i64,
    pub bump: u8,
}

impl AIAgent {
    pub const SPACE: usize = 8   // discriminator
        + 32                      // owner
        + 4 + 30                  // agent_id (string)
        + 4 + 50                  // name (string)
        + 1                       // is_active
        + 8                       // max_budget_per_ticket
        + 8                       // total_budget
        + 8                       // spent_budget
        + 8                       // preference_flags
        + 10                      // preferred_genres (10 bytes)
        + 160                     // preferred_venues (5 * 32)
        + 4                       // min_event_duration
        + 4                       // max_event_duration
        + 160                     // allowed_locations (5 * 32)
        + 4                       // max_distance
        + 1                       // preferred_days (bitflag)
        + 4                       // preferred_time_start
        + 4                       // preferred_time_end
        + 1                       // auto_purchase_enabled
        + 2                       // auto_purchase_threshold
        + 1                       // max_tickets_per_event
        + 1                       // require_verification
        + 1                       // allow_agent_coordination
        + (4 + 30)                // coordination_group_id (Option<String>)
        + 8                       // tickets_purchased
        + 8                       // money_saved
        + 8                       // created_at
        + 8                       // last_active
        + 1;                      // bump
}

/// =====================================
/// TICKET NFT (On-Chain Metadata)
/// =====================================

#[account]
pub struct Ticket {
    pub mint: Pubkey,
    pub event: Pubkey,
    pub tier_id: String,              // max 20 chars
    pub owner: Pubkey,
    pub original_price: u64,
    pub status: TicketStatus,
    pub purchased_at: i64,
    pub validated_at: Option<i64>,
    pub seat_info: Option<String>,     // max 50 chars (e.g., "Section A, Row 5, Seat 12")
    pub bump: u8,
}

impl Ticket {
    pub const SPACE: usize = 8   // discriminator
        + 32                      // mint
        + 32                      // event
        + 4 + 20                  // tier_id (string)
        + 32                      // owner
        + 8                       // original_price
        + 1                       // status (enum)
        + 8                       // purchased_at
        + (1 + 8)                 // validated_at (Option<i64>)
        + (1 + 50)                // seat_info (Option<String>)
        + 1;                      // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum TicketStatus {
    Active,     // Ticket can be used and sold
    Consumed,   // Ticket scanned at venue (cannot be used/sold)
    Cancelled,  // Ticket cancelled by admin
}

/// =====================================
/// MARKET LISTING (Secondary Market)
/// =====================================

#[account]
pub struct MarketListing {
    pub listing_id: String,           // max 30 chars
    pub seller: Pubkey,
    pub ticket_mint: Pubkey,
    pub event: Pubkey,
    pub tier_id: String,              // max 20 chars

    // Pricing
    pub list_price: u64,
    pub minimum_offer: u64,
    pub accept_offers: bool,

    // Dynamic pricing
    pub original_purchase_price: u64,
    pub price_adjustment_rate: u16,   // Basis points per hour (Dutch)
    pub last_price_adjustment: i64,
    pub min_price: u64,               // Anti-scalping floor
    pub max_price: u64,               // Anti-scalping ceiling

    // Status
    pub is_active: bool,
    pub sale_type: SaleType,
    pub created_at: i64,
    pub expires_at: i64,

    // Statistics
    pub view_count: u32,
    pub offer_count: u32,

    pub bump: u8,
}

impl MarketListing {
    pub const SPACE: usize = 8   // discriminator
        + 4 + 30                  // listing_id (string)
        + 32                      // seller
        + 32                      // ticket_mint
        + 32                      // event
        + 4 + 20                  // tier_id (string)
        + 8                       // list_price
        + 8                       // minimum_offer
        + 1                       // accept_offers
        + 8                       // original_purchase_price
        + 2                       // price_adjustment_rate
        + 8                       // last_price_adjustment
        + 8                       // min_price
        + 8                       // max_price
        + 1                       // is_active
        + 1                       // sale_type (enum)
        + 8                       // created_at
        + 8                       // expires_at
        + 4                       // view_count
        + 4                       // offer_count
        + 1;                      // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum SaleType {
    Fixed,      // Fixed price purchase
    Auction,    // Buyers make offers, seller accepts
    Dutch,      // Price declines over time
}

/// =====================================
/// AUCTION OFFER
/// =====================================

#[account]
pub struct Offer {
    pub listing: Pubkey,
    pub buyer: Pubkey,
    pub offer_amount: u64,
    pub created_at: i64,
    pub expires_at: i64,
    pub is_active: bool,
    pub bump: u8,
}

impl Offer {
    pub const SPACE: usize = 8   // discriminator
        + 32                      // listing
        + 32                      // buyer
        + 8                       // offer_amount
        + 8                       // created_at
        + 8                       // expires_at
        + 1                       // is_active
        + 1;                      // bump
}

/// =====================================
/// AGENT COORDINATION
/// =====================================

#[account]
pub struct AgentCoordination {
    pub group_id: String,             // max 30 chars
    pub coordinator: Pubkey,
    pub event: Pubkey,
    pub tier_id: String,              // max 20 chars
    pub target_ticket_count: u32,
    pub current_ticket_count: u32,
    pub max_budget_per_ticket: u64,
    pub total_budget_committed: u64,
    pub participants: Vec<Pubkey>,    // Agents participating
    pub expires_at: i64,
    pub is_active: bool,
    pub is_completed: bool,
    pub bump: u8,
}

impl AgentCoordination {
    pub const MAX_PARTICIPANTS: usize = 10;
    pub const SPACE: usize = 8   // discriminator
        + 4 + 30                  // group_id (string)
        + 32                      // coordinator
        + 32                      // event
        + 4 + 20                  // tier_id (string)
        + 4                       // target_ticket_count
        + 4                       // current_ticket_count
        + 8                       // max_budget_per_ticket
        + 8                       // total_budget_committed
        + 4 + (32 * Self::MAX_PARTICIPANTS)  // participants (Vec<Pubkey>)
        + 8                       // expires_at
        + 1                       // is_active
        + 1                       // is_completed
        + 1;                      // bump
}

/// =====================================
/// USER EVENT TICKET COUNT (for anti-scalping)
/// =====================================

#[account]
pub struct UserTicketCounter {
    pub user: Pubkey,
    pub event: Pubkey,
    pub ticket_count: u32,
    pub bump: u8,
}

impl UserTicketCounter {
    pub const SPACE: usize = 8   // discriminator
        + 32                      // user
        + 32                      // event
        + 4                       // ticket_count
        + 1;                      // bump
}
