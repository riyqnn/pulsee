use anchor_lang::prelude::*;

use crate::state::Event;
use crate::error::TixError;
use crate::constraints::{validate_event_timing, validate_royalty_bps};

/// =====================================
/// INSTRUCTIONS
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

    validate_event_timing(
        event_start_time,
        event_end_time,
        sale_start_time,
        sale_end_time,
    )?;
    validate_royalty_bps(royalty_bps)?;

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

pub fn update_event(
    ctx: Context<UpdateEvent>,
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
    let event = &mut ctx.accounts.event;
    let clock = Clock::get()?;

    // Cannot modify if sale has started
    require!(
        clock.unix_timestamp < event.sale_start_time,
        TixError::SaleAlreadyStarted
    );

    if let Some(new_name) = name {
        require!(new_name.len() <= 100, TixError::InvalidEventTiming);
        event.name = new_name;
    }

    if let Some(new_description) = description {
        require!(new_description.len() <= 200, TixError::InvalidEventTiming);
        event.description = new_description;
    }

    if let Some(new_image_url) = image_url {
        require!(new_image_url.len() <= 100, TixError::InvalidEventTiming);
        event.image_url = new_image_url;
    }

    if let Some(new_venue) = venue {
        require!(new_venue.len() <= 100, TixError::InvalidEventTiming);
        event.venue = new_venue;
    }

    if let Some(new_start) = event_start_time {
        event.event_start_time = new_start;
    }

    if let Some(new_end) = event_end_time {
        event.event_end_time = new_end;
    }

    if let Some(new_sale_start) = sale_start_time {
        event.sale_start_time = new_sale_start;
    }

    if let Some(new_sale_end) = sale_end_time {
        event.sale_end_time = new_sale_end;
    }

    if let Some(new_max) = max_tickets_per_user {
        require!(new_max > 0, TixError::InvalidEventTiming);
        event.max_tickets_per_user = new_max;
    }

    if let Some(new_royalty) = royalty_bps {
        validate_royalty_bps(new_royalty)?;
        event.royalty_bps = new_royalty;
    }

    // Re-validate timing if changed
    validate_event_timing(
        event.event_start_time,
        event.event_end_time,
        event.sale_start_time,
        event.sale_end_time,
    )?;

    msg!("Event updated: {}", event.event_id);
    Ok(())
}

pub fn cancel_event(ctx: Context<CancelEvent>) -> Result<()> {
    let event = &mut ctx.accounts.event;

    require!(!event.is_cancelled, TixError::EventAlreadyCancelled);

    event.is_cancelled = true;
    event.is_active = false;

    msg!("Event cancelled: {}", event.event_id);
    Ok(())
}

/// =====================================
/// CONTEXTS
/// =====================================

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
pub struct UpdateEvent<'info> {
    #[account(
        mut,
        seeds = [
            b"event",
            event.organizer.as_ref(),
            event.event_id.as_bytes()
        ],
        bump = event.bump,
        constraint = event.organizer == organizer.key() @ TixError::InvalidAuthority
    )]
    pub event: Account<'info, Event>,

    pub organizer: Signer<'info>,
}

#[derive(Accounts)]
pub struct CancelEvent<'info> {
    #[account(
        mut,
        seeds = [
            b"event",
            event.organizer.as_ref(),
            event.event_id.as_bytes()
        ],
        bump = event.bump,
        constraint = event.organizer == organizer.key() @ TixError::InvalidAuthority
    )]
    pub event: Account<'info, Event>,

    pub organizer: Signer<'info>,
}
