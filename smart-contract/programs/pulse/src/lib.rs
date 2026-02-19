use anchor_lang::prelude::*;

declare_id!("46AaMsoX9xU6Ydeohp5YgWnK7PT3b4hPiw8s7L3GsskH");

#[program]
pub mod pulse {
    use super::*;

    /// =====================================
    /// ADMIN INSTRUCTIONS
    /// =====================================

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        protocol_fee_bps: u16,
        default_price_cap_bps: u16,
        min_listing_duration: i64,
        max_listing_duration: i64,
        allow_agent_coordination: bool,
        require_verification: bool,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;

        require!(protocol_fee_bps <= 10000, TixError::InvalidRoyaltyBps);
        require!(default_price_cap_bps <= 10000, TixError::InvalidRoyaltyBps);
        require!(min_listing_duration > 0, TixError::InvalidEventTiming);
        require!(max_listing_duration > min_listing_duration, TixError::InvalidEventTiming);

        config.admin = ctx.accounts.admin.key();
        config.protocol_fee_bps = protocol_fee_bps;
        config.default_price_cap_bps = default_price_cap_bps;
        config.min_listing_duration = min_listing_duration;
        config.max_listing_duration = max_listing_duration;
        config.allow_agent_coordination = allow_agent_coordination;
        config.require_verification = require_verification;
        config.treasury = ctx.accounts.admin.key();
        config.bump = ctx.bumps.config;

