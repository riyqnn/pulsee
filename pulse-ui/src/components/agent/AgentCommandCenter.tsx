import { useState, useEffect } from 'react';
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
  const { agents, totalTicketsPurchased, totalBudgetSpent, loading } = useAgentsContext();
  const { getEscrow, activateAgent, deactivateAgent, toggleAutoPurchase, addAgentBudget } = useAIAgent();
  const { refresh } = useAgentsContext();
  const [showEscrowFor, setShowEscrowFor] = useState<PublicKey | null>(null);
  const [showBudgetModalFor, setShowBudgetModalFor] = useState<PublicKey | null>(null);
  const [escrowBalances, setEscrowBalances] = useState<Map<string, string>>(new Map());
  const [actionLoading, setActionLoading] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState('');

  // Fetch escrow balances for all agents
  const fetchEscrowBalances = async () => {
    if (!publicKey) return;

    const balances = new Map<string, string>();
    for (const agent of agents) {
      try {
        const [escrowPDA] = getEscrowPDA(agent.publicKey, publicKey, PROGRAM_ID);
        const escrow = await getEscrow(escrowPDA);
        if (escrow) {
          balances.set(agent.publicKey.toBase58(), lamportsToSol(escrow.balance));
        } else {
          balances.set(agent.publicKey.toBase58(), '0.0000');
        }
      } catch {
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
        <h2 className="font-display font-extrabold text-5xl">AGENT COMMAND CENTER</h2>
        <NeoBadge variant="green">{agents.length} AGENTS</NeoBadge>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Agent Status Panel - Redesigned */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative"
          >
            {/* Brutalist Header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b-4 border-black">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-[#00FF41]" />
                <span className="font-mono text-sm tracking-widest text-neutral-500">AGENT STATUS</span>
              </div>
              <div className="font-black text-3xl text-[#FF00F5]">{agents.length}</div>
            </div>
          </motion.div>

          {loading ? (
            <NeoCard className="p-8">
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-center font-mono text-lg font-bold"
              >
                LOADING AGENTS...
              </motion.div>
            </NeoCard>
          ) : agents.length === 0 ? (
            <NeoCard className="p-8">
              <div className="text-center font-mono text-sm text-neutral-500">
                NO AGENTS FOUND
                <div className="mt-2 text-xs">CREATE YOUR FIRST AI AGENT!</div>
              </div>
            </NeoCard>
          ) : (
            <div className="space-y-3">
              {agents.map((agent, index) => {
                const tickets = Number(agent.account.ticketsPurchased);
                const spent = lamportsToSol(agent.account.spentBudget);
                const budget = lamportsToSol(agent.account.totalBudget);
                const remaining = (parseFloat(budget) - parseFloat(spent)).toFixed(4);
                const escrowBalance = escrowBalances.get(agent.publicKey.toBase58()) || '0.00';
                const maxPerTicket = lamportsToSol(agent.account.maxBudgetPerTicket);
                // Format large numbers compactly
                const formatMax = (val: string) => {
                  const num = parseFloat(val);
                  if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
                  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
                  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
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
                      {/* Header - Clean & Compact */}
                      <div className="border-b-4 border-black p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <motion.div
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className={`w-2 h-2 rounded-full ${agent.account.isActive ? 'bg-[#00FF41]' : 'bg-neutral-400'}`}
                            />
                            <span className="font-mono font-bold text-base">{agent.account.agentId}</span>
                          </div>
                          <div className="flex gap-1">
                            <span className={`px-2 py-0.5 font-mono text-[10px] font-bold border-2 border-black ${agent.account.isActive ? 'bg-[#00FF41] text-black' : 'bg-neutral-300 text-black'}`}>
                              {agent.account.isActive ? 'ON' : 'OFF'}
                            </span>
                            <span className={`px-2 py-0.5 font-mono text-[10px] font-bold border-2 border-black ${agent.account.autoPurchaseEnabled ? 'bg-[#FF00F5] text-white' : 'bg-neutral-500 text-white'}`}>
                              AUTO: {agent.account.autoPurchaseEnabled ? 'ON' : 'OFF'}
                            </span>
                          </div>
                        </div>
                        {/* Single line stats */}
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-neutral-600">{tickets} tkt</span>
                          <span className="text-[#FFEB3B] font-bold">{escrowBalance} SOL</span>
                          <span className="text-neutral-600">max: {formatMax(maxPerTicket)}</span>
                        </div>
                      </div>

                      {/* Body - Clean Layout */}
                      <div className="p-3 space-y-3">
                        {/* Budget Progress - Simplified */}
                        <div>
                          <div className="flex justify-between font-mono text-[11px] mb-1">
                            <span className="text-neutral-500 font-bold">BUDGET</span>
                            <span className={`${parseFloat(remaining) < 0 ? 'text-red-500' : 'text-black'} font-bold`}>
                              {remaining}/{budget} SOL
                            </span>
                          </div>
                          <div className="h-2.5 bg-neutral-200 border-2 border-black overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, Math.max(0, (parseFloat(budget) - parseFloat(remaining)) / parseFloat(budget) * 100 || 0))}%` }}
                              transition={{ duration: 0.5 }}
                              className={`h-full ${parseFloat(remaining) < 0 ? 'bg-red-500' : 'bg-[#00FF41]'}`}
                            />
                          </div>
                        </div>

                        {/* Action Buttons - 2x2 Grid */}
                        <div className="grid grid-cols-2 gap-2">
                          <NeoButton
                            variant={agent.account.isActive ? 'warning' : 'success'}
                            size="sm"
                            onClick={() => handleToggleActive(agent)}
                            disabled={actionLoading || loading}
                            className="font-mono text-[10px] py-1.5"
                          >
                            {agent.account.isActive ? 'STOP' : 'START'}
                          </NeoButton>
                          <NeoButton
                            variant={agent.account.autoPurchaseEnabled ? 'accent' : 'secondary'}
                            size="sm"
                            onClick={() => handleToggleAutoPurchase(agent)}
                            disabled={actionLoading || loading}
                            className="font-mono text-[10px] py-1.5"
                          >
                            AUTO: {agent.account.autoPurchaseEnabled ? 'ON' : 'OFF'}
                          </NeoButton>
                          <NeoButton
                            variant="primary"
                            size="sm"
                            onClick={() => setShowBudgetModalFor(agent.publicKey)}
                            disabled={actionLoading || loading}
                            className="font-mono text-[10px] py-1.5"
                          >
                            +BUDGET
                          </NeoButton>
                          <NeoButton
                            variant="accent"
                            size="sm"
                            onClick={() => setShowEscrowFor(agent.publicKey)}
                            disabled={actionLoading || loading}
                            className="font-mono text-[10px] py-1.5"
                          >
                            ESCROW
                          </NeoButton>
                        </div>
                      </div>
                    </div>

                    {/* Corner Accent */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      className="absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-[#FF00F5] border-2 border-black z-10 pointer-events-none"
                    />
                  </motion.div>
                );
              })}
            </div>
          )}

          <NeoCard className="p-4">
            <h3 className="font-display font-bold text-xl mb-4 border-b-4 border-neo-black pb-2">
              STATISTICS
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between font-mono">
                <span>Total Purchases:</span>
                <span className="font-bold">{isNaN(totalTicketsPurchased) ? '0' : totalTicketsPurchased}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>Total Spent:</span>
                <span className="font-bold">{isNaN(totalBudgetSpent) ? '0.0000' : totalBudgetSpent.toFixed(4)} SOL</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>Active Agents:</span>
                <span className="font-bold">{agents.filter((a) => a.account.isActive).length}</span>
              </div>
            </div>
          </NeoCard>
        </div>

        {/* Live Log */}
        <div className="col-span-12 lg:col-span-5">
          <NeoCard className="h-full">
            <div className="border-b-4 border-neo-black p-4">
              <h3 className="font-display font-bold text-xl flex items-center gap-2">
                <span className="w-3 h-3 bg-neo-pink rounded-full animate-blink"></span>
                LIVE ACTIVITY LOG
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
                className="font-mono text-sm bg-neo-black text-white px-4 py-2 border-4 border-neo-black hover:bg-neo-gray"
              >
                CLOSE
              </button>
            </div>
            <EscrowDashboard
              agentPDA={showEscrowFor}
              agentId={agents.find(a => a.publicKey.equals(showEscrowFor))?.account.agentId || ''}
            />
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {showBudgetModalFor && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowBudgetModalFor(null)}>
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <NeoCard className="p-6">
              <h3 className="font-display text-xl mb-4 text-neo-green">ADD BUDGET TO AGENT</h3>
              <NeoInput
                label="Amount (SOL)"
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter amount to add"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-6">
                <NeoButton
                  variant="secondary"
                  onClick={() => setShowBudgetModalFor(null)}
                  disabled={actionLoading}
                >
                  CANCEL
                </NeoButton>
                <NeoButton
                  variant="primary"
                  onClick={() => {
                    const agent = agents.find(a => a.publicKey.equals(showBudgetModalFor));
                    if (agent) handleAddBudget(agent.publicKey, agent.account.agentId);
                  }}
                  disabled={!budgetAmount || actionLoading}
                >
                  {actionLoading ? 'ADDING...' : 'ADD BUDGET'}
                </NeoButton>
              </div>
            </NeoCard>
          </div>
        </div>
      )}
    </motion.div>
  );
};
