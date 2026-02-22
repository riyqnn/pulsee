import { useState } from 'react';
import { motion } from 'framer-motion';
import { PublicKey } from '@solana/web3.js';
import { NeoCard, NeoBadge, NeoButton } from '../neo';
import { LiveLog } from './LiveLog';
import { AgentSettings } from './AgentSettings';
import { AddBudgetModal } from './AddBudgetModal';
import { useAgentsContext } from '../../contexts/AgentsContext';
import { useAIAgent } from '../../hooks/useAIAgent';
import { lamportsToSol } from '../../utils/accounts';

export const AgentCommandCenter = () => {
  const { agents, totalTicketsPurchased, totalBudgetSpent, totalMoneySaved, loading, refresh } = useAgentsContext();
  const { activateAgent, deactivateAgent, addBudget, toggleAutoPurchase } = useAIAgent();
  const [showBudgetModal, setShowBudgetModal] = useState<{ pda: PublicKey; agentId: string } | null>(null);

  const handleToggleAuto = async (agentPDA: PublicKey) => {
    try {
      await toggleAutoPurchase(agentPDA);
      await refresh();
    } catch (error) {
      console.error('[AgentCommandCenter] Failed to toggle auto-purchase:', error);
      alert(`Failed to toggle auto-purchase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleActivate = async (agentPDA: PublicKey, isActive: boolean) => {
    try {
      if (isActive) {
        await deactivateAgent(agentPDA);
      } else {
        await activateAgent(agentPDA);
      }
      await refresh();
    } catch (error) {
      console.error('Failed to toggle agent status:', error);
      alert(`Failed to toggle agent status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAddBudget = async (amountLamports: number) => {
    if (!showBudgetModal) return;
    try {
      await addBudget(showBudgetModal.pda, amountLamports);
      setShowBudgetModal(null);
      await refresh();
    } catch (error) {
      console.error('[AgentCommandCenter] Failed to add budget:', error);
      alert(`Failed to add budget: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
          <NeoCard className="p-4">
            <h3 className="font-display font-bold text-xl mb-4 border-b-4 border-neo-black pb-2">
              AGENT STATUS
            </h3>
            {loading ? (
              <div className="text-center py-8 font-mono text-sm">Loading agents...</div>
            ) : agents.length === 0 ? (
              <div className="text-center py-8 font-mono text-sm">
                No agents found. Create your first AI agent!
              </div>
            ) : (
              <div className="space-y-3">
                {agents.map((agent) => {
                  const status = agent.account.isActive ? 'active' : 'inactive';
                  const tickets = Number(agent.account.ticketsPurchased);
                  const saved = lamportsToSol(agent.account.moneySaved);

                  return (
                    <motion.div
                      key={agent.publicKey.toBase58()}
                      className="p-3 border-4 border-neo-black bg-neo-gray space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`status-dot status-${status}`} />
                          <div>
                            <div className="font-mono font-bold">{agent.account.name}</div>
                            <div className="font-mono text-xs text-gray-500">{agent.account.agentId}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm">{tickets} tickets</div>
                          <div className="font-mono text-xs text-neo-green">{saved} SOL</div>
                        </div>
                      </div>

                      {/* Control Buttons */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t-2 border-neo-black">
                        <NeoButton
                          variant={agent.account.isActive ? 'danger' : 'success'}
                          size="sm"
                          onClick={() => handleActivate(agent.publicKey, agent.account.isActive)}
                        >
                          {agent.account.isActive ? 'DEACTIVATE' : 'ACTIVATE'}
                        </NeoButton>

                        <NeoButton
                          variant="warning"
                          size="sm"
                          onClick={() => setShowBudgetModal({ pda: agent.publicKey, agentId: agent.account.agentId })}
                        >
                          ADD BUDGET
                        </NeoButton>

                        <NeoButton
                          variant={agent.account.autoPurchaseEnabled ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => handleToggleAuto(agent.publicKey)}
                        >
                          AUTO: {agent.account.autoPurchaseEnabled ? 'ON' : 'OFF'}
                        </NeoButton>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </NeoCard>

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
                <span>Total Saved:</span>
                <span className="font-bold text-neo-green">{isNaN(totalMoneySaved) ? '0.0000' : totalMoneySaved.toFixed(4)} SOL</span>
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

      {/* Add Budget Modal */}
      {showBudgetModal && (
        <AddBudgetModal
          agentPDA={showBudgetModal.pda}
          onClose={() => setShowBudgetModal(null)}
          onConfirm={handleAddBudget}
        />
      )}
    </motion.div>
  );
};