        msg!("Global config initialized");
        Ok(())
    }

    /// =====================================
    /// EVENT INSTRUCTIONS
    /// =====================================

    pub fn create_event(
        ctx: Context<CreateEvent>,
        event_id: String,
        name: String,
        description: String,
        image_url: String,
        venue: String,
        event_start_time: i64,
        event_end_time: i64,
        sale_start_time: i64,
        sale_end_time: i64,
        max_tickets_per_user: u32,
        royalty_bps: u16,
    ) -> Result<()> {
        let event = &mut ctx.accounts.event;

        // Validate inputs
        require!(event_id.len() <= 50, TixError::InvalidEventTiming);
        require!(name.len() <= 100, TixError::InvalidEventTiming);
        require!(description.len() <= 200, TixError::InvalidEventTiming);
        require!(image_url.len() <= 100, TixError::InvalidEventTiming);
        require!(venue.len() <= 100, TixError::InvalidEventTiming);
        require!(max_tickets_per_user > 0, TixError::InvalidEventTiming);
        require!(event_start_time > 0, TixError::InvalidEventTiming);
        require!(event_end_time > event_start_time, TixError::InvalidEventTiming);
        require!(sale_start_time > 0, TixError::InvalidEventTiming);
        require!(sale_end_time > sale_start_time, TixError::InvalidEventTiming);
        require!(sale_end_time < event_start_time, TixError::InvalidEventTiming);
        require!(royalty_bps <= 10000, TixError::InvalidRoyaltyBps);

        event.organizer = ctx.accounts.organizer.key();
        event.event_id = event_id;
        event.name = name;
        event.description = description;
        event.image_url = image_url;
        event.venue = venue;
        event.event_start_time = event_start_time;
        event.event_end_time = event_end_time;
        event.sale_start_time = sale_start_time;
        event.sale_end_time = sale_end_time;
        event.is_active = true;
        event.is_cancelled = false;
        event.max_tickets_per_user = max_tickets_per_user;
        event.royalty_bps = royalty_bps;
        event.total_tickets_sold = 0;
        event.total_revenue = 0;
        event.bump = ctx.bumps.event;

        msg!("Event created: {} ({})", event.name, event.event_id);
        Ok(())
    }

    /// =====================================
    /// TICKET TIER INSTRUCTIONS
    /// =====================================

    pub fn create_ticket_tier(
        ctx: Context<CreateTicketTier>,
        tier_id: String,
        name: String,
        description: String,
        price: u64,
        max_supply: u64,
    ) -> Result<()> {
        let tier = &mut ctx.accounts.tier;
        let event = &ctx.accounts.event;

        // Validate inputs
        require!(tier_id.len() <= 20, TixError::InvalidEventTiming);
        require!(name.len() <= 50, TixError::InvalidEventTiming);
        require!(description.len() <= 100, TixError::InvalidEventTiming);
        require!(price > 0, TixError::InvalidTierPrice);
        require!(max_supply > 0, TixError::InvalidTierPrice);
        require!(event.is_active, TixError::EventNotActive);

        tier.event = ctx.accounts.event.key();
        tier.tier_id = tier_id.clone();
        tier.name = name;
        tier.description = description;
        tier.price = price;
        tier.max_supply = max_supply;
        tier.current_supply = 0;
        tier.is_active = true;
        tier.bump = ctx.bumps.tier;

        msg!("Ticket tier created: {} ({})", tier.name, tier.tier_id);
        Ok(())
    }

    /// =====================================
    /// USER INSTRUCTIONS
    /// =====================================

    pub fn create_user(
        ctx: Context<CreateUser>,
        username: String,
        email: String,
    ) -> Result<()> {
        let user = &mut ctx.accounts.user;

        require!(username.len() <= 30, TixError::InvalidEventTiming);
        require!(email.len() <= 100, TixError::InvalidEventTiming);

        user.owner = ctx.accounts.owner.key();
        user.username = username;
        user.email = email;
        user.tickets_owned = 0;
        user.total_spent = 0;
        user.tickets_purchased = 0;
        user.is_verified = false;
        user.bump = ctx.bumps.user;

        msg!("User created: {}", user.username);
        Ok(())
    }

    /// =====================================
    /// AI AGENT INSTRUCTIONS
    /// =====================================

    pub fn create_ai_agent(
        ctx: Context<CreateAIAgent>,
        agent_id: String,
        name: String,
        max_budget_per_ticket: u64,
        total_budget: u64,
        auto_purchase_enabled: bool,
        auto_purchase_threshold: u16,
        max_tickets_per_event: u8,
    ) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        let clock = Clock::get()?;

        require!(agent_id.len() <= 30, TixError::InvalidEventTiming);
        require!(name.len() <= 50, TixError::InvalidEventTiming);
        require!(max_budget_per_ticket > 0, TixError::InsufficientAgentBudget);
        require!(total_budget > 0, TixError::InsufficientAgentBudget);
        require!(auto_purchase_threshold <= 10000, TixError::InvalidRoyaltyBps);

        agent.owner = ctx.accounts.owner.key();
        agent.agent_id = agent_id;
        agent.name = name;
        agent.is_active = true;
        agent.max_budget_per_ticket = max_budget_per_ticket;
        agent.total_budget = total_budget;
        agent.spent_budget = 0;
        agent.preference_flags = 0;
        agent.preferred_genres = [0; 10];
        agent.preferred_venues = [Pubkey::default(); 5];
        agent.min_event_duration = 0;
        agent.max_event_duration = 86400;
        agent.allowed_locations = [Pubkey::default(); 5];
        agent.max_distance = 100;
        agent.preferred_days = 127; // All days
        agent.preferred_time_start = 0;
        agent.preferred_time_end = 1439;
        agent.auto_purchase_enabled = auto_purchase_enabled;
        agent.auto_purchase_threshold = auto_purchase_threshold;
        agent.max_tickets_per_event = max_tickets_per_event;
        agent.require_verification = false;
        agent.allow_agent_coordination = false;
        agent.coordination_group_id = None;
        agent.tickets_purchased = 0;
        agent.money_saved = 0;
        agent.created_at = clock.unix_timestamp;
        agent.last_active = clock.unix_timestamp;
        agent.bump = ctx.bumps.agent;

        msg!("AI Agent created: {} ({})", agent.name, agent.agent_id);
        Ok(())
    }

    /// =====================================
    /// PRIMARY MARKET INSTRUCTIONS
    /// =====================================

    pub fn buy_ticket(
        ctx: Context<BuyTicket>,
        tier_id: String,
    ) -> Result<()> {
        let event = &mut ctx.accounts.event;
        let tier = &mut ctx.accounts.tier;
        let user = &mut ctx.accounts.user;
        let clock = Clock::get()?;

        // Validate event and tier
        require!(event.is_active, TixError::EventNotActive);
        require!(!event.is_cancelled, TixError::EventAlreadyCancelled);
        require!(clock.unix_timestamp >= event.sale_start_time, TixError::EventNotActive);
        require!(clock.unix_timestamp <= event.sale_end_time, TixError::EventNotActive);
        require!(tier.is_active, TixError::TierNotActive);
        require!(tier.current_supply < tier.max_supply, TixError::TierSoldOut);

        let price = tier.price;

        // Transfer payment
        **ctx.accounts.buyer.to_account_info().try_borrow_mut_lamports()? -= price;
        **ctx.accounts.organizer.to_account_info().try_borrow_mut_lamports()? += price;

        // Update tier supply
        tier.current_supply += 1;

        // Update event stats
        event.total_tickets_sold += 1;
        event.total_revenue += price;

        // Update user stats
        user.tickets_owned += 1;
        user.total_spent += price;
        user.tickets_purchased += 1;

        msg!("Ticket purchased for event: {}, tier: {}, price: {}", event.event_id, tier_id, price);
        Ok(())
    }

    /// =====================================
    /// SECONDARY MARKET INSTRUCTIONS
    /// =====================================

    pub fn list_ticket_for_sale(
        ctx: Context<ListTicketForSale>,
        listing_id: String,
        list_price: u64,
        duration: i64,
    ) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        let ticket = &ctx.accounts.ticket;
        let event = &ctx.accounts.event;
        let config = &ctx.accounts.config;
        let clock = Clock::get()?;

        require!(ticket.status == TicketStatus::Active, TixError::TicketConsumed);
        require!(listing_id.len() <= 30, TixError::InvalidEventTiming);
        require!(list_price > 0, TixError::InvalidPrice);
        require!(duration >= config.min_listing_duration, TixError::InvalidPrice);
        require!(duration <= config.max_listing_duration, TixError::InvalidPrice);

        // Cannot list after event has started
        require!(
            clock.unix_timestamp < event.event_start_time,
            TixError::CannotListAfterEventStart
        );

        // Validate price cap
        let max_price = ticket.original_price
            .checked_mul(10000_u16.checked_add(config.default_price_cap_bps).ok_or(TixError::MathOverflow)? as u64)
            .ok_or(TixError::MathOverflow)?
            .checked_div(10000)
            .ok_or(TixError::MathOverflow)?;
        require!(list_price <= max_price, TixError::PriceCapExceeded);

        let expires_at = clock.unix_timestamp.checked_add(duration).ok_or(TixError::MathOverflow)?;

        listing.listing_id = listing_id;
        listing.seller = ctx.accounts.seller.key();
        listing.ticket_mint = ticket.mint;
        listing.event = event.key();
        listing.tier_id = ticket.tier_id.clone();
        listing.list_price = list_price;
        listing.minimum_offer = 0;
        listing.accept_offers = false;
        listing.original_purchase_price = ticket.original_price;
        listing.price_adjustment_rate = 0;
        listing.last_price_adjustment = clock.unix_timestamp;
        listing.min_price = 0;
        listing.max_price = max_price;
        listing.is_active = true;
        listing.sale_type = SaleType::Fixed;
        listing.created_at = clock.unix_timestamp;
        listing.expires_at = expires_at;
        listing.view_count = 0;
        listing.offer_count = 0;
        listing.bump = ctx.bumps.listing;

        msg!("Ticket listed for sale: {} at {} lamports", listing.listing_id, list_price);
        Ok(())
    }

    pub fn buy_listed_ticket(ctx: Context<BuyListedTicket>) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        let config = &ctx.accounts.config;
        let event = &ctx.accounts.event;
        let clock = Clock::get()?;

        require!(listing.is_active, TixError::ListingExpired);
        require!(clock.unix_timestamp <= listing.expires_at, TixError::ListingExpired);

        let sale_price = listing.list_price;

        // Calculate royalties
        let protocol_fee = sale_price
            .checked_mul(config.protocol_fee_bps as u64)
            .ok_or(TixError::MathOverflow)?
            .checked_div(10000)
            .ok_or(TixError::MathOverflow)?;
        let organizer_royalty = sale_price
            .checked_mul(event.royalty_bps as u64)
            .ok_or(TixError::MathOverflow)?
            .checked_div(10000)
            .ok_or(TixError::MathOverflow)?;
        let total_fees = protocol_fee.checked_add(organizer_royalty).ok_or(TixError::MathOverflow)?;
        let seller_payout = sale_price.checked_sub(total_fees).ok_or(TixError::MathUnderflow)?;

        // Transfer lamports
        **ctx.accounts.buyer.to_account_info().try_borrow_mut_lamports()? -= sale_price;
        **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += seller_payout;
        **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? += protocol_fee;
        **ctx.accounts.organizer.to_account_info().try_borrow_mut_lamports()? += organizer_royalty;

        // Update listing
        listing.is_active = false;

        msg!("Ticket sold: {} for {} lamports (seller: {}, fees: {})",
             listing.listing_id, sale_price, seller_payout, total_fees);
        Ok(())
    }
}

