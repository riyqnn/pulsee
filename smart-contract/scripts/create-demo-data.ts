// Create demo data for Pulse app
// Creates sample events, ticket tiers, and AI agents

import { Program, BN, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { getPayer, getConnection } from './utils';
import * as fs from 'fs';
import * as path from 'path';

const PROGRAM_ID = new PublicKey('5fQA4eCdUtCJPDhjGfb6nn47RhVfKJT2dW5iHuQaeH2n');

async function createDemoData() {
  console.log('🎨 Creating demo data...');

  const payer = await getPayer();
  const connection = getConnection();
  const cluster = connection.rpcEndpoint.includes('devnet') ? 'devnet' : 'mainnet';

  console.log('📡 Cluster:', cluster);
  console.log('👤 Organizer:', payer.publicKey.toString());

  // Load IDL
  const idlPath = path.join(__dirname, '..', 'pulse', 'target', 'idl', 'pulse.json');
  if (!fs.existsSync(idlPath)) {
    throw new Error(`IDL not found at ${idlPath}. Please build the contract first: anchor build`);
  }

  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

  // Create provider using AnchorProvider
  const provider = new AnchorProvider(
    connection,
    {
      publicKey: payer.publicKey,
      signTransaction: async (tx: any) => {
        tx.sign(payer);
        return tx;
      },
      signAllTransactions: async (txs: any[]) => {
        txs.forEach((tx) => tx.sign(payer));
        return txs;
      },
    },
    { commitment: 'confirmed' }
  );

  // Create program instance (IDL contains program address)
  const program = new Program(idl, provider);

  const now = Math.floor(Date.now() / 1000);

  // ============================================================================
  // EVENT 1: Neon Music Festival 2025
  // ============================================================================
  console.log('\n🎵 Creating Event 1: Neon Music Festival 2025');

  const eventId1 = 'NEON2025';
  const eventStart1 = now + 86400 * 7; // 7 days from now
  const eventEnd1 = eventStart1 + 86400; // 1 day duration
  const saleStart1 = now;
  const saleEnd1 = eventStart1 - 3600; // Sale ends 1 hour before event

  const [eventPda1] = PublicKey.findProgramAddressSync(
    [Buffer.from('event'), payer.publicKey.toBuffer(), Buffer.from(eventId1)],
    PROGRAM_ID
  );

  console.log('  📍 Event PDA:', eventPda1.toString());

  try {
    const tx1 = await program.methods
      .createEvent(
        eventId1,
        'Neon Music Festival 2025',
        'Electronic music festival featuring top DJs',
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
        'Cyber Arena, Tokyo',
        new BN(eventStart1),
        new BN(eventEnd1),
        new BN(saleStart1),
        new BN(saleEnd1),
        5, // max_tickets_per_user
        500 // organizer_fee_bps
      )
      .accounts({
        event: eventPda1,
        organizer: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('  ✅ Event created!');
    console.log('  📝 TX:', `https://solscan.io/tx/${tx1}?cluster=${cluster}`);
  } catch (error: any) {
    console.log('  ⚠️  Event might already exist or error:', error?.message || error);
  }

  // ============================================================================
  // TICKET TIERS FOR EVENT 1
  // ============================================================================
  console.log('\n🎫 Creating ticket tiers for Neon Music Festival 2025');

  // GA Tier
  const [tier1Pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('tier'), eventPda1.toBuffer(), Buffer.from('GA')],
    PROGRAM_ID
  );

  try {
    const tx2 = await program.methods
      .createTicketTier(
        'GA',
        'General Admission',
        'Standard entry to all areas',
        new BN(100_000_000), // 0.1 SOL = ~$10
        new BN(1000) // 1000 tickets
      )
      .accounts({
        event: eventPda1,
        tier: tier1Pda,
        organizer: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('  ✅ GA Tier created (0.1 SOL, 1000 tickets)');
    console.log('  📝 TX:', `https://solscan.io/tx/${tx2}?cluster=${cluster}`);
  } catch (error: any) {
    console.log('  ⚠️  GA tier might already exist:', error?.message || error);
  }

  // VIP Tier
  const [tier2Pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('tier'), eventPda1.toBuffer(), Buffer.from('VIP')],
    PROGRAM_ID
  );

  try {
    const tx3 = await program.methods
      .createTicketTier(
        'VIP',
        'VIP Access',
        'Front row + backstage pass + complimentary drinks',
        new BN(500_000_000), // 0.5 SOL = ~$50
        new BN(100) // 100 tickets
      )
      .accounts({
        event: eventPda1,
        tier: tier2Pda,
        organizer: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('  ✅ VIP Tier created (0.5 SOL, 100 tickets)');
    console.log('  📝 TX:', `https://solscan.io/tx/${tx3}?cluster=${cluster}`);
  } catch (error: any) {
    console.log('  ⚠️  VIP tier might already exist:', error?.message || error);
  }

  // ============================================================================
  // EVENT 2: Tech Conference 2025
  // ============================================================================
  console.log('\n💻 Creating Event 2: Tech Conference 2025');

  const eventId2 = 'TECH2025';
  const eventStart2 = now + 86400 * 14; // 14 days from now
  const eventEnd2 = eventStart2 + 86400 * 2; // 2 days duration
  const saleStart2 = now;
  const saleEnd2 = eventStart2 - 86400; // Sale ends 1 day before event

  const [eventPda2] = PublicKey.findProgramAddressSync(
    [Buffer.from('event'), payer.publicKey.toBuffer(), Buffer.from(eventId2)],
    PROGRAM_ID
  );

  console.log('  📍 Event PDA:', eventPda2.toString());

  try {
    const tx4 = await program.methods
      .createEvent(
        eventId2,
        'Future Tech Conference 2025',
        'Annual technology conference featuring AI, blockchain, and Web3 innovators',
        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
        'Moscone Center, San Francisco',
        new BN(eventStart2),
        new BN(eventEnd2),
        new BN(saleStart2),
        new BN(saleEnd2),
        3, // max_tickets_per_user
        750 // royalty_bps: 7.5%
      )
      .accounts({
        event: eventPda2,
        organizer: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('  ✅ Event created!');
    console.log('  📝 TX:', `https://solscan.io/tx/${tx4}?cluster=${cluster}`);
  } catch (error: any) {
    console.log('  ⚠️  Event might already exist or error:', error?.message || error);
  }

  // Create tiers for Event 2
  console.log('\n🎫 Creating ticket tiers for Tech Conference 2025');

  const [tier3Pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('tier'), eventPda2.toBuffer(), Buffer.from('EARLY')],
    PROGRAM_ID
  );

  try {
    const tx5 = await program.methods
      .createTicketTier(
        'EARLY',
        'Early Bird',
        'Best price - limited time offer',
        new BN(200_000_000), // 0.2 SOL = ~$20
        new BN(500) // 500 tickets
      )
      .accounts({
        event: eventPda2,
        tier: tier3Pda,
        organizer: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('  ✅ Early Bird Tier created (0.2 SOL, 500 tickets)');
    console.log('  📝 TX:', `https://solscan.io/tx/${tx5}?cluster=${cluster}`);
  } catch (error: any) {
    console.log('  ⚠️  Tier might already exist:', error?.message || error);
  }

  // ============================================================================
  // AI AGENTS
  // ============================================================================
  console.log('\n🤖 Creating AI Agents');

  // Agent 1: Pulse Bot
  const agentId1 = 'AGENT_001';
  const [agentPda1] = PublicKey.findProgramAddressSync(
    [Buffer.from('agent'), payer.publicKey.toBuffer(), Buffer.from(agentId1)],
    PROGRAM_ID
  );

  try {
    const tx6 = await program.methods
      .createAiAgent(
        agentId1,
        'Pulse Bot',
        new BN(500_000_000), // max_price_per_ticket: 0.5 SOL
        new BN(2_000_000_000), // total_budget: 2 SOL
        true, // auto_purchase_enabled
        90, // purchase_threshold_bps: 90%
        5 // max_tickets_per_event
      )
      .accounts({
        agent: agentPda1,
        owner: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('  ✅ Pulse Bot created!');
    console.log('     - Budget: 2 SOL');
    console.log('     - Max per ticket: 0.5 SOL');
    console.log('     - Auto-purchase: Enabled');
    console.log('  📝 TX:', `https://solscan.io/tx/${tx6}?cluster=${cluster}`);
  } catch (error: any) {
    console.log('  ⚠️  Agent might already exist:', error?.message || error);
  }

  // Agent 2: Sniper Bot
  const agentId2 = 'AGENT_002';
  const [agentPda2] = PublicKey.findProgramAddressSync(
    [Buffer.from('agent'), payer.publicKey.toBuffer(), Buffer.from(agentId2)],
    PROGRAM_ID
  );

  try {
    const tx7 = await program.methods
      .createAiAgent(
        agentId2,
        'Sniper Bot',
        new BN(1_000_000_000), // max_price_per_ticket: 1 SOL
        new BN(5_000_000_000), // total_budget: 5 SOL
        true, // auto_purchase_enabled
        95, // purchase_threshold_bps: 95%
        10 // max_tickets_per_event
      )
      .accounts({
        agent: agentPda2,
        owner: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('  ✅ Sniper Bot created!');
    console.log('     - Budget: 5 SOL');
    console.log('     - Max per ticket: 1 SOL');
    console.log('     - Auto-purchase: Enabled');
    console.log('  📝 TX:', `https://solscan.io/tx/${tx7}?cluster=${cluster}`);
  } catch (error: any) {
    console.log('  ⚠️  Agent might already exist:', error?.message || error);
  }

  console.log('\n🎉 Demo data created successfully!');
  console.log('\n📊 Summary:');
  console.log('  - 2 Events: Neon Music Festival, Tech Conference');
  console.log('  - 4 Ticket Tiers: GA, VIP, Early Bird, Standard');
  console.log('  - 2 AI Agents: Pulse Bot, Sniper Bot');
  console.log('\n🚀 You can now start the frontend and test!');
  console.log('   cd ../pulse-ui && pnpm dev');
}

createDemoData().catch(console.error);
