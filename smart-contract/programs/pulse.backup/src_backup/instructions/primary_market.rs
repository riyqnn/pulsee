use anchor_lang::prelude::*;

use crate::state::{Event, TicketTier, User, AIAgent, Ticket, UserTicketCounter, TicketStatus};
use crate::error::TixError;
use crate::math::{safe_add, safe_sub};
use crate::constraints::{is_event_active, check_agent_preferences_match};

/// =====================================
/// INSTRUCTIONS
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
    require!(is_event_active(event, &clock), TixError::EventNotActive);
    require!(tier.is_active, TixError::TierNotActive);
    require!(tier.current_supply < tier.max_supply, TixError::TierSoldOut);

    // Check user ticket limit - if counter exists
    let current_count = if ctx.accounts.user_ticket_counter.is_some() {
        let counter = ctx.accounts.user_ticket_counter.as_ref().unwrap();
        counter.ticket_count
    } else {
        0
    };
    require!(
        current_count < event.max_tickets_per_user,
        TixError::MaxTicketsPerUserExceeded
    );

    let price = tier.price;

    // Transfer payment
    **ctx.accounts.buyer.to_account_info().try_borrow_mut_lamports()? -= price;
    **ctx.accounts.organizer.to_account_info().try_borrow_mut_lamports()? += price;

    // Update tier supply
    tier.current_supply = safe_add(tier.current_supply, 1)?;

    // Update event stats
    event.total_tickets_sold = safe_add(event.total_tickets_sold, 1)?;
    event.total_revenue = safe_add(event.total_revenue, price)?;

    // Update user stats
    user.tickets_owned = safe_add(user.tickets_owned, 1)?;
    user.total_spent = safe_add(user.total_spent, price)?;
    user.tickets_purchased = safe_add(user.tickets_purchased, 1)?;

    // Update ticket counter if it exists
    if let Some(counter) = &mut ctx.accounts.user_ticket_counter {
        counter.ticket_count += 1;
    }

    msg!("Ticket purchased for event: {}, tier: {}, price: {}", event.event_id, tier_id, price);
    Ok(())
}

pub fn buy_ticket_with_agent(
    ctx: Context<BuyTicketWithAgent>,
    tier_id: String,
    price_deal_bps: u16,
) -> Result<()> {
    let event = &mut ctx.accounts.event;
    let tier = &mut ctx.accounts.tier;
    let agent = &mut ctx.accounts.agent;
    let user = &mut ctx.accounts.user;
    let clock = Clock::get()?;

    // Validate event and tier
    require!(is_event_active(event, &clock), TixError::EventNotActive);
    require!(tier.is_active, TixError::TierNotActive);
    require!(tier.current_supply < tier.max_supply, TixError::TierSoldOut);

    // Validate agent
    require!(agent.is_active, TixError::AgentInactive);
    require!(agent.auto_purchase_enabled, TixError::AgentAutoPurchaseDisabled);

    // Check preferences match
    require!(
        check_agent_preferences_match(agent, event, tier, tier.price, price_deal_bps)?,
        TixError::PreferenceMismatch
    );

    let price = tier.price;

    // Check agent budget
    let remaining_budget = safe_sub(agent.total_budget, agent.spent_budget)?;
    require!(price <= remaining_budget, TixError::InsufficientAgentBudget);
    require!(price <= agent.max_budget_per_ticket, TixError::InsufficientAgentBudget);

    // Check user ticket limit
    let current_count = if ctx.accounts.user_ticket_counter.is_some() {
        let counter = ctx.accounts.user_ticket_counter.as_ref().unwrap();
        counter.ticket_count
    } else {
        0
    };
    require!(
        current_count < event.max_tickets_per_user,
        TixError::MaxTicketsPerUserExceeded
    );

    // Transfer payment from agent owner
    **ctx.accounts.agent_owner.to_account_info().try_borrow_mut_lamports()? -= price;
    **ctx.accounts.organizer.to_account_info().try_borrow_mut_lamports()? += price;

    // Update agent budget
    agent.spent_budget = safe_add(agent.spent_budget, price)?;
    agent.tickets_purchased = safe_add(agent.tickets_purchased, 1)?;
    agent.last_active = clock.unix_timestamp;

    // Calculate money saved (if below market price)
    if price_deal_bps > 0 {
        let market_price = (price as u128)
            .checked_mul(10000_u128.checked_add(price_deal_bps as u128).ok_or(TixError::MathOverflow)?)
            .ok_or(TixError::MathOverflow)?
            .checked_div(10000)
            .ok_or(TixError::MathOverflow)? as u64;
        let saved = safe_sub(market_price, price)?;
        agent.money_saved = safe_add(agent.money_saved, saved)?;
    }

    // Update tier supply
    tier.current_supply = safe_add(tier.current_supply, 1)?;

    // Update event stats
    event.total_tickets_sold = safe_add(event.total_tickets_sold, 1)?;
    event.total_revenue = safe_add(event.total_revenue, price)?;

    // Update user stats
    user.tickets_owned = safe_add(user.tickets_owned, 1)?;
    user.total_spent = safe_add(user.total_spent, price)?;
    user.tickets_purchased = safe_add(user.tickets_purchased, 1)?;

    // Update ticket counter if it exists
    if let Some(counter) = &mut ctx.accounts.user_ticket_counter {
        counter.ticket_count += 1;
    }

    msg!("Agent {} purchased ticket for event: {}, tier: {}, price: {}", agent.agent_id, event.event_id, tier_id, price);
    Ok(())
}