// =====================================
// STATE STRUCTS
// =====================================

#[account]
pub struct GlobalConfig {
    pub admin: Pubkey,
    pub protocol_fee_bps: u16,
    pub default_price_cap_bps: u16,
    pub min_listing_duration: i64,
    pub max_listing_duration: i64,
    pub allow_agent_coordination: bool,
    pub require_verification: bool,
    pub treasury: Pubkey,
    pub bump: u8,
}

impl GlobalConfig {
    pub const SPACE: usize = 8 + 32 + 2 + 2 + 8 + 8 + 1 + 1 + 32 + 1;
}

#[account]
pub struct Event {
    pub organizer: Pubkey,
    pub event_id: String,
    pub name: String,
    pub description: String,
    pub image_url: String,
    pub venue: String,
    pub event_start_time: i64,
    pub event_end_time: i64,
    pub sale_start_time: i64,
    pub sale_end_time: i64,
    pub is_active: bool,
    pub is_cancelled: bool,
    pub max_tickets_per_user: u32,
    pub royalty_bps: u16,
    pub total_tickets_sold: u64,
    pub total_revenue: u64,
    pub bump: u8,
}

impl Event {
    pub const SPACE: usize = 8 + 32 + 4 + 50 + 4 + 100 + 4 + 200 + 4 + 100 + 4 + 100 + 8 + 8 + 8 + 8 + 1 + 1 + 4 + 2 + 8 + 8 + 1;
}

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
    pub const SPACE: usize = 8 + 32 + 4 + 20 + 4 + 50 + 4 + 100 + 8 + 8 + 8 + 1 + 1;
}

