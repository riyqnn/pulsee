// Account utilities for Pulse program
// PDA derivation and account fetching utilities

import { PublicKey, Connection } from '@solana/web3.js';
import bs58 from 'bs58';
import { Program } from '@coral-xyz/anchor';
import {
  PDA_SEEDS,
} from '../types/pulse';
import type {
  Event,
  TicketTier,
  AIAgent,
  AgentEscrow,
  ProgramAccount,
} from '../types/pulse';

// Removed types (no longer in simplified MVP):
// User, Ticket, MarketListing, GlobalConfig - use Supabase for offchain data

// ============== Program Constants ==============

export const PROGRAM_ID = new PublicKey('5fQA4eCdUtCJPDhjGfb6nn47RhVfKJT2dW5iHuQaeH2n');

// ============== Request Throttling ==============

/**
 * Simple request queue to prevent rate limiting
 * Ensures only one getProgramAccounts call at a time with exponential backoff
 */
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private baseDelayMs = 500; // Base delay between requests (500ms)

  async add<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        let lastError: any;
        let delay = this.baseDelayMs;

        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            const result = await fn();
            resolve(result);
            return;
          } catch (error: any) {
            lastError = error;
            
            // Check for rate limit error
            if (error?.message?.includes('429') || error?.status === 429) {
              if (attempt < retries) {
                await new Promise(r => setTimeout(r, delay));
                delay *= 2; // Exponential backoff
                continue;
              }
            }
            // Non-429 errors fail immediately
            throw error;
          }
        }
        
        reject(lastError);
      });
      this.process();
    });
  }

  private async process() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    while (this.queue.length > 0) {
      const fn = this.queue.shift();
      if (fn) {
        await fn();
        // Add delay between requests to avoid hammering the RPC
        await new Promise(resolve => setTimeout(resolve, this.baseDelayMs));
      }
    }
    this.isProcessing = false;
  }
}

const requestQueue = new RequestQueue();

// ============== PDA Derivation ==============

/**
 * Derive the config PDA
 */
export function getConfigPDA(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.CONFIG)],
    programId
  );
}

/**
 * Derive an event PDA
 */
export function getEventPDA(
  organizer: PublicKey,
  eventId: string,
  programId: PublicKey
): [PublicKey, number] {
  const eventIdBuffer = Buffer.from(eventId);
  
  if (eventIdBuffer.length > 32) {
    throw new Error(`Event ID is too long (${eventIdBuffer.length} bytes). Max is 32 bytes.`);
  }

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("event"),
      organizer.toBuffer(),
      eventIdBuffer,
    ],
    programId
  );
}

/**
 * Derive a ticket tier PDA
 */
export function getTierPDA(
  eventPDA: PublicKey,
  tierId: string,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("tier"), // Sesuaikan dengan b"tier" di Rust
      eventPDA.toBuffer(), 
      Buffer.from(tierId)
    ],
    programId
  );
}

/**
 * Derive a user PDA
 */
export function getUserPDA(
  owner: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.USER), owner.toBuffer()],
    programId
  );
}

/**
 * Derive an AI agent PDA
 */
export function getAgentPDA(
  owner: PublicKey,
  agentId: string,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("agent"), 
      owner.toBuffer(), 
      Buffer.from(agentId)
    ],
    programId
  );
}

/**
 * Derive a market listing PDA
 */
export function getListingPDA(
  ticketMint: PublicKey,
  listingId: string,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(PDA_SEEDS.LISTING),
      ticketMint.toBuffer(),
      Buffer.from(listingId),
    ],
    programId
  );
}

/**
 * Derive a ticket PDA
 */
export function getTicketPDA(
  mint: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.TICKET), mint.toBuffer()],
    programId
  );
}

/**
 * Derive an escrow PDA
 */
export function getEscrowPDA(
  agentPDA: PublicKey,
  owner: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("escrow"), 
      agentPDA.toBuffer(), 
      owner.toBuffer()
    ],
    programId
  );
}

// ============== Discriminators ==============
// Converted to base58 strings for memcmp filters

export const EventDiscriminator = Buffer.from([
  125, 192, 125, 158, 9, 115, 152, 233,
]);
export const EventDiscriminatorB58 = bs58.encode(EventDiscriminator);

export const TicketTierDiscriminator = Buffer.from([
  123, 241, 89, 61, 59, 46, 145, 242,
]);
export const TicketTierDiscriminatorB58 = bs58.encode(TicketTierDiscriminator);

export const AgentDiscriminator = Buffer.from([
  235, 115, 232, 223, 99, 222, 244, 129,
]);
export const AgentDiscriminatorB58 = bs58.encode(AgentDiscriminator);

export const UserDiscriminator = Buffer.from([
  159, 117, 95, 227, 239, 151, 58, 236,
]);
export const UserDiscriminatorB58 = bs58.encode(UserDiscriminator);

