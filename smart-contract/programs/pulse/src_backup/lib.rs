use anchor_lang::prelude::*;

pub mod error;
pub mod state;
pub mod constraints;
pub mod math;
pub mod instructions;

declare_id!("46AaMsoX9xU6Ydeohp5YgWnK7PT3b4hPiw8s7L3GsskH");

#[program]
pub mod pulse {
    use super::*;

    /// =====================================
    /// ADMIN INSTRUCTIONS
    /// =====================================

    pub fn initialize_config(
        ctx: Context<instructions::admin::InitializeConfig>,
        protocol_fee_bps: u16,
        default_price_cap_bps: u16,
        min_listing_duration: i64,
        max_listing_duration: i64,
        allow_agent_coordination: bool,
        require_verification: bool,
    ) -> Result<()> {
        instructions::admin::initialize_config(
            ctx,
            protocol_fee_bps,
            default_price_cap_bps,
            min_listing_duration,
            max_listing_duration,
            allow_agent_coordination,
            require_verification,
        )
    }

    pub fn update_config(
        ctx: Context<instructions::admin::UpdateConfig>,
        protocol_fee_bps: Option<u16>,
        default_price_cap_bps: Option<u16>,
        min_listing_duration: Option<i64>,
        max_listing_duration: Option<i64>,
        allow_agent_coordination: Option<bool>,
        require_verification: Option<bool>,
        treasury: Option<Pubkey>,
    ) -> Result<()> {
        instructions::admin::update_config(
            ctx,
            protocol_fee_bps,
            default_price_cap_bps,
            min_listing_duration,
            max_listing_duration,
            allow_agent_coordination,
            require_verification,
            treasury,
        )
    }

    /// =====================================
    /// EVENT INSTRUCTIONS
    /// =====================================

    pub fn create_event(
        ctx: Context<instructions::events::CreateEvent>,
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
        instructions::events::create_event(
            ctx,
            event_id,
            name,
            description,
            image_url,
            venue,
            event_start_time,
            event_end_time,
            sale_start_time,
            sale_end_time,
            max_tickets_per_user,
            royalty_bps,
        )
    }

    pub fn update_event(
        ctx: Context<instructions::events::UpdateEvent>,
        name: Option<String>,
        description: Option<String>,
        image_url: Option<String>,
        venue: Option<String>,
        event_start_time: Option<i64>,
        event_end_time: Option<i64>,
        sale_start_time: Option<i64>,
        sale_end_time: Option<i64>,
        max_tickets_per_user: Option<u32>,
        royalty_bps: Option<u16>,
    ) -> Result<()> {
        instructions::events::update_event(
            ctx,
            name,
            description,
            image_url,
            venue,
            event_start_time,
            event_end_time,
            sale_start_time,
            sale_end_time,
            max_tickets_per_user,
            royalty_bps,
        )
    }

    pub fn cancel_event(ctx: Context<instructions::events::CancelEvent>) -> Result<()> {
        instructions::events::cancel_event(ctx)
    }

    /// =====================================
    /// TICKET TIER INSTRUCTIONS
    /// =====================================

    pub fn create_ticket_tier(
        ctx: Context<instructions::tier::CreateTicketTier>,
        tier_id: String,
        name: String,
        description: String,
        price: u64,
        max_supply: u64,
    ) -> Result<()> {
        instructions::tier::create_ticket_tier(
            ctx,
            tier_id,
            name,
            description,
            price,
            max_supply,
        )
    }

    pub fn update_ticket_tier(
        ctx: Context<instructions::tier::UpdateTicketTier>,
        name: Option<String>,
        description: Option<String>,
        price: Option<u64>,
        max_supply: Option<u64>,
    ) -> Result<()> {
        instructions::tier::update_ticket_tier(
            ctx,
            name,
            description,
            price,
            max_supply,
        )
    }

    pub fn disable_tier(ctx: Context<instructions::tier::DisableTier>) -> Result<()> {
        instructions::tier::disable_tier(ctx)
    }

    /// =====================================
    /// USER INSTRUCTIONS
    /// =====================================

    pub fn create_user(
        ctx: Context<instructions::user::CreateUser>,
        username: String,
        email: String,
    ) -> Result<()> {
        instructions::user::create_user(ctx, username, email)
    }

    pub fn update_user_profile(
        ctx: Context<instructions::user::UpdateUserProfile>,
        username: Option<String>,
        email: Option<String>,
    ) -> Result<()> {
        instructions::user::update_user_profile(ctx, username, email)
    }

    /// =====================================
    /// AI AGENT INSTRUCTIONS
    /// =====================================

    pub fn create_ai_agent(
        ctx: Context<instructions::agent::CreateAIAgent>,
        agent_id: String,
        name: String,
        max_budget_per_ticket: u64,
        total_budget: u64,
        preference_flags: u64,
        preferred_genres: [u8; 10],
        preferred_venues: [Pubkey; 5],
        min_event_duration: u32,
        max_event_duration: u32,
        allowed_locations: [Pubkey; 5],
        max_distance: u32,
        preferred_days: u8,
        preferred_time_start: u32,
        preferred_time_end: u32,
        auto_purchase_enabled: bool,
        auto_purchase_threshold: u16,
        max_tickets_per_event: u8,
        require_verification: bool,
        allow_agent_coordination: bool,
    ) -> Result<()> {
        instructions::agent::create_ai_agent(
            ctx,
            agent_id,
            name,
            max_budget_per_ticket,
            total_budget,
            preference_flags,
            preferred_genres,
            preferred_venues,
            min_event_duration,
            max_event_duration,
            allowed_locations,
            max_distance,
            preferred_days,
            preferred_time_start,
            preferred_time_end,
            auto_purchase_enabled,
            auto_purchase_threshold,
            max_tickets_per_event,
            require_verification,
            allow_agent_coordination,
        )
    }

