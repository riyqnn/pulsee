import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { NeoCard } from './neo';
import { useProgram } from '../hooks/useProgram';
import { PROGRAM_ID, lamportsToSol } from '../utils/accounts';
import { supabase } from '../utils/supabase';

interface MyTicketsProps {
  ownerPublicKey: PublicKey;
}

export const MyTickets = ({ ownerPublicKey }: MyTicketsProps) => {
  const { connection } = useProgram();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOnChainTickets = useCallback(async () => {
    if (!connection || !ownerPublicKey) return;

    try {
      setLoading(true);
      console.log("🔍 Scanning Blockchain for True NFTs...");

      // 1. Ambil semua token accounts milik user
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(ownerPublicKey, {
        programId: TOKEN_PROGRAM_ID,
      });

      // 2. Filter token yang jumlahnya 1 (NFT)
      const potentialNFTs = tokenAccounts.value.filter(
        (t) => t.account.data.parsed.info.tokenAmount.uiAmount === 1
      );

      const ticketList: any[] = [];

      // 3. Verifikasi Authority & Tarik Metadata Supabase
      // Kita lakukan ini secara batch biar cepet
      for (const token of potentialNFTs) {
        const mintAddress = new PublicKey(token.account.data.parsed.info.mint);
        
        // Ambil info detail mint buat liat siapa boss-nya (Authority)
        const mintInfo = await connection.getAccountInfo(mintAddress);
        if (!mintInfo) continue;

        /**
         * Di Solana Mint Account, byte ke 4-36 adalah Mint Authority.
         * Di Smart Contract kita, Mint Authority = Event PDA.
         */
        const mintAuthority = new PublicKey(mintInfo.data.slice(4, 36));
        const eventPdaStr = mintAuthority.toBase58();

        // 4. Tanya Supabase: "Eh, ada metadata buat Event PDA ini gak?"
        const { data: meta, error } = await supabase
          .from('events_metadata')
          .select('*')
          .eq('event_pda', eventPdaStr)
          .single();

        if (meta) {
          ticketList.push({
            mint: mintAddress.toBase58(),
            eventPda: eventPdaStr,
            metadata: meta,
            onChainStatus: 'VERIFIED_NFT'
          });
        }
      }

      setTickets(ticketList);
    } catch (error) {
      console.error('[MyTickets] On-chain fetch failed:', error);
    } finally {
      setLoading(false);
    }
  }, [connection, ownerPublicKey]);

  useEffect(() => {
    fetchOnChainTickets();
  }, [fetchOnChainTickets]);

  if (loading) {
    return (
      <div className="text-center py-20 font-mono">
        <div className="inline-block w-12 h-12 border-8 border-black border-t-[#FF00F5] rounded-full animate-spin mb-4" />
        <p className="font-black text-xl italic uppercase">Scanning Neural Network...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 p-4">
      {/* Brutalist Header */}
      <div className="relative border-b-8 border-black pb-6">
        <h2 className="font-black text-7xl tracking-tighter uppercase italic leading-none">
          Owned<br />Assets
        </h2>
        <div className="absolute top-0 right-0 bg-[#00FF41] border-4 border-black px-4 py-2 font-mono font-bold shadow-[4px_4px_0_0_#000000]">
          {tickets.length} TRUE_NFTs
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="bg-neutral-100 border-8 border-black p-20 text-center shadow-[12px_12px_0_0_#000000]">
          <h3 className="font-black text-4xl mb-4 uppercase">Wallet Empty</h3>
          <p className="font-mono text-neutral-500">No tickets found on-chain. Go buy some via AI Agents!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tickets.map((ticket, index) => (
            <motion.div
              key={ticket.mint}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="group relative"
            >
              <div className="bg-white border-4 border-black shadow-[8px_8px_0_0_#000000] overflow-hidden transition-all group-hover:shadow-[12px_12px_0_0_#FF00F5] group-hover:-translate-y-1">
                {/* Image Section */}
                <div className="relative h-48 border-b-4 border-black bg-black">
                  <img 
                    src={ticket.metadata.image_url} 
                    alt="NFT Cover" 
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute top-3 left-3 bg-black text-white px-2 py-1 font-mono text-[10px] border-2 border-white">
                    MINT: {ticket.mint.slice(0, 8)}...
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="font-black text-2xl uppercase truncate leading-tight">
                      {ticket.metadata.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 bg-[#00FF41] rounded-full animate-pulse" />
                      <span className="font-mono text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Verified Pulse Asset</span>
                    </div>
                  </div>

                  <div className="bg-neutral-50 border-2 border-black p-3 font-mono text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">VENUE:</span>
                      <span className="font-bold">{ticket.metadata.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">EVENT_PDA:</span>
                      <span className="font-bold text-[#FF00F5]">{ticket.eventPda.slice(0, 10)}...</span>
                    </div>
                  </div>

                  {/* On-Chain Verification Stamp */}
                  <div className="flex gap-2">
                    <div className="flex-1 border-4 border-black bg-[#FFEB3B] text-black font-black text-center py-2 text-sm italic shadow-[2px_2px_0_0_#000000]">
                      TRUE NFT
                    </div>
                    <button className="bg-black text-white px-4 py-2 border-4 border-black hover:bg-[#FF00F5] transition-colors">
                      <span className="font-black text-sm">QR</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};