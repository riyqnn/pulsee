import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // //UPDATED: Tambah AnimatePresence
import { PublicKey } from '@solana/web3.js';
import { NeoCard, NeoBadge, NeoButton } from '../neo';
import { LiveLog } from './LiveLog';
import { AgentSettings } from './AgentSettings';
import { EscrowDashboard } from './EscrowDashboard';
import { useAgentsContext } from '../../contexts/AgentsContext';
import { useToast } from '../../contexts/ToastContext';
import { useAIAgent } from '../../hooks/useAIAgent';
import { lamportsToSol, getEscrowPDA, PROGRAM_ID } from '../../utils/accounts';
import { useWallet } from '@solana/wallet-adapter-react';
import { X, AlertCircle } from 'lucide-react'; // //NEW: Icons
import type { ProgramAccount, AIAgent } from '../../types/pulse';

export const AgentCommandCenter = () => {
  const { publicKey } = useWallet();
  const { agents, missions, totalTicketsPurchased, totalBudgetSpent, loading, refresh } = useAgentsContext();
  const { getEscrow, activateAgent, deactivateAgent } = useAIAgent();
  const { addToast } = useToast();

  const [showEscrowFor, setShowEscrowFor] = useState<PublicKey | null>(null);
  const [escrowBalances, setEscrowBalances] = useState<Map<string, string>>(new Map());
  const [actionLoading, setActionLoading] = useState(false);

  // //NEW: State buat liat alasan reject
  const [viewingRejectedFor, setViewingRejectedFor] = useState<string | null>(null);

  const fetchEscrowBalances = async () => {
    if (!publicKey || agents.length === 0) return;

    const balances = new Map<string, string>();
    for (const agent of agents) {
      try {
        const [escrowPDA] = getEscrowPDA(agent.publicKey, publicKey, PROGRAM_ID);
        const escrow = await getEscrow(escrowPDA);
        if (escrow) {
          const balance = typeof escrow.balance === 'bigint' ? Number(escrow.balance) : Number(escrow.balance);
          balances.set(agent.publicKey.toBase58(), lamportsToSol(balance));
        } else {
          balances.set(agent.publicKey.toBase58(), '0.0000');
        }
      } catch {
        balances.set(agent.publicKey.toBase58(), '0.0000');
      }
    }
    setEscrowBalances(balances);
  };

  useEffect(() => {
    fetchEscrowBalances();
  }, [agents, publicKey]);

  const handleToggleActive = async (agent: ProgramAccount<AIAgent>) => {
    setActionLoading(true);
    try {
      if (agent.account.isActive) {
        await deactivateAgent(agent.publicKey, agent.account.agentId);
      } else {
        await activateAgent(agent.publicKey, agent.account.agentId);
      }
      await refresh();
    } catch (error) {
      console.error('Failed to toggle agent active state:', error);
      addToast(`Failed to toggle agent: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display font-extrabold text-5xl italic tracking-tighter uppercase text-black">Agent Command Center</h2>
        <NeoBadge variant="green">{agents.length} DEPLOYED NODES</NeoBadge>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Agent Status Panel */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative"
          >
            <div className="flex items-center justify-between mb-4 pb-4 border-b-4 border-black">
              <span className="font-mono text-sm tracking-widest text-neutral-500 uppercase">ACTIVE_THREADS.log</span>
              <div className="font-black text-3xl text-[#FF00F5]">{agents.length}</div>
            </div>
          </motion.div>

          {loading ? (
            <NeoCard className="p-8">
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-center font-mono text-lg font-bold uppercase"
              >
                FETCHING AGENT DATA...
              </motion.div>
            </NeoCard>
          ) : agents.length === 0 ? (
            <NeoCard className="p-8">
              <div className="text-center font-mono text-sm text-neutral-500 font-bold uppercase">
                NO AGENTS FOUND
                <div className="mt-2 text-xs opacity-60">DEPLOY A MISSION TO START</div>
              </div>
            </NeoCard>
          ) : (
            <div className="space-y-3">
              {agents.map((agent, index) => {
                const spentSol = Number(agent.account.spentBudget.toString()) / 1e9;
                const totalBudgetSol = Number(agent.account.totalBudget.toString()) / 1e9;
                const remainingSol = (totalBudgetSol - spentSol).toFixed(4);
                const escrowBalance = escrowBalances.get(agent.publicKey.toBase58()) || '0.00';
                const maxPerTicket = lamportsToSol(agent.account.maxBudgetPerTicket.toString());
                const agentName = agent.account.name || agent.account.agentId;
                const agentPDA = agent.publicKey.toBase58();

                const agentMissions = missions.filter(m => m.agent_id === agent.account.agentId);
                const activeMissions = agentMissions.filter(m => m.status === 'active');
                const totalWait = activeMissions.filter(m => m.ai_decision_status === 'HOLD' || m.ai_decision_status === 'PENDING').length;
                const boughtCount = agent.account.ticketsPurchased.toString();
                const rejectedCount = agentMissions.filter(m => m.status === 'failed').length;

                const formatMax = (val: string) => {
                  const num = parseFloat(val);
                  if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
                  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
                  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
                  return val;
                };

                return (
                  <motion.div
                    key={agentPDA}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="relative group"
                  >
                    <div className="bg-white border-4 border-black shadow-[6px_6px_0_0_#000000] transition-all duration-200">
                      <div className="border-b-4 border-black p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-base truncate max-w-[140px] uppercase">
                              {agentName}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 font-mono text-[10px] font-bold border-2 border-black ${agent.account.isActive ? 'bg-[#00FF41] text-black' : 'bg-neutral-300 text-black'}`}>
                            {agent.account.isActive ? 'ONLINE' : 'OFFLINE'}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <div className="flex gap-2 flex-wrap items-center">
                             <span className="text-black font-black uppercase">{boughtCount} BOUGHT</span>
                             
                             {totalWait > 0 && (
                               <span className="text-[#FF00F5] font-bold bg-[#FF00F5]/5 px-1">
                                 {totalWait} WAIT
                               </span>
                             )}

                             {rejectedCount > 0 && (
                               <button 
                                 onClick={() => setViewingRejectedFor(agent.account.agentId)}
                                 className="text-red-500 font-bold bg-red-50 px-1 border border-red-200 hover:bg-red-500 hover:text-white transition-colors"
                               >
                                 {rejectedCount} REJECTED [?]
                               </button>
                             )}
                          </div>
                          <span className="text-[#FFEB3B] font-bold bg-black px-2">{escrowBalance} SOL</span>
                        </div>
                      </div>

                      <div className="p-3 space-y-3">
                        <div>
                          <div className="flex justify-between font-mono text-[11px] mb-1">
                            <span className="text-neutral-500 font-bold uppercase">Budget Control</span>
                            <span className={`${parseFloat(remainingSol) < 0 ? 'text-red-500' : 'text-black'} font-bold`}>
                              {spentSol.toFixed(2)}/{totalBudgetSol.toFixed(2)} SOL
                            </span>
                          </div>
                          <div className="h-2.5 bg-neutral-200 border-2 border-black overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, Math.max(0, (spentSol / totalBudgetSol) * 100 || 0))}%` }}
                              transition={{ duration: 0.5 }}
                              className={`h-full ${parseFloat(remainingSol) < 0 ? 'bg-red-500' : 'bg-[#00FF41]'}`}
                            />
                          </div>
                          <div className="flex justify-between mt-1 text-[9px] font-mono uppercase font-bold text-neutral-400">
                             <span>Cap: {formatMax(maxPerTicket)} SOL</span>
                             {rejectedCount > 0 && <span className="text-red-400 italic underline cursor-help" onClick={() => setViewingRejectedFor(agent.account.agentId)}>WHY REJECTED?</span>}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <NeoButton
                            variant={agent.account.isActive ? 'warning' : 'success'}
                            size="sm"
                            onClick={() => handleToggleActive(agent)}
                            disabled={actionLoading}
                            className="font-mono text-[10px] py-1.5 uppercase font-bold"
                          >
                            {agent.account.isActive ? 'DISENGAGE' : 'ENGAGE'}
                          </NeoButton>
                          <NeoButton
                            variant="accent"
                            size="sm"
                            onClick={() => setShowEscrowFor(agent.publicKey)}
                            disabled={actionLoading}
                            className="font-mono text-[10px] py-1.5 uppercase font-bold"
                          >
                            ESCROW_DATA
                          </NeoButton>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          <NeoCard className="p-4 border-dashed border-black/30">
            <h3 className="font-display font-bold text-xl mb-4 border-b-4 border-neo-black pb-2 uppercase tracking-tighter italic text-[#FF00F5]">
              System Analytics
            </h3>
            <div className="space-y-2 font-bold uppercase">
              <div className="flex justify-between font-mono text-sm">
                <span className="text-neutral-500">Verified Minted:</span>
                <span className="font-bold text-[#00FF41]">{totalTicketsPurchased.toString()} TKT</span>
              </div>
              <div className="flex justify-between font-mono text-sm">
                <span className="text-neutral-500">Resource Spent:</span>
                <span className="font-bold text-black">{totalBudgetSpent.toFixed(4)} SOL</span>
              </div>
              <div className="flex justify-between font-mono text-sm">
                <span className="text-neutral-500">Strategic Holds:</span>
                <span className="font-bold text-[#FF00F5]">
                  {missions.filter(m => m.status === 'active' && (m.ai_decision_status === 'HOLD' || m.ai_decision_status === 'PENDING')).length}
                </span>
              </div>
              <div className="flex justify-between font-mono text-sm">
                <span className="text-neutral-500">Terminated:</span>
                <span className="font-bold text-red-500">
                  {missions.filter(m => m.status === 'failed').length} MISSIONS
                </span>
              </div>
            </div>
          </NeoCard>
        </div>

        {/* Live Log */}
        <div className="col-span-12 lg:col-span-5">
          <NeoCard className="h-full bg-black">
            <div className="border-b-4 border-white/20 p-4">
              <h3 className="font-display font-bold text-xl uppercase italic text-white tracking-widest">
                {">"} LIVE AGENT LOGS
              </h3>
            </div>
            <div className="p-4 h-[500px]">
              <LiveLog />
            </div>
          </NeoCard>
        </div>

        {/* Settings */}
        <div className="col-span-12 lg:col-span-3">
          <AgentSettings />
        </div>
      </div>

      {/* ========================================== */}
      {/* //NEW: REJECTED REASONS MODAL (Kenapa cu?) */}
      {/* ========================================== */}
      <AnimatePresence>
        {viewingRejectedFor && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white border-8 border-black shadow-[16px_16px_0_0_#FF0000] w-full max-w-2xl overflow-hidden"
             >
                <div className="bg-red-600 text-white p-4 flex justify-between items-center border-b-8 border-black">
                   <div className="flex items-center gap-2">
                      <AlertCircle size={24} />
                      <h3 className="font-black text-2xl uppercase italic">Mission Debrief: Terminal Failure</h3>
                   </div>
                   <button onClick={() => setViewingRejectedFor(null)} className="hover:rotate-90 transition-transform bg-black text-white p-1">
                      <X size={20} />
                   </button>
                </div>
                
                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                   <p className="font-mono text-sm text-neutral-500 uppercase border-b-4 border-neutral-100 pb-2">
                      Listing all terminated missions for Agent_ID: <span className="text-black font-bold">{viewingRejectedFor}</span>
                   </p>

                   {missions
                     .filter(m => m.agent_id === viewingRejectedFor && m.status === 'failed')
                     .map((m) => (
                        <div key={m.id} className="bg-neutral-50 border-4 border-black p-4 space-y-2">
                           <div className="flex justify-between items-center border-b-2 border-black/10 pb-2">
                              <span className="font-black text-lg uppercase">{m.event_name || 'Unknown Event'}</span>
                              <span className="bg-black text-white px-2 py-0.5 font-mono text-[10px]">{new Date(m.created_at).toLocaleDateString()}</span>
                           </div>
                           <div className="bg-black p-3 rounded-none">
                              <div className="text-[#FF0000] font-mono text-[10px] mb-1 uppercase tracking-tighter italic font-bold underline">Reasoning_Report.txt</div>
                              <p className="text-white font-mono text-xs leading-relaxed italic">
                                 {"> "} {m.agent_reasoning_log || 'No reasoning provided by Neural Net.'}
                              </p>
                           </div>
                        </div>
                   ))}

                   {missions.filter(m => m.agent_id === viewingRejectedFor && m.status === 'failed').length === 0 && (
                      <div className="text-center py-10 font-mono italic text-neutral-400 uppercase">
                         No mission data logged for this ID.
                      </div>
                   )}
                </div>

                <div className="p-4 bg-neutral-100 border-t-8 border-black">
                   <NeoButton variant="warning" className="w-full font-black text-xl" onClick={() => setViewingRejectedFor(null)}>
                      ACKNOWLEDGE & CLOSE
                   </NeoButton>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Escrow Dashboard Modal */}
      {showEscrowFor && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowEscrowFor(null)}>
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setShowEscrowFor(null)}
                className="font-mono text-sm bg-white text-black px-4 py-2 border-4 border-black hover:bg-[#FF00F5] hover:text-white transition-colors uppercase font-bold"
              >
                EXIT_VAULT
              </button>
            </div>
            <EscrowDashboard
              agentPDA={showEscrowFor}
              agentId={agents.find(a => a.publicKey.equals(showEscrowFor))?.account.agentId || ''}
              nickname={agents.find(a => a.publicKey.equals(showEscrowFor))?.account.name}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};