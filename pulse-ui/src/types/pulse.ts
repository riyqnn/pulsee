// TypeScript types generated from Pulse IDL
// Program ID: DUJBE41hSUh178BujH79WtirW8p9A3aA3WNCdk6ibyPp
//
// NOTE: Input types match the deployed contract (simplified version):
// - CreateAIAgentInput has only the 7 fields required by create_ai_agent
// - ListTicketForSaleInput has only the 3 fields required by list_ticket_for_sale
//
// The full AIAgent and MarketListing account types include all fields from the IDL,
// but only the basic fields are used during creation in the deployed contract.

import { PublicKey } from '@solana/web3.js';

// ============== Enums ==============
// Anchor enums are represented as objects with variant discriminators

export type SaleType = { Fixed: {} } | { Auction: {} } | { Dutch: {} };
export type TicketStatus = { Active: {} } | { Consumed: {} } | { Cancelled: {} };

// Helper functions to create enum values
export const SaleType = {
  Fixed: (): SaleType => ({ Fixed: {} }),
  Auction: (): SaleType => ({ Auction: {} }),
  Dutch: (): SaleType => ({ Dutch: {} }),
};

export const TicketStatus = {
  Active: (): TicketStatus => ({ Active: {} }),
  Consumed: (): TicketStatus => ({ Consumed: {} }),
  Cancelled: (): TicketStatus => ({ Cancelled: {} }),
};

// Helper to get string representation of SaleType
export function getSaleTypeString(saleType: SaleType): string {
  if ('Fixed' in saleType) return 'Fixed';
  if ('Auction' in saleType) return 'Auction';
  if ('Dutch' in saleType) return 'Dutch';
  return 'Unknown';
}

// Helper to get string representation of TicketStatus
export function getTicketStatusString(status: TicketStatus): string {
  if ('Active' in status) return 'Active';
  if ('Consumed' in status) return 'Consumed';
  if ('Cancelled' in status) return 'Cancelled';
  return 'Unknown';
}

// ============== Account Types ==============

export interface AIAgent {
  owner: PublicKey;
  agentId: string;
  name: string;
  isActive: boolean;
  maxBudgetPerTicket: bigint;
  totalBudget: bigint;
  spentBudget: bigint;
  preferenceFlags: bigint;
  preferredGenres: number[];
  preferredVenues: PublicKey[];
  minEventDuration: number;
  maxEventDuration: number;
  allowedLocations: PublicKey[];
  maxDistance: number;
  preferredDays: number;
  preferredTimeStart: number;
  preferredTimeEnd: number;
  autoPurchaseEnabled: boolean;
  autoPurchaseThreshold: number;
  maxTicketsPerEvent: number;
  requireVerification: boolean;
  allowAgentCoordination: boolean;
  coordinationGroupId: string | null;
  ticketsPurchased: bigint;
  moneySaved: bigint;
  createdAt: bigint;
  lastActive: bigint;
  bump: number;
}

export interface Event {
  organizer: PublicKey;
  eventId: string;
  name: string;
  description: string;
  imageUrl: string;
  venue: string;
  eventStartTime: bigint;
  eventEndTime: bigint;
  saleStartTime: bigint;
  saleEndTime: bigint;
  isActive: boolean;
  isCancelled: boolean;
  maxTicketsPerUser: number;
  royaltyBps: number;
  totalTicketsSold: bigint;
  totalRevenue: bigint;
  bump: number;
}

export interface GlobalConfig {
  admin: PublicKey;
  protocolFeeBps: number;
  defaultPriceCapBps: number;
  minListingDuration: bigint;
  maxListingDuration: bigint;
  allowAgentCoordination: boolean;
  requireVerification: boolean;
  treasury: PublicKey;
  bump: number;
}

