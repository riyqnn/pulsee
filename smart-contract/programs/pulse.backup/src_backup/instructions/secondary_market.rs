use anchor_lang::prelude::*;

use crate::state::{Event, Ticket, MarketListing, Offer, GlobalConfig, TicketStatus, SaleType};
use crate::error::TixError;
use crate::math::{calculate_percentage, safe_add, safe_sub};
use crate::constraints::{validate_price_cap, calculate_dutch_auction_price};

/// =====================================
/// INSTRUCTIONS
/// =====================================

pub fn list_ticket_for_sale(
    ctx: Context<ListTicketForSale>,
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
    validate_price_cap(list_price, ticket.original_price, config.default_price_cap_bps)?;

    let sale_type_enum = match sale_type {
        0 => SaleType::Fixed,
        1 => SaleType::Auction,
        2 => SaleType::Dutch,
        _ => return Err(TixError::InvalidPrice.into()),
    };

    // For Dutch auctions, validate pricing parameters
    if sale_type_enum == SaleType::Dutch {
        require!(min_price > 0, TixError::InvalidPrice);
        require!(max_price >= list_price, TixError::InvalidPrice);
        require!(min_price < list_price, TixError::InvalidPrice);
    }

    let expires_at = clock.unix_timestamp.checked_add(duration).ok_or(TixError::MathOverflow)?;

    listing.listing_id = listing_id;
    listing.seller = ctx.accounts.seller.key();
    listing.ticket_mint = ticket.mint;
    listing.event = event.key();
    listing.tier_id = ticket.tier_id.clone();
    listing.list_price = list_price;
    listing.minimum_offer = minimum_offer;
    listing.accept_offers = accept_offers;
    listing.original_purchase_price = ticket.original_price;
    listing.price_adjustment_rate = price_adjustment_rate;
    listing.last_price_adjustment = clock.unix_timestamp;
    listing.min_price = min_price;
    listing.max_price = max_price;
    listing.is_active = true;
    listing.sale_type = sale_type_enum;
    listing.created_at = clock.unix_timestamp;
    listing.expires_at = expires_at;
    listing.view_count = 0;
    listing.offer_count = 0;
    listing.bump = ctx.bumps.listing;

    msg!("Ticket listed for sale: {} at {} lamports", listing.listing_id, list_price);
    Ok(())
}

pub fn update_listing(
    ctx: Context<UpdateListing>,
    list_price: Option<u64>,
    minimum_offer: Option<u64>,
    accept_offers: Option<bool>,
    min_price: Option<u64>,
    max_price: Option<u64>,
) -> Result<()> {
    let listing = &mut ctx.accounts.listing;
    let config = &ctx.accounts.config;

    if let Some(new_price) = list_price {
        validate_price_cap(new_price, listing.original_purchase_price, config.default_price_cap_bps)?;
        listing.list_price = new_price;
    }

    if let Some(new_min) = minimum_offer {
        listing.minimum_offer = new_min;
    }

    if let Some(new_accept) = accept_offers {
        listing.accept_offers = new_accept;
    }

    if let Some(new_min_price) = min_price {
        listing.min_price = new_min_price;
    }

    if let Some(new_max_price) = max_price {
        listing.max_price = new_max_price;
    }

    msg!("Listing updated: {}", listing.listing_id);
    Ok(())
}

