import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAgentsContext } from '../../contexts/AgentsContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../utils/supabase';

export const EventDetailModal = ({ event, onClose }: any) => {
  const { publicKey } = useWallet();
  const { agents, refresh } = useAgentsContext();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isTurbo, setIsTurbo] = useState(false); // Mode Perang Barbar
  
  // STRATEGY STATE
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [priorityTier, setPriorityTier] = useState<string | null>(null);
  const [fallbackTier, setFallbackTier] = useState<string | null>(null);

  const activeAgent = useMemo(() => {
    return agents.find(a => (a.account as any).isActive || (a.account as any).is_active);
  }, [agents]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    refresh();
    return () => { document.body.style.overflow = ''; };
  }, [refresh]);

  // SEKTOR 3: LAUNCH MISSION WITH TURBO & FALLBACK LOGIC
  const handleDeployWarMission = async () => {
    if (!publicKey || !activeAgent) {
      addToast("An active agent and connected wallet are required to deploy a mission.", 'error');
      return;
    }
    if (!priorityTier) {
      addToast("Please select at least one priority tier for your mission.", 'warning');
      return;
    }

    setLoading(true);
    try {
      console.log(`⚔️ DEPLOYING ${isTurbo ? 'TURBO' : 'NORMAL'} MISSION...`);

      const { error } = await supabase
        .from('agent_missions')
        .insert([{
          agent_id: (activeAgent.account as any).agentId || (activeAgent.account as any).agent_id,
          agent_owner: publicKey.toBase58(),
          event_pda: event.publicKey.toBase58(),
          event_name: event.name,
          priority_tier_id: priorityTier,
          fallback_tier_id: fallbackTier,
          target_quantity: quantities[priorityTier] || 1,
          purchased_quantity: 0,
          max_price_sol: 2.0,
          status: 'active',
          is_turbo: isTurbo // //Kirim flag Turbo ke Backend
        }]);

      if (error) throw error;

      addToast(`Mission strategy locked in! Mode: ${isTurbo ? 'Turbo (Aggressive)' : 'Normal (Sequential)'}`, 'success');
      onClose();
    } catch (error: any) {
      addToast(`Strategy deployment failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col bg-white border-8 border-black shadow-[20px_20px_0_0_#000000]">
          
          {/* Header & Hero Image */}
          <div className="relative h-56 border-b-8 border-black bg-black flex-shrink-0">
             <img src={event.image} alt={event.name} className="w-full h-full object-cover opacity-60" />
             <div className="absolute inset-0 p-8 flex flex-col justify-end bg-gradient-to-t from-black to-transparent">
                <h1 className="font-black text-5xl text-white italic uppercase tracking-tighter">{event.name}</h1>
             </div>
             <button onClick={onClose} className="absolute top-4 right-4 w-12 h-12 bg-[#FF00F5] text-white border-4 border-black font-black text-2xl hover:rotate-90 transition-transform">+</button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* LEFT PANEL: SELECTION */}
            <div className="w-2/3 overflow-y-auto p-8 border-r-8 border-black">
              <h2 className="font-black text-3xl mb-6 flex items-center gap-4 text-black">
                <div className="w-4 h-10 bg-[#00FF41]" /> STEP 1: SELECT UNITS
              </h2>

              <div className="grid grid-cols-1 gap-4">
                {event.ticketTiers.map((tier: any) => (
                  <div 
                    key={tier.tierId} 
                    className={`border-4 border-black p-4 flex items-center justify-between transition-all ${
                      priorityTier === tier.tierId ? 'bg-[#00FF41] shadow-[4px_4px_0_0_#000000]' : 
                      fallbackTier === tier.tierId ? 'bg-[#FFEB3B] shadow-[4px_4px_0_0_#000000]' : 'bg-white'
                    }`}
                  >
                    <div>
                      <h3 className="font-black text-xl text-black">{tier.name.toUpperCase()}</h3>
                      <p className="font-mono text-sm text-black">{tier.price} SOL | {tier.available} LEFT</p>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Quantity Selector */}
                      <div className="flex items-center border-2 border-black bg-white">
                        <button onClick={() => setQuantities(p => ({...p, [tier.tierId]: Math.max(1, (p[tier.tierId]||1) - 1)}))} className="px-3 py-1 border-r-2 border-black font-bold text-black">-</button>
                        <span className="px-4 font-mono font-bold text-black">{quantities[tier.tierId] || 1}</span>
                        <button onClick={() => setQuantities(p => ({...p, [tier.tierId]: (p[tier.tierId]||1) + 1}))} className="px-3 py-1 border-l-2 border-black font-bold text-black">+</button>
                      </div>

                      <button 
                        onClick={() => priorityTier === tier.tierId ? setPriorityTier(null) : setPriorityTier(tier.tierId)}
                        className={`px-4 py-2 border-2 border-black font-black text-[10px] ${priorityTier === tier.tierId ? 'bg-black text-white' : 'bg-white text-black'}`}
                      >
                        {priorityTier === tier.tierId ? 'PRIMARY' : 'SET PRIMARY'}
                      </button>

                      <button 
                        disabled={priorityTier === tier.tierId}
                        onClick={() => fallbackTier === tier.tierId ? setFallbackTier(null) : setFallbackTier(tier.tierId)}
                        className={`px-4 py-2 border-2 border-black font-black text-[10px] ${fallbackTier === tier.tierId ? 'bg-black text-white' : 'bg-white text-black'} disabled:opacity-30`}
                      >
                        {fallbackTier === tier.tierId ? 'FALLBACK' : 'SET FALLBACK'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT PANEL: REVIEW & DEPLOY */}
            <div className="w-1/3 p-8 bg-neutral-100 flex flex-col">
              <div className="flex-1">
                <h2 className="font-black text-3xl mb-6 text-black uppercase">Step 2: Review</h2>
                
                {/* Mission Card */}
                <div className="space-y-4 font-mono text-sm bg-white border-4 border-black p-4 shadow-[8px_8px_0_0_#000000] mb-6">
                  <div>
                    <span className="text-neutral-400">AGENT:</span>
                    <p className="font-bold text-[#FF00F5] uppercase">{(activeAgent?.account as any)?.name || "NO AGENT"}</p>
                  </div>
                  <div className="border-t-2 border-black pt-2">
                    <span className="text-neutral-400 font-bold">PRIMARY TARGET:</span>
                    <p className="text-black">{priorityTier ? `${quantities[priorityTier] || 1}x ${priorityTier}` : "NOT SET"}</p>
                  </div>
                  <div className="border-t-2 border-black pt-2">
                    <span className="text-neutral-400 font-bold">FALLBACK TARGET:</span>
                    <p className="text-black">{fallbackTier ? `AUTO-SWITCH TO ${fallbackTier}` : "NONE"}</p>
                  </div>
                </div>

                {/* Mode Selection */}
                <div className="border-t-4 border-black pt-4">
                  <span className="font-black text-sm text-black uppercase tracking-widest">Select War Mode:</span>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button 
                      onClick={() => setIsTurbo(false)}
                      className={`py-3 border-4 border-black font-black text-xs transition-all ${!isTurbo ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'}`}
                    >
                      🛡️ NORMAL
                    </button>
                    <button 
                      onClick={() => setIsTurbo(true)}
                      className={`py-3 border-4 border-black font-black text-xs transition-all ${isTurbo ? 'bg-[#FF00F5] text-white animate-pulse shadow-[4px_4px_0_0_#000000]' : 'bg-white text-black hover:bg-neutral-100'}`}
                    >
                      🔥 TURBO
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-auto space-y-4">
                {isTurbo && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-red-600 text-white p-3 text-[10px] font-black border-4 border-black uppercase italic leading-tight">
                    ⚠️ ALERT: Turbo mode will spam transactions until the target is met. High RPC usage.
                  </motion.div>
                )}
                
                <button 
                  onClick={handleDeployWarMission}
                  disabled={loading || !priorityTier || !activeAgent}
                  className="w-full py-6 bg-[#00FF41] border-8 border-black font-black text-2xl shadow-[10px_10px_0_0_#000000] hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50 disabled:bg-neutral-300"
                >
                  {loading ? "WIRING DATA..." : "LAUNCH MISSION ⚔️"}
                </button>
              </div>
            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};