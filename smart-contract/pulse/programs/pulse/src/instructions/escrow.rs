use anchor_lang::prelude::*;

use crate::state::{AgentEscrow, AIAgent, Event, TicketTier};
use crate::error::TixError;

/// =====================================
/// INSTRUCTIONS
/// =====================================

/// Create an escrow account for an agent
pub fn create_escrow(ctx: Context<CreateEscrow>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    let agent = &ctx.accounts.agent;
    let clock = Clock::get()?;

    escrow.agent = ctx.accounts.agent.key();
    escrow.owner = ctx.accounts.owner.key();
    escrow.balance = 0;
    escrow.total_deposited = 0;
    escrow.total_withdrawn = 0;
    escrow.total_spent = 0;
    escrow.created_at = clock.unix_timestamp;
    escrow.last_activity = clock.unix_timestamp;
    escrow.bump = ctx.bumps.escrow;

    msg!("Escrow created for agent {}", agent.agent_id);
    Ok(())
}

/// Deposit SOL into agent's escrow account
pub fn deposit_to_escrow(ctx: Context<DepositToEscrow>, amount: u64) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    let clock = Clock::get()?;

    require!(amount > 0, TixError::InvalidBudget);

    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: ctx.accounts.owner.to_account_info(),
            to: escrow.to_account_info(),
        },
    );
    anchor_lang::system_program::transfer(cpi_context, amount)?;

    // Atomic state update
    escrow.balance = escrow.balance.checked_add(amount).ok_or(TixError::MathOverflow)?;
    escrow.total_deposited = escrow.total_deposited.checked_add(amount).ok_or(TixError::MathOverflow)?;
    escrow.last_activity = clock.unix_timestamp;

    msg!("Deposited {} lamports to escrow", amount);
    Ok(())
}

/// Withdraw unused SOL from agent's escrow account
pub fn withdraw_from_escrow(ctx: Context<WithdrawFromEscrow>, amount: u64) -> Result<()> {
    let escrow_info = ctx.accounts.escrow.to_account_info();
    let owner_info = ctx.accounts.owner.to_account_info();
    
    let escrow = &mut ctx.accounts.escrow;
    let clock = Clock::get()?;

    require!(amount > 0, TixError::InvalidBudget);
    require!(escrow.balance >= amount, TixError::InsufficientEscrowBalance);

    **escrow_info.try_borrow_mut_lamports()? -= amount;
    **owner_info.try_borrow_mut_lamports()? += amount;

    escrow.balance = escrow.balance.checked_sub(amount).ok_or(TixError::MathUnderflow)?;
    escrow.total_withdrawn = escrow.total_withdrawn.checked_add(amount).ok_or(TixError::MathOverflow)?;
    escrow.last_activity = clock.unix_timestamp;

    msg!("Withdrew {} lamports from escrow", amount);
    Ok(())
}

/// =====================================
/// CORE FUNCTION: BUY TICKET WITH ESCROW
/// =====================================

/// Buy ticket using agent's escrow balance
/// Can be called by anyone (scheduler service) - no user signature needed for payment
/// Funds come from escrow, not from user wallet
pub fn buy_ticket_with_escrow(
    ctx: Context<BuyTicketWithEscrow>,
    _tier_id: String,
) -> Result<()> {
   let escrow_info = ctx.accounts.escrow.to_account_info();
    let organizer_info = ctx.accounts.organizer.to_account_info();

    let event = &mut ctx.accounts.event;
    let tier = &mut ctx.accounts.tier;
    let agent = &mut ctx.accounts.agent;
    let escrow = &mut ctx.accounts.escrow;
    let clock = Clock::get()?;

    require!(event.is_active, TixError::EventNotActive);
    require!(tier.is_active, TixError::TierNotActive);
    require!(tier.current_supply < tier.max_supply, TixError::TierSoldOut);
    require!(agent.is_active, TixError::AgentInactive);
    require!(agent.auto_purchase_enabled, TixError::AutoPurchaseDisabled);

   let price = tier.price;
    require!(escrow.balance >= price, TixError::InsufficientEscrowBalance);

    let remaining_budget = agent.total_budget.checked_sub(agent.spent_budget)
        .ok_or(TixError::InsufficientAgentBudget)?;
    
    require!(price <= remaining_budget, TixError::InsufficientAgentBudget);
    require!(price <= agent.max_budget_per_ticket, TixError::InsufficientAgentBudget);

    **escrow_info.try_borrow_mut_lamports()? -= price;
    **organizer_info.try_borrow_mut_lamports()? += price;

    escrow.balance = escrow.balance.checked_sub(price).ok_or(TixError::MathUnderflow)?;
    escrow.total_spent = escrow.total_spent.checked_add(price).ok_or(TixError::MathOverflow)?;
    escrow.last_activity = clock.unix_timestamp;

    agent.spent_budget = agent.spent_budget.checked_add(price).ok_or(TixError::MathOverflow)?;
    agent.tickets_purchased += 1;

    tier.current_supply += 1;
    event.total_tickets_sold += 1;
    event.total_revenue = event.total_revenue.checked_add(price).ok_or(TixError::MathOverflow)?;

    msg!("Autonomous purchase successful for agent: {}", agent.agent_id);
    Ok(())
}

/// =====================================
/// CONTEXTS
/// =====================================

#[derive(Accounts)]
pub struct CreateEscrow<'info> {
    #[account(
        mut,
        seeds = [
            b"agent",
            owner.key().as_ref(),
            agent.agent_id.as_bytes()
        ],
        bump = agent.bump
    )]
    pub agent: Account<'info, AIAgent>,

    #[account(
        init,
        seeds = [
            b"escrow",
            agent.key().as_ref(),
            owner.key().as_ref()
        ],
        bump,
        payer = owner,
        space = AgentEscrow::SPACE
    )]
    pub escrow: Account<'info, AgentEscrow>,

    #[account(
        mut,
        constraint = owner.key() == agent.owner @ TixError::Unauthorized
    )]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositToEscrow<'info> {
    #[account(
        mut,
        seeds = [
            b"escrow",
            agent.key().as_ref(),
            owner.key().as_ref()
        ],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, AgentEscrow>,

    #[account(
        constraint = agent.owner == owner.key() @ TixError::Unauthorized
    )]
    pub agent: Account<'info, AIAgent>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawFromEscrow<'info> {
    #[account(
        mut,
        seeds = [
            b"escrow",
            agent.key().as_ref(),
            owner.key().as_ref()
        ],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, AgentEscrow>,

    #[account(
        constraint = agent.owner == owner.key() @ TixError::Unauthorized
    )]
    pub agent: Account<'info, AIAgent>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(tier_id: String)]
pub struct BuyTicketWithEscrow<'info> {
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
            escrow.owner.as_ref(),
            agent.agent_id.as_bytes()
        ],
        bump = agent.bump
    )]
    pub agent: Account<'info, AIAgent>,

    #[account(
        mut,
        seeds = [
            b"escrow",
            agent.key().as_ref(),
            agent.owner.as_ref()
        ],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, AgentEscrow>,

    /// CHECK: Organizer wallet
    #[account(
        mut,
        constraint = organizer.key() == event.organizer
    )]
    pub organizer: UncheckedAccount<'info>,

    /// CHECK: Authority can be ANYONE - key for autonomous operation!
    /// Could be a scheduler service, or delegated authority
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
