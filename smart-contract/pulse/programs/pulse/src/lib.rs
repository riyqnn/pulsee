use anchor_lang::prelude::*;

pub mod state;
pub mod error;
pub mod instructions;

use instructions::escrow::*;

declare_id!("5fQA4eCdUtCJPDhjGfb6nn47RhVfKJT2dW5iHuQaeH2n");

#[program]
pub mod pulse {
    use super::*;
    use crate::error::TixError;

    /// =====================================
    /// EVENT INSTRUCTIONS
    /// =====================================

    pub fn create_event(
        ctx: Context<CreateEvent>,
        event_id: String,
        organizer_fee_bps: u16,
    ) -> Result<()> {
        let event = &mut ctx.accounts.event;
        let clock = Clock::get()?;

        require!(event_id.len() <= 50, TixError::InvalidInput);
        require!(organizer_fee_bps <= 10000, TixError::InvalidFeeBps);

        event.organizer = ctx.accounts.organizer.key();
        event.event_id = event_id;
        event.organizer_fee_bps = organizer_fee_bps;
        event.total_tickets_sold = 0;
        event.total_revenue = 0;
        event.is_active = true;
        event.created_at = clock.unix_timestamp;
        event.bump = ctx.bumps.event;

        msg!("Event created: {}", event.event_id);
        Ok(())
    }

    /// =====================================
    /// TICKET TIER INSTRUCTIONS
    /// =====================================

    pub fn create_ticket_tier(
        ctx: Context<CreateTicketTier>,
        tier_id: String,
        price: u64,
        max_supply: u64,
    ) -> Result<()> {
        let tier = &mut ctx.accounts.tier;
        let event = &ctx.accounts.event;

        require!(tier_id.len() <= 20, TixError::InvalidInput);
        require!(price > 0, TixError::InvalidPrice);
        require!(max_supply > 0, TixError::InvalidSupply);
        require!(event.is_active, TixError::EventNotActive);

        tier.event = ctx.accounts.event.key();
        tier.tier_id = tier_id;
        tier.price = price;
        tier.max_supply = max_supply;
        tier.current_supply = 0;
        tier.is_active = true;
        tier.bump = ctx.bumps.tier;

        msg!("Ticket tier created: {} at {} lamports", tier.tier_id, tier.price);
        Ok(())
    }

    /// =====================================
    /// AI AGENT INSTRUCTIONS
    /// =====================================

    pub fn create_ai_agent(
        ctx: Context<CreateAIAgent>,
        agent_id: String,
        max_budget_per_ticket: u64,
        total_budget: u64,
    ) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        let clock = Clock::get()?;

        require!(agent_id.len() <= 30, TixError::InvalidInput);
        require!(max_budget_per_ticket > 0, TixError::InvalidBudget);
        require!(total_budget > 0, TixError::InvalidBudget);

        agent.owner = ctx.accounts.owner.key();
        agent.agent_id = agent_id;
        agent.is_active = true;
        agent.auto_purchase_enabled = false;     // Default disabled
        agent.auto_purchase_threshold = 10000;   // Default 100%
        agent.max_budget_per_ticket = max_budget_per_ticket;
        agent.total_budget = total_budget;
        agent.spent_budget = 0;
        agent.tickets_purchased = 0;
        agent.created_at = clock.unix_timestamp;
        agent.bump = ctx.bumps.agent;

        msg!("AI Agent created: {} with budget {}", agent.agent_id, agent.total_budget);
        Ok(())
    }

    /// =====================================
    /// AGENT CONTROL INSTRUCTIONS
    /// =====================================

    pub fn activate_agent(ctx: Context<ActivateAgent>) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        agent.is_active = true;
        msg!("Agent {} activated", agent.agent_id);
        Ok(())
    }

    pub fn deactivate_agent(ctx: Context<DeactivateAgent>) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        agent.is_active = false;
        msg!("Agent {} deactivated", agent.agent_id);
        Ok(())
    }

    pub fn toggle_auto_purchase(ctx: Context<ToggleAutoPurchase>, enabled: bool) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        agent.auto_purchase_enabled = enabled;
        msg!(
            "Auto-purchase {} for agent {}",
            if enabled { "enabled" } else { "disabled" },
            agent.agent_id
        );
        Ok(())
    }

    pub fn add_agent_budget(ctx: Context<AddAgentBudget>, amount: u64) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        agent.total_budget = agent.total_budget.checked_add(amount).ok_or(TixError::MathOverflow)?;
        msg!("Added {} lamports to agent {} budget", amount, agent.agent_id);
        Ok(())
    }

    pub fn update_agent_config(
        ctx: Context<UpdateAgentConfig>,
        max_budget_per_ticket: Option<u64>,
        auto_purchase_threshold: Option<u16>,
    ) -> Result<()> {
        let agent = &mut ctx.accounts.agent;

        if let Some(max_budget) = max_budget_per_ticket {
            require!(max_budget > 0, TixError::InvalidBudget);
            agent.max_budget_per_ticket = max_budget;
        }

        if let Some(threshold) = auto_purchase_threshold {
            require!(threshold <= 10000, TixError::InvalidInput);
            agent.auto_purchase_threshold = threshold;
        }

        msg!("Agent {} config updated", agent.agent_id);
        Ok(())
    }

    /// =====================================
    /// ESCROW INSTRUCTIONS
    /// =====================================

    pub fn create_escrow(ctx: Context<CreateEscrow>) -> Result<()> {
        instructions::escrow::create_escrow(ctx)
    }

    pub fn deposit_to_escrow(ctx: Context<DepositToEscrow>, amount: u64) -> Result<()> {
        instructions::escrow::deposit_to_escrow(ctx, amount)
    }

    pub fn withdraw_from_escrow(ctx: Context<WithdrawFromEscrow>, amount: u64) -> Result<()> {
        instructions::escrow::withdraw_from_escrow(ctx, amount)
    }

    /// =====================================
    /// CORE FUNCTION: BUY TICKET WITH AGENT ESCROW
    /// =====================================

    pub fn buy_ticket_with_escrow(
        ctx: Context<BuyTicketWithEscrow>,
        tier_id: String,
    ) -> Result<()> {
        instructions::escrow::buy_ticket_with_escrow(ctx, tier_id)
    }
}

// =====================================
// CONTEXTS
// =====================================

// Import state types and error for use in contexts below
use crate::state::*;
use crate::error::TixError;

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
        constraint = organizer.key() == event.organizer @ TixError::Unauthorized
    )]
    pub organizer: Signer<'info>,
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
pub struct ActivateAgent<'info> {
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
        mut,
        constraint = owner.key() == agent.owner @ TixError::Unauthorized
    )]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct DeactivateAgent<'info> {
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
        mut,
        constraint = owner.key() == agent.owner @ TixError::Unauthorized
    )]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct ToggleAutoPurchase<'info> {
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
        mut,
        constraint = owner.key() == agent.owner @ TixError::Unauthorized
    )]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct AddAgentBudget<'info> {
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
        mut,
        constraint = owner.key() == agent.owner @ TixError::Unauthorized
    )]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateAgentConfig<'info> {
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
        mut,
        constraint = owner.key() == agent.owner @ TixError::Unauthorized
    )]
    pub owner: Signer<'info>,
}
