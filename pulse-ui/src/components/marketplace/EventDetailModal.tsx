import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrimaryMarket } from '../../hooks/usePrimaryMarket';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAgentsContext } from '../../contexts/AgentsContext';
import { useProgram } from '../../hooks/useProgram'; // //NEW: Butuh ini buat ambil program instance
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Keypair, SystemProgram, PublicKey } from '@solana/web3.js';
import { getTierPDA, getAgentPDA, getEscrowPDA, PROGRAM_ID } from '../../utils/accounts'; // //NEW: Import helpers

interface EventDetailModalProps {
  event: {
    id: string;
    name: string;
    venue: string;
    date: string;
    image: string;
    description?: string;
    publicKey: PublicKey;
    soldOut: boolean;
    organizer_pubkey?: string; // Tambahin biar aman
    organizer?: string;        // Handle dua kemungkinan casing
    ticketTiers: {
      name: string;
      tierId: string;
      price: number;
      available: number;
      maxSupply: number;
    }[];
  };
  onClose: () => void;
}

export const EventDetailModal = ({ event, onClose }: EventDetailModalProps) => {
  const { isReady } = usePrimaryMarket();
  const { program } = useProgram(); // //FIXED: Tarik program ke sini cu!
  const { publicKey } = useWallet();
  const { agents, refresh } = useAgentsContext();
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  // Get the first active agent
  const activeAgent = useMemo(() => {
    return agents.find(a => {
      const acc = a.account as any;
      return acc.isActive === true || acc.is_active === true;
    });
  }, [agents]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    refresh();
    return () => {
      document.body.style.overflow = '';
    };
  }, [refresh]);

  const handleBuyTicket = async (tierId: string, useAgentForPurchase: boolean = false) => {
      // 1. Initial Validation - Sekarang program udah ada
      if (!publicKey || !program) {
          console.error("❌ Wallet not connected or Program not initialized");
          return alert('PLEASE CONNECT YOUR WALLET TO PROCEED');
      }

      setLoading(true);
      setSelectedTier(tierId);

      try {
          if (useAgentForPurchase) {
              /**
               * CASE: AI AGENT AUTONOMOUS PURCHASE
               */
              if (!activeAgent) {
                  alert('ACTIVE AGENT NOT FOUND! Please initialize an agent in the Command Center first.');
                  setLoading(false);
                  return;
              }

              console.log("🤖 [AGENT MODE] Requesting background purchase via Pulse Scheduler...");
              
              const agentId = (activeAgent.account as any).agentId || (activeAgent.account as any).agent_id;
              const organizerWallet = (event as any).organizer_pubkey || (event as any).organizer;

              const response = await fetch('http://localhost:3001/trigger-agent', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      agentOwner: publicKey.toBase58(),
                      agentId: agentId,
                      organizerPubkey: organizerWallet,
                      eventId: event.id,
                      tierId: tierId,
                  }),
              });

              const result = await response.json();
              
              if (result.success) {
                  console.log(`✅ [AGENT SUCCESS] Transaction Signature: ${result.tx}`);
                  alert(`MISSION ACCOMPLISHED! Your agent has secured the ticket. \n\nNFT Minted & Delivered.`);
                  onClose();
              } else {
                  throw new Error(result.error || 'Agent execution failed');
              }

          } else {
              /**
               * CASE: MANUAL DIRECT PURCHASE (BUNDLED WITH NFT MINT)
               */
              console.log("⚡ [MANUAL MODE] Initializing Bundled Transaction (Payment + NFT Mint)...");

              const ticketMintKeypair = Keypair.generate();
              const buyerATA = getAssociatedTokenAddressSync(
                  ticketMintKeypair.publicKey,
                  publicKey
              );

              // Ambil PDA secara real-time
              const agentId = (activeAgent?.account as any)?.agentId || "DEFAULT_AGENT"; 
              const [agentPDA] = getAgentPDA(publicKey, agentId, PROGRAM_ID);
              const [escrowPDA] = getEscrowPDA(agentPDA, publicKey, PROGRAM_ID);
              const [tierPDA] = getTierPDA(event.publicKey, tierId, PROGRAM_ID);

              const organizerPubkey = new PublicKey((event as any).organizer_pubkey || (event as any).organizer);

              // Construct the bundled transaction
              const tx = await program.methods
                  .buyTicketWithEscrow(tierId, publicKey) 
                  .accounts({
                      event: event.publicKey,
                      tier: tierPDA,
                      agent: agentPDA,
                      escrow: escrowPDA,
                      organizer: organizerPubkey,
                      authority: publicKey,
                      systemProgram: SystemProgram.programId,
                  })
                  .postInstructions([
                      await program.methods
                          .mintTicketNft()
                          .accounts({
                              event: event.publicKey,
                              ticketMint: ticketMintKeypair.publicKey,
                              buyerTokenAccount: buyerATA,
                              buyer: publicKey,
                              authority: publicKey,
                              tokenProgram: TOKEN_PROGRAM_ID,
                              associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                              systemProgram: SystemProgram.programId,
                          })
                          .instruction()
                  ])
                  .signers([ticketMintKeypair]) 
                  .rpc();

              console.log(`✅ [MANUAL SUCCESS] Bundled TX Signature: ${tx}`);
              alert('TICKET SECURED! The True NFT has been minted directly to your wallet.');
              onClose();
          }
      } catch (error: any) {
          console.error('🚨 [CRITICAL ERROR] Purchase process failed:', error);
          alert(`FAILED: ${error.message || 'Transaction error'}`);
      } finally {
          setLoading(false);
          setSelectedTier(null);
      }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!event) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={handleBackdropClick}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main Modal Container */}
          <div className="bg-white border-4 border-black shadow-[16px_16px_0_0_#000000] flex flex-col max-h-[95vh]">
            {/* Hero Image Section */}
            <div className="relative aspect-[21/9] overflow-hidden border-b-4 border-black bg-neutral-900 flex-shrink-0">
              <img
                src={event.image}
                alt={event.name}
                className="w-full h-full object-cover"
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* Close Button - Industrial Style */}
              <motion.button
                whileHover={{ rotate: 90, backgroundColor: '#FF00F5', color: 'white' }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="absolute top-6 right-6 w-12 h-12 bg-white border-4 border-black flex items-center justify-center z-20 transition-colors duration-200"
              >
                <span className="font-black text-2xl">+</span>
              </motion.button>

              {/* Sold Out Stamp */}
              <AnimatePresence>
                {event.soldOut && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, rotate: -15 }}
                    animate={{ opacity: 1, scale: 1, rotate: -15 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-10"
                  >
                    <div className="border-12 border-[#FF00F5] bg-white px-12 py-6">
                      <span className="font-black text-6xl text-black tracking-widest" style={{ textShadow: '6px 6px 0 #FF00F5' }}>
                        SOLD OUT
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* On Sale Badge */}
              {!event.soldOut && (
                <motion.div
                  initial={{ x: -100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="absolute top-6 left-6 z-10"
                >
                  <div className="bg-[#00FF41] border-4 border-black px-6 py-3">
                    <span className="font-black text-xl text-black">ON SALE NOW</span>
                  </div>
                </motion.div>
              )}

              {/* Event Title Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <h1 className="font-black text-5xl md:text-6xl text-white mb-4" style={{ textShadow: '4px 4px 0 #000000' }}>
                  {event.name}
                </h1>
                <div className="flex flex-wrap gap-4">
                  <div className="bg-black/90 border-2 border-white px-4 py-2">
                    <span className="font-mono text-white font-bold">{event.venue}</span>
                  </div>
                  <div className="bg-[#FF00F5] border-2 border-black px-4 py-2">
                    <span className="font-mono text-white font-bold">{event.date}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 p-8">
              {/* Ticket Tiers Section */}
              <div className="mb-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-2 h-12 bg-[#00FF41]" />
                  <h2 className="font-black text-3xl">SELECT TICKET TIER</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {event.ticketTiers.map((tier, index) => {
                    const isSoldOut = tier.available >= tier.maxSupply;
                    const isBuying = loading && selectedTier === tier.tierId;
                    const soldPercentage = ((tier.maxSupply - tier.available) / tier.maxSupply) * 100;

                    return (
                      <motion.div
                        key={tier.tierId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`relative bg-white border-4 border-black transition-all duration-200 ${
                          isSoldOut ? 'opacity-50' : 'hover:shadow-[8px_8px_0_0_#FF00F5] hover:-translate-y-1 hover:-translate-x-1'
                        }`}
                      >
                        {/* Tier Header */}
                        <div className="bg-black p-4 border-b-4 border-black">
                          <div className="flex items-center justify-between">
                            <h3 className="font-black text-2xl text-white">{tier.name.toUpperCase()}</h3>
                            {isSoldOut ? (
                              <div className="bg-neutral-600 border-2 border-white px-3 py-1">
                                <span className="font-mono text-sm font-bold text-white">SOLD OUT</span>
                              </div>
                            ) : (
                              <motion.div
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="bg-[#00FF41] border-2 border-white px-3 py-1"
                              >
                                <span className="font-mono text-sm font-bold text-black">{tier.available} LEFT</span>
                              </motion.div>
                            )}
                          </div>
                        </div>

                        {/* Tier Body */}
                        <div className="p-5">
                          {/* Price Display */}
                          <div className="text-center mb-4">
                            <div className="font-mono text-neutral-500 text-sm mb-1">PRICE PER TICKET</div>
                            <div className="font-black text-5xl bg-gradient-to-br from-[#00FF41] to-[#00cc33] bg-clip-text text-transparent">
                              {tier.price.toFixed(2)}
                            </div>
                            <div className="font-mono text-neutral-500 text-lg">SOL</div>
                          </div>

                          {/* Availability Progress */}
                          <div className="mb-5">
                            <div className="flex justify-between font-mono text-sm mb-2">
                              <span className="text-neutral-500">AVAILABILITY</span>
                              <span className="font-bold">{tier.maxSupply - tier.available} / {tier.maxSupply} SOLD</span>
                            </div>
                            <div className="h-4 bg-neutral-200 border-2 border-black overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${soldPercentage}%` }}
                                transition={{ duration: 0.8, delay: index * 0.1 + 0.3 }}
                                className={`h-full ${soldPercentage > 80 ? 'bg-[#FF00F5]' : 'bg-[#00FF41]'}`}
                              />
                            </div>
                          </div>

                          {/* Buy Buttons */}
                          <div className="grid grid-cols-2 gap-3">
                            {/* Manual Buy */}
                            <motion.button 
                              onClick={() => handleBuyTicket(tier.tierId, true)}
                              // HAPUS isSoldOut dari sini cu!
                              disabled={isBuying || !publicKey || !activeAgent} 
                              className={`py-3 font-black text-sm border-4 border-black transition-all ${
                                !publicKey || !activeAgent
                                  ? 'bg-neutral-300 text-neutral-600 cursor-not-allowed'
                                  : 'bg-[#FF00F5] text-white hover:bg-black hover:border-white'
                              }`}
                            >
                              {isBuying && selectedTier === tier.tierId ? 'PROCESSING...' : isSoldOut ? 'SOLD OUT' : !publicKey ? 'CONNECT' : 'BUY NOW'}
                            </motion.button>

                            {/* Agent Buy */}

                            <motion.button
                              whileHover={{ scale: !activeAgent ? 1 : 1.02 }}
                              onClick={() => handleBuyTicket(tier.tierId, true)}
                              disabled={isBuying || !publicKey || !activeAgent} 
                              className={`py-3 font-black text-sm border-4 border-black transition-all cursor-pointer ${
                                !publicKey || !activeAgent
                                  ? 'bg-neutral-300 text-neutral-600 cursor-not-allowed'
                                  : 'bg-[#FF00F5] text-white hover:bg-black hover:border-white shadow-[4px_4px_0_0_#000000]'
                              }`}
                            >
                              {!activeAgent ? 'NO AGENT' : isBuying && selectedTier === tier.tierId ? 'BUYING...' : 'AGENT BUY'}
                            </motion.button>
                          </div>
                        </div>

                        {/* Corner Accent */}
                        {!isSoldOut && (
                          <div className="absolute top-0 right-0 w-6 h-6 bg-[#FF00F5]" />
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Info Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Event Info */}
                <div className="bg-neutral-100 border-4 border-black p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-black flex items-center justify-center">
                      <span className="text-white font-bold text-sm">INF</span>
                    </div>
                    <h3 className="font-black text-xl">EVENT DETAILS</h3>
                  </div>
                  <ul className="space-y-2 font-mono text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-[#00FF41] font-bold">+</span>
                      <span>Digital ticket secured on Solana blockchain</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#00FF41] font-bold">+</span>
                      <span>Instant delivery after successful purchase</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#00FF41] font-bold">+</span>
                      <span>Resellable on secondary P2P marketplace</span>
                    </li>
                  </ul>
                </div>

                {/* Security Info */}
                <div className="bg-neutral-100 border-4 border-black p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-[#FF00F5] flex items-center justify-center">
                      <span className="text-white font-bold text-sm">SEC</span>
                    </div>
                    <h3 className="font-black text-xl">SMART CONTRACT</h3>
                  </div>
                  <ul className="space-y-2 font-mono text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-[#FF00F5] font-bold">+</span>
                      <span>Anchor program powered transactions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#FF00F5] font-bold">+</span>
                      <span>Non-custodial ticket ownership</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#FF00F5] font-bold">+</span>
                      <span>On-chain verifiable authenticity</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer Bar */}
            <div className="flex-shrink-0 bg-black border-t-4 border-black p-4">
              <div className="flex items-center justify-between">
                <div className="font-mono text-sm text-neutral-400">
                  <span className="text-[#00FF41] font-bold">PULSE</span> PROTOCOL v1.0
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${isReady ? 'bg-[#00FF41]' : 'bg-[#FF00F5]'} ${isReady ? 'animate-pulse' : ''}`} />
                    <span className="font-mono text-xs text-white">
                      {isReady ? 'SYSTEM READY' : 'CONNECTING...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
