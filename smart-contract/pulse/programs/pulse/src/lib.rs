use anchor_lang::prelude::*;

pub mod state;
pub mod error;
pub mod instructions;

use instructions::escrow::*;

use anchor_spl::token;

declare_id!("EXZ9u1aF8gvHeUsKM8eTRzWDo88WGMKWZJLbvM8bYetJ");

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
        event.organizer = ctx.accounts.organizer.key();
        event.event_id = event_id;
        event.organizer_fee_bps = organizer_fee_bps;
        event.is_active = true;
        event.total_tickets_sold = 0;
        event.total_revenue = 0;
        event.created_at = Clock::get()?.unix_timestamp;
        event.bump = ctx.bumps.event;
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
        require!(ctx.accounts.event.is_active, TixError::EventNotActive);

        tier.event = ctx.accounts.event.key();
        tier.tier_id = tier_id;
        tier.price = price;
        tier.max_supply = max_supply;
        tier.current_supply = 0;
        tier.is_active = true;
        tier.bump = ctx.bumps.tier;
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
        max_tickets_per_event: u32,      
    ) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        let clock = Clock::get()?;

        agent.owner = ctx.accounts.owner.key();
        agent.agent_id = agent_id;
        agent.name = name; 
        agent.is_active = true;
        agent.auto_purchase_enabled = auto_purchase_enabled;
        agent.auto_purchase_threshold = auto_purchase_threshold;
        agent.max_budget_per_ticket = max_budget_per_ticket;
        agent.total_budget = total_budget;
        agent.max_tickets_per_event = max_tickets_per_event; 
        agent.spent_budget = 0;
        agent.tickets_purchased = 0;
        agent.created_at = clock.unix_timestamp;
        agent.bump = ctx.bumps.agent;

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

    pub fn decrease_agent_budget(ctx: Context<DecreaseAgentBudget>, amount: u64) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        agent.total_budget = agent.total_budget.checked_sub(amount).ok_or(TixError::MathUnderflow)?;
        msg!("Decreased {} lamports from agent {} budget", amount, agent.agent_id);
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
        agent_owner: Pubkey,
    ) -> Result<()> {
        instructions::escrow::buy_ticket_with_escrow(ctx, tier_id, agent_owner)
    }

    /// =====================================
    /// CORE FUNCTION: MINT TICKET NFT
    /// =====================================
    pub fn mint_ticket_nft(ctx: Context<MintTicketNFT>, name: String, symbol: String, uri: String) -> Result<()> {
        let event = &ctx.accounts.event;
        let organizer_key = event.organizer.key();
        let event_id_bytes = event.event_id.as_bytes();
        let bump_vector = event.bump.to_le_bytes();
        
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"event",
            organizer_key.as_ref(),
            event_id_bytes,
            &bump_vector,
        ]];

        anchor_spl::token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::MintTo {
                    mint: ctx.accounts.ticket_mint.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: ctx.accounts.event.to_account_info(),
                },
                signer_seeds,
            ),
            1,
        )?;

        let metadata_infos = anchor_spl::metadata::CreateMetadataAccountsV3 {
            metadata: ctx.accounts.metadata.to_account_info(),
            mint: ctx.accounts.ticket_mint.to_account_info(),
            mint_authority: ctx.accounts.event.to_account_info(),
            payer: ctx.accounts.authority.to_account_info(),
            update_authority: ctx.accounts.event.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        };

        let data_v2 = anchor_spl::metadata::mpl_token_metadata::types::DataV2 {
            name,
            symbol,
            uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };

        anchor_spl::metadata::create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.to_account_info(),
                metadata_infos,
                signer_seeds,
            ),
            data_v2,
            true, 
            true, 
            None,
        )?;

        msg!("Verified NFT Minted!");
        Ok(())
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
pub struct DecreaseAgentBudget<'info> {
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

#[derive(Accounts)]
pub struct MintTicketNFT<'info> {
    #[account(mut)]
    pub event: Account<'info, Event>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = event,
    )]
    pub ticket_mint: Account<'info, anchor_spl::token::Mint>,

    /// CHECK: Metadata account will be created via CPI
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    #[account(
        init,
        payer = authority,
        associated_token::mint = ticket_mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, anchor_spl::token::TokenAccount>,

    /// CHECK: The user receiving the NFT
    pub buyer: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, anchor_spl::token::Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    
    /// CHECK: Metaplex program ID
    pub token_metadata_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}