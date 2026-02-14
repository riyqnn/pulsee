use anchor_lang::prelude::*;

declare_id!("HkUzsGxmAhjh6UpdBc6ECsN8pj6D8poX7H7yLvuMRLtS");

#[program]
pub mod pulse {
    use super::*;

    pub fn create_event(
        ctx: Context<CreateEvent>,
        event_id: String,
        revenue_split_bps: u16,
        revenue_nft_supply: u64,
    ) -> Result<()> {
        require!(revenue_split_bps <= 10000, PulseError::InvalidBps);
        require!(revenue_nft_supply > 0, PulseError::InvalidSupply);
        require!(event_id.len() <= 50, PulseError::InvalidEventId);

        let event = &mut ctx.accounts.event;
        let clock = Clock::get()?;

        event.authority = ctx.accounts.authority.key();
        event.event_id = event_id.clone();
        event.revenue_split_bps = revenue_split_bps;
        event.revenue_nft_supply = revenue_nft_supply;
        event.total_revenue_collected = 0;
        event.total_investor_pool = 0;
        event.total_revenue_per_share = 0;
        event.revenue_nft_mint = ctx.accounts.revenue_nft_mint.key();
        event.vault = ctx.accounts.vault.key();
        event.bump = ctx.bumps.event;
        event.created_at = clock.unix_timestamp;
        event.vault_bump = ctx.bumps.vault;

        msg!("Event created: {} with split: {} bps", event_id, revenue_split_bps);
        Ok(())
    }

    pub fn buy_revenue_nft(
        ctx: Context<BuyRevenueNft>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, PulseError::InvalidAmount);

        let event = &mut ctx.accounts.event;
        let investor_position = &mut ctx.accounts.investor_position;

        if investor_position.nft_amount == 0 {
            investor_position.owner = ctx.accounts.owner.key();
            investor_position.event = event.key();
            investor_position.nft_amount = amount;
            investor_position.reward_debt = (amount as u128)
                .checked_mul(event.total_revenue_per_share)
                .ok_or(PulseError::MathOverflow)?;
            investor_position.bump = ctx.bumps.investor_position;
        } else {
            let pending = (investor_position.nft_amount as u128)
                .checked_mul(event.total_revenue_per_share)
                .ok_or(PulseError::MathOverflow)?
                .checked_sub(investor_position.reward_debt)
                .ok_or(PulseError::MathUnderflow)?;

            investor_position.nft_amount = investor_position.nft_amount
                .checked_add(amount)
                .ok_or(PulseError::MathOverflow)?;

            investor_position.reward_debt = (investor_position.nft_amount as u128)
                .checked_mul(event.total_revenue_per_share)
                .ok_or(PulseError::MathOverflow)?
                .checked_sub(pending)
                .ok_or(PulseError::MathUnderflow)?;
        }

        msg!("Bought {} revenue NFTs for event: {}", amount, event.event_id);
        Ok(())
    }

    pub fn buy_ticket(
        ctx: Context<BuyTicket>,
        ticket_price: u64,
    ) -> Result<()> {
        require!(ticket_price > 0, PulseError::InvalidAmount);

        let event = &mut ctx.accounts.event;

        let investor_cut = (ticket_price as u128)
            .checked_mul(event.revenue_split_bps as u128)
            .ok_or(PulseError::MathOverflow)?
            .checked_div(10000)
            .ok_or(PulseError::MathOverflow)? as u64;

        let organizer_cut = ticket_price
            .checked_sub(investor_cut)
            .ok_or(PulseError::MathUnderflow)?;

        **ctx.accounts.buyer.to_account_info().try_borrow_mut_lamports()? -= organizer_cut;
        **ctx.accounts.event_authority.to_account_info().try_borrow_mut_lamports()? += organizer_cut;

        **ctx.accounts.buyer.to_account_info().try_borrow_mut_lamports()? -= investor_cut;
        **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? += investor_cut;

        event.total_revenue_collected = event.total_revenue_collected
            .checked_add(ticket_price)
            .ok_or(PulseError::MathOverflow)?;

        event.total_investor_pool = event.total_investor_pool
            .checked_add(investor_cut)
            .ok_or(PulseError::MathOverflow)?;

        let revenue_per_nft = (investor_cut as u128)
            .checked_mul(1_000_000_000)
            .ok_or(PulseError::MathOverflow)?
            .checked_div(event.revenue_nft_supply as u128)
            .ok_or(PulseError::MathOverflow)?;

        event.total_revenue_per_share = event.total_revenue_per_share
            .checked_add(revenue_per_nft)
            .ok_or(PulseError::MathOverflow)?;

        msg!("Ticket bought for {} lamports - Organizer: {}, Investor: {}",
             ticket_price, organizer_cut, investor_cut);

        Ok(())
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let event = &ctx.accounts.event;
        let investor_position = &mut ctx.accounts.investor_position;
        let vault = &ctx.accounts.vault;

        let total_reward = (investor_position.nft_amount as u128)
            .checked_mul(event.total_revenue_per_share)
            .ok_or(PulseError::MathOverflow)?;

        let pending_reward_nano = total_reward
            .checked_sub(investor_position.reward_debt)
            .ok_or(PulseError::MathUnderflow)?;

        let pending_reward_nano_u64 = pending_reward_nano
            .checked_div(1_000_000_000)
            .ok_or(PulseError::MathOverflow)? as u64;

        require!(pending_reward_nano_u64 > 0, PulseError::NothingToClaim);

        require!(
            vault.get_lamports() >= pending_reward_nano_u64,
            PulseError::InsufficientVaultBalance
        );

        let vault_key = vault.to_account_info();
        let investor_key = &ctx.accounts.investor.to_account_info();

        **vault_key.try_borrow_mut_lamports()? -= pending_reward_nano_u64;
        **investor_key.try_borrow_mut_lamports()? += pending_reward_nano_u64;

        investor_position.reward_debt = total_reward;

        msg!("Claimed {} lamports for investor", pending_reward_nano_u64);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(event_id: String)]
