use anchor_lang::prelude::*;

#[error_code]
pub enum TixError {
    // Admin
    #[msg("Invalid authority - not the admin")]
    InvalidAuthority,
    #[msg("Config already initialized")]
    ConfigAlreadyInitialized,

    // Events
    #[msg("Invalid event timing - sale end must be before event start")]
    InvalidEventTiming,
    #[msg("Event is already cancelled")]
    EventAlreadyCancelled,
    #[msg("Sale has already started - cannot modify")]
    SaleAlreadyStarted,
    #[msg("Invalid royalty basis points - must be 0-10000")]
    InvalidRoyaltyBps,
    #[msg("Event is not active")]
    EventNotActive,

    // Tiers
    #[msg("Ticket tier not found")]
    TierNotFound,
    #[msg("Ticket tier is sold out")]
    TierSoldOut,
    #[msg("Invalid tier price")]
    InvalidTierPrice,
    #[msg("Tier is not active")]
    TierNotActive,

    // Users
    #[msg("Maximum tickets per user exceeded")]
    MaxTicketsPerUserExceeded,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("User already has ticket for this tier")]
    AlreadyHasTicket,

    // Agents
    #[msg("Agent is inactive")]
    AgentInactive,
    #[msg("Insufficient agent budget")]
    InsufficientAgentBudget,
    #[msg("Event does not match agent preferences")]
    PreferenceMismatch,
    #[msg("Agent is not the coordinator")]
    AgentNotCoordinator,
    #[msg("Agent auto-purchase is disabled")]
    AgentAutoPurchaseDisabled,

    // Marketplace
    #[msg("Listing has expired")]
    ListingExpired,
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("Price exceeds maximum allowed")]
    PriceCapExceeded,
    #[msg("Offer has expired")]
    OfferExpired,
    #[msg("No active offer found")]
    NoActiveOffer,
    #[msg("Ticket is already listed")]
    AlreadyListed,
    #[msg("Cannot list after event has started")]
    CannotListAfterEventStart,
    #[msg("Ticket has been consumed and cannot be sold")]
    TicketConsumed,

    // Ticket Validation
    #[msg("Ticket is not valid for this event")]
    TicketNotValid,
    #[msg("Event is not currently ongoing")]
    EventNotOngoing,
    #[msg("Ticket already consumed")]
    TicketAlreadyConsumed,
    #[msg("Ticket is cancelled")]
    TicketCancelled,

    // Math
    #[msg("Math operation overflow")]
    MathOverflow,
    #[msg("Math operation underflow")]
    MathUnderflow,

    // General
    #[msg("Invalid PDA derivation")]
    InvalidPDA,
    #[msg("Unauthorized action")]
    Unauthorized,
}