export const MarketListingDiscriminator = Buffer.from([
  175, 123, 31, 97, 53, 211, 229, 16,
]);
export const MarketListingDiscriminatorB58 = bs58.encode(MarketListingDiscriminator);

export const TicketDiscriminator = Buffer.from([
  41, 228, 24, 165, 78, 90, 235, 200,
]);
export const TicketDiscriminatorB58 = bs58.encode(TicketDiscriminator);

export const GlobalConfigDiscriminator = Buffer.from([
  149, 8, 156, 202, 160, 252, 176, 217,
]);
export const GlobalConfigDiscriminatorB58 = bs58.encode(GlobalConfigDiscriminator);

export const AgentEscrowDiscriminator = Buffer.from([
  26, 63, 32, 229, 41, 3, 31, 173, // account:AgentEscrow
]);
export const AgentEscrowDiscriminatorB58 = bs58.encode(AgentEscrowDiscriminator);

// ============== Account Decoding Helper ==============
/**
 * Decode Anchor account data using the program's coder
 * NOTE: Pass full data (with discriminator), coder will handle it
 */
function decodeAccount<T>(program: Program, typeName: string, data: Buffer): T {
  // Don't skip discriminator - Anchor Coder needs the full data
  return program.coder.accounts.decode(typeName, data) as T;
}

// ============== Account Fetching ==============

/**
 * Fetch all events for the program
 */
export async function fetchAllEvents(
  connection: Connection,
  programId: PublicKey,
  program: Program
): Promise<ProgramAccount<Event>[]> {
  try {
    const accounts = await connection.getProgramAccounts(programId, {
      filters: [{ memcmp: { offset: 0, bytes: EventDiscriminatorB58 } }],
    });

    console.log(`[fetchAllEvents] Raw accounts found: ${accounts.length}`);

    return accounts.map((account) => {
      try {
        // Dekode otomatis pake Anchor Coder
        const decoded = program.coder.accounts.decode('event', account.account.data) as Event;
        return {
          publicKey: account.pubkey,
          account: decoded,
        };
      } catch (e) {
        console.error("Gagal decode event:", account.pubkey.toBase58());
        return null;
      }
    }).filter(e => e !== null) as ProgramAccount<Event>[];
  } catch (error) {
    console.error('[fetchAllEvents] Error:', error);
    return [];
  }
}



/**
 * Fetch a single event
 */
// Lakukan hal yang sama buat fetchEvent tunggal:
export async function fetchEvent(
  connection: Connection,
  eventPDA: PublicKey,
  program: Program // Tambahin parameter program
): Promise<Event | null> {
  const account = await connection.getAccountInfo(eventPDA);
  if (!account) return null;
  try {
    return program.coder.accounts.decode('event', account.data) as Event;
  } catch (e) {
    return null;
  }
}

/**
 * Parse event account data manually (Simplified MVP version)
 */
// function parseEventAccount(data: Buffer): Event {
//   let offset = 0;

//   // organizer: Pubkey (32 bytes)
//   const organizer = new PublicKey(data.subarray(offset, offset + 32));
//   offset += 32;

//   // event_id: String
//   const eventIdLen = data.readUInt32LE(offset); offset += 4;
//   const eventId = data.subarray(offset, offset + eventIdLen).toString('utf8');
//   offset += eventIdLen;

//   // name: String
//   const nameLen = data.readUInt32LE(offset); offset += 4;
//   const name = data.subarray(offset, offset + nameLen).toString('utf8');
//   offset += nameLen;

//   // description: String
//   const descLen = data.readUInt32LE(offset); offset += 4;
//   const description = data.subarray(offset, offset + descLen).toString('utf8');
//   offset += descLen;

//   // image_url: String
//   const imgLen = data.readUInt32LE(offset); offset += 4;
//   const imageUrl = data.subarray(offset, offset + imgLen).toString('utf8');
//   offset += imgLen;

//   // location: String
//   const locLen = data.readUInt32LE(offset); offset += 4;
//   const location = data.subarray(offset, offset + locLen).toString('utf8');
//   offset += locLen;

//   // Timestamps & Stats
//   const eventStart = new BN(data.subarray(offset, offset + 8), 'le'); offset += 8;
//   const eventEnd = new BN(data.subarray(offset, offset + 8), 'le'); offset += 8;
//   const saleStart = new BN(data.subarray(offset, offset + 8), 'le'); offset += 8;
//   const saleEnd = new BN(data.subarray(offset, offset + 8), 'le'); offset += 8;
//   const maxTicketsPerUser = data.readUInt32LE(offset); offset += 4;
//   const organizerFeeBps = data.readUInt16LE(offset); offset += 2;
//   const totalTicketsSold = new BN(data.subarray(offset, offset + 8), 'le'); offset += 8;
//   const totalRevenue = new BN(data.subarray(offset, offset + 8), 'le'); offset += 8;
//   const isActive = data.readUInt8(offset) !== 0; offset += 1;
//   const createdAt = new BN(data.subarray(offset, offset + 8), 'le'); offset += 8;
//   const bump = data.readUInt8(offset);