pub struct CreateEvent<'info> {
    #[account(
        init,
        seeds = [
            b"event",
            authority.key().as_ref(),
            event_id.as_bytes()
        ],
        bump,
        payer = authority,
        space = Event::SPACE
    )]
    pub event: Account<'info, Event>,

    #[account(
        seeds = [b"vault", event.key().as_ref()],
        bump,
    )]
    /// CHECK: This is just a PDA for vault - lamports will be stored here
    pub vault: UncheckedAccount<'info>,

    /// CHECK: Revenue NFT mint - we only store the pubkey for reference
    pub revenue_nft_mint: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyRevenueNft<'info> {
    #[account(mut)]
    pub event: Account<'info, Event>,

    #[account(
        init,
        seeds = [
            b"investor",
            event.key().as_ref(),
            owner.key().as_ref()
        ],
        bump,
        payer = owner,
        space = InvestorPosition::SPACE
    )]
    pub investor_position: Account<'info, InvestorPosition>,

    #[account(mut)]
    pub buyer_funding: SystemAccount<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyTicket<'info> {
    #[account(mut)]
    pub event: Account<'info, Event>,

    #[account(
        mut,
        seeds = [b"vault", event.key().as_ref()],
        bump = event.vault_bump
    )]
    /// CHECK: Vault PDA that holds SOL
    pub vault: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = event_authority.key() == event.authority
    )]
    pub event_authority: SystemAccount<'info>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub event: Account<'info, Event>,

    #[account(
        mut,
        seeds = [b"vault", event.key().as_ref()],
        bump = event.vault_bump
    )]
    /// CHECK: Vault PDA that holds SOL
    pub vault: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = investor_position.owner == investor.key()
    )]
    pub investor_position: Account<'info, InvestorPosition>,

    #[account(mut)]
    pub investor: Signer<'info>,
}

#[account]
pub struct Event {
    pub authority: Pubkey,
    pub event_id: String,
    pub revenue_split_bps: u16,
    pub total_revenue_collected: u64,
    pub total_investor_pool: u64,
    pub revenue_nft_supply: u64,
    pub total_revenue_per_share: u128,
    pub revenue_nft_mint: Pubkey,
    pub vault: Pubkey,
    pub bump: u8,
    pub vault_bump: u8,
    pub created_at: i64,
}

impl Event {
    pub const SPACE: usize = 8 + 32 + 54 + 2 + 8 + 8 + 8 + 16 + 32 + 32 + 1 + 1 + 8;
}

#[account]
pub struct InvestorPosition {
    pub owner: Pubkey,
    pub event: Pubkey,
    pub nft_amount: u64,
    pub reward_debt: u128,
    pub bump: u8,
}

impl InvestorPosition {
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 16 + 1;
}

#[error_code]
pub enum PulseError {
    #[msg("Invalid basis points - must be between 0 and 10000")]
    InvalidBps,
    #[msg("Invalid supply - must be greater than 0")]
    InvalidSupply,
    #[msg("Invalid event ID - must be 50 characters or less")]
    InvalidEventId,
    #[msg("Invalid amount - must be greater than 0")]
    InvalidAmount,
    #[msg("Math operation overflow")]
    MathOverflow,
    #[msg("Math operation underflow")]
    MathUnderflow,
    #[msg("Nothing to claim")]
    NothingToClaim,
    #[msg("Insufficient vault balance")]
    InsufficientVaultBalance,
}