#[account]
pub struct User {
    pub owner: Pubkey,
    pub username: String,
    pub email: String,
    pub tickets_owned: u64,
    pub total_spent: u64,
    pub tickets_purchased: u64,
    pub is_verified: bool,
    pub bump: u8,
}

impl User {
    pub const SPACE: usize = 8 + 32 + 4 + 30 + 4 + 100 + 8 + 8 + 8 + 1 + 1;
}

#[account]
pub struct AIAgent {
    pub owner: Pubkey,
    pub agent_id: String,
    pub name: String,
    pub is_active: bool,
    pub max_budget_per_ticket: u64,
    pub total_budget: u64,
    pub spent_budget: u64,
    pub preference_flags: u64,
    pub preferred_genres: [u8; 10],
    pub preferred_venues: [Pubkey; 5],
    pub min_event_duration: u32,
    pub max_event_duration: u32,
    pub allowed_locations: [Pubkey; 5],
    pub max_distance: u32,
    pub preferred_days: u8,
    pub preferred_time_start: u32,
    pub preferred_time_end: u32,
    pub auto_purchase_enabled: bool,
    pub auto_purchase_threshold: u16,
    pub max_tickets_per_event: u8,
    pub require_verification: bool,
    pub allow_agent_coordination: bool,
    pub coordination_group_id: Option<String>,
    pub tickets_purchased: u64,
    pub money_saved: u64,
    pub created_at: i64,
    pub last_active: i64,
    pub bump: u8,
}

