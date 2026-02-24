import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PublicKey } from '@solana/web3.js';
import { usePrimaryMarket } from '../../hooks/usePrimaryMarket';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAgentsContext } from '../../contexts/AgentsContext';

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
  const { buyTicket, isReady } = usePrimaryMarket();
  const { publicKey } = useWallet();
  const { agents, refresh } = useAgentsContext();
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  // Get the first active agent (simplified - no autoPurchaseEnabled check)
  const activeAgent = agents.find(a => {
    // Cek property isActive (bisa jadi is_active di beberapa environment)
    return (a.account as any).isActive === true || (a.account as any).is_active === true;
  });

  useEffect(() => {
    document.body.style.overflow = 'hidden';

    // Refresh agents when modal opens
    refresh();

    return () => {
      document.body.style.overflow = '';
    };
  }, [refresh]);


  const handleBuyTicket = async (tierId: string, useAgentForPurchase: boolean = false) => {
    if (!publicKey) return alert('CONNECT WALLET FIRST');

    setLoading(true);
    setSelectedTier(tierId);

    try {
      if (useAgentForPurchase) {
        if (!activeAgent) {
          alert('GAK ADA AGENT AKTIF, CU! Bikin dulu atau aktifin di Command Center.');
          setLoading(false);
          return;
        }

        console.log("🤖 Asking Backend Agent to buy...");
        
        const agentId = (activeAgent.account as any).agentId || (activeAgent.account as any).agent_id;

        const response = await fetch('http://localhost:3001/trigger-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentOwner: publicKey.toBase58(),
            agentId: agentId,
            organizerPubkey: event.publicKey.toBase58(), 
            eventId: event.id,
            tierId: tierId,
          }),
        });

        const result = await response.json();
        
        if (result.success) {
          alert(`MISSION SUCCESS! TX: ${result.tx}`);
          onClose();
        } else {
          throw new Error(result.error || 'Backend error');
        }

      } else {
        // Manual Buy (Direct)
        await buyTicket({
          eventPDA: event.publicKey,
          tierId: tierId,
        });
        alert('TICKET PURCHASED SUCCESSFULLY');
        onClose();
      }
    } catch (error: any) {
      console.error('Purchase failed:', error);
      alert(`FAILED: ${error.message}`);
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
                              whileHover={{ scale: isSoldOut ? 1 : 1.02 }}
                              whileTap={{ scale: isSoldOut ? 1 : 0.98 }}
                              onClick={() => !isSoldOut && handleBuyTicket(tier.tierId, false)}
                              disabled={isSoldOut || isBuying || !publicKey}
                              className={`py-3 font-black text-sm border-4 border-black transition-all ${
                                isSoldOut || !publicKey
                                  ? 'bg-neutral-300 text-neutral-600 cursor-not-allowed'
                                  : 'bg-[#00FF41] text-black hover:bg-[#FF00F5] hover:text-white'
                              }`}
                            >
                              {isBuying && selectedTier === tier.tierId ? 'PROCESSING...' : isSoldOut ? 'SOLD OUT' : !publicKey ? 'CONNECT' : 'BUY NOW'}
                            </motion.button>

                            {/* Agent Buy */}
                            <motion.button
                              whileHover={{ scale: (isSoldOut || !activeAgent) ? 1 : 1.02 }}
                              whileTap={{ scale: (isSoldOut || !activeAgent) ? 1 : 0.98 }}
                              onClick={() => !isSoldOut && handleBuyTicket(tier.tierId, true)}
                              disabled={isSoldOut || isBuying || !publicKey || !activeAgent}
                              className={`py-3 font-black text-sm border-4 border-black transition-all ${
                                isSoldOut || !publicKey || !activeAgent
                                  ? 'bg-neutral-300 text-neutral-600 cursor-not-allowed'
                                  : 'bg-[#FF00F5] text-white hover:bg-black hover:border-white'
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
