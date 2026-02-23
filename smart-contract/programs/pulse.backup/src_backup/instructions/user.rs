use anchor_lang::prelude::*;

use crate::state::User;
use crate::error::TixError;

/// =====================================
/// INSTRUCTIONS
/// =====================================

pub fn create_user(
    ctx: Context<CreateUser>,
    username: String,
    email: String,
) -> Result<()> {
    let user = &mut ctx.accounts.user;

    require!(username.len() <= 30, TixError::InvalidEventTiming);
    require!(email.len() <= 100, TixError::InvalidEventTiming);

    user.owner = ctx.accounts.owner.key();
    user.username = username;
    user.email = email;
    user.tickets_owned = 0;
    user.total_spent = 0;
    user.tickets_purchased = 0;
    user.is_verified = false;
    user.bump = ctx.bumps.user;

    msg!("User created: {}", user.username);
    Ok(())
}

pub fn update_user_profile(
    ctx: Context<UpdateUserProfile>,
    username: Option<String>,
    email: Option<String>,
) -> Result<()> {
    let user = &mut ctx.accounts.user;

    if let Some(new_username) = username {
        require!(new_username.len() <= 30, TixError::InvalidEventTiming);
        user.username = new_username;
    }

    if let Some(new_email) = email {
        require!(new_email.len() <= 100, TixError::InvalidEventTiming);
        user.email = new_email;
    }

    msg!("User profile updated");
    Ok(())
}

/// =====================================
/// CONTEXTS
/// =====================================

#[derive(Accounts)]
pub struct CreateUser<'info> {
    #[account(
        init,
        seeds = [b"user", owner.key().as_ref()],
        bump,
        payer = owner,
        space = User::SPACE
    )]
    pub user: Account<'info, User>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateUserProfile<'info> {
    #[account(
        mut,
        seeds = [b"user", owner.key().as_ref()],
        bump = user.bump,
        constraint = user.owner == owner.key() @ TixError::InvalidAuthority
    )]
    pub user: Account<'info, User>,

    pub owner: Signer<'info>,
}