    pub fn update_ai_agent(
        ctx: Context<instructions::agent::UpdateAIAgent>,
        max_budget_per_ticket: Option<u64>,
        preference_flags: Option<u64>,
        preferred_genres: Option<[u8; 10]>,
        preferred_venues: Option<[Pubkey; 5]>,
        min_event_duration: Option<u32>,
        max_event_duration: Option<u32>,
        allowed_locations: Option<[Pubkey; 5]>,
        max_distance: Option<u32>,
        preferred_days: Option<u8>,
        preferred_time_start: Option<u32>,
        preferred_time_end: Option<u32>,
        auto_purchase_threshold: Option<u16>,
        max_tickets_per_event: Option<u8>,
        require_verification: Option<bool>,
        allow_agent_coordination: Option<bool>,
    ) -> Result<()> {
        instructions::agent::update_ai_agent(
            ctx,
            max_budget_per_ticket,
            preference_flags,
            preferred_genres,
            preferred_venues,
            min_event_duration,
            max_event_duration,
            allowed_locations,
            max_distance,
            preferred_days,
            preferred_time_start,
            preferred_time_end,
            auto_purchase_threshold,
            max_tickets_per_event,
            require_verification,
            allow_agent_coordination,
        )
    }

    pub fn activate_agent(ctx: Context<instructions::agent::ActivateAgent>) -> Result<()> {
        instructions::agent::activate_agent(ctx)
    }

    pub fn deactivate_agent(ctx: Context<instructions::agent::DeactivateAgent>) -> Result<()> {
        instructions::agent::deactivate_agent(ctx)
    }

    pub fn toggle_auto_purchase(
        ctx: Context<instructions::agent::ToggleAutoPurchase>,
        enabled: bool,
    ) -> Result<()> {
        instructions::agent::toggle_auto_purchase(ctx, enabled)
    }

    pub fn add_agent_budget(
        ctx: Context<instructions::agent::AddAgentBudget>,
        amount: u64,
    ) -> Result<()> {
        instructions::agent::add_agent_budget(ctx, amount)
    }

    /// =====================================
    /// PRIMARY MARKET INSTRUCTIONS
    /// =====================================

    pub fn buy_ticket(
        ctx: Context<instructions::primary_market::BuyTicket>,
        tier_id: String,
    ) -> Result<()> {
        instructions::primary_market::buy_ticket(ctx, tier_id)
    }

    pub fn buy_ticket_with_agent(
        ctx: Context<instructions::primary_market::BuyTicketWithAgent>,
        tier_id: String,
        price_deal_bps: u16,
    ) -> Result<()> {
        instructions::primary_market::buy_ticket_with_agent(ctx, tier_id, price_deal_bps)
    }

    pub fn validate_ticket(ctx: Context<instructions::primary_market::ValidateTicket>) -> Result<()> {
        instructions::primary_market::validate_ticket(ctx)
    }

    pub fn cancel_ticket_by_admin(
        ctx: Context<instructions::primary_market::CancelTicketByAdmin>,
        reason: String,
    ) -> Result<()> {
        instructions::primary_market::cancel_ticket_by_admin(ctx, reason)
    }

    /// =====================================
    /// SECONDARY MARKET INSTRUCTIONS
    /// =====================================

    pub fn list_ticket_for_sale(
        ctx: Context<instructions::secondary_market::ListTicketForSale>,
        listing_id: String,
        list_price: u64,
        minimum_offer: u64,
        accept_offers: bool,
        sale_type: u8,
        price_adjustment_rate: u16,
        min_price: u64,
        max_price: u64,
        duration: i64,
    ) -> Result<()> {
        instructions::secondary_market::list_ticket_for_sale(
            ctx,
            listing_id,
            list_price,
            minimum_offer,
            accept_offers,
            sale_type,
            price_adjustment_rate,
            min_price,
            max_price,
            duration,
        )
    }

    pub fn update_listing(
        ctx: Context<instructions::secondary_market::UpdateListing>,
        list_price: Option<u64>,
        minimum_offer: Option<u64>,
        accept_offers: Option<bool>,
        min_price: Option<u64>,
        max_price: Option<u64>,
    ) -> Result<()> {
        instructions::secondary_market::update_listing(
            ctx,
            list_price,
            minimum_offer,
            accept_offers,
            min_price,
            max_price,
        )
    }

    pub fn cancel_listing(ctx: Context<instructions::secondary_market::CancelListing>) -> Result<()> {
        instructions::secondary_market::cancel_listing(ctx)
    }

    pub fn buy_listed_ticket(ctx: Context<instructions::secondary_market::BuyListedTicket>) -> Result<()> {
        instructions::secondary_market::buy_listed_ticket(ctx)
    }

    pub fn make_offer(
        ctx: Context<instructions::secondary_market::MakeOffer>,
        offer_id: String,
        offer_amount: u64,
        duration: i64,
    ) -> Result<()> {
        instructions::secondary_market::make_offer(ctx, offer_id, offer_amount, duration)
    }

    pub fn accept_offer(ctx: Context<instructions::secondary_market::AcceptOffer>) -> Result<()> {
        instructions::secondary_market::accept_offer(ctx)
    }

    pub fn execute_dutch_auction_purchase(
        ctx: Context<instructions::secondary_market::ExecuteDutchAuctionPurchase>,
    ) -> Result<()> {
        instructions::secondary_market::execute_dutch_auction_purchase(ctx)
    }

    pub fn claim_expired_listing(
        ctx: Context<instructions::secondary_market::ClaimExpiredListing>,
    ) -> Result<()> {
        instructions::secondary_market::claim_expired_listing(ctx)
    }
}