impl AIAgent {
    pub const SPACE: usize = 8 + 32 + 4 + 30 + 4 + 50 + 1 + 8 + 8 + 8 + 8 + 10 + 160 + 4 + 4 + 160 + 4 + 1 + 4 + 4 + 1 + 2 + 1 + 1 + 1 + (4 + 30) + 8 + 8 + 8 + 8 + 1;
}

#[account]
pub struct Ticket {
    pub mint: Pubkey,
    pub event: Pubkey,
    pub tier_id: String,
    pub owner: Pubkey,
    pub original_price: u64,
    pub status: TicketStatus,
    pub purchased_at: i64,
    pub validated_at: Option<i64>,
    pub seat_info: Option<String>,
    pub bump: u8,
}

impl Ticket {
    pub const SPACE: usize = 8 + 32 + 32 + 4 + 20 + 32 + 8 + 1 + 8 + (1 + 8) + (1 + 50) + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum TicketStatus {
    Active,
    Consumed,
    Cancelled,
}

#[account]
pub struct MarketListing {
    pub listing_id: String,
    pub seller: Pubkey,
    pub ticket_mint: Pubkey,
    pub event: Pubkey,
    pub tier_id: String,
    pub list_price: u64,
    pub minimum_offer: u64,
    pub accept_offers: bool,
    pub original_purchase_price: u64,
    pub price_adjustment_rate: u16,
    pub last_price_adjustment: i64,
    pub min_price: u64,
    pub max_price: u64,
    pub is_active: bool,
    pub sale_type: SaleType,
    pub created_at: i64,
    pub expires_at: i64,
    pub view_count: u32,
    pub offer_count: u32,
    pub bump: u8,
}

impl MarketListing {
    pub const SPACE: usize = 8 + 4 + 30 + 32 + 32 + 32 + 4 + 20 + 8 + 8 + 1 + 8 + 2 + 8 + 8 + 8 + 1 + 1 + 8 + 8 + 4 + 4 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum SaleType {
    Fixed,
    Auction,
    Dutch,
}

// =====================================
// CONTEXTS
// =====================================

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        seeds = [b"config"],
        bump,
        payer = admin,
        space = GlobalConfig::SPACE
    )]
    pub config: Account<'info, GlobalConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(event_id: String)]
pub struct CreateEvent<'info> {
    #[account(
        init,
        seeds = [
            b"event",
            organizer.key().as_ref(),
            event_id.as_bytes()
        ],
        bump,
        payer = organizer,
        space = Event::SPACE
    )]
    pub event: Account<'info, Event>,
    #[account(mut)]
    pub organizer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(tier_id: String)]
pub struct CreateTicketTier<'info> {
    #[account(
        constraint = event.is_active @ TixError::EventNotActive
    )]
    pub event: Account<'info, Event>,
    #[account(
        init,
        seeds = [
            b"tier",
            event.key().as_ref(),
            tier_id.as_bytes()
        ],
        bump,
        payer = organizer,
        space = TicketTier::SPACE
    )]
    pub tier: Account<'info, TicketTier>,
    #[account(
        mut,
        constraint = organizer.key() == event.organizer @ TixError::InvalidAuthority
    )]
    pub organizer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateUser<'info> {
    #[account(
        init,
        seeds = [b"user", owner.key().as_ref()],
        bump,
        payer = owner,
        space = User::SPACE
    )]
    pub user: Account<'info, User>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(agent_id: String)]