pub fn cancel_listing(ctx: Context<CancelListing>) -> Result<()> {
    let listing = &mut ctx.accounts.listing;

    listing.is_active = false;

    msg!("Listing cancelled: {}", listing.listing_id);
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
    let protocol_fee = calculate_percentage(sale_price, config.protocol_fee_bps)?;
    let organizer_royalty = calculate_percentage(sale_price, event.royalty_bps)?;
    let total_fees = safe_add(protocol_fee, organizer_royalty)?;
    let seller_payout = safe_sub(sale_price, total_fees)?;

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

pub fn make_offer(ctx: Context<MakeOffer>, offer_id: String, offer_amount: u64, duration: i64) -> Result<()> {
    let listing = &ctx.accounts.listing;
    let offer = &mut ctx.accounts.offer;
    let clock = Clock::get()?;

    require!(listing.is_active, TixError::ListingExpired);
    require!(listing.accept_offers, TixError::NoActiveOffer);
    require!(clock.unix_timestamp <= listing.expires_at, TixError::ListingExpired);
    require!(offer_amount >= listing.minimum_offer, TixError::InvalidPrice);
    require!(offer_id.len() <= 30, TixError::InvalidEventTiming);

    let expires_at = clock.unix_timestamp.checked_add(duration).ok_or(TixError::MathOverflow)?;

    offer.listing = listing.key();
    offer.buyer = ctx.accounts.buyer.key();
    offer.offer_amount = offer_amount;
    offer.created_at = clock.unix_timestamp;
    offer.expires_at = expires_at;
    offer.is_active = true;
    offer.bump = ctx.bumps.offer;

    // Update offer count
    let listing_mut = &mut ctx.accounts.listing;
    listing_mut.offer_count = listing_mut.offer_count.checked_add(1).ok_or(TixError::MathOverflow)?;

    msg!("Offer made: {} for {} lamports", offer_id, offer_amount);
    Ok(())
}

pub fn accept_offer(ctx: Context<AcceptOffer>) -> Result<()> {
    let listing = &mut ctx.accounts.listing;
    let offer = &mut ctx.accounts.offer;
    let config = &ctx.accounts.config;
    let event = &ctx.accounts.event;
    let clock = Clock::get()?;

    require!(listing.is_active, TixError::ListingExpired);
    require!(offer.is_active, TixError::OfferExpired);
    require!(clock.unix_timestamp <= offer.expires_at, TixError::OfferExpired);

    let sale_price = offer.offer_amount;

    // Calculate royalties
    let protocol_fee = calculate_percentage(sale_price, config.protocol_fee_bps)?;
    let organizer_royalty = calculate_percentage(sale_price, event.royalty_bps)?;
    let total_fees = safe_add(protocol_fee, organizer_royalty)?;
    let seller_payout = safe_sub(sale_price, total_fees)?;

    // Transfer lamports
    **ctx.accounts.buyer.to_account_info().try_borrow_mut_lamports()? -= sale_price;
    **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += seller_payout;
    **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? += protocol_fee;
    **ctx.accounts.organizer.to_account_info().try_borrow_mut_lamports()? += organizer_royalty;

    // Deactivate offer and listing
    offer.is_active = false;
    listing.is_active = false;

    msg!("Offer accepted: {} for {} lamports", offer.buyer, sale_price);
    Ok(())
}

pub fn execute_dutch_auction_purchase(ctx: Context<ExecuteDutchAuctionPurchase>) -> Result<()> {
    let listing = &mut ctx.accounts.listing;
    let config = &ctx.accounts.config;
    let event = &ctx.accounts.event;
    let clock = Clock::get()?;

    require!(listing.is_active, TixError::ListingExpired);
    require!(clock.unix_timestamp <= listing.expires_at, TixError::ListingExpired);

    // Calculate current Dutch auction price
    let current_price = calculate_dutch_auction_price(listing, clock.unix_timestamp)?;

    // Calculate royalties
    let protocol_fee = calculate_percentage(current_price, config.protocol_fee_bps)?;
    let organizer_royalty = calculate_percentage(current_price, event.royalty_bps)?;
    let total_fees = safe_add(protocol_fee, organizer_royalty)?;
    let seller_payout = safe_sub(current_price, total_fees)?;

    // Transfer lamports
    **ctx.accounts.buyer.to_account_info().try_borrow_mut_lamports()? -= current_price;
    **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += seller_payout;
    **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? += protocol_fee;
    **ctx.accounts.organizer.to_account_info().try_borrow_mut_lamports()? += organizer_royalty;

    // Deactivate listing
    listing.is_active = false;

    msg!("Dutch auction ticket purchased: {} for {} lamports (original: {}, discount: {})",
         listing.listing_id, current_price, listing.list_price,
         safe_sub(listing.list_price, current_price)?);
    Ok(())
}

pub fn claim_expired_listing(ctx: Context<ClaimExpiredListing>) -> Result<()> {
    let listing = &mut ctx.accounts.listing;
    let clock = Clock::get()?;

    require!(listing.is_active, TixError::ListingExpired);
    require!(clock.unix_timestamp > listing.expires_at, TixError::ListingExpired);

    listing.is_active = false;

    msg!("Expired listing claimed: {}", listing.listing_id);
    Ok(())
}

/// =====================================
/// CONTEXTS
/// =====================================

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
pub struct UpdateListing<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, GlobalConfig>,

    #[account(
        mut,
        seeds = [
            b"listing",
            listing.ticket_mint.as_ref(),
            listing.listing_id.as_bytes()
        ],
        bump = listing.bump,
        constraint = listing.seller == seller.key() @ TixError::InvalidAuthority
    )]
    pub listing: Account<'info, MarketListing>,

    pub seller: Signer<'info>,
}

#[derive(Accounts)]
pub struct CancelListing<'info> {
    #[account(
        mut,
        seeds = [
            b"listing",
            listing.ticket_mint.as_ref(),
            listing.listing_id.as_bytes()
        ],
        bump = listing.bump,
        constraint = listing.seller == seller.key() @ TixError::InvalidAuthority
    )]
    pub listing: Account<'info, MarketListing>,

    pub seller: Signer<'info>,
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

#[derive(Accounts)]
#[instruction(offer_id: String)]
pub struct MakeOffer<'info> {
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
        init,
        seeds = [
            b"offer",
            listing.key().as_ref(),
            buyer.key().as_ref()
        ],
        bump,
        payer = buyer,
        space = Offer::SPACE
    )]
    pub offer: Account<'info, Offer>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AcceptOffer<'info> {
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
        bump = listing.bump,
        constraint = listing.seller == seller.key() @ TixError::InvalidAuthority
    )]
    pub listing: Account<'info, MarketListing>,

    #[account(
        mut,
        seeds = [
            b"offer",
            listing.key().as_ref(),
            offer.buyer.as_ref()
        ],
        bump = offer.bump
    )]
    pub offer: Account<'info, Offer>,

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

#[derive(Accounts)]
pub struct ExecuteDutchAuctionPurchase<'info> {
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

#[derive(Accounts)]
pub struct ClaimExpiredListing<'info> {
    #[account(
        mut,
        seeds = [
            b"listing",
            listing.ticket_mint.as_ref(),
            listing.listing_id.as_bytes()
        ],
        bump = listing.bump,
        constraint = listing.seller == seller.key() @ TixError::InvalidAuthority
    )]
    pub listing: Account<'info, MarketListing>,

    pub seller: Signer<'info>,
}
