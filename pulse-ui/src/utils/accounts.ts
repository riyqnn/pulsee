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
  User,
  Ticket,
  MarketListing,
  GlobalConfig,
  ProgramAccount,
} from '../types/pulse';

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
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(PDA_SEEDS.EVENT),
      organizer.toBuffer(),
      Buffer.from(eventId),
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
    [Buffer.from(PDA_SEEDS.TIER), eventPDA.toBuffer(), Buffer.from(tierId)],
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
    [Buffer.from(PDA_SEEDS.AGENT), owner.toBuffer(), Buffer.from(agentId)],
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
    const accounts = await requestQueue.add(() =>
      connection.getProgramAccounts(programId, {
        filters: [
          {
            memcmp: {
              offset: 0,
              bytes: EventDiscriminatorB58,
            },
          },
        ],
      })
    );

    return accounts.map((account) => {
      // Use Anchor's coder to properly decode the account data
      const event = decodeAccount<Event>(program, 'event', account.account.data);
      return {
        publicKey: account.pubkey,
        account: event,
      };
    });
  } catch (error) {
    console.error('[fetchAllEvents] Error:', error);
    return [];
  }
}

/**
 * Fetch a single event
 */
export async function fetchEvent(
  connection: Connection,
  eventPDA: PublicKey
): Promise<Event | null> {
  const account = await connection.getAccountInfo(eventPDA);
  if (!account) return null;
  // Skip 8-byte discriminator and parse the Event struct
  const data = account.data.subarray(8);
  return parseEventAccount(data);
}

/**
 * Parse event account data manually
 */
function parseEventAccount(data: Buffer): Event {
  let offset = 0;

  // organizer: Pubkey (32 bytes)
  const organizer = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  // event_id: String (4 bytes length + string)
  const eventIdLen = data.readUInt32LE(offset);
  offset += 4;
  const eventId = data.subarray(offset, offset + eventIdLen).toString('utf8');
  offset += eventIdLen;

  // name: String
  const nameLen = data.readUInt32LE(offset);
  offset += 4;
  const name = data.subarray(offset, offset + nameLen).toString('utf8');
  offset += nameLen;

  // description: String
  const descLen = data.readUInt32LE(offset);
  offset += 4;
  const description = data.subarray(offset, offset + descLen).toString('utf8');
  offset += descLen;

  // image_url: String
  const imageUrlLen = data.readUInt32LE(offset);
  offset += 4;
  const imageUrl = data.subarray(offset, offset + imageUrlLen).toString('utf8');
  offset += imageUrlLen;

  // venue: String
  const venueLen = data.readUInt32LE(offset);
  offset += 4;
  const venue = data.subarray(offset, offset + venueLen).toString('utf8');
  offset += venueLen;

  // event_start_time: i64 (8 bytes)
  const eventStartTime = BigInt(data.readBigInt64LE(offset));
  offset += 8;

  // event_end_time: i64
  const eventEndTime = BigInt(data.readBigInt64LE(offset));
  offset += 8;

  // sale_start_time: i64
  const saleStartTime = BigInt(data.readBigInt64LE(offset));
  offset += 8;

  // sale_end_time: i64
  const saleEndTime = BigInt(data.readBigInt64LE(offset));
  offset += 8;

  // is_active: bool (1 byte)
  const isActive = data.readUInt8(offset) !== 0;
  offset += 1;

  // is_cancelled: bool
  const isCancelled = data.readUInt8(offset) !== 0;
  offset += 1;

  // max_tickets_per_user: u32 (4 bytes)
  const maxTicketsPerUser = data.readUInt32LE(offset);
  offset += 4;

  // royalty_bps: u16 (2 bytes)
  const royaltyBps = data.readUInt16LE(offset);
  offset += 2;

  // total_tickets_sold: u64 (8 bytes)
  const totalTicketsSold = BigInt(data.readBigUInt64LE(offset));
  offset += 8;

  // total_revenue: u64
  const totalRevenue = BigInt(data.readBigUInt64LE(offset));
  offset += 8;

  // bump: u8
  const bump = data.readUInt8(offset);

  return {
    organizer,
    eventId,
    name,
    description,
    imageUrl,
    venue,
    eventStartTime: Number(eventStartTime),
    eventEndTime: Number(eventEndTime),
    saleStartTime: Number(saleStartTime),
    saleEndTime: Number(saleEndTime),
    isActive,
    isCancelled,
    maxTicketsPerUser,
    royaltyBps,
    totalTicketsSold,
    totalRevenue,
    bump,
  } as any as Event;
}