pub struct CreateAIAgent<'info> {
    #[account(
        init,
        seeds = [
            b"agent",
            owner.key().as_ref(),
            agent_id.as_bytes()
        ],
        bump,
        payer = owner,
        space = AIAgent::SPACE
    )]
    pub agent: Account<'info, AIAgent>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(tier_id: String)]
pub struct BuyTicket<'info> {
    #[account(mut)]
    pub event: Account<'info, Event>,
    #[account(
        mut,
        seeds = [
            b"tier",
            event.key().as_ref(),
            tier_id.as_bytes()
        ],
        bump = tier.bump
    )]
    pub tier: Account<'info, TicketTier>,
    #[account(
        mut,
        seeds = [b"user", buyer.key().as_ref()],
        bump = user.bump
    )]
    pub user: Account<'info, User>,
    /// CHECK: Organizer wallet
    #[account(
        mut,
        constraint = organizer.key() == event.organizer
    )]
    pub organizer: UncheckedAccount<'info>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(listing_id: String)]
pub struct ListTicketForSale<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, GlobalConfig>,
    pub event: Account<'info, Event>,
    #[account(
        constraint = ticket.status == TicketStatus::Active
    )]
    pub ticket: Account<'info, Ticket>,
    #[account(
        init,
        seeds = [
            b"listing",
            ticket.mint.as_ref(),
            listing_id.as_bytes()
        ],
        bump,
        payer = seller,
        space = MarketListing::SPACE
    )]
    pub listing: Account<'info, MarketListing>,
    #[account(mut)]
    pub seller: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyListedTicket<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, GlobalConfig>,
    pub event: Account<'info, Event>,
    #[account(
        mut,
        seeds = [
            b"listing",
            listing.ticket_mint.as_ref(),
            listing.listing_id.as_bytes()
        ],
        bump = listing.bump
    )]
    pub listing: Account<'info, MarketListing>,
    #[account(
        mut,
        constraint = seller.key() == listing.seller
    )]
    /// CHECK: Seller's wallet
    pub seller: UncheckedAccount<'info>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: Treasury wallet
    #[account(
        mut,
        constraint = treasury.key() == config.treasury
    )]
    pub treasury: UncheckedAccount<'info>,
    /// CHECK: Organizer wallet
    #[account(
        mut,
        constraint = organizer.key() == event.organizer
    )]
    pub organizer: UncheckedAccount<'info>,
}

// =====================================
// ERRORS
// =====================================

#[error_code]
pub enum TixError {
    #[msg("Invalid authority - not the admin")]
    InvalidAuthority,
    #[msg("Invalid event timing - sale end must be before event start")]
    InvalidEventTiming,
    #[msg("Event is already cancelled")]
    EventAlreadyCancelled,
    #[msg("Sale has already started - cannot modify")]
    SaleAlreadyStarted,
    #[msg("Invalid royalty basis points - must be 0-10000")]
    InvalidRoyaltyBps,
    #[msg("Event is not active")]
    EventNotActive,
    #[msg("Ticket tier not found")]
    TierNotFound,
    #[msg("Ticket tier is sold out")]
    TierSoldOut,
    #[msg("Invalid tier price")]
    InvalidTierPrice,
    #[msg("Tier is not active")]
    TierNotActive,
    #[msg("Maximum tickets per user exceeded")]
    MaxTicketsPerUserExceeded,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Agent is inactive")]
    AgentInactive,
    #[msg("Insufficient agent budget")]
    InsufficientAgentBudget,
    #[msg("Listing has expired")]
    ListingExpired,
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("Price exceeds maximum allowed")]
    PriceCapExceeded,
    #[msg("Cannot list after event has started")]
    CannotListAfterEventStart,
    #[msg("Ticket has been consumed and cannot be sold")]
    TicketConsumed,
    #[msg("Math operation overflow")]
    MathOverflow,
    #[msg("Math operation underflow")]
    MathUnderflow,
}
