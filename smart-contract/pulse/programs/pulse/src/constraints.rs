use anchor_lang::prelude::*;
use crate::error::TixError;
use crate::state::{Event, TicketTier, AIAgent, MarketListing};

/// Validation helper functions

pub fn validate_event_timing(
    event_start: i64,
    event_end: i64,
    sale_start: i64,
    sale_end: i64,
) -> Result<()> {
    require!(event_start > 0, TixError::InvalidEventTiming);
    require!(event_end > event_start, TixError::InvalidEventTiming);
    require!(sale_start > 0, TixError::InvalidEventTiming);
    require!(sale_end > sale_start, TixError::InvalidEventTiming);
    require!(sale_end < event_start, TixError::InvalidEventTiming);
    Ok(())
}

pub fn validate_royalty_bps(royalty_bps: u16) -> Result<()> {
    require!(royalty_bps <= 10000, TixError::InvalidRoyaltyBps);
    Ok(())
}

pub fn is_event_active(event: &Event, clock: &Clock) -> bool {
    event.is_active
        && !event.is_cancelled
        && clock.unix_timestamp >= event.sale_start_time
        && clock.unix_timestamp <= event.sale_end_time
}

pub fn is_event_ongoing(event: &Event, clock: &Clock) -> bool {
    !event.is_cancelled
        && clock.unix_timestamp >= event.event_start_time
        && clock.unix_timestamp <= event.event_end_time
}

pub fn validate_string_length(s: &str, max_len: usize) -> Result<()> {
    require!(s.len() <= max_len, TixError::InvalidPrice); // Using generic error
    Ok(())
}

pub fn check_agent_preferences_match(
    agent: &AIAgent,
    _event: &Event,
    _tier: &TicketTier,
    price: u64,
    price_deal_bps: u16,
) -> Result<bool> {
    let clock = Clock::get()?;

    // Check if agent is active and auto-purchase is enabled
    if !agent.is_active || !agent.auto_purchase_enabled {
        return Ok(false);
    }

    // Check budget
    let remaining_budget = agent.total_budget
        .checked_sub(agent.spent_budget)
        .ok_or(TixError::MathUnderflow)?;
    if price > remaining_budget || price > agent.max_budget_per_ticket {
        return Ok(false);
    }

    // Check time preferences
    let event_hour = (clock.unix_timestamp % 86400) as u32 / 3600;
    if event_hour < agent.preferred_time_start || event_hour > agent.preferred_time_end {
        return Ok(false);
    }

    // Check day of week preference
    let day_of_week = ((clock.unix_timestamp / 86400) % 7) as u8;
    if (agent.preferred_days & (1 << day_of_week)) == 0 {
        return Ok(false);
    }

    // Check price deal threshold
    if price_deal_bps < agent.auto_purchase_threshold {
        return Ok(false);
    }

    Ok(true)
}

pub fn calculate_dutch_auction_price(
    listing: &MarketListing,
    current_time: i64,
) -> Result<u64> {
    let hours_elapsed = current_time
        .checked_sub(listing.created_at)
        .ok_or(TixError::MathUnderflow)?
        .checked_div(3600)
        .ok_or(TixError::MathOverflow)? as u64;

    let discount_bps = hours_elapsed
        .checked_mul(listing.price_adjustment_rate as u64)
        .ok_or(TixError::MathOverflow)?;

    let discount = (listing.list_price as u128)
        .checked_mul(discount_bps as u128)
        .ok_or(TixError::MathOverflow)?
        .checked_div(10000)
        .ok_or(TixError::MathOverflow)? as u64;

    let current_price = listing.list_price
        .checked_sub(discount)
        .ok_or(TixError::MathUnderflow)?;

    Ok(current_price.max(listing.min_price))
}

pub fn validate_price_cap(
    list_price: u64,
    original_price: u64,
    price_cap_bps: u16,
) -> Result<()> {
    let max_price = (original_price as u128)
        .checked_mul(10000_u128.checked_add(price_cap_bps as u128).ok_or(TixError::MathOverflow)?)
        .ok_or(TixError::MathOverflow)?
        .checked_div(10000)
        .ok_or(TixError::MathOverflow)? as u64;

    require!(list_price <= max_price, TixError::PriceCapExceeded);
    Ok(())
}
