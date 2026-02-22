// Initialize GlobalConfig on Devnet
// This is REQUIRED before any other features work

import { Program, BN, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { getPayer, getConnection } from './utils';
import * as fs from 'fs';
import * as path from 'path';

const PROGRAM_ID = new PublicKey('DUJBE41hSUh178BujH79WtirW8p9A3aA3WNCdk6ibyPp');

async function initializeConfig() {
  console.log('🚀 Initializing GlobalConfig...');

  const payer = await getPayer();
  const connection = getConnection();
  const cluster = connection.rpcEndpoint.includes('devnet') ? 'devnet' : 'mainnet';

  console.log('📡 Cluster:', cluster);
  console.log('👤 Admin:', payer.publicKey.toString());

  // Load IDL
  const idlPath = path.join(__dirname, '..', 'target', 'idl', 'pulse.json');
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

  // Derive Config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    PROGRAM_ID
  );

  console.log('📋 Config PDA:', configPda.toString());

  // Check if config already exists
  const configAccount = await connection.getAccountInfo(configPda);
  if (configAccount) {
    console.log('⚠️  Config already initialized! Skipping...');
    console.log('🔍 View on Solscan:', `https://solscan.io/account/${configPda.toString()}?cluster=${cluster}`);
    return;
  }

  // Initialize config with default values
  console.log('📝 Config Parameters:');
  console.log('  - Protocol Fee: 5%');
  console.log('  - Default Price Cap: 10%');
  console.log('  - Min Listing Duration: 1 hour');
  console.log('  - Max Listing Duration: 24 hours');
  console.log('  - Agent Coordination: Disabled');
  console.log('  - Verification: Optional');

  try {
    const tx = await program.methods
      .initializeConfig(
        500, // protocol_fee_bps: 5%
        1000, // default_price_cap_bps: 10%
        new BN(3600), // min_listing_duration: 1 hour
        new BN(86400), // max_listing_duration: 24 hours
        false, // allow_agent_coordination
        false // require_verification
      )
      .accounts({
        config: configPda,
        admin: payer.publicKey,
      })
      .rpc();

    console.log('✅ Config initialized successfully!');
    console.log('📝 Transaction signature:', tx);
    console.log('🔍 View on Solscan:', `https://solscan.io/tx/${tx}?cluster=${cluster}`);
    console.log('📋 Config account:', configPda.toString());
  } catch (error) {
    console.error('❌ Failed to initialize config:', error);
    throw error;
  }
}

initializeConfig().catch(console.error);
