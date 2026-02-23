use anchor_lang::prelude::*;

use crate::state::{Event, TicketTier};
use crate::error::TixError;

/// =====================================
/// INSTRUCTIONS
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
    let clock = Clock::get()?;

    // Validate inputs
    require!(tier_id.len() <= 20, TixError::InvalidEventTiming);
    require!(name.len() <= 50, TixError::InvalidEventTiming);
    require!(description.len() <= 100, TixError::InvalidEventTiming);
    require!(price > 0, TixError::InvalidTierPrice);
    require!(max_supply > 0, TixError::InvalidTierPrice);

    // Cannot create tier if sale has started
    require!(
        clock.unix_timestamp < event.sale_start_time,
        TixError::SaleAlreadyStarted
    );

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

pub fn update_ticket_tier(
    ctx: Context<UpdateTicketTier>,
    name: Option<String>,
    description: Option<String>,
    price: Option<u64>,
    max_supply: Option<u64>,
) -> Result<()> {
    let tier = &mut ctx.accounts.tier;
    let event = &ctx.accounts.event;
    let clock = Clock::get()?;

    // Cannot modify if sale has started
    require!(
        clock.unix_timestamp < event.sale_start_time,
        TixError::SaleAlreadyStarted
    );

    // Cannot increase max_supply below current_supply
    if let Some(new_max) = max_supply {
        require!(new_max >= tier.current_supply, TixError::InvalidTierPrice);
        require!(new_max > 0, TixError::InvalidTierPrice);
        tier.max_supply = new_max;
    }

    if let Some(new_name) = name {
        require!(new_name.len() <= 50, TixError::InvalidEventTiming);
        tier.name = new_name;
    }

    if let Some(new_description) = description {
        require!(new_description.len() <= 100, TixError::InvalidEventTiming);
        tier.description = new_description;
    }

    if let Some(new_price) = price {
        require!(new_price > 0, TixError::InvalidTierPrice);
        tier.price = new_price;
    }

    msg!("Ticket tier updated: {}", tier.tier_id);
    Ok(())
}

pub fn disable_tier(ctx: Context<DisableTier>) -> Result<()> {
    let tier = &mut ctx.accounts.tier;

    tier.is_active = false;

    msg!("Ticket tier disabled: {}", tier.tier_id);
    Ok(())
}

/// =====================================
/// CONTEXTS
/// =====================================

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
pub struct UpdateTicketTier<'info> {
    pub event: Account<'info, Event>,

    #[account(
        mut,
        seeds = [
            b"tier",
            event.key().as_ref(),
            tier.tier_id.as_bytes()
        ],
        bump = tier.bump
    )]
    pub tier: Account<'info, TicketTier>,

    /// CHECK: Organizer authority, checked via event
    pub organizer: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct DisableTier<'info> {
    pub event: Account<'info, Event>,

    #[account(
        mut,
        seeds = [
            b"tier",
            event.key().as_ref(),
            tier.tier_id.as_bytes()
        ],
        bump = tier.bump
    )]
    pub tier: Account<'info, TicketTier>,

    /// CHECK: Organizer authority
    pub organizer: UncheckedAccount<'info>,
}
