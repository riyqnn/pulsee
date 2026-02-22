use anchor_lang::prelude::*;
use crate::error::TixError;

/// Math utility functions with overflow protection

pub fn calculate_percentage(amount: u64, bps: u16) -> Result<u64> {
    let result = (amount as u128)
        .checked_mul(bps as u128)
        .ok_or(TixError::MathOverflow)?
        .checked_div(10000)
        .ok_or(TixError::MathOverflow)?;

    Ok(result as u64)
}

pub fn calculate_percentage_with_rounding(amount: u64, bps: u16) -> Result<u64> {
    let result = (amount as u128)
        .checked_mul(bps as u128)
        .ok_or(TixError::MathOverflow)?
        .checked_add(5000)
        .ok_or(TixError::MathOverflow)?
        .checked_div(10000)
        .ok_or(TixError::MathOverflow)?;

    Ok(result as u64)
}

pub fn safe_add(a: u64, b: u64) -> Result<u64> {
    a.checked_add(b).ok_or(TixError::MathOverflow.into())
}

pub fn safe_sub(a: u64, b: u64) -> Result<u64> {
    a.checked_sub(b).ok_or(TixError::MathUnderflow.into())
}

pub fn safe_mul(a: u64, b: u64) -> Result<u64> {
    a.checked_mul(b).ok_or(TixError::MathOverflow.into())
}

pub fn safe_div(a: u64, b: u64) -> Result<u64> {
    require!(b > 0, TixError::MathOverflow);
    Ok(a / b)
}

pub fn safe_add_u128(a: u128, b: u128) -> Result<u128> {
    a.checked_add(b).ok_or(TixError::MathOverflow.into())
}

pub fn safe_sub_u128(a: u128, b: u128) -> Result<u128> {
    a.checked_sub(b).ok_or(TixError::MathUnderflow.into())
}

pub fn safe_mul_u128(a: u128, b: u128) -> Result<u128> {
    a.checked_mul(b).ok_or(TixError::MathOverflow.into())
}

pub fn safe_div_u128(a: u128, b: u128) -> Result<u128> {
    require!(b > 0, TixError::MathOverflow);
    Ok(a / b)
}
