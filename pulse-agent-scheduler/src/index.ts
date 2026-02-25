import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import cron from 'node-cron';
import { Program, AnchorProvider, Wallet, setProvider } from '@coral-xyz/anchor';
import dotenv from 'dotenv';
import express from 'express'; 
import cors from 'cors';     
import { IDL } from './idl.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { google } from 'googleapis';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ============== Log Buffer for SSE (TETAP SAMA) ==============
// (Kode LogBuffer dan console.log override tetap di sini)
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

const originalLog = console.log;
console.log = (...args: any[]) => {
  originalLog(...args);

  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');

  const entry: LogEntry = {
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
    action: message,
    type: 'info'
  };

  if (message.includes('[SYSTEM]')) {
    entry.action = message.replace(/[🛰️]/g, 'SYSTEM').replace(/🛰️/g, '');
    entry.type = 'info';
  } else if (message.includes('[SUCCESS]')) {
    entry.action = message.replace(/🎯/g, 'SUCCESS').replace(/✅/g, 'SUCCESS');
    entry.type = 'success';
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

  entry.action = entry.action
    .replace(/[^\x00-\x7F]/g, '') 
    .replace(/\s+/g, ' ') 
    .trim();

  logBuffer.add(entry);
};

// ============== Setup & Constants ==============
const PROGRAM_ID = new PublicKey('EXZ9u1aF8gvHeUsKM8eTRzWDo88WGMKWZJLbvM8bYetJ');
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const SCHEDULER_KEYPAIR_B64 = process.env.SCHEDULER_KEYPAIR;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const AIRLABS_API_KEY = process.env.AIRLABS_API_KEY!;

let program: any;
let schedulerKeypair: Keypair;
let supabase: SupabaseClient;
let genAI: GoogleGenerativeAI;

// ============== PDA Derivations ==============
function getEventPDA(organizer: PublicKey, eventId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('event'), organizer.toBuffer(), Buffer.from(eventId)], PROGRAM_ID);
}
function getTierPDA(event: PublicKey, tierId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('tier'), event.toBuffer(), Buffer.from(tierId)], PROGRAM_ID);
}
function getAgentPDA(owner: PublicKey, agentId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('agent'), owner.toBuffer(), Buffer.from(agentId)], PROGRAM_ID);
}
function getEscrowPDA(agentPDA: PublicKey, owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('escrow'), agentPDA.toBuffer(), owner.toBuffer()], PROGRAM_ID);
}

// ============== Brain Part 1: Determine Airports ==============
// ============== Brain Part 1: Determine Airports (IATA) ==============
async function determineAirports(originText: string, destinationText: string): Promise<{ origin_iata: string, dest_iata: string, requires_flight: boolean }> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });

  const prompt = `
    Analyze travel from "${originText}" to "${destinationText}".
    Identify the nearest major IATA airport codes. 
    If they are in the same city area, requires_flight is false.
    Return JSON: { "origin_iata": string, "dest_iata": string, "requires_flight": boolean }
  `;

  try {
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (e) {
    return { origin_iata: "CGK", dest_iata: "SIN", requires_flight: true }; // Fallback
  }
}


// ============== Tool 1: AirLabs Flight Search ==============
async function checkFlights(originIata: string, destIata: string): Promise<any> {
  if (!originIata || !destIata) return { found: false, error: "Invalid IATA codes" };

  try {
    console.log(`[SYSTEM] ✈️ Scanning radar for flights: ${originIata} ➔ ${destIata}`);
    
    const url = `https://airlabs.co/api/v9/schedules?dep_iata=${originIata}&arr_iata=${destIata}&api_key=${AIRLABS_API_KEY}`;
    const response = await axios.get(url);
    
    if (response.data && response.data.response && response.data.response.length > 0) {
      const flight = response.data.response[0];
      const mockPriceUsd = Math.floor(Math.random() * (250 - 50 + 1)) + 50; 
      const estimatedPriceSol = parseFloat((mockPriceUsd / 150).toFixed(2));

      return {
        found: true,
        airline: flight.airline_icao || "Unknown",
        flight_number: flight.flight_number || "TBA",
        dep_time: flight.dep_time || "Morning",
        estimated_price_sol: estimatedPriceSol,
        raw_price_usd: mockPriceUsd
      };
    }
    return { found: false, reason: `No active routes found on Airlabs for ${originIata}-${destIata}.` };
  } catch (error) {
    console.error("Flight API Error:", error);
    return { found: false, error: "Flight Radar API Timeout" };
  }
}

// ============== Tool 2: REAL Google Calendar Checker ==============
async function checkRealGoogleCalendar(walletAddress: string, eventDateStr: string): Promise<{status: string, message: string}> {
  try {
    console.log(`📅 [CALENDAR] Resolving Neural ID for wallet: ${walletAddress.slice(0,8)}...`);
    
    // 1. Langsung ambil google_access_token dari user_profiles berdasarkan wallet
    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('id, google_access_token')
      .eq('wallet_address', walletAddress)
      .single();

    if (profileErr || !profile?.id) {
       console.log(`⚠️ [CALENDAR_WARN] Unregistered wallet. Cannot sync Google Calendar.`);
       return { status: "unknown", message: "Profile not linked to Auth." };
    }

    const userId = profile.id;
    const accessToken = profile.google_access_token;

    // 2. CEK TOKEN: Kalau token ga ada, langsung skip (nggak usah nunggu flag dari tabel misi)
    if (!accessToken) {
        console.log(`⚠️ [CALENDAR_WARN] No Google Token found in user profile for ID: ${userId.slice(0,8)}...`);
        // Fallback kalau token blm kesimpen
        const isActuallyClear = Math.random() > 0.2; 
        return isActuallyClear 
            ? { status: "clear", message: "No token found. Assuming clear schedule for demo." }
            : { status: "conflict", message: "No token found. Assumed conflict detected." };
    }

    // 3. Eksekusi Real GCP API kalau Tokennya ada!
    console.log(`📅 [CALENDAR] Valid Google Access Token found! Hitting GCP API...`);
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Cek jadwal dari H-1 sampe H+1 event
    const eventDate = new Date(eventDateStr);
    const timeMin = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(eventDate.getTime() + 24 * 60 * 60 * 1000).toISOString();

    try {
        const res = await calendar.events.list({
            calendarId: 'primary',
            timeMin: timeMin,
            timeMax: timeMax,
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = res.data.items;
        if (events && events.length > 0) {
            // Cari event yang numpuk di hari H
            const conflict = events.find(e => {
                const eStart = new Date(e.start?.dateTime || e.start?.date || '');
                return eStart.toDateString() === eventDate.toDateString();
            });

            if (conflict) {
                 console.log(`⚠️ [CALENDAR_CONFLICT] Found: "${conflict.summary}"`);
                 return { status: "conflict", message: `Found conflicting event in Google Calendar: "${conflict.summary}"` };
            }
        }
        console.log(`✅ [CALENDAR_CLEAR] Schedule is clear!`);
        return { status: "clear", message: "Real Google Calendar is clear on this date." };

    } catch (gcpErr: any) {
        console.error(`❌ [GCP_API_ERROR] Token might be expired or invalid scopes: ${gcpErr.message}`);
        // Fallback kalau token expired (karena kita ga setup auto-refresh buat hackathon)
        const isActuallyClear = Math.random() > 0.2; 
        return isActuallyClear 
            ? { status: "clear", message: "GCP API failed (Expired Token). Assuming clear schedule for demo." }
            : { status: "conflict", message: "GCP API failed. Assumed conflict detected." };
    }

  } catch (error: any) {
    console.error(`❌ [CALENDAR_SYSTEM_ERROR] ${error.message}`);
    return { status: "unknown", message: "System error during Calendar Sync." };
  }
}

// ============== Brain Part 2: Decision Engine ==============
async function consultGemini(missionContext: any): Promise<{ decision: string, reasoning: string, simulated_flight_cost_sol: number, itinerary: any }> {
  console.log("[SYSTEM] 🧠 Asking Gemini for final Purchase Decision...");
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" } 
  });

  const prompt = `
    You are PULSE AI, a Web3 autonomous ticketing concierge. 
    Your mission is to secure a concert ticket AND organize travel if required, within a strict budget.

    --- CONTEXT ---
    Budget Limit: ${missionContext.maxPrice} SOL
    Ticket Target: Tier ${missionContext.tier} for ${missionContext.destinationName} on ${missionContext.eventDate}
    Estimated Ticket Price: 1 SOL
    
    Travel Required: ${missionContext.requiresTravel ? "YES" : "NO"}
    Flight Options Found: ${JSON.stringify(missionContext.flight)}
    User Calendar Status: ${JSON.stringify(missionContext.calendar)}
    ---------------

    DECISION LOGIC:
    1. If Calendar Status is explicitly "conflict", you CANNOT buy the ticket. Decision MUST be "HOLD".
    2. If Calendar Status is "unknown", proceed with caution but DO NOT hold just for this reason. Assume it's clear.
    3. If Travel Required is YES but no flight is found, decision MUST be "HOLD".
    4. Calculate Total Cost = (Ticket Price) + (Flight Cost in SOL).
    5. If Total Cost > Budget Limit, decision MUST be "HOLD".
    6. If Calendar is NOT a conflict, Flights are good (or not required), and Budget is sufficient, decision MUST be "EXECUTE".

    If EXECUTE and Travel is YES, create a realistic dummy "itinerary" object using the Flight Options Found.
    If EXECUTE and Travel is NO, create an "itinerary" object stating it's a local event.
    
    Return EXACTLY this JSON schema:
    {
      "decision": "EXECUTE" | "HOLD",
      "reasoning": "A highly detailed, robotic log explaining your analysis of the calendar, the flight route, and the budget before making the decision.",
      "total_cost_estimate_sol": number,
      "itinerary": {
        "status": "Simulated Booking" | "Local Event - No Flight Needed",
        "type": "Flight",
        "provider": "string (e.g., Airline Name or N/A)",
        "departure_time": "string (e.g., 08:00 AM or N/A)",
        "estimated_cost_usd": number
      }
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const data = JSON.parse(result.response.text());
    return {
        decision: data.decision,
        reasoning: data.reasoning,
        simulated_flight_cost_sol: data.total_cost_estimate_sol - 1,
        itinerary: data.itinerary || null // //FIXED: Ambil objek itinerary dari Gemini
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { decision: "HOLD", reasoning: "Neural cognitive failure. Safety hold engaged.", simulated_flight_cost_sol: 0, itinerary: null };
  }
}


// ============== Metadata Generator (Tetap Sama) ==============
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
        <rect width="500" height="300" fill="url(#bgGradient)"/>
        <rect width="500" height="300" fill="url(#noise)"/>
        <rect x="2" y="2" width="496" height="296" fill="none" stroke="#00FF41" stroke-width="2"/>
        <rect x="6" y="6" width="488" height="288" fill="none" stroke="#FF00F5" stroke-width="1"/>
        <rect x="0" y="0" width="500" height="60" fill="#000000"/>
        <line x1="0" y1="60" x2="500" y2="60" stroke="#00FF41" stroke-width="2"/>
        <text x="30" y="40" font-family="Arial, sans-serif" font-weight="900" font-size="20" fill="#ffffff">PULSE</text>
        <text x="100" y="40" font-family="Arial, sans-serif" font-weight="300" font-size="16" fill="#00FF41">PROTOCOL</text>
        <text x="380" y="40" font-family="monospace" font-size="12" fill="#FF00F5" text-anchor="end">OFFICIAL TICKET</text>
        <text x="250" y="100" font-family="Arial, sans-serif" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle">${eventName}</text>
        <g transform="translate(50, 140)">
          <text x="0" y="0" font-family="monospace" font-size="12" fill="#00FF41">VENUE</text>
          <text x="0" y="20" font-family="Arial, sans-serif" font-weight="700" font-size="16" fill="#ffffff">${venue}</text>
          <text x="200" y="0" font-family="monospace" font-size="12" fill="#00FF41">DATE</text>
          <text x="200" y="20" font-family="Arial, sans-serif" font-weight="700" font-size="16" fill="#ffffff">${date}</text>
          <rect x="350" y="-5" width="80" height="30" fill="#FF00F5"/>
          <text x="390" y="16" font-family="Arial, sans-serif" font-weight="900" font-size="14" fill="#000000" text-anchor="middle">${tier}</text>
        </g>
        <line x1="40" y1="180" x2="460" y2="180" stroke="#333333" stroke-width="1"/>
        <g transform="translate(50, 220)">
          <text x="0" y="0" font-family="monospace" font-size="10" fill="#888888">TICKET ID</text>
          <text x="0" y="20" font-family="monospace" font-size="14" fill="#00FF41">${ticketId}</text>
          <text x="350" y="0" font-family="monospace" font-size="10" fill="#888888">TIME</text>
          <text x="350" y="20" font-family="monospace" font-size="14" fill="#ffffff">${time}</text>
        </g>
        <circle cx="250" cy="270" r="20" fill="#000000" stroke="#00FF41" stroke-width="2"/>
        <text x="250" y="275" font-family="Arial" font-weight="900" font-size="16" fill="#00FF41" text-anchor="middle">✓</text>
        <rect x="2" y="2" width="10" height="10" fill="#FF00F5"/>
        <rect x="488" y="2" width="10" height="10" fill="#FF00F5"/>
        <rect x="2" y="288" width="10" height="10" fill="#FF00F5"/>
        <rect x="488" y="288" width="10" height="10" fill="#FF00F5"/>
      </svg>
    `;
    const base64Svg = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64Svg}`;
  }
  
  function generateTicketMetadata(eventMeta: any, tierId: string): string {
    const ticketImage = generateTicketSVG(eventMeta, tierId);
    const date = eventMeta.event_start ? new Date(eventMeta.event_start).toLocaleDateString() : 'TBD';
  
    const metadata = {
      name: `${eventMeta.name} - ${tierId.toUpperCase()} Ticket`,
      symbol: 'PULSE',
      description: `Official ticket for ${eventMeta.name} at ${eventMeta.location || 'TBD'}. Powered by Pulse Protocol.`,
      image: ticketImage,
      attributes: [
        { trait_type: 'Event', value: eventMeta.name },
        { trait_type: 'Tier', value: tierId.toUpperCase() },
        { trait_type: 'Date', value: date },
        { trait_type: 'Location', value: eventMeta.location || 'TBD' },
        { trait_type: 'Protocol', value: 'Pulse Protocol' },
      ],
      properties: {
        files: [{ uri: ticketImage, type: 'image/svg+xml' }],
        category: 'image',
      },
    };
  
    const json = JSON.stringify(metadata);
    return `data:application/json;base64,${Buffer.from(json).toString('base64')}`;
  }

// ============== Core Tx Logic ==============
async function executePurchaseMission(
  agentOwner: string, 
  agentId: string, 
  organizerPubkey: string, 
  eventId: string, 
  tierId: string, 
  eventMeta?: any
): Promise<string> {
  const agentOwnerPubkey = new PublicKey(agentOwner);
  const organizerPubkeyObj = new PublicKey(organizerPubkey);
  const [eventPDA] = getEventPDA(organizerPubkeyObj, eventId);
  const [tierPDA] = getTierPDA(eventPDA, tierId);
  const [agentPDA] = getAgentPDA(agentOwnerPubkey, agentId);
  const [escrowPDA] = getEscrowPDA(agentPDA, agentOwnerPubkey);

  const ticketMintKeypair = Keypair.generate();
  const buyerATA = getAssociatedTokenAddressSync(ticketMintKeypair.publicKey, agentOwnerPubkey);

  // 🚨 CRITICAL FIX: TRUNCATE SEMUA DATA YANG MAU MASUK SOLANA BUFFER
  // Limit nama NFT Max 32 karakter (Aturan Metaplex Token Metadata)
  let safeName = eventMeta?.name || "Pulse Ticket";
  if (safeName.length > 32) {
      safeName = safeName.substring(0, 29) + "...";
  }

  // Symbol Max 10 karakter
  const safeSymbol = "PULSE";

  // URI Max 200 karakter. Karena kita ga pake real URI buat hackathon MVP, kita pake dummy pendek.
  const metadataURI = `https://arweave.net/pulse_placeholder`;

  console.log(`📦 [DEBUG_BUFFER] Payload to mint_ticket_nft:`);
  console.log(`   - Name: "${safeName}" (Length: ${safeName.length}/32)`);
  console.log(`   - Symbol: "${safeSymbol}" (Length: ${safeSymbol.length}/10)`);
  console.log(`   - URI: "${metadataURI}" (Length: ${metadataURI.length}/200)`);

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
        .mintTicketNft(safeName, safeSymbol, metadataURI)
        .accounts({
          event: eventPDA,
          ticketMint: ticketMintKeypair.publicKey,
          metadata: PublicKey.findProgramAddressSync(
            [Buffer.from("metadata"), new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(), ticketMintKeypair.publicKey.toBuffer()], 
            new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
          )[0],
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


// ============== The Agentic Loop (UPDATED FOR TRANSPARENCY) ==============
async function runAutonomousWar() {
  if (!program || !supabase) return;
  console.log("🛰️ [SYSTEM] AI NEURAL NET SCANNING MISSIONS...");

  const { data: missions, error: mError } = await supabase
    .from('agent_missions')
    .select('*')
    .eq('status', 'active');

  if (mError) {
    console.log(`❌ [DATABASE_ERROR] Failed to fetch missions: ${mError.message}`);
    return;
  }

  if (!missions || missions.length === 0) {
    console.log("😴 [IDLE] No active missions in the queue.");
    return;
  }

  for (const mission of missions) {
    console.log(`\n──────────────── MISSION_START: ${mission.id.slice(0, 8)} ────────────────`);
    console.log(`🎯 [TARGET] Event: ${mission.event_name} | Tier: ${mission.priority_tier_id} | Budget: ${mission.max_price_sol} SOL`);
    
    if (mission.purchased_quantity >= mission.target_quantity) {
      console.log(`✅ [MISSION_COMPLETE] Target already met for ${mission.event_name}`);
      await supabase.from('agent_missions').update({ status: 'completed' }).eq('id', mission.id);
      continue;
    }

    try {
      const { data: eventMeta, error: eError } = await supabase
        .from('events_metadata')
        .select('*')
        .eq('event_pda', mission.event_pda)
        .single();

      if (eError || !eventMeta) {
        console.log(`❌ [METADATA_FAIL] Event metadata missing.`);
        continue;
      }

      // ==========================================
      // 1. INTELLIGENCE & COOLDOWN LAYER
      // ==========================================
      let currentDecision = mission.ai_decision_status || 'PENDING';
      let needsToThink = false;
      let finalItinerary = null; // //NEW: Variabel buat nampung itinerary sementara

      const lastCheckTime = mission.last_ai_check ? new Date(mission.last_ai_check).getTime() : 0;
      const diffMinutes = Math.floor((Date.now() - lastCheckTime) / (1000 * 60));

      if (currentDecision === 'PENDING') {
        needsToThink = true;
      } else if (currentDecision === 'HOLD') {
        if (diffMinutes >= 2) {
          console.log(`⏳ [COOLDOWN] 2 minutes passed. Waking up Agent for re-evaluation...`);
          needsToThink = true;
        } else {
          console.log(`⏸️ [STANDING_BY] Decision is HOLD. Reason: "${mission.agent_reasoning_log}". Retrying in ${2 - diffMinutes}m.`);
        }
      }

      if (needsToThink) {
        console.log(`\n--- [AGENT_THINKING_PROCESS] ---`);
        
        // Step A: Calendar Sync
        console.log(`📅 [1/3] Syncing Google Calendar for ${eventMeta.event_start}...`);
        
        // //FIXED: Panggil cuma pake wallet & tanggal aja! AI bakal otomatis nyari tokennya di database.
        const calendarData = await checkRealGoogleCalendar(
          mission.agent_owner, 
          eventMeta.event_start
        );
        
        console.log(`   └─ Result: ${calendarData.status.toUpperCase()} - ${calendarData.message}`);

        // Step B: Routing & Flight
        console.log(`🌐 [2/3] Analyzing Logistics: ${mission.user_origin_city || 'Jakarta'} -> ${eventMeta.location}`);
        const routing = await determineAirports(mission.user_origin_city || "Jakarta", eventMeta.location);
        console.log(`   └─ Route: ${routing.origin_iata} to ${routing.dest_iata} | Flight Required: ${routing.requires_flight}`);

        let flightData = { found: true, cost_sol: 0, details: "Local event, no flight needed." };
        if (routing.requires_flight) {
          console.log(`✈️ [2.5/3] Querying AirLabs API for schedules...`);
          const flights = await checkFlights(routing.origin_iata, routing.dest_iata);
          flightData = { 
            found: flights.found, 
            cost_sol: flights.estimated_price_sol || 0,
            details: flights.found ? `Found ${flights.airline} flight ${flights.flight_number} for ~$${flights.raw_price_usd}` : flights.reason || "Not found"
          };
          console.log(`   └─ Result: ${flightData.details} (Est. ${flightData.cost_sol} SOL)`);
        }

        // Step C: The Brain
        console.log(`🧠 [3/3] Feeding data to Gemini Neural Net for Final Decision...`);
        const verdict = await consultGemini({
          maxPrice: mission.max_price_sol,
          tier: mission.priority_tier_id,
          destinationName: eventMeta.name,
          eventDate: eventMeta.event_start,
          requiresTravel: routing.requires_flight,
          flight: flightData,
          calendar: calendarData
        });

        console.log(`\n🤖 [AI_VERDICT] -> ${verdict.decision}`);
        console.log(`💬 [AI_REASONING] -> ${verdict.reasoning}`);
        
        currentDecision = verdict.decision;
        finalItinerary = verdict.itinerary; // //NEW: Simpan ke memori lokal
        
        if(currentDecision === 'EXECUTE') {
             console.log(`🧳 [ITINERARY_GENERATED] -> ${JSON.stringify(finalItinerary)}`);
        }
        console.log(`----------------------------------\n`);

        // Simpan keputusan dan log analisis ke DB
        // //NEW: Kalau EXECUTE, sekalian save secured_itinerary-nya!
        await supabase.from('agent_missions').update({
          ai_decision_status: currentDecision,
          agent_reasoning_log: verdict.reasoning,
          last_ai_check: new Date().toISOString(),
          ...(currentDecision === 'EXECUTE' && finalItinerary ? { secured_itinerary: finalItinerary } : {})
        }).eq('id', mission.id);
      }

      // ==========================================
      // 2. BLOCKCHAIN EXECUTION LAYER
      // ==========================================
      if (currentDecision === 'EXECUTE') {
        console.log(`⚡ [EXECUTION_PHASE] Proceeding to Smart Contract Interaction...`);
        let targetTier = mission.priority_tier_id;
        
        try {
          console.log(`📦 [DEBUG] Preparing Solana Transaction (Tier: ${targetTier})...`);
          
          const cleanMeta = {
            name: eventMeta.name.slice(0, 30),
            location: eventMeta.location.slice(0, 30),
            event_id: eventMeta.event_id
          };

          const tx = await executePurchaseMission(
            mission.agent_owner, 
            mission.agent_id, 
            eventMeta.organizer_pubkey, 
            eventMeta.event_id, 
            targetTier, 
            cleanMeta 
          );
          
          console.log(`✅ [ON_CHAIN_SUCCESS] NFT Ticket Minted! TX: ${tx}`);
          
          mission.purchased_quantity += 1;
          const status = mission.purchased_quantity >= mission.target_quantity ? 'completed' : 'active';
          
          await supabase.from('agent_missions').update({
            purchased_quantity: mission.purchased_quantity,
            status: status
          }).eq('id', mission.id);

        } catch (txErr: any) {
          console.log(`⚠️ [TX_FAILED] Failed to buy ${targetTier}. Error: ${txErr.message}`);
          
          if (mission.fallback_tier_id) {
            console.log(`🔄 [FALLBACK] Attempting recovery with Fallback Tier: ${mission.fallback_tier_id}`);
            try {
              const fbTx = await executePurchaseMission(mission.agent_owner, mission.agent_id, eventMeta.organizer_pubkey, eventMeta.event_id, mission.fallback_tier_id, eventMeta);
              console.log(`✅ [FALLBACK_SUCCESS] NFT Ticket Minted! TX: ${fbTx}`);
              mission.purchased_quantity += 1;
              await supabase.from('agent_missions').update({ purchased_quantity: mission.purchased_quantity }).eq('id', mission.id);
            } catch (fbErr: any) {
              console.log(`❌ [CRITICAL_FAIL] Both Primary and Fallback tiers failed.`);
            }
          }
        }
      }

    } catch (criticalErr: any) {
      console.error(`💀 [SYSTEM_ERROR] Loop crashed for mission ${mission.id}: ${criticalErr.message}`);
    }
    console.log(`─────────────────────────────────────────────────────────────`);
  }
}

// ============== Main Entrance ==============
async function main() {
  console.log('SYSTEM - PULSE Agent Scheduler System Starting...');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing in .env');
  }
  if (!SCHEDULER_KEYPAIR_B64) throw new Error('SCHEDULER_KEYPAIR missing in .env');
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing in .env');

  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

  const connection = new Connection(RPC_URL, 'confirmed');
  schedulerKeypair = Keypair.fromSecretKey(Buffer.from(SCHEDULER_KEYPAIR_B64, 'base64'));
  const wallet = new Wallet(schedulerKeypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  setProvider(provider);
  program = new Program(IDL as any, provider);

  const PORT = process.env.PORT || 3001;

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'pulse-agent-scheduler', timestamp: new Date().toISOString(), uptime: process.uptime() });
  });

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