export interface MarketListing {
  listingId: string;
  seller: PublicKey;
  ticketMint: PublicKey;
  event: PublicKey;
  tierId: string;
  listPrice: bigint;
  minimumOffer: bigint;
  acceptOffers: boolean;
  originalPurchasePrice: bigint;
  priceAdjustmentRate: number;
  lastPriceAdjustment: bigint;
  minPrice: bigint;
  maxPrice: bigint;
  isActive: boolean;
  saleType: SaleType;
  createdAt: bigint;
  expiresAt: bigint;
  viewCount: number;
  offerCount: number;
  bump: number;
}

export interface Ticket {
  mint: PublicKey;
  event: PublicKey;
  tierId: string;
  owner: PublicKey;
  originalPrice: bigint;
  status: TicketStatus;
  purchasedAt: bigint;
  validatedAt: bigint | null;
  seatInfo: string | null;
  bump: number;
}

export interface TicketTier {
  event: PublicKey;
  tierId: string;
  name: string;
  description: string;
  price: bigint;
  maxSupply: bigint;
  currentSupply: bigint;
  isActive: boolean;
  bump: number;
}

export interface User {
  owner: PublicKey;
  username: string;
  email: string;
  ticketsOwned: bigint;
  totalSpent: bigint;
  ticketsPurchased: bigint;
  isVerified: boolean;
  bump: number;
}

// ============== Input Types ==============

export interface CreateAIAgentInput {
  agentId: string;
  name: string;
  maxBudgetPerTicket: number | bigint;
  totalBudget: number | bigint;
  autoPurchaseEnabled: boolean;
  autoPurchaseThreshold: number;
  maxTicketsPerEvent: number;
}

export interface CreateEventInput {
  eventId: string;
  name: string;
  description: string;
  imageUrl: string;
  venue: string;
  eventStartTime: number | bigint;
  eventEndTime: number | bigint;
  saleStartTime: number | bigint;
  saleEndTime: number | bigint;
  maxTicketsPerUser: number;
  royaltyBps: number;
}

export interface CreateTicketTierInput {
  tierId: string;
  name: string;
  description: string;
  price: number | bigint;
  maxSupply: number | bigint;
}

export interface CreateUserInput {
  username: string;
  email: string;
}

export interface ListTicketForSaleInput {
  listingId: string;
  listPrice: number | bigint;
  duration: number | bigint;
}

// ============== PDA Seeds ==============

export const PDA_SEEDS = {
  CONFIG: 'config',
  EVENT: 'event',
  TIER: 'tier',
  USER: 'user',
  AGENT: 'agent',
  LISTING: 'listing',
  TICKET: 'ticket',
} as const;

// ============== Error Messages ==============

export const ERROR_MESSAGES: Record<number, string> = {
  6000: 'You are not authorized to perform this action',
  6001: 'Invalid event dates. Sale must end before event starts.',
  6002: 'Event is already cancelled',
  6003: 'Sale has already started - cannot modify',
  6004: 'Invalid royalty basis points - must be 0-10000',
  6005: 'Event is not active',
  6006: 'Ticket tier not found',
  6007: 'This tier is sold out!',
  6008: 'Invalid tier price',
  6009: 'Tier is not active',
  6010: "You've reached the maximum tickets allowed for this event",
  6011: 'Insufficient funds for this purchase',
  6012: 'Agent is inactive',
  6013: 'Insufficient agent budget. Add more SOL to your agent.',
  6014: 'Listing has expired',
  6015: 'Invalid price',
  6016: 'Price exceeds maximum allowed',
  6017: 'Cannot list after event has started',
  6018: 'Ticket has been consumed and cannot be sold',
  6019: 'Math operation overflow',
  6020: 'Math operation underflow',
};

export function getErrorMessage(errorCode: number): string {
  return ERROR_MESSAGES[errorCode] || `Unknown error (${errorCode})`;
}

// ============== Utility Types ==============

export type ProgramAccount<T> = {
  publicKey: PublicKey;
  account: T;
};

export interface EventWithTiers extends Event {
  tiers: TicketTier[];
}

export interface ListingWithDetails extends MarketListing {
  eventName?: string;
  tierName?: string;
}