/**
 * Fetch all ticket tiers for an event
 */
export async function fetchTicketTiers(
  connection: Connection,
  eventPDA: PublicKey,
  programId: PublicKey,
  program: Program
): Promise<ProgramAccount<TicketTier>[]> {
  const accounts = await requestQueue.add(() =>
    connection.getProgramAccounts(programId, {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: TicketTierDiscriminatorB58,
          },
        },
        {
          memcmp: {
            offset: 8,
            bytes: eventPDA.toBase58(),
          },
        },
      ],
    })
  );

  return accounts.map((account) => {
    const tier = decodeAccount<TicketTier>(program, 'ticketTier', account.account.data);
    return {
      publicKey: account.pubkey,
      account: tier,
    };
  });
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
 * Parse agent account data manually
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

  // name: String
  const nameLen = data.readUInt32LE(offset);
  offset += 4;
  const name = data.subarray(offset, offset + nameLen).toString('utf8');
  offset += nameLen;

  // is_active: bool (1 byte) - NO ALIGNMENT NEEDED AFTER THIS
  const isActive = data.readUInt8(offset) !== 0;
  offset += 1;

  // max_budget_per_ticket: u64 (8 bytes) - READ IMMEDIATELY, NO ALIGNMENT
  const maxBudgetPerTicket = BigInt(data.readBigUInt64LE(offset));
  offset += 8;

  // total_budget: u64
  const totalBudget = BigInt(data.readBigUInt64LE(offset));
  offset += 8;

  // spent_budget: u64
  const spentBudget = BigInt(data.readBigUInt64LE(offset));
  offset += 8;

  // preference_flags: u64
  const preferenceFlags = BigInt(data.readBigUInt64LE(offset));
  offset += 8;

  // preferred_genres: [u8; 10]
  const preferredGenres = Array.from(data.subarray(offset, offset + 10));
  offset += 10;

  // preferred_venues: [Pubkey; 5] (5 * 32 = 160 bytes)
  const preferredVenues: PublicKey[] = [];
  for (let i = 0; i < 5; i++) {
    preferredVenues.push(new PublicKey(data.subarray(offset, offset + 32)));
    offset += 32;
  }

  // min_event_duration: u32 (4 bytes)
  const minEventDuration = data.readUInt32LE(offset);
  offset += 4;

  // max_event_duration: u32
  const maxEventDuration = data.readUInt32LE(offset);
  offset += 4;

  // allowed_locations: [Pubkey; 5]
  const allowedLocations: PublicKey[] = [];
  for (let i = 0; i < 5; i++) {
    allowedLocations.push(new PublicKey(data.subarray(offset, offset + 32)));
    offset += 32;
  }

  // max_distance: u32
  const maxDistance = data.readUInt32LE(offset);
  offset += 4;

  // preferred_days: u8
  const preferredDays = data.readUInt8(offset);
  offset += 1;

  // Align to 4-byte boundary before u32 fields (Rust struct alignment)
  while (offset % 4 !== 0) {
    offset += 1;
  }

  // preferred_time_start: u32
  const preferredTimeStart = data.readUInt32LE(offset);
  offset += 4;

  // preferred_time_end: u32
  const preferredTimeEnd = data.readUInt32LE(offset);
  offset += 4;

  // auto_purchase_enabled: bool
  const autoPurchaseEnabled = data.readUInt8(offset) !== 0;
  offset += 1;

  // auto_purchase_threshold: u16
  const autoPurchaseThreshold = data.readUInt16LE(offset);
  offset += 2;

  // max_tickets_per_event: u8
  const maxTicketsPerEvent = data.readUInt8(offset);
  offset += 1;

  // require_verification: bool
  const requireVerification = data.readUInt8(offset) !== 0;
  offset += 1;

  // allow_agent_coordination: bool
  const allowAgentCoordination = data.readUInt8(offset) !== 0;
  offset += 1;

  // coordination_group_id: Option<String> (1 byte flag + length + string)
  const hasGroupId = data.readUInt8(offset) !== 0;
  offset += 1;
  let coordinationGroupId: string | null = null;
  if (hasGroupId) {
    const groupIdLen = data.readUInt32LE(offset);
    offset += 4;
    coordinationGroupId = data.subarray(offset, offset + groupIdLen).toString('utf8');
    offset += groupIdLen;
  }

  // Align to 8-byte boundary before u64 (tickets_purchased)
  while (offset % 8 !== 0) {
    offset += 1;
  }

  // tickets_purchased: u64
  const ticketsPurchased = BigInt(data.readBigUInt64LE(offset));
  offset += 8;

  // money_saved: u64
  const moneySaved = BigInt(data.readBigUInt64LE(offset));
  offset += 8;

  // created_at: i64
  const createdAt = BigInt(data.readBigUInt64LE(offset));
  offset += 8;

  // last_active: i64
  const lastActive = BigInt(data.readBigUInt64LE(offset));
  offset += 8;

  // bump: u8
  const bump = data.readUInt8(offset);

  return {
    owner,
    agentId,
    name,
    isActive,
    maxBudgetPerTicket,
    totalBudget,
    spentBudget,
    preferenceFlags,
    preferredGenres,
    preferredVenues,
    minEventDuration,
    maxEventDuration,
    allowedLocations,
    maxDistance,
    preferredDays,
    preferredTimeStart,
    preferredTimeEnd,
    autoPurchaseEnabled,
    autoPurchaseThreshold,
    maxTicketsPerEvent,
    requireVerification,
    allowAgentCoordination,
    coordinationGroupId,
    ticketsPurchased,
    moneySaved,
    createdAt,
    lastActive,
    bump,
  };
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
 * Fetch a user account
 */
export async function fetchUser(
  connection: Connection,
  userPDA: PublicKey
): Promise<User | null> {
  const account = await connection.getAccountInfo(userPDA);
  if (!account) return null;
  // Skip 8-byte discriminator
  const data = account.data.subarray(8);
  return data as unknown as User;
}

/**
 * Fetch all active market listings
 */
export async function fetchAllListings(
  connection: Connection,
  programId: PublicKey
): Promise<ProgramAccount<MarketListing>[]> {
  const accounts = await requestQueue.add(() =>
    connection.getProgramAccounts(programId, {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: MarketListingDiscriminatorB58,
          },
        },
      ],
    })
  );

  return accounts.map((account) => {
    // Skip 8-byte discriminator
    const data = account.account.data.subarray(8);
    return {
      publicKey: account.pubkey,
      account: data as unknown as MarketListing,
    };
  });
}

/**
 * Fetch a single market listing
 */
export async function fetchListing(
  connection: Connection,
  listingPDA: PublicKey
): Promise<MarketListing | null> {
  const account = await connection.getAccountInfo(listingPDA);
  if (!account) return null;
  // Skip 8-byte discriminator
  const data = account.data.subarray(8);
  return data as unknown as MarketListing;
}

/**
 * Fetch global config
 */
export async function fetchConfig(
  connection: Connection,
  programId: PublicKey
): Promise<GlobalConfig | null> {
  const [configPDA] = getConfigPDA(programId);
  const account = await connection.getAccountInfo(configPDA);
  if (!account) return null;
  // Skip 8-byte discriminator
  const data = account.data.subarray(8);
  return data as unknown as GlobalConfig;
}

/**
 * Fetch all tickets owned by a user
 */
export async function fetchUserTickets(
  connection: Connection,
  owner: PublicKey,
  programId: PublicKey
): Promise<ProgramAccount<Ticket>[]> {
  const accounts = await requestQueue.add(() =>
    connection.getProgramAccounts(programId, {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: TicketDiscriminatorB58,
          },
        },
        {
          memcmp: {
            offset: 8 + 32 + 32 + 32,
            bytes: owner.toBase58(),
          },
        },
      ],
    })
  );

  return accounts.map((account) => {
    // Skip 8-byte discriminator
    const data = account.account.data.subarray(8);
    return {
      publicKey: account.pubkey,
      account: data as unknown as Ticket,
    };
  });
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
