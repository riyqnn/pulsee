import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
import type { ProgramAccount, AIAgent } from '../../types/pulse';

export const AgentCommandCenter = () => {
  const { publicKey } = useWallet();
  const { agents, totalTicketsPurchased, totalBudgetSpent, loading, refresh } = useAgentsContext();
  const { getEscrow, activateAgent, deactivateAgent } = useAIAgent();
  const { addToast } = useToast();

  const [showEscrowFor, setShowEscrowFor] = useState<PublicKey | null>(null);
  const [escrowBalances, setEscrowBalances] = useState<Map<string, string>>(new Map());
  const [actionLoading, setActionLoading] = useState(false);

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
        <h2 className="font-display font-extrabold text-5xl">AGENT COMMAND CENTER</h2>
        <NeoBadge variant="green">{agents.length} AGENTS</NeoBadge>
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
              <span className="font-mono text-sm tracking-widest text-neutral-500 uppercase">AGENT STATUS</span>
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
                LOADING AGENTS...
              </motion.div>
            </NeoCard>
          ) : agents.length === 0 ? (
            <NeoCard className="p-8">
              <div className="text-center font-mono text-sm text-neutral-500 font-bold uppercase">
                NO AGENTS FOUND
                <div className="mt-2 text-xs opacity-60">CREATE YOUR FIRST AI AGENT!</div>
              </div>
            </NeoCard>
          ) : (
            <div className="space-y-3">
              {agents.map((agent, index) => {
                const tickets = agent.account.ticketsPurchased.toString();
                const spentSol = Number(agent.account.spentBudget.toString()) / 1e9;
                const totalBudgetSol = Number(agent.account.totalBudget.toString()) / 1e9;
                const remainingSol = (totalBudgetSol - spentSol).toFixed(4);
                const escrowBalance = escrowBalances.get(agent.publicKey.toBase58()) || '0.00';
                const maxPerTicket = lamportsToSol(agent.account.maxBudgetPerTicket.toString());
                const agentName = agent.account.name || agent.account.agentId;
                const agentPDA = agent.publicKey.toBase58();

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
                      {/* Header */}
                      <div className="border-b-4 border-black p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-base truncate max-w-[140px]">
                              {agentName}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 font-mono text-[10px] font-bold border-2 border-black ${agent.account.isActive ? 'bg-[#00FF41] text-black' : 'bg-neutral-300 text-black'}`}>
                            {agent.account.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>
                        {/* Status Line */}
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-neutral-600 uppercase">{tickets} tkt</span>
                          <span className="text-[#FFEB3B] font-bold">{escrowBalance} SOL</span>
                          <span className="text-neutral-600 uppercase">max: {formatMax(maxPerTicket)}</span>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-3 space-y-3">
                        <div>
                          <div className="flex justify-between font-mono text-[11px] mb-1">
                            <span className="text-neutral-500 font-bold uppercase">BUDGET</span>
                            <span className={`${parseFloat(remainingSol) < 0 ? 'text-red-500' : 'text-black'} font-bold`}>
                              {remainingSol}/{totalBudgetSol.toFixed(2)} SOL
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
                        </div>

                        {/* Action Buttons - Simplified to 2 */}
                        <div className="grid grid-cols-2 gap-2">
                          <NeoButton
                            variant={agent.account.isActive ? 'warning' : 'success'}
                            size="sm"
                            onClick={() => handleToggleActive(agent)}
                            disabled={actionLoading}
                            className="font-mono text-[10px] py-1.5 uppercase font-bold"
                          >
                            {agent.account.isActive ? 'STOP' : 'START'}
                          </NeoButton>
                          <NeoButton
                            variant="accent"
                            size="sm"
                            onClick={() => setShowEscrowFor(agent.publicKey)}
                            disabled={actionLoading}
                            className="font-mono text-[10px] py-1.5 uppercase font-bold"
                          >
                            ESCROW
                          </NeoButton>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Statistics Card */}
          <NeoCard className="p-4">
            <h3 className="font-display font-bold text-xl mb-4 border-b-4 border-neo-black pb-2 uppercase">
              STATISTICS
            </h3>
            <div className="space-y-2 font-bold uppercase">
              <div className="flex justify-between font-mono">
                <span>Total Purchases:</span>
                <span className="font-bold text-black">{totalTicketsPurchased.toString()}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>Total Spent:</span>
                <span className="font-bold text-black">{totalBudgetSpent.toFixed(4)} SOL</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>Active Agents:</span>
                <span className="font-bold text-[#00FF41]">{agents.filter((a) => a.account.isActive).length}</span>
              </div>
            </div>
          </NeoCard>
        </div>

        {/* Live Log */}
        <div className="col-span-12 lg:col-span-5">
          <NeoCard className="h-full">
            <div className="border-b-4 border-neo-black p-4">
              <h3 className="font-display font-bold text-xl uppercase">
                LIVE UPDATES
              </h3>
            </div>
            <div className="p-4">
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowEscrowFor(null)}>
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setShowEscrowFor(null)}
                className="font-mono text-sm bg-neo-black text-white px-4 py-2 border-4 border-neo-black hover:bg-[#FF00F5] transition-colors uppercase font-bold"
              >
                CLOSE
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
