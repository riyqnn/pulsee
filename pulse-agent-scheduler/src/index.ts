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
  web3,
  setProvider,
} from '@coral-xyz/anchor';
import { IDL } from './idl.js';
import dotenv from 'dotenv';

dotenv.config();

// Program ID
const PROGRAM_ID = new PublicKey('5fQA4eCdUtCJPDhjGfb6nn47RhVfKJT2dW5iHuQaeH2n');

// Configuration from environment
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const SCHEDULER_KEYPAIR = process.env.SCHEDULER_KEYPAIR;
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
      Buffer.from(eventId),
    ],
    PROGRAM_ID
  );
}

function getTierPDA(event: PublicKey, tierId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('tier'),
      event.toBuffer(),
      Buffer.from(tierId),
    ],
    PROGRAM_ID
  );
}

function getAgentPDA(owner: PublicKey, agentId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('agent'),
      owner.toBuffer(),
      Buffer.from(agentId),
    ],
    PROGRAM_ID
  );
}

function getEscrowPDA(agent: PublicKey, owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('escrow'),
      agent.toBuffer(),
      owner.toBuffer(),
    ],
    PROGRAM_ID
  );
}

/**
 * Buy ticket with agent escrow
 * This is the CORE function - can be called by anyone (scheduler service)
 */
async function buyTicketWithEscrow(
  program: Program,
  schedulerKeypair: Keypair,
  agentOwner: string,
  agentId: string,
  organizerPubkey: string,
  eventId: string,
  tierId: string
): Promise<string> {
  console.log('\n=== Buying Ticket with Agent Escrow ===');

  const agentOwnerPubkey = new PublicKey(agentOwner);
  const organizerPubkeyObj = new PublicKey(organizerPubkey);

  // Derive PDAs
  const [eventPDA] = getEventPDA(organizerPubkeyObj, eventId);
  const [tierPDA] = getTierPDA(eventPDA, tierId);
  const [agentPDA] = getAgentPDA(agentOwnerPubkey, agentId);
  const [escrowPDA] = getEscrowPDA(agentPDA, agentOwnerPubkey);

  console.log('Event PDA:', eventPDA.toBase58());
  console.log('Tier PDA:', tierPDA.toBase58());
  console.log('Agent PDA:', agentPDA.toBase58());
  console.log('Escrow PDA:', escrowPDA.toBase58());

  // Fetch agent account to check status
  const agentAccount = await program.account.aiAgent.fetch(agentPDA);
  console.log('Agent status:', {
    isActive: agentAccount.isActive,
    autoPurchaseEnabled: agentAccount.autoPurchaseEnabled,
    autoPurchaseThreshold: agentAccount.autoPurchaseThreshold,
  });

  // Validate agent is active and auto-purchase is enabled
  if (!agentAccount.isActive) {
    console.log(`⚠️ Agent ${agentId} is inactive. Skipping purchase.`);
    throw new Error('Agent is inactive');
  }

  if (!agentAccount.autoPurchaseEnabled) {
    console.log(`⚠️ Auto-purchase disabled for agent ${agentId}. Skipping.`);
    throw new Error('Auto-purchase is disabled');
  }

  // Fetch tier to validate price against budget
  const tierAccount = await program.account.ticketTier.fetch(tierPDA);
  const price = Number(tierAccount.price);
  const maxBudget = Number(agentAccount.maxBudgetPerTicket);

  console.log(`Price: ${price} lamports, Max Budget: ${maxBudget} lamports`);

  // Validate price is within budget
  if (price > maxBudget) {
    console.log(`⚠️ Price ${price} exceeds max budget ${maxBudget}. Skipping.`);
    throw new Error('Price exceeds maximum budget');
  }

  // Build transaction
  const tx = await program.methods
    .buyTicketWithEscrow(tierId)
    .accounts({
      event: eventPDA,
      tier: tierPDA,
      agent: agentPDA,
      escrow: escrowPDA,
      organizer: organizerPubkeyObj,
      authority: schedulerKeypair.publicKey, // Scheduler yang bayar gas fee
      systemProgram: SystemProgram.programId,
    })
    .signers([schedulerKeypair])
    .rpc();

  console.log('✅ Ticket purchased! TX:', tx);
  return tx;
}

/**
 * Main execution
 */
async function main() {
  console.log('🤖 PULSE Agent Scheduler Starting...');
  console.log('Network:', RPC_URL);

  // Validate environment
  if (!SCHEDULER_KEYPAIR) {
    throw new Error('SCHEDULER_KEYPAIR not set in .env');
  }
  if (!AGENT_OWNER) {
    throw new Error('AGENT_OWNER not set in .env');
  }
  if (!EVENT_ORGANIZER) {
    throw new Error('EVENT_ORGANIZER not set in .env');
  }

  // Setup connection
  const connection = new Connection(RPC_URL, 'confirmed');

  // Load scheduler keypair
  const schedulerKeypair = Keypair.fromSecretKey(
    Buffer.from(SCHEDULER_KEYPAIR, 'base64')
  );
  console.log('Scheduler Authority:', schedulerKeypair.publicKey.toBase58());

  // Setup Anchor provider
  const provider = new AnchorProvider(
    connection,
    {
      publicKey: schedulerKeypair.publicKey,
      signTransaction: async (tx: Transaction) => {
        tx.sign(schedulerKeypair);
        return tx;
      },
      signAllTransactions: async (txs: Transaction[]) => {
        txs.forEach(tx => tx.sign(schedulerKeypair));
        return txs;
      },
    },
    { commitment: 'confirmed' }
  );

  setProvider(provider);

  // Load program
  const program = new Program(IDL, PROGRAM_ID, provider);
  console.log('Program ID:', program.programId.toBase58());

  // Execute once on startup for testing
  try {
    const tx = await buyTicketWithEscrow(
      program,
      schedulerKeypair,
      AGENT_OWNER,
      AGENT_ID,
      EVENT_ORGANIZER,
      EVENT_ID,
      TIER_ID
    );

    console.log('\n✨ Success! Transaction signature:', tx);
    console.log('View on Solana Explorer:', `https://solscan.io/tx/${tx}?cluster=devnet`);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // Setup cron scheduling - run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('\n⏰ Scheduled task triggered at:', new Date().toISOString());
    try {
      const tx = await buyTicketWithEscrow(
        program,
        schedulerKeypair,
        AGENT_OWNER,
        AGENT_ID,
        EVENT_ORGANIZER,
        EVENT_ID,
        TIER_ID
      );

      console.log('✨ Scheduled purchase successful! TX:', tx);
      console.log('View on Solana Explorer:', `https://solscan.io/tx/${tx}?cluster=devnet`);
    } catch (error) {
      console.error('❌ Scheduled purchase failed:', error);
    }
  });

  console.log('\n⏰ Scheduler configured to run every 5 minutes');
  console.log('Press Ctrl+C to stop the scheduler');

  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down scheduler...');
    process.exit(0);
  });
}

// Run
main().catch(console.error);
