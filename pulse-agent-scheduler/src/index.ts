import {
  Connection,
  PublicKey,
  Keypair,
} from '@solana/web3.js';
import cron from 'node-cron';
import {
  Program,
  AnchorProvider,
  Wallet,
  setProvider,
} from '@coral-xyz/anchor';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { IDL } from './idl.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ============== Log Buffer for SSE ==============
interface LogEntry {
  timestamp: string;
  agent?: string;
  action: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

class LogBuffer {
  private logs: LogEntry[] = [];
  private clients: Set<NodeJS.WritableStream> = new Set();
  private maxLogs = 100;

  add(entry: LogEntry) {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    this.broadcast(entry);
  }

  getRecent(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  addClient(stream: NodeJS.WritableStream) {
    this.clients.add(stream);
    stream.on('close', () => this.clients.delete(stream));
    // Send recent logs to new client
    this.getRecent().forEach(log => {
      stream.write(`data: ${JSON.stringify(log)}\n\n`);
    });
  }

  private broadcast(entry: LogEntry) {
    const data = `data: ${JSON.stringify(entry)}\n\n`;
    this.clients.forEach(client => {
      try {
        client.write(data);
      } catch (e) {
        this.clients.delete(client);
      }
    });
  }
}

const logBuffer = new LogBuffer();

// Override console.log to capture agent activity
const originalLog = console.log;
console.log = (...args: any[]) => {
  originalLog(...args);

  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');

  // Parse log and extract structured data
  const entry: LogEntry = {
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
    action: message,
    type: 'info'
  };

  // Categorize logs
  if (message.includes('[SYSTEM]')) {
    entry.action = message.replace(/[🛰️]/g, 'SYSTEM').replace(/🛰️/g, '');
    entry.type = 'info';
  } else if (message.includes('[SUCCESS]')) {
    entry.action = message.replace(/🎯/g, 'SUCCESS').replace(/✅/g, 'SUCCESS');
    entry.type = 'success';
    // Extract agent name if present
    const agentMatch = message.match(/for mission (\w+)/) || message.match(/Sniping (\w+)/);
    if (agentMatch) {
      entry.agent = agentMatch[1];
    }
  } else if (message.includes('[FALLBACK SUCCESS]')) {
    entry.action = message.replace(/🎯/g, 'SUCCESS').replace(/✅/g, 'SUCCESS');
    entry.type = 'success';
  } else if (message.includes('failed') || message.includes('[FAILURE]')) {
    entry.action = message.replace(/❌/g, 'ERROR').replace(/⚠️/g, 'WARNING');
    entry.type = message.includes('Both') ? 'error' : 'warning';
  } else if (message.includes('Sniping') || message.includes('Switching')) {
    entry.action = message.replace(/⚔️/g, 'ATTACKING').replace(/🔄/g, 'SWITCHING');
    entry.type = 'info';
    const agentMatch = message.match(/for mission (\w+)/);
    if (agentMatch) entry.agent = agentMatch[1];
  } else if (message.includes('Priority Tier failed')) {
    entry.action = message.replace(/⚠️/g, 'WARNING');
    entry.type = 'warning';
  } else if (message.includes('No active missions')) {
    entry.action = message.replace(/😴/g, 'IDLE');
    entry.type = 'info';
  } else if (message.includes('SCANNING')) {
    entry.action = message.replace(/[🛰️]/g, '').replace(/🛰️/g, '');
    entry.type = 'info';
  } else if (message.includes('ARMED AND READY')) {
    entry.action = message.replace(/🚀/g, 'SYSTEM');
    entry.type = 'success';
  } else if (message.includes('API Listener running')) {
    entry.action = message.replace(/📡/g, 'SYSTEM');
    entry.type = 'success';
  } else if (message.includes('Starting')) {
    entry.action = message.replace(/🤖/g, 'SYSTEM');
    entry.type = 'info';
  }

  // Remove all emojis
  entry.action = entry.action
    .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII (emojis)
    .replace(/\s+/g, ' ') // Clean up whitespace
    .trim();

  logBuffer.add(entry);
};

// ============== Setup & Constants ==============
const PROGRAM_ID = new PublicKey('EXZ9u1aF8gvHeUsKM8eTRzWDo88WGMKWZJLbvM8bYetJ');
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const SCHEDULER_KEYPAIR_B64 = process.env.SCHEDULER_KEYPAIR;

// ============== Global State ==============
let program: any;
let schedulerKeypair: Keypair;
let supabase: SupabaseClient; // //FIXED: Deklarasi dulu, isi nanti di main()

// ============== PDA Derivations ==============
// (Fungsi getEventPDA, getTierPDA, dkk tetep sama kayak punya lo cu...)
function getEventPDA(organizer: PublicKey, eventId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('event'), organizer.toBuffer(), Buffer.from(eventId)],
    PROGRAM_ID
  );
}
function getTierPDA(event: PublicKey, tierId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('tier'), event.toBuffer(), Buffer.from(tierId)],
    PROGRAM_ID
  );
}
function getAgentPDA(owner: PublicKey, agentId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('agent'), owner.toBuffer(), Buffer.from(agentId)],
    PROGRAM_ID
  );
}
function getEscrowPDA(agentPDA: PublicKey, owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), agentPDA.toBuffer(), owner.toBuffer()],
    PROGRAM_ID
  );
}

