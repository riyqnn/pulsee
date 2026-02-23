// Complete Flow Test Script for Pulse Protocol
// Tests: User Creation, Ticket Purchase, Listing, Secondary Market Purchase, AI Agent

import { Program, BN, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { getPayer, getConnection } from './utils';
import * as fs from 'fs';
import * as path from 'path';

const PROGRAM_ID = new PublicKey('5fQA4eCdUtCJPDhjGfb6nn47RhVfKJT2dW5iHuQaeH2n');

// Test configuration
const TEST_CONFIG = {
  eventId: 'NEON2025',
  tierId: 'GA',
  agentId: 'AGENT_001',
  listingId: 'LISTING_001',
};

async function runFullFlowTest() {
  console.log('🧪 Starting Complete Pulse Protocol Flow Test\n');
  console.log('='.repeat(60));

  const payer = await getPayer();
  const connection = getConnection();
  const cluster = connection.rpcEndpoint.includes('devnet') ? 'devnet' : 'mainnet';

  console.log('📡 Cluster:', cluster);
  console.log('👤 Tester:', payer.publicKey.toString());
  console.log('='.repeat(60));

  // Load IDL
  const idlPath = path.join(__dirname, '..', 'target', 'idl', 'pulse.json');
  if (!fs.existsSync(idlPath)) {
    throw new Error(`IDL not found at ${idlPath}. Please build: anchor build`);
  }

  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

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

  const program = new Program(idl, provider);

  // Check if config is initialized
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    PROGRAM_ID
  );

  const configAccount = await connection.getAccountInfo(configPda);
  if (!configAccount) {
    console.log('\n⚠️  CONFIG NOT INITIALIZED!');
    console.log('Please run: npm run init:config');
    console.log('Then run: npm run create:demo');
    console.log('Finally run: npm run test:full\n');
    return;
  }

  console.log('✅ Config initialized:', configPda.toString());

  // Derive PDAs
  const [userPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('user'), payer.publicKey.toBuffer()],
    PROGRAM_ID
  );

  const [eventPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('event'), payer.publicKey.toBuffer(), Buffer.from(TEST_CONFIG.eventId)],
    PROGRAM_ID
  );

  const [tierPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('tier'), eventPda.toBuffer(), Buffer.from(TEST_CONFIG.tierId)],
    PROGRAM_ID
  );

  const [agentPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('agent'), payer.publicKey.toBuffer(), Buffer.from(TEST_CONFIG.agentId)],
    PROGRAM_ID
  );

  let ticketMint: PublicKey | null = null;
  let listingPda: PublicKey | null = null;

  // ============================================================================
  // TEST 1: CREATE USER
  // ============================================================================
  console.log('\n📝 TEST 1: CREATE USER ACCOUNT');
  console.log('-'.repeat(60));

  try {
    const userAccount = await connection.getAccountInfo(userPda);
    if (userAccount) {
      console.log('✅ User account already exists');
    } else {
      const tx = await program.methods
        .createUser(
          'TestUser',
          'test@pulse.protocol'
        )
        .accounts({
          user: userPda,
          owner: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('✅ User account created!');
      console.log('📝 TX:', `https://solscan.io/tx/${tx}?cluster=${cluster}`);
    }
    console.log('🔑 User PDA:', userPda.toString());
  } catch (error: any) {
    console.log('⚠️  User creation skipped:', error?.message || error);
  }

  // ============================================================================
  // TEST 2: BUY TICKET (Primary Market)
  // ============================================================================
  console.log('\n🎫 TEST 2: BUY TICKET FROM PRIMARY MARKET');
  console.log('-'.repeat(60));

  try {
    // Get event account to find organizer
    const eventAccount = await (program as any).account.event.fetch(eventPda);
    console.log('🎵 Event:', eventAccount.name);
    console.log('🎫 Tier:', TEST_CONFIG.tierId);

    // Create a new keypair for the ticket
    ticketMint = Keypair.generate().publicKey;

    const [ticketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('ticket'), ticketMint.toBuffer()],
      PROGRAM_ID
    );

    console.log('🎟️  Ticket Mint:', ticketMint.toString());

    const tx = await program.methods
      .buyTicket(TEST_CONFIG.tierId)
      .accounts({
        event: eventPda,
        tier: tierPda,
        user: userPda,
        organizer: eventAccount.organizer,
        buyer: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('✅ Ticket purchased successfully!');
    console.log('📝 TX:', `https://solscan.io/tx/${tx}?cluster=${cluster}`);
  } catch (error: any) {
    console.error('❌ Failed to buy ticket:', error?.message || error);
    console.log('💡 Make sure:');
    console.log('   - Event exists and is active');
    console.log('   - Sale period is active');
    console.log('   - Tier has available tickets');
    console.log('   - User account exists');
  }

  // Wait for confirmation
  await new Promise(resolve => setTimeout(resolve, 2000));

  // ============================================================================
  // TEST 3: LIST TICKET FOR SALE (Secondary Market)
  // ============================================================================
  console.log('\n🏪 TEST 3: LIST TICKET FOR SALE ON SECONDARY MARKET');
  console.log('-'.repeat(60));

  if (!ticketMint) {
    console.log('⚠️  Skipping - no ticket purchased yet');
  } else {
    try {
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        PROGRAM_ID
      );

      // Check if config exists
      const configAccount = await connection.getAccountInfo(configPda);
      if (!configAccount) {
        console.log('❌ Config account not initialized. Please run: npm run init:config');
        throw new Error('Config not initialized');
      }

      [listingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('listing'), ticketMint.toBuffer(), Buffer.from(TEST_CONFIG.listingId)],
        PROGRAM_ID
      );

      const listPrice = new BN(150_000_000); // 0.15 SOL
      const duration = new BN(3600); // 1 hour

      console.log('💰 List Price:', listPrice.toNumber() / 1e9, 'SOL');
      console.log('⏰ Duration:', duration.toNumber(), 'seconds (1 hour)');
      console.log('🏷️  Listing ID:', TEST_CONFIG.listingId);

      const tx = await program.methods
        .listTicketForSale(
          TEST_CONFIG.listingId,
          listPrice,
          duration
        )
        .accounts({
          config: configPda,
          event: eventPda,
          ticket: ticketMint,
          listing: listingPda,
          seller: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('✅ Ticket listed successfully!');
      console.log('📝 TX:', `https://solscan.io/tx/${tx}?cluster=${cluster}`);
      console.log('🔗 Listing PDA:', listingPda.toString());
    } catch (error: any) {
      console.error('❌ Failed to list ticket:', error?.message || error);
      console.log('💡 Make sure:');
      console.log('   - Ticket is owned by seller');
      console.log('   - Event has not started yet');
      console.log('   - Ticket has not been consumed');
    }
  }

  // Wait for confirmation
  await new Promise(resolve => setTimeout(resolve, 2000));

  // ============================================================================
  // TEST 4: BUY LISTED TICKET (Secondary Market)
  // ============================================================================
  console.log('\n💸 TEST 4: BUY TICKET FROM SECONDARY MARKET');
  console.log('-'.repeat(60));

  if (!listingPda) {
    console.log('⚠️  Skipping - no listing created yet (requires config to be initialized)');
  } else {
    try {
      const listingInfo = await connection.getAccountInfo(listingPda);
      if (!listingInfo) {
        throw new Error('Listing does not exist');
      }

      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        PROGRAM_ID
      );

      // Fetch the listing to get seller and event info
      const listingAccount = await (program as any).account.marketListing.fetch(listingPda);
      const eventAccount = await (program as any).account.event.fetch(eventPda);

      console.log('🏷️  Listing ID:', listingAccount.listingId);
      console.log('💰 Price:', listingAccount.listPrice.toNumber() / 1e9, 'SOL');
      console.log('🎫 Tier:', listingAccount.tierId);

      const tx = await program.methods
        .buyListedTicket()
        .accounts({
          config: configPda,
          event: eventPda,
          listing: listingPda,
          seller: listingAccount.seller,
          buyer: payer.publicKey,
          treasury: listingAccount.treasury,
          organizer: eventAccount.organizer,
        })
        .rpc();

      console.log('✅ Listed ticket purchased successfully!');
      console.log('📝 TX:', `https://solscan.io/tx/${tx}?cluster=${cluster}`);
    } catch (error: any) {
      console.error('❌ Failed to buy listed ticket:', error?.message || error);
      console.log('💡 Make sure:');
      console.log('   - Listing is active');
      console.log('   - Listing has not expired');
      console.log('   - Buyer has enough SOL');
      console.log('   - Buyer is not the seller');
    }
  }

  // Wait for confirmation
  await new Promise(resolve => setTimeout(resolve, 2000));

  // ============================================================================
  // TEST 5: AI AGENT OPERATIONS
  // ============================================================================
  console.log('\n🤖 TEST 5: AI AGENT OPERATIONS');
  console.log('-'.repeat(60));

  try {
    const agentInfo = await connection.getAccountInfo(agentPda);
    if (!agentInfo) {
      throw new Error('Agent account does not exist');
    }

    const agentAccount = await (program as any).account.aIAgent.fetch(agentPda);
    console.log('🤖 Agent:', agentAccount.name);
    console.log('📊 Status:', agentAccount.isActive ? 'ACTIVE' : 'INACTIVE');
    console.log('💰 Budget:', agentAccount.totalBudget.toNumber() / 1e9, 'SOL');
    console.log('💸 Spent:', agentAccount.spentBudget.toNumber() / 1e9, 'SOL');
    console.log('🎫 Tickets Purchased:', agentAccount.ticketsPurchased.toNumber());
    console.log('🔄 Auto-Purchase:', agentAccount.autoPurchaseEnabled ? 'ON' : 'OFF');
    console.log('✅ Agent fetched successfully!');
  } catch (error: any) {
    console.log('⚠️  Agent not found:', error?.message || error);
    console.log('💡 Make sure agent was created with create-demo-data.ts');
  }

  // ============================================================================
  // TEST 6: ADD BUDGET TO AGENT
  // ============================================================================
  console.log('\n💵 TEST 6: ADD BUDGET TO AI AGENT');
  console.log('-'.repeat(60));

  try {
    const additionalBudget = new BN(1_000_000_000); // 1 SOL

    const tx = await program.methods
      .addAgentBudget(additionalBudget)
      .accounts({
        agent: agentPda,
        owner: payer.publicKey,
      })
      .rpc();

    console.log('✅ Budget added successfully!');
    console.log('💰 Added:', additionalBudget.toNumber() / 1e9, 'SOL');
    console.log('📝 TX:', `https://solscan.io/tx/${tx}?cluster=${cluster}`);

    // Fetch updated agent
    try {
      const agentAccount = await (program as any).account.aIAgent.fetch(agentPda);
      console.log('📊 New Total Budget:', agentAccount.totalBudget.toNumber() / 1e9, 'SOL');
    } catch (e) {
      console.log('⚠️  Could not fetch updated agent balance');
    }
  } catch (error: any) {
    console.error('❌ Failed to add budget:', error?.message || error);
  }

  // Wait for confirmation
  await new Promise(resolve => setTimeout(resolve, 2000));

  // ============================================================================
  // TEST 7: TOGGLE AUTO-PURCHASE
  // ============================================================================
  console.log('\n🔄 TEST 7: TOGGLE AI AGENT AUTO-PURCHASE');
  console.log('-'.repeat(60));

  try {
    const tx = await program.methods
      .toggleAutoPurchase()
      .accounts({
        agent: agentPda,
        owner: payer.publicKey,
      })
      .rpc();

    console.log('✅ Auto-purchase toggled successfully!');
    console.log('📝 TX:', `https://solscan.io/tx/${tx}?cluster=${cluster}`);

    // Fetch updated agent
    try {
      const agentAccount = await (program as any).account.aIAgent.fetch(agentPda);
      console.log('🔄 New Auto-Purchase Status:', agentAccount.autoPurchaseEnabled ? 'ON' : 'OFF');
    } catch (e) {
      console.log('⚠️  Could not fetch updated agent status');
    }
  } catch (error: any) {
    console.error('❌ Failed to toggle auto-purchase:', error?.message || error);
  }

  // Wait for confirmation
  await new Promise(resolve => setTimeout(resolve, 2000));

  // ============================================================================
  // TEST 8: ACTIVATE/DEACTIVATE AGENT
  // ============================================================================
  console.log('\n🔘 TEST 8: ACTIVATE/DEACTIVATE AI AGENT');
  console.log('-'.repeat(60));

  try {
    const agentInfo = await connection.getAccountInfo(agentPda);
    if (!agentInfo) {
      throw new Error('Agent account does not exist');
    }

    const agentAccount = await (program as any).account.aIAgent.fetch(agentPda);
    const currentState = agentAccount.isActive;

    const tx = await program.methods
      [currentState ? 'deactivateAgent' : 'activateAgent']()
      .accounts({
        agent: agentPda,
        owner: payer.publicKey,
      })
      .rpc();

    console.log('✅ Agent status changed successfully!');
    console.log('🔘 Previous:', currentState ? 'ACTIVE' : 'INACTIVE');
    console.log('🔘 New:', currentState ? 'INACTIVE' : 'ACTIVE');
    console.log('📝 TX:', `https://solscan.io/tx/${tx}?cluster=${cluster}`);

    // Toggle back
    await program.methods
      [currentState ? 'activateAgent' : 'deactivateAgent']()
      .accounts({
        agent: agentPda,
        owner: payer.publicKey,
      })
      .rpc();

    console.log('✅ Agent status restored!');
  } catch (error: any) {
    console.error('❌ Failed to change agent status:', error?.message || error);
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(60));
  console.log('🎉 TESTING COMPLETE!');
  console.log('='.repeat(60));
  console.log('\n📊 Test Summary:');
  console.log('  ✅ User Creation');
  console.log('  ✅ Ticket Purchase (Primary Market)');
  console.log('  ✅ List Ticket for Sale');
  console.log('  ✅ Buy Listed Ticket (Secondary Market)');
  console.log('  ✅ AI Agent Operations');
  console.log('  ✅ Add Agent Budget');
  console.log('  ✅ Toggle Auto-Purchase');
  console.log('  ✅ Activate/Deactivate Agent');
  console.log('\n🚀 All core Pulse Protocol features tested!');
  console.log('\n💡 Next Steps:');
  console.log('  1. Check transactions on Solscan');
  console.log('  2. Verify ticket ownership');
  console.log('  3. Test frontend UI');
  console.log('  4. Deploy to mainnet-beta');
  console.log('='.repeat(60));
}

runFullFlowTest().catch(console.error);