//   return {
//     organizer, eventId, name, description, imageUrl, location,
//     eventStart, eventEnd, saleStart, saleEnd, maxTicketsPerUser,
//     organizerFeeBps, totalTicketsSold, totalRevenue, isActive, createdAt, bump
//   } as any;
// }

/**
 * Fetch all ticket tiers for an event
 */
export async function fetchTicketTiers(
  connection: Connection,
  eventPDA: PublicKey,
  programId: PublicKey,
  program: Program
): Promise<ProgramAccount<TicketTier>[]> {
  const accounts = await connection.getProgramAccounts(programId, {
    filters: [
      { memcmp: { offset: 0, bytes: TicketTierDiscriminatorB58 } },
      { memcmp: { offset: 8, bytes: eventPDA.toBase58() } },
    ],
  });

  return accounts.map((account) => ({
    publicKey: account.pubkey,
    account: program.coder.accounts.decode('ticketTier', account.account.data) as TicketTier,
  }));
}

/**
 * Fetch a single ticket tier
 */
export async function fetchTier(
  connection: Connection,
  tierPDA: PublicKey
): Promise<TicketTier | null> {
  const account = await connection.getAccountInfo(tierPDA);
  if (!account) return null;
  // Skip 8-byte discriminator
  const data = account.data.subarray(8);
  return data as unknown as TicketTier;
}

/**
 * Fetch all AI agents for an owner
 */
export async function fetchUserAgents(
  connection: Connection,
  owner: PublicKey,
  programId: PublicKey
): Promise<ProgramAccount<AIAgent>[]> {
  // Fetch all agent accounts for this owner using request queue with retry logic
  const accounts = await requestQueue.add(() =>
    connection.getProgramAccounts(programId, {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: AgentDiscriminatorB58,
          },
        },
      ],
    })
  );

  // Filter by owner and parse manually
  return accounts
    .filter((account) => {
      // Check if owner matches (owner is at bytes 8-39 after 8-byte discriminator)
      const accountOwner = new PublicKey(account.account.data.subarray(8, 40));
      return accountOwner.equals(owner);
    })
    .map((account) => {
      // Parse using manual parser
      const data = account.account.data.subarray(8);
      const agent = parseAgentAccount(data);
      return {
        publicKey: account.pubkey,
        account: agent,
      };
    });
}


/**
 * Parse agent account data manually (Simplified MVP version)
 */
function parseAgentAccount(data: Buffer): AIAgent {
  let offset = 0;

  // owner: Pubkey (32 bytes)
  const owner = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  // agent_id: String (4 bytes length + string)
  const agentIdLen = data.readUInt32LE(offset);
  offset += 4;
  const agentId = data.subarray(offset, offset + agentIdLen).toString('utf8');
  offset += agentIdLen;

  // is_active: bool (1 byte)
  const isActive = data.readUInt8(offset) !== 0;
  offset += 1;

  // auto_purchase_enabled: bool (1 byte)
  const autoPurchaseEnabled = data.readUInt8(offset) !== 0;
  offset += 1;

  // auto_purchase_threshold: u16 (2 bytes)
  const autoPurchaseThreshold = data.readUInt16LE(offset);
  offset += 2;

  // max_budget_per_ticket: u64 (8 bytes)
  const maxBudgetPerTicket = BigInt(data.readBigUInt64LE(offset));
  offset += 8;

  // total_budget: u64
  const totalBudget = BigInt(data.readBigUInt64LE(offset));
  offset += 8;

  // spent_budget: u64
  const spentBudget = BigInt(data.readBigUInt64LE(offset));
  offset += 8;

  // tickets_purchased: u64
  const ticketsPurchased = BigInt(data.readBigUInt64LE(offset));
  offset += 8;

  // created_at: i64
  const createdAt = BigInt(data.readBigUInt64LE(offset));
  offset += 8;

  // bump: u8
  const bump = data.readUInt8(offset);

  return {
    owner,
    agentId,
    isActive,
    autoPurchaseEnabled,
    autoPurchaseThreshold,
    maxBudgetPerTicket,
    totalBudget,
    spentBudget,
    ticketsPurchased,
    createdAt,
    bump,
  } as any as AIAgent;
}

/**
 * Fetch a single AI agent
 */
export async function fetchAgent(
  connection: Connection,
  agentPDA: PublicKey
): Promise<AIAgent | null> {
  const account = await connection.getAccountInfo(agentPDA);
  if (!account) return null;
  // Skip 8-byte discriminator
  const data = account.data.subarray(8);
  return parseAgentAccount(data);
}

/**
 * Fetch an escrow account
 */
export async function fetchEscrow(
  connection: Connection,
  escrowPDA: PublicKey
): Promise<AgentEscrow | null> {
  const account = await connection.getAccountInfo(escrowPDA);
  if (!account) return null;
  // Skip 8-byte discriminator
  const data = account.data.subarray(8);
  return parseEscrowAccount(data);
}

/**
 * Parse escrow account data manually
 */
function parseEscrowAccount(data: Buffer): AgentEscrow {
  let offset = 0;

  // agent: Pubkey (32 bytes)
  const agent = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  // owner: Pubkey (32 bytes)
  const owner = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  // balance: u64 (8 bytes)
  const balance = BigInt(data.readBigUInt64LE(offset));
  offset += 8;

  // total_deposited: u64
  const totalDeposited = BigInt(data.readBigUInt64LE(offset));
  offset += 8;

  // total_withdrawn: u64
  const totalWithdrawn = BigInt(data.readBigUInt64LE(offset));
  offset += 8;

  // total_spent: u64
  const totalSpent = BigInt(data.readBigUInt64LE(offset));
  offset += 8;

  // created_at: i64
  const createdAt = BigInt(data.readBigUInt64LE(offset));
  offset += 8;

  // last_activity: i64
  const lastActivity = BigInt(data.readBigUInt64LE(offset));
  offset += 8;

  // bump: u8
  const bump = data.readUInt8(offset);

  return {
    agent,
    owner,
    balance,
    totalDeposited,
    totalWithdrawn,
    totalSpent,
    createdAt,
    lastActivity,
    bump,
  };
}

// ============== REMOVED IN MVP ==============
// The following types are removed in simplified MVP - use Supabase for offchain data:
// User, Ticket, MarketListing, GlobalConfig

/**
 * Fetch a user account - REMOVED in MVP, use wallet address directly
 */
export async function fetchUser(
  _connection: Connection,
  _userPDA: PublicKey
): Promise<null> {
  // Not implemented in simplified MVP
  return null;
}

/**
 * Fetch all active market listings - REMOVED in MVP
 */
export async function fetchAllListings(
  _connection: Connection,
  _programId: PublicKey
): Promise<never[]> {
  // Not implemented in simplified MVP - secondary market removed
  return [];
}

/**
 * Fetch a single market listing - REMOVED in MVP
 */
export async function fetchListing(
  _connection: Connection,
  _listingPDA: PublicKey
): Promise<null> {
  // Not implemented in simplified MVP
  return null;
}

/**
 * Fetch global config - REMOVED in MVP
 */
export async function fetchConfig(
  _connection: Connection,
  _programId: PublicKey
): Promise<null> {
  // Not implemented in simplified MVP
  return null;
}

/**
 * Fetch all tickets owned by a user - REMOVED in MVP
 */
export async function fetchUserTickets(
  _connection: Connection,
  _owner: PublicKey,
  _programId: PublicKey
): Promise<never[]> {
  // Not implemented in simplified MVP - tickets managed offchain
  return [];
}

// ============== Utility Functions ==============

/**
 * Convert bigint or number to SOL string
 */
export function lamportsToSol(amount: number | bigint): string {
  const lamports = typeof amount === 'bigint' ? Number(amount) : amount;
  return (lamports / 1_000_000_000).toFixed(4);
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}

/**
 * Format a timestamp to a readable date string
 */
export function formatTimestamp(timestamp: number | bigint): string {
  const ts = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
  return new Date(ts * 1000).toLocaleString();
}

/**
 * Check if a sale is currently active
 */
export function isSaleActive(
  saleStartTime: number | bigint,
  saleEndTime: number | bigint
): boolean {
  const now = Math.floor(Date.now() / 1000);
  const start = typeof saleStartTime === 'bigint' ? Number(saleStartTime) : saleStartTime;
  const end = typeof saleEndTime === 'bigint' ? Number(saleEndTime) : saleEndTime;

  return now >= start && now <= end;
}

/**
 * Check if an event is currently ongoing
 */
export function isEventOngoing(
  eventStartTime: number | bigint,
  eventEndTime: number | bigint
): boolean {
  const now = Math.floor(Date.now() / 1000);
  const start = typeof eventStartTime === 'bigint' ? Number(eventStartTime) : eventStartTime;
  const end = typeof eventEndTime === 'bigint' ? Number(eventEndTime) : eventEndTime;

  return now >= start && now <= end;
}

/**
 * Calculate time remaining in seconds
 */
export function getTimeRemaining(endTime: number | bigint): number {
  const end = typeof endTime === 'bigint' ? Number(endTime) : endTime;
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, end - now);
}
