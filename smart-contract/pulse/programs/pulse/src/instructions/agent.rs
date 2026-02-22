use anchor_lang::prelude::*;

use crate::state::AIAgent;
use crate::error::TixError;
use crate::math::safe_add;

/// =====================================
/// INSTRUCTIONS
/// =====================================

pub fn create_ai_agent(
    ctx: Context<CreateAIAgent>,
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
    let agent = &mut ctx.accounts.agent;
    let clock = Clock::get()?;

    require!(agent_id.len() <= 30, TixError::InvalidEventTiming);
    require!(name.len() <= 50, TixError::InvalidEventTiming);
    require!(max_budget_per_ticket > 0, TixError::InsufficientAgentBudget);
    require!(total_budget > 0, TixError::InsufficientAgentBudget);
    require!(preferred_time_start <= 1439, TixError::InvalidEventTiming); // Max 23:59
    require!(preferred_time_end <= 1439, TixError::InvalidEventTiming);
    require!(auto_purchase_threshold <= 10000, TixError::InvalidRoyaltyBps);

    agent.owner = ctx.accounts.owner.key();
    agent.agent_id = agent_id;
    agent.name = name;
    agent.is_active = true;
    agent.max_budget_per_ticket = max_budget_per_ticket;
    agent.total_budget = total_budget;
    agent.spent_budget = 0;
    agent.preference_flags = preference_flags;
    agent.preferred_genres = preferred_genres;
    agent.preferred_venues = preferred_venues;
    agent.min_event_duration = min_event_duration;
    agent.max_event_duration = max_event_duration;
    agent.allowed_locations = allowed_locations;
    agent.max_distance = max_distance;
    agent.preferred_days = preferred_days;
    agent.preferred_time_start = preferred_time_start;
    agent.preferred_time_end = preferred_time_end;
    agent.auto_purchase_enabled = auto_purchase_enabled;
    agent.auto_purchase_threshold = auto_purchase_threshold;
    agent.max_tickets_per_event = max_tickets_per_event;
    agent.require_verification = require_verification;
    agent.allow_agent_coordination = allow_agent_coordination;
    agent.coordination_group_id = None;
    agent.tickets_purchased = 0;
    agent.money_saved = 0;
    agent.created_at = clock.unix_timestamp;
    agent.last_active = clock.unix_timestamp;
    agent.bump = ctx.bumps.agent;

    msg!("AI Agent created: {} ({})", agent.name, agent.agent_id);
    Ok(())
}

pub fn update_ai_agent(
    ctx: Context<UpdateAIAgent>,
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
    let agent = &mut ctx.accounts.agent;

    if let Some(new_max) = max_budget_per_ticket {
        require!(new_max > 0, TixError::InsufficientAgentBudget);
        agent.max_budget_per_ticket = new_max;
    }

    if let Some(flags) = preference_flags {
        agent.preference_flags = flags;
    }

    if let Some(genres) = preferred_genres {
        agent.preferred_genres = genres;
    }

    if let Some(venues) = preferred_venues {
        agent.preferred_venues = venues;
    }

    if let Some(min_duration) = min_event_duration {
        agent.min_event_duration = min_duration;
    }

    if let Some(max_duration) = max_event_duration {
        agent.max_event_duration = max_duration;
    }

    if let Some(locations) = allowed_locations {
        agent.allowed_locations = locations;
    }

    if let Some(distance) = max_distance {
        agent.max_distance = distance;
    }

    if let Some(days) = preferred_days {
        agent.preferred_days = days;
    }

    if let Some(start) = preferred_time_start {
        require!(start <= 1439, TixError::InvalidEventTiming);
        agent.preferred_time_start = start;
    }

    if let Some(end) = preferred_time_end {
        require!(end <= 1439, TixError::InvalidEventTiming);
        agent.preferred_time_end = end;
    }

    if let Some(threshold) = auto_purchase_threshold {
        require!(threshold <= 10000, TixError::InvalidRoyaltyBps);
        agent.auto_purchase_threshold = threshold;
    }

    if let Some(max_tickets) = max_tickets_per_event {
        agent.max_tickets_per_event = max_tickets;
    }

    if let Some(required) = require_verification {
        agent.require_verification = required;
    }

    if let Some(allowed) = allow_agent_coordination {
        agent.allow_agent_coordination = allowed;
    }

    msg!("AI Agent updated: {}", agent.agent_id);
    Ok(())
}

pub fn activate_agent(ctx: Context<ActivateAgent>) -> Result<()> {
    let agent = &mut ctx.accounts.agent;
    agent.is_active = true;
    msg!("AI Agent activated: {}", agent.agent_id);
    Ok(())
}

pub fn deactivate_agent(ctx: Context<DeactivateAgent>) -> Result<()> {
    let agent = &mut ctx.accounts.agent;
    agent.is_active = false;
    msg!("AI Agent deactivated: {}", agent.agent_id);
    Ok(())
}

pub fn toggle_auto_purchase(ctx: Context<ToggleAutoPurchase>, enabled: bool) -> Result<()> {
    let agent = &mut ctx.accounts.agent;
    agent.auto_purchase_enabled = enabled;
    msg!("Auto-purchase {} for agent: {}", if enabled { "enabled" } else { "disabled" }, agent.agent_id);
    Ok(())
}

pub fn add_agent_budget(ctx: Context<AddAgentBudget>, amount: u64) -> Result<()> {
    let agent = &mut ctx.accounts.agent;

    require!(amount > 0, TixError::InsufficientAgentBudget);

    agent.total_budget = safe_add(agent.total_budget, amount)?;

    msg!("Added {} lamports to agent {} budget", amount, agent.agent_id);
    Ok(())
}

/// =====================================
/// CONTEXTS
/// =====================================

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
pub struct UpdateAIAgent<'info> {
    #[account(
        mut,
        seeds = [
            b"agent",
            agent.owner.as_ref(),
            agent.agent_id.as_bytes()
        ],
        bump = agent.bump,
        constraint = agent.owner == owner.key() @ TixError::InvalidAuthority
    )]
    pub agent: Account<'info, AIAgent>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct ActivateAgent<'info> {
    #[account(
        mut,
        seeds = [
            b"agent",
            agent.owner.as_ref(),
            agent.agent_id.as_bytes()
        ],
        bump = agent.bump,
        constraint = agent.owner == owner.key() @ TixError::InvalidAuthority
    )]
    pub agent: Account<'info, AIAgent>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct DeactivateAgent<'info> {
    #[account(
        mut,
        seeds = [
            b"agent",
            agent.owner.as_ref(),
            agent.agent_id.as_bytes()
        ],
        bump = agent.bump,
        constraint = agent.owner == owner.key() @ TixError::InvalidAuthority
    )]
    pub agent: Account<'info, AIAgent>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct ToggleAutoPurchase<'info> {
    #[account(
        mut,
        seeds = [
            b"agent",
            agent.owner.as_ref(),
            agent.agent_id.as_bytes()
        ],
        bump = agent.bump,
        constraint = agent.owner == owner.key() @ TixError::InvalidAuthority
    )]
    pub agent: Account<'info, AIAgent>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct AddAgentBudget<'info> {
    #[account(
        mut,
        seeds = [
            b"agent",
            agent.owner.as_ref(),
            agent.agent_id.as_bytes()
        ],
        bump = agent.bump,
        constraint = agent.owner == owner.key() @ TixError::InvalidAuthority
    )]
    pub agent: Account<'info, AIAgent>,

    #[account(mut)]
    pub owner: Signer<'info>,
}
