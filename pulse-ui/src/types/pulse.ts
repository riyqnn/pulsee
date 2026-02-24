/**
 * Simplified Types for PULSE MVP
 * Matches the new simplified smart contract
 */

// ============== Type Exports ==============

export interface Event {
  organizer: PublicKey;
  eventId: string;
  name: string;          // Tambah
  description: string;   // Tambah
  imageUrl: string;      // Tambah
  location: string;      // Tambah
  eventStart: BN;        // Tambah (pakai BN karena i64)
  eventEnd: BN;
  saleStart: BN;
  saleEnd: BN;
  maxTicketsPerUser: number;
  organizerFeeBps: number;
  totalTicketsSold: BN;
  totalRevenue: BN;
  isActive: boolean;
  createdAt: BN;
  bump: number;
}

export interface TicketTier {
  event: PublicKey;
  tierId: string;
  name: string;        // Tambah
  description: string; // Tambah
  price: BN;
  maxSupply: BN;
  currentSupply: BN;
  isActive: boolean;
  bump: number;
}

export interface AIAgent {
  owner: PublicKey;
  agentId: string;
  isActive: boolean;
  autoPurchaseEnabled: boolean;
  autoPurchaseThreshold: number;
  maxBudgetPerTicket: bigint;
  totalBudget: bigint;
  spentBudget: bigint;
  ticketsPurchased: bigint;
  createdAt: bigint;
  bump: number;
}

export interface AgentEscrow {
  agent: PublicKey;
  owner: PublicKey;
  balance: bigint;
  totalDeposited: bigint;
  totalWithdrawn: bigint;
  totalSpent: bigint;
  createdAt: bigint;
  lastActivity: bigint;
  bump: number;
}

export interface ProgramAccount<T> {
  publicKey: PublicKey;
  account: T;
}

export interface EventWithTiers extends ProgramAccount<Event> {
  tiers: TicketTier[];  // Just the account data, not ProgramAccount
}

// ============== Input Types ==============

export interface CreateAgentInput {
  agentId: string;
  maxBudgetPerTicket: number | bigint;
  totalBudget: number | bigint;
  autoPurchaseEnabled?: boolean;
  autoPurchaseThreshold?: number;
}

export interface CreateEventInput {
  eventId: string;
  organizerFeeBps: number;
}

export interface CreateTicketTierInput {
  tierId: string;
  price: number | bigint;
  maxSupply: number | bigint;
}

// ============== PDA Seeds ==============

export const PDA_SEEDS = {
  CONFIG: 'config',
  EVENT: 'event',
  TIER: 'tier',
  AGENT: 'agent',
  USER: 'user',
  TICKET: 'ticket',
  LISTING: 'listing',
  ESCROW: 'escrow',
} as const;

// ============== Utility Functions ==============

export function getErrorMessage(error: any): string {
  if (error?.message) {
    return error.message;
  }
  if (error?.toString) {
    return error.toString();
  }
  return 'Unknown error';
}

// ============== Type Guards ==============

export function isEvent(obj: any): obj is Event {
  return obj && typeof obj.eventId === 'string' && typeof obj.organizer !== 'undefined';
}

export function isAIAgent(obj: any): obj is AIAgent {
  return obj && typeof obj.agentId === 'string' && typeof obj.owner !== 'undefined';
}

export function isAgentEscrow(obj: any): obj is AgentEscrow {
  return obj && typeof obj.balance !== 'undefined' && typeof obj.agent !== 'undefined';
}

import type { BN } from '@coral-xyz/anchor';
// ============== Type Imports ==============

import { PublicKey } from '@solana/web3.js';