pub fn validate_ticket(ctx: Context<ValidateTicket>) -> Result<()> {
    let ticket = &mut ctx.accounts.ticket;
    let event = &ctx.accounts.event;
    let clock = Clock::get()?;

    // Validate ticket status
    require!(ticket.status == TicketStatus::Active, TixError::TicketConsumed);

    // Validate event
    require!(
        clock.unix_timestamp >= event.event_start_time,
        TixError::EventNotOngoing
    );
    require!(
        clock.unix_timestamp <= event.event_end_time,
        TixError::EventNotOngoing
    );
    require!(!event.is_cancelled, TixError::TicketCancelled);

    // Mark ticket as consumed
    ticket.status = TicketStatus::Consumed;
    ticket.validated_at = Some(clock.unix_timestamp);

    msg!("Ticket validated and marked as consumed");
    Ok(())
}

pub fn cancel_ticket_by_admin(ctx: Context<CancelTicketByAdmin>, reason: String) -> Result<()> {
    let ticket = &mut ctx.accounts.ticket;
    let event = &ctx.accounts.event;

    // Only organizer can cancel tickets
    require!(
        ctx.accounts.organizer.key() == event.organizer,
        TixError::InvalidAuthority
    );

    // Only active tickets can be cancelled
    require!(ticket.status == TicketStatus::Active, TixError::TicketConsumed);

    // Mark ticket as cancelled
    ticket.status = TicketStatus::Cancelled;

    msg!("Ticket cancelled by admin. Reason: {}", reason);
    Ok(())
}

/// =====================================
/// CONTEXTS
/// =====================================

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

    /// CHECK: Optional ticket counter
    #[account(
        mut,
        seeds = [
            b"user_ticket_counter",
            buyer.key().as_ref(),
            event.key().as_ref()
        ],
        bump
    )]
    pub user_ticket_counter: Option<Account<'info, UserTicketCounter>>,

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
#[instruction(tier_id: String)]
pub struct BuyTicketWithAgent<'info> {
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
        seeds = [
            b"agent",
            agent.owner.as_ref(),
            agent.agent_id.as_bytes()
        ],
        bump = agent.bump
    )]
    pub agent: Account<'info, AIAgent>,

    #[account(
        mut,
        seeds = [b"user", agent.owner.as_ref()],
        bump = user.bump
    )]
    pub user: Account<'info, User>,

    /// CHECK: Optional ticket counter
    #[account(
        mut,
        seeds = [
            b"user_ticket_counter",
            agent.owner.as_ref(),
            event.key().as_ref()
        ],
        bump
    )]
    pub user_ticket_counter: Option<Account<'info, UserTicketCounter>>,

    /// CHECK: Agent owner's wallet
    #[account(
        mut,
        constraint = agent_owner.key() == agent.owner
    )]
    pub agent_owner: UncheckedAccount<'info>,

    /// CHECK: Organizer wallet
    #[account(
        mut,
        constraint = organizer.key() == event.organizer
    )]
    pub organizer: UncheckedAccount<'info>,

    /// CHECK: Agent owner as signer
    pub agent_owner_signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ValidateTicket<'info> {
    pub event: Account<'info, Event>,

    #[account(
        mut,
        constraint = ticket.event == event.key()
    )]
    pub ticket: Account<'info, Ticket>,

    /// CHECK: Admin/validator authority
    pub validator: Signer<'info>,
}

#[derive(Accounts)]
pub struct CancelTicketByAdmin<'info> {
    pub event: Account<'info, Event>,

    #[account(
        mut,
        constraint = ticket.event == event.key()
    )]
    pub ticket: Account<'info, Ticket>,

    pub organizer: Signer<'info>,
}
