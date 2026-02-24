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

const PROGRAM_ID = new PublicKey('5fQA4eCdUtCJPDhjGfb6nn47RhVfKJT2dW5iHuQaeH2n');
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
function getEscrowPDA(agent: PublicKey, owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), agent.toBuffer(), owner.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * CORE LOGIC
 */
async function buyTicketWithEscrow(
  program: any, // Pake any biar ga berantem sama TypeScript casing
  schedulerKeypair: Keypair,
  agentOwner: string,
  agentId: string,
  organizerPubkey: string,
  eventId: string,
  tierId: string
): Promise<string> {
  console.log(`\n=== Executing Purchase: Agent ${agentId} ===`);

  const agentOwnerPubkey = new PublicKey(agentOwner);
  const organizerPubkeyObj = new PublicKey(organizerPubkey);

  const [eventPDA] = getEventPDA(organizerPubkeyObj, eventId);
  const [tierPDA] = getTierPDA(eventPDA, tierId);
  const [agentPDA] = getAgentPDA(agentOwnerPubkey, agentId);
  const [escrowPDA] = getEscrowPDA(agentPDA, agentOwnerPubkey);

  // Anchor biasanya ngerubah CamelCase jadi camelCase (aiAgent, ticketTier)
  // Kita fetch pake cara generic biar aman dari error "Property not exist"
  const agentAccount = await program.account.aiAgent.fetch(agentPDA);
  if (!agentAccount.isActive) throw new Error('Agent is inactive');
  if (!agentAccount.autoPurchaseEnabled) throw new Error('Auto-purchase is disabled');

  const tierAccount = await program.account.ticketTier.fetch(tierPDA);
  const price = Number(tierAccount.price);
  const maxBudget = Number(agentAccount.maxBudgetPerTicket);

  if (price > maxBudget) throw new Error(`Price ${price} exceeds max budget ${maxBudget}`);

  return await program.methods
    .buyTicketWithEscrow(tierId)
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