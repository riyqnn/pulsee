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
import { IDL } from './idl.ts';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { createClient, SupabaseClient } from '@supabase/supabase-js'; // //FIXED: Import type

dotenv.config(); // //PENTING: Harus paling atas setelah import

const app = express();
app.use(cors());
app.use(express.json());

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
async function executePurchaseMission(
  agentOwner: string,
  agentId: string,
  organizerPubkey: string,
  eventId: string,
  tierId: string
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
        .mintTicketNft("Pulse Ticket", "PULSE", "https://arweave.net/placeholder")
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
  console.log("🛰️ [SYSTEM] SCANNING MISSION CONTROL...");

  const { data: missions, error } = await supabase
    .from('agent_missions')
    .select('*')
    .eq('status', 'active');

  if (error || !missions || missions.length === 0) {
    console.log("😴 No active missions found.");
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
        .select('organizer_pubkey, event_id')
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
          
          console.log(`⚔️ Sniping ${targetTier} for mission ${mission.id}...`);
          
          const tx = await executePurchaseMission(
            mission.agent_owner,
            mission.agent_id,
            eventMeta.organizer_pubkey,
            eventMeta.event_id,
            targetTier
          );

          mission.purchased_quantity += 1;
          
          await supabase.from('agent_missions').update({
            purchased_quantity: mission.purchased_quantity,
            status: (mission.purchased_quantity >= mission.target_quantity) ? 'completed' : 'active'
          }).eq('id', mission.id);

          console.log(`🎯 [SUCCESS] Sniped! Progress: ${mission.purchased_quantity}/${mission.target_quantity}`);

          // Kalau BUKAN turbo mode, kita keluar dari while loop setelah 1x sukses
          if (!mission.is_turbo) continueWar = false;
          
          // Jeda dikit biar RPC gak kaget (500ms)
          if (continueWar) await new Promise(r => setTimeout(r, 500));

        } catch (e: any) {
          console.log(`⚠️ Priority Tier failed: ${e.message}`);
          
          // FALLBACK LOGIC: Kalau priority gagal dan ada fallback, coba fallback-nya
          if (mission.fallback_tier_id) {
            console.log(`🔄 Switching to Fallback Tier: ${mission.fallback_tier_id}`);
            try {
              const txFallback = await executePurchaseMission(
                mission.agent_owner,
                mission.agent_id,
                eventMeta.organizer_pubkey,
                eventMeta.event_id,
                mission.fallback_tier_id
              );
              
              mission.purchased_quantity += 1;
              await supabase.from('agent_missions').update({
                purchased_quantity: mission.purchased_quantity
              }).eq('id', mission.id);
              
              console.log(`🎯 [FALLBACK SUCCESS] Sniped fallback ticket!`);
            } catch (fallbackErr: any) {
              console.error(`❌ Both Priority & Fallback failed: ${fallbackErr.message}`);
              continueWar = false; // Berhenti dulu scan ini
            }
          } else {
            continueWar = false; // Gak ada fallback, berhenti
          }
        }
      }
    } catch (e: any) {
      console.error(`⚠️ Mission ${mission.id} total failure: ${e.message}`);
    }
  }
}

// ============== Main Entrance ==============
async function main() {
  console.log('🤖 PULSE Agent Scheduler System Starting...');
  
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
  app.listen(PORT, () => console.log(`📡 API Listener running on port ${PORT}`));

  cron.schedule('*/10 * * * * *', runAutonomousWar);
  console.log('🚀 SYSTEM ARMED AND READY.');
}

main().catch(console.error);