// ============== Core Transaction Logic ==============
// Generate SVG Ticket Image
function generateTicketSVG(eventMeta: any, tierId: string): string {
  const eventName = eventMeta.name || 'EVENT';
  const venue = eventMeta.location || 'TBD';
  const date = eventMeta.event_start ? new Date(eventMeta.event_start).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) : 'TBD';
  const time = eventMeta.event_start ? new Date(eventMeta.event_start).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }) : 'TBD';
  const tier = tierId.toUpperCase();

  // Generate unique ticket ID
  const ticketId = Math.random().toString(36).substring(2, 10).toUpperCase();

  const svg = `
    <svg width="500" height="300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#000000;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1" />
        </linearGradient>
        <pattern id="noise" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="#ffffff" opacity="0.03"/>
        </pattern>
      </defs>

      <!-- Background -->
      <rect width="500" height="300" fill="url(#bgGradient)"/>
      <rect width="500" height="300" fill="url(#noise)"/>

      <!-- Border -->
      <rect x="2" y="2" width="496" height="296" fill="none" stroke="#00FF41" stroke-width="2"/>
      <rect x="6" y="6" width="488" height="288" fill="none" stroke="#FF00F5" stroke-width="1"/>

      <!-- Header Section -->
      <rect x="0" y="0" width="500" height="60" fill="#000000"/>
      <line x1="0" y1="60" x2="500" y2="60" stroke="#00FF41" stroke-width="2"/>

      <!-- Pulse Protocol Logo/Text -->
      <text x="30" y="40" font-family="Arial, sans-serif" font-weight="900" font-size="20" fill="#ffffff">PULSE</text>
      <text x="100" y="40" font-family="Arial, sans-serif" font-weight="300" font-size="16" fill="#00FF41">PROTOCOL</text>
      <text x="380" y="40" font-family="monospace" font-size="12" fill="#FF00F5" text-anchor="end">OFFICIAL TICKET</text>

      <!-- Event Name -->
      <text x="250" y="100" font-family="Arial, sans-serif" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle">${eventName}</text>

      <!-- Ticket Details -->
      <g transform="translate(50, 140)">
        <!-- Venue -->
        <text x="0" y="0" font-family="monospace" font-size="12" fill="#00FF41">VENUE</text>
        <text x="0" y="20" font-family="Arial, sans-serif" font-weight="700" font-size="16" fill="#ffffff">${venue}</text>

        <!-- Date -->
        <text x="200" y="0" font-family="monospace" font-size="12" fill="#00FF41">DATE</text>
        <text x="200" y="20" font-family="Arial, sans-serif" font-weight="700" font-size="16" fill="#ffffff">${date}</text>

        <!-- Tier Badge -->
        <rect x="350" y="-5" width="80" height="30" fill="#FF00F5"/>
        <text x="390" y="16" font-family="Arial, sans-serif" font-weight="900" font-size="14" fill="#000000" text-anchor="middle">${tier}</text>
      </g>

      <!-- Divider -->
      <line x1="40" y1="180" x2="460" y2="180" stroke="#333333" stroke-width="1"/>

      <!-- Footer Section with Ticket ID -->
      <g transform="translate(50, 220)">
        <text x="0" y="0" font-family="monospace" font-size="10" fill="#888888">TICKET ID</text>
        <text x="0" y="20" font-family="monospace" font-size="14" fill="#00FF41">${ticketId}</text>

        <text x="350" y="0" font-family="monospace" font-size="10" fill="#888888">TIME</text>
        <text x="350" y="20" font-family="monospace" font-size="14" fill="#ffffff">${time}</text>
      </g>

      <!-- Verification Badge -->
      <circle cx="250" cy="270" r="20" fill="#000000" stroke="#00FF41" stroke-width="2"/>
      <text x="250" y="275" font-family="Arial" font-weight="900" font-size="16" fill="#00FF41" text-anchor="middle">✓</text>

      <!-- Corner Accents -->
      <rect x="2" y="2" width="10" height="10" fill="#FF00F5"/>
      <rect x="488" y="2" width="10" height="10" fill="#FF00F5"/>
      <rect x="2" y="288" width="10" height="10" fill="#FF00F5"/>
      <rect x="488" y="288" width="10" height="10" fill="#FF00F5"/>
    </svg>
  `;

  // Convert SVG to base64 data URI
  const base64Svg = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64Svg}`;
}

// Generate NFT metadata URI
function generateTicketMetadata(eventMeta: any, tierId: string): string {
  // Generate ticket SVG
  const ticketImage = generateTicketSVG(eventMeta, tierId);
  const date = eventMeta.event_start ? new Date(eventMeta.event_start).toLocaleDateString() : 'TBD';

  const metadata = {
    name: `${eventMeta.name} - ${tierId.toUpperCase()} Ticket`,
    symbol: 'PULSE',
    description: `Official ticket for ${eventMeta.name} at ${eventMeta.location || 'TBD'}. Powered by Pulse Protocol.`,
    image: ticketImage,
    attributes: [
      {
        trait_type: 'Event',
        value: eventMeta.name,
      },
      {
        trait_type: 'Tier',
        value: tierId.toUpperCase(),
      },
      {
        trait_type: 'Date',
        value: date,
      },
      {
        trait_type: 'Location',
        value: eventMeta.location || 'TBD',
      },
      {
        trait_type: 'Protocol',
        value: 'Pulse Protocol',
      },
    ],
    properties: {
      files: [
        {
          uri: ticketImage,
          type: 'image/svg+xml',
        },
      ],
      category: 'image',
    },
  };

  // Encode as base64 data URI for simplicity
  // For production, you should upload to Arweave/IPFS
  const json = JSON.stringify(metadata);
  return `data:application/json;base64,${Buffer.from(json).toString('base64')}`;
}

async function executePurchaseMission(
  agentOwner: string,
  agentId: string,
  organizerPubkey: string,
  eventId: string,
  tierId: string,
  eventMeta?: any
): Promise<string> {
  // logic ini tetep sama...
  const agentOwnerPubkey = new PublicKey(agentOwner);
  const organizerPubkeyObj = new PublicKey(organizerPubkey);
  const [eventPDA] = getEventPDA(organizerPubkeyObj, eventId);
  const [tierPDA] = getTierPDA(eventPDA, tierId);
  const [agentPDA] = getAgentPDA(agentOwnerPubkey, agentId);
  const [escrowPDA] = getEscrowPDA(agentPDA, agentOwnerPubkey);

  const ticketMintKeypair = Keypair.generate();
  const buyerATA = getAssociatedTokenAddressSync(ticketMintKeypair.publicKey, agentOwnerPubkey);

  // Generate metadata URI
  const metadataURI = eventMeta ? generateTicketMetadata(eventMeta, tierId) : "https://arweave.net/placeholder";

  return await program.methods
    .buyTicketWithEscrow(tierId, agentOwnerPubkey)
    .accounts({
      event: eventPDA,
      tier: tierPDA,
      agent: agentPDA,
      escrow: escrowPDA,
      organizer: organizerPubkeyObj,
      authority: schedulerKeypair.publicKey,
      systemProgram: PublicKey.default,
    })
    .postInstructions([
      await program.methods
        .mintTicketNft(eventMeta?.name || "Pulse Ticket", "PULSE", metadataURI)
        .accounts({
          event: eventPDA,
          ticketMint: ticketMintKeypair.publicKey,
          metadata: PublicKey.findProgramAddressSync([Buffer.from("metadata"), new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(), ticketMintKeypair.publicKey.toBuffer()], new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"))[0],
          buyerTokenAccount: buyerATA,
          buyer: agentOwnerPubkey,
          authority: schedulerKeypair.publicKey,
          tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
          associatedTokenProgram: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
          tokenMetadataProgram: new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
          systemProgram: PublicKey.default,
          rent: new PublicKey("SysvarRent111111111111111111111111111111111"),
        })
        .instruction()
    ])
    .signers([schedulerKeypair, ticketMintKeypair])
    .rpc();
}

// ============== The Autonomous War Engine ==============
async function runAutonomousWar() {
  if (!program || !supabase) return;
  console.log("[SYSTEM] SCANNING MISSION CONTROL...");

  const { data: missions, error } = await supabase
    .from('agent_missions')
    .select('*')
    .eq('status', 'active');

  if (error || !missions || missions.length === 0) {
    console.log("IDLE - No active missions found.");
    return;
  }

  for (const mission of missions) {
    // Cek apakah target sudah terpenuhi
    if (mission.purchased_quantity >= mission.target_quantity) {
      await supabase.from('agent_missions').update({ status: 'completed' }).eq('id', mission.id);
      continue;
    }

    try {
      const { data: eventMeta } = await supabase
        .from('events_metadata')
        .select('*')
        .eq('event_pda', mission.event_pda)
        .single();

      if (!eventMeta) throw new Error("Event metadata missing!");

      // LOGIC: Turbo Mode vs Normal Mode
      // Kalau Turbo = true, dia bakal 'while' loop sampe target abis atau saldo abis
      let continueWar = true;

      while (continueWar && mission.purchased_quantity < mission.target_quantity) {
        try {
          // Tentukan tier: Coba priority dulu
          let targetTier = mission.priority_tier_id;

          console.log(`ATTACKING - Sniping ${targetTier} for mission ${mission.id}...`);

          const tx = await executePurchaseMission(
            mission.agent_owner,
            mission.agent_id,
            eventMeta.organizer_pubkey,
            eventMeta.event_id,
            targetTier,
            eventMeta
          );

          mission.purchased_quantity += 1;

          await supabase.from('agent_missions').update({
            purchased_quantity: mission.purchased_quantity,
            status: (mission.purchased_quantity >= mission.target_quantity) ? 'completed' : 'active'
          }).eq('id', mission.id);

          console.log(`SUCCESS - Sniped! Progress: ${mission.purchased_quantity}/${mission.target_quantity}`);

          // Kalau BUKAN turbo mode, kita keluar dari while loop setelah 1x sukses
          if (!mission.is_turbo) continueWar = false;

          // Jeda dikit biar RPC gak kaget (500ms)
          if (continueWar) await new Promise(r => setTimeout(r, 500));

        } catch (e: any) {
          console.log(`WARNING - Priority Tier failed: ${e.message}`);

          // FALLBACK LOGIC: Kalau priority gagal dan ada fallback, coba fallback-nya
          if (mission.fallback_tier_id) {
            console.log(`SWITCHING - Switching to Fallback Tier: ${mission.fallback_tier_id}`);
            try {
              const txFallback = await executePurchaseMission(
                mission.agent_owner,
                mission.agent_id,
                eventMeta.organizer_pubkey,
                eventMeta.event_id,
                mission.fallback_tier_id,
                eventMeta
              );

              mission.purchased_quantity += 1;
              await supabase.from('agent_missions').update({
                purchased_quantity: mission.purchased_quantity
              }).eq('id', mission.id);

              console.log(`SUCCESS - Sniped fallback ticket!`);
            } catch (fallbackErr: any) {
              console.error(`ERROR - Both Priority & Fallback failed: ${fallbackErr.message}`);
              continueWar = false; // Berhenti dulu scan ini
            }
          } else {
            continueWar = false; // Gak ada fallback, berhenti
          }
        }
      }
    } catch (e: any) {
      console.error(`ERROR - Mission ${mission.id} total failure: ${e.message}`);
    }
  }
}

// ============== Main Entrance ==============
async function main() {
  console.log('SYSTEM - PULSE Agent Scheduler System Starting...');

  // 1. Validasi ENV dulu sebelum inisialisasi apapun
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing in .env');
  }
  if (!SCHEDULER_KEYPAIR_B64) throw new Error('SCHEDULER_KEYPAIR missing in .env');

  // 2. Inisialisasi Supabase SEKARANG (setelah env pasti ada)
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 3. Setup Solana
  const connection = new Connection(RPC_URL, 'confirmed');
  schedulerKeypair = Keypair.fromSecretKey(Buffer.from(SCHEDULER_KEYPAIR_B64, 'base64'));
  const wallet = new Wallet(schedulerKeypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  setProvider(provider);
  program = new Program(IDL as any, provider);

  // 4. Start Server & Cron
  const PORT = process.env.PORT || 3001;

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'pulse-agent-scheduler',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // SSE endpoint for live logs
  app.get('/logs', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    logBuffer.addClient(res);
  });

  app.listen(PORT, () => console.log(`SYSTEM API Listener running on port ${PORT}`));

  cron.schedule('*/10 * * * * *', runAutonomousWar);
  console.log('SYSTEM ARMED AND READY.');
}

main().catch(console.error);