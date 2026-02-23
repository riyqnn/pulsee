use anchor_lang::prelude::*;

#[error_code]
pub enum TixError {
    #[msg("Invalid input")]
    InvalidInput,
    #[msg("Invalid fee basis points - must be 0-10000")]
    InvalidFeeBps,
    #[msg("Event is not active")]
    EventNotActive,
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("Invalid supply")]
    InvalidSupply,
    #[msg("Invalid budget")]
    InvalidBudget,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Agent is inactive")]
    AgentInactive,
    #[msg("Auto-purchase is not enabled for this agent")]
    AutoPurchaseDisabled,
    #[msg("Insufficient agent budget")]
    InsufficientAgentBudget,
    #[msg("Tier is sold out")]
    TierSoldOut,
    #[msg("Tier is not active")]
    TierNotActive,
    #[msg("Insufficient escrow balance")]
    InsufficientEscrowBalance,
    #[msg("Math operation overflow")]
    MathOverflow,
    #[msg("Math operation underflow")]
    MathUnderflow,
}
