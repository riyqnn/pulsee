use anchor_lang::prelude::*;

use crate::state::GlobalConfig;
use crate::error::TixError;

/// =====================================
/// INSTRUCTIONS
/// =====================================

pub fn initialize_config(
    ctx: Context<InitializeConfig>,
    protocol_fee_bps: u16,
    default_price_cap_bps: u16,
    min_listing_duration: i64,
    max_listing_duration: i64,
    allow_agent_coordination: bool,
    require_verification: bool,
) -> Result<()> {
    let config = &mut ctx.accounts.config;

    require!(protocol_fee_bps <= 10000, TixError::InvalidRoyaltyBps);
    require!(default_price_cap_bps <= 10000, TixError::InvalidRoyaltyBps);
    require!(min_listing_duration > 0, TixError::InvalidEventTiming);
    require!(max_listing_duration > min_listing_duration, TixError::InvalidEventTiming);

    config.admin = ctx.accounts.admin.key();
    config.protocol_fee_bps = protocol_fee_bps;
    config.default_price_cap_bps = default_price_cap_bps;
    config.min_listing_duration = min_listing_duration;
    config.max_listing_duration = max_listing_duration;
    config.allow_agent_coordination = allow_agent_coordination;
    config.require_verification = require_verification;
    config.treasury = ctx.accounts.admin.key(); // Default to admin
    config.bump = ctx.bumps.config;

    msg!("Global config initialized");
    Ok(())
}

pub fn update_config(
    ctx: Context<UpdateConfig>,
    protocol_fee_bps: Option<u16>,
    default_price_cap_bps: Option<u16>,
    min_listing_duration: Option<i64>,
    max_listing_duration: Option<i64>,
    allow_agent_coordination: Option<bool>,
    require_verification: Option<bool>,
    treasury: Option<Pubkey>,
) -> Result<()> {
    let config = &mut ctx.accounts.config;

    if let Some(fee) = protocol_fee_bps {
        require!(fee <= 10000, TixError::InvalidRoyaltyBps);
        config.protocol_fee_bps = fee;
    }

    if let Some(cap) = default_price_cap_bps {
        require!(cap <= 10000, TixError::InvalidRoyaltyBps);
        config.default_price_cap_bps = cap;
    }

    if let Some(min_duration) = min_listing_duration {
        require!(min_duration > 0, TixError::InvalidEventTiming);
        config.min_listing_duration = min_duration;
    }

    if let Some(max_duration) = max_listing_duration {
        require!(max_duration > config.min_listing_duration, TixError::InvalidEventTiming);
        config.max_listing_duration = max_duration;
    }

    if let Some(allowed) = allow_agent_coordination {
        config.allow_agent_coordination = allowed;
    }

    if let Some(required) = require_verification {
        config.require_verification = required;
    }

    if let Some(new_treasury) = treasury {
        config.treasury = new_treasury;
    }

    msg!("Config updated");
    Ok(())
}

/// =====================================
/// CONTEXTS
/// =====================================

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        seeds = [b"config"],
        bump,
        payer = admin,
        space = GlobalConfig::SPACE
    )]
    pub config: Account<'info, GlobalConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.admin == admin.key() @ TixError::InvalidAuthority
    )]
    pub config: Account<'info, GlobalConfig>,

    pub admin: Signer<'info>,
}
