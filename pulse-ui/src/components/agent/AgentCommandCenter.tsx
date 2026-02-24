import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PublicKey } from '@solana/web3.js';
import { NeoCard, NeoBadge, NeoButton, NeoInput } from '../neo';
import { LiveLog } from './LiveLog';
import { AgentSettings } from './AgentSettings';
import { EscrowDashboard } from './EscrowDashboard';
import { useAgentsContext } from '../../contexts/AgentsContext';
import { useAIAgent } from '../../hooks/useAIAgent';
import { lamportsToSol, getEscrowPDA, PROGRAM_ID } from '../../utils/accounts';
import { useWallet } from '@solana/wallet-adapter-react';
import type { ProgramAccount, AIAgent } from '../../types/pulse';

export const AgentCommandCenter = () => {
  const { publicKey } = useWallet();
  const { agents, totalTicketsPurchased, totalBudgetSpent, loading, refresh } = useAgentsContext();
  const { getEscrow, activateAgent, deactivateAgent, toggleAutoPurchase, addAgentBudget } = useAIAgent();
  
  const [showEscrowFor, setShowEscrowFor] = useState<PublicKey | null>(null);
  const [showBudgetModalFor, setShowBudgetModalFor] = useState<PublicKey | null>(null);
  const [escrowBalances, setEscrowBalances] = useState<Map<string, string>>(new Map());
  const [actionLoading, setActionLoading] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState('');

  // Fetch escrow balances for all agents
  const fetchEscrowBalances = async () => {
    if (!publicKey || agents.length === 0) return;

    const balances = new Map<string, string>();
    
    // SEQUENTIAL FETCH: Biar ga kena Rate Limit (429)
    for (const agent of agents) {
      try {
        const [escrowPDA] = getEscrowPDA(agent.publicKey, publicKey, PROGRAM_ID);
        const escrow = await getEscrow(escrowPDA);
        
        if (escrow) {
          /**
           * //TESTING YAAAAA: Pake toString() biar BN/BigInt ga bocor ke UI
           * lamportsToSol butuh string/number bersih
           */
          balances.set(agent.publicKey.toBase58(), lamportsToSol(escrow.balance.toString()));
        } else {
          balances.set(agent.publicKey.toBase58(), '0.0000');
        }
      } catch (e) {
        balances.set(agent.publicKey.toBase58(), '0.0000');
      }
    }
    setEscrowBalances(balances);
  };

  // Fetch balances when agents change
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
      alert(`Failed to toggle agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAutoPurchase = async (agent: ProgramAccount<AIAgent>) => {
    setActionLoading(true);
    try {
      await toggleAutoPurchase(
        agent.publicKey,
        agent.account.agentId,
        !agent.account.autoPurchaseEnabled
      );
      await refresh();
    } catch (error) {
      console.error('Failed to toggle auto-purchase:', error);
      alert(`Failed to toggle auto-purchase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddBudget = async (agentPDA: PublicKey, agentId: string) => {
    const amountSol = parseFloat(budgetAmount);
    if (!amountSol || amountSol <= 0 || isNaN(amountSol)) {
      alert('Please enter a valid amount');
      return;
    }

    setActionLoading(true);
    try {
      const amountLamports = Math.floor(amountSol * 1e9);
      await addAgentBudget(agentPDA, agentId, amountLamports);
      await refresh();
      setBudgetAmount('');
      setShowBudgetModalFor(null);
    } catch (error) {
      console.error('Failed to add budget:', error);
      alert(`Failed to add budget: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        <h2 className="font-display font-extrabold text-5xl tracking-tighter uppercase">COMMAND CENTER</h2>
        <NeoBadge variant="green" className="text-xl px-4 py-2 border-4 border-black">{agents.length} AGENTS ONLINE</NeoBadge>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Agent Status Panel */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between mb-4 pb-4 border-b-4 border-black">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-[#00FF41] animate-pulse" />
              <span className="font-mono text-sm font-black tracking-widest text-neutral-500 uppercase">Deployed Units</span>
            </div>
          </div>

          {loading ? (
            <NeoCard className="p-8 border-4 border-black">
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-center font-mono text-lg font-bold uppercase">
                Synchronizing Neurons...
              </motion.div>
            </NeoCard>
          ) : agents.length === 0 ? (
            <NeoCard className="p-8 border-4 border-black bg-neutral-100">
              <div className="text-center font-mono text-sm text-neutral-500 font-bold uppercase">
                No Agents Detected
                <div className="mt-2 text-xs opacity-60">Initialize your first bot to start sniping.</div>
              </div>
            </NeoCard>
          ) : (
            <div className="space-y-4">
              {agents.map((agent, index) => {
                /**
                 * //FIXED: Handle BigInt/BN secara aman biar angkanya gak jadi jutaan
                 */
                const tickets = agent.account.ticketsPurchased.toString();
                const budgetSol = Number(agent.account.totalBudget.toString()) / 1e9;
                const spentSol = Number(agent.account.spentBudget.toString()) / 1e9;
                const remainingSol = (budgetSol - spentSol).toFixed(4);
                
                const escrowBalance = escrowBalances.get(agent.publicKey.toBase58()) || '0.0000';
                const maxPerTicket = lamportsToSol(agent.account.maxBudgetPerTicket.toString());

                const formatCompact = (val: string) => {
                  const num = parseFloat(val);
                  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
                  return val;
                };

                return (
                  <motion.div
                    key={agent.publicKey.toBase58()}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="relative group"
                  >
                    <div className="bg-white border-4 border-black shadow-[6px_6px_0_0_#000000] transition-all duration-200 group-hover:shadow-[10px_10px_0_0_#FF00F5]">
                      {/* Header */}
                      <div className="border-b-4 border-black p-3 bg-neutral-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${agent.account.isActive ? 'bg-[#00FF41]' : 'bg-neutral-400'} border-2 border-black`} />
                            <span className="font-mono font-black text-sm uppercase truncate max-w-[120px]">{agent.account.name || agent.account.agentId}</span>
                          </div>
                          <div className="flex gap-1">
                            <span className={`px-2 py-0.5 font-mono text-[9px] font-black border-2 border-black ${agent.account.isActive ? 'bg-[#00FF41]' : 'bg-neutral-300'}`}>
                              {agent.account.isActive ? 'ACTIVE' : 'IDLE'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between font-mono text-[10px] font-bold">
                          <span className="text-neutral-500 uppercase">{tickets} TICKETS</span>
                          <span className="text-neo-pink uppercase">{escrowBalance} SOL ESCROW</span>
                          <span className="text-neutral-500 uppercase">LIMIT: {formatCompact(maxPerTicket)}</span>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-3 space-y-4">
                        {/* Progress Bar */}
                        <div>
                          <div className="flex justify-between font-mono text-[10px] mb-1 font-black uppercase">
                            <span>Fuel / Budget</span>
                            <span className={parseFloat(remainingSol) < 0.01 ? 'text-red-500' : 'text-black'}>
                              {remainingSol} / {budgetSol.toFixed(2)} SOL
                            </span>
                          </div>
                          <div className="h-3 bg-neutral-200 border-2 border-black overflow-hidden shadow-[inner_2px_2px_0_rgba(0,0,0,0.1)]">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, Math.max(0, (spentSol / budgetSol) * 100))}%` }}
                              className={`h-full ${parseFloat(remainingSol) < 0.1 ? 'bg-red-500' : 'bg-[#00FF41]'} border-r-2 border-black`}
                            />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          <NeoButton variant={agent.account.isActive ? 'secondary' : 'primary'} size="sm" onClick={() => handleToggleActive(agent)} disabled={actionLoading} className="text-[10px] py-2 font-black border-2">
                            {agent.account.isActive ? 'SHUTDOWN' : 'ACTIVATE'}
                          </NeoButton>
                          <NeoButton variant="accent" size="sm" onClick={() => setShowEscrowFor(agent.publicKey)} disabled={actionLoading} className="text-[10px] py-2 font-black border-2">
                            ESCROW MGMT
                          </NeoButton>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Stats Card */}
          <NeoCard className="p-4 border-4 border-black bg-black text-white shadow-[8px_8px_0_0_#00FF41]">
            <h3 className="font-display font-black text-xl mb-4 border-b-2 border-white/20 pb-2 uppercase italic">Global Intel</h3>
            <div className="space-y-3 font-mono text-sm font-bold">
              <div className="flex justify-between">
                <span className="text-neutral-400 uppercase">Total Ops:</span>
                <span className="text-[#00FF41]">{totalTicketsPurchased.toString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400 uppercase">Total Burn:</span>
                <span className="text-neo-pink">{totalBudgetSpent.toFixed(4)} SOL</span>
              </div>
            </div>
          </NeoCard>
        </div>

        {/* Live Log */}
        <div className="col-span-12 lg:col-span-5">
          <NeoCard className="h-full border-4 border-black bg-white shadow-[12px_12px_0_0_#000000]">
            <div className="border-b-4 border-black p-4 bg-neutral-50 flex items-center justify-between">
              <h3 className="font-display font-black text-xl uppercase italic flex items-center gap-2">
                <span className="w-3 h-3 bg-[#FF00F5] rounded-full animate-ping"></span>
                Satellite Uplink
              </h3>
              <NeoBadge variant="pink">REAL-TIME</NeoBadge>
            </div>
            <div className="p-0">
              <LiveLog />
            </div>
          </NeoCard>
        </div>

        {/* Settings */}
        <div className="col-span-12 lg:col-span-3">
          <AgentSettings />
        </div>
      </div>

      {/* Escrow Dashboard Modal */}
      {showEscrowFor && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4" onClick={() => setShowEscrowFor(null)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex justify-end">
              <button onClick={() => setShowEscrowFor(null)} className="font-mono font-black text-sm bg-neo-pink text-white px-6 py-2 border-4 border-black shadow-[4px_4px_0_0_#000000] hover:translate-y-1 hover:shadow-none transition-all">
                [ CLOSE_TERMINAL ]
              </button>
            </div>
            <EscrowDashboard
              agentPDA={showEscrowFor}
              agentId={agents.find(a => a.publicKey.equals(showEscrowFor))?.account.agentId || ''}
            />
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};