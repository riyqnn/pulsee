import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram
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
// //TESTING YAAAAA: Import langsung dari .ts biar ga pusing masalah .js extension
import { IDL } from './idl.ts';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PROGRAM_ID = new PublicKey('EXZ9u1aF8gvHeUsKM8eTRzWDo88WGMKWZJLbvM8bYetJ');
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const SCHEDULER_KEYPAIR = process.env.SCHEDULER_KEYPAIR;

// Default values (Testing)
const AGENT_OWNER = process.env.AGENT_OWNER;
const AGENT_ID = process.env.AGENT_ID || 'my-agent';
const EVENT_ORGANIZER = process.env.EVENT_ORGANIZER;
const EVENT_ID = process.env.EVENT_ID || 'event-1';
const TIER_ID = process.env.TIER_ID || 'VIP';

/**
 * PDA Derivations
 */
function getEventPDA(organizer: PublicKey, eventId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('event'), 
      organizer.toBuffer(), 
      Buffer.from(eventId) // Ini slug string (misal: "mensrea")
    ],
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
    [
      Buffer.from('agent'), 
      owner.toBuffer(), 
      Buffer.from(agentId)
    ],
    PROGRAM_ID
  );
}
function getEscrowPDA(agentPDA: PublicKey, owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('escrow'), 
      agentPDA.toBuffer(), // Pake Alamat PDA Agent
      owner.toBuffer()     // Pake Alamat Wallet Owner
    ],
    PROGRAM_ID
  );
}

/**
 * CORE LOGIC - ANTI-CORRUPTION VERSION
 */
// pulse-agent-scheduler/src/index.ts

async function buyTicketWithEscrow(
  program: any,
  schedulerKeypair: Keypair,
  agentOwner: string,
  agentId: string,
  organizerPubkey: string,
  eventId: string,
  tierId: string
): Promise<string> {
  const agentOwnerPubkey = new PublicKey(agentOwner);
  const organizerPubkeyObj = new PublicKey(organizerPubkey);

  const [eventPDA] = getEventPDA(organizerPubkeyObj, eventId);
  const [tierPDA] = getTierPDA(eventPDA, tierId);
  const [agentPDA] = getAgentPDA(agentOwnerPubkey, agentId);
  const [escrowPDA] = getEscrowPDA(agentPDA, agentOwnerPubkey);

  console.log(`🤖 Bot triggering purchase for Agent: ${agentId}`);

  // //FIXED: Kirim agentOwnerPubkey sebagai argumen kedua
  return await program.methods
    .buyTicketWithEscrow(tierId, agentOwnerPubkey) 
    .accounts({
      event: eventPDA,
      tier: tierPDA,
      agent: agentPDA,
      escrow: escrowPDA,
      organizer: organizerPubkeyObj,
      authority: schedulerKeypair.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([schedulerKeypair])
    .rpc();
}
/**
 * API Trigger
 */
app.post('/trigger-agent', async (req, res) => {
  const { agentOwner, agentId, organizerPubkey, eventId, tierId } = req.body;
  console.log(`🚀 API Request for Agent: ${agentId}`);
  
  try {
    const connection = new Connection(RPC_URL, 'confirmed');
    const schedulerKeypair = Keypair.fromSecretKey(Buffer.from(SCHEDULER_KEYPAIR!, 'base64'));
    const wallet = new Wallet(schedulerKeypair); 
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    const program = new Program(IDL as any, provider);

    const tx = await buyTicketWithEscrow(program, schedulerKeypair, agentOwner, agentId, organizerPubkey, eventId, tierId);
    res.json({ success: true, tx });
  } catch (error: any) {
    console.error("❌ API Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Main
 */
async function main() {
  console.log('🤖 PULSE Agent Scheduler System Starting...');
  if (!SCHEDULER_KEYPAIR) throw new Error('SCHEDULER_KEYPAIR not set in .env');

  const connection = new Connection(RPC_URL, 'confirmed');
  const schedulerKeypair = Keypair.fromSecretKey(Buffer.from(SCHEDULER_KEYPAIR, 'base64'));
  const wallet = new Wallet(schedulerKeypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  setProvider(provider);

  const program = new Program(IDL as any, provider);

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`📡 PULSE API Listener running on port ${PORT}`);
  });

  // Startup Test (Optional)
  if (AGENT_OWNER && EVENT_ORGANIZER) {
    try {
      console.log("🧪 Running startup check...");
      await buyTicketWithEscrow(program, schedulerKeypair, AGENT_OWNER, AGENT_ID, EVENT_ORGANIZER, EVENT_ID, TIER_ID);
    } catch (e) {
      console.log('⚠️ Startup check skipped.');
    }
  }

  cron.schedule('*/5 * * * *', async () => {
    if (AGENT_OWNER && EVENT_ORGANIZER) {
      try {
        await buyTicketWithEscrow(program, schedulerKeypair, AGENT_OWNER, AGENT_ID, EVENT_ORGANIZER, EVENT_ID, TIER_ID);
      } catch (error: any) {
        console.error('❌ Cron failed:', error.message);
      }
    }
  });

  console.log('🚀 System Fully Operational.');
}

main().catch(console.error);