import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PublicKey } from '@solana/web3.js';
import { NeoCard, NeoBadge, NeoInput, NeoButton } from '../neo';
import { useToast } from '../../contexts/ToastContext';
import { useAIAgent } from '../../hooks/useAIAgent';
import { getEscrowPDA, lamportsToSol, PROGRAM_ID } from '../../utils/accounts';
import { useWallet } from '@solana/wallet-adapter-react';
import type { AgentEscrow, AIAgent } from '../../types/pulse';

interface EscrowDashboardProps {
  agentPDA: PublicKey;
  agentId: string;
  nickname?: string;
}

export const EscrowDashboard: React.FC<EscrowDashboardProps> = ({
  agentPDA,
  nickname,
}) => {
  const { publicKey } = useWallet();
  const { addToast } = useToast();
  const { createEscrow, depositToEscrow, withdrawFromEscrow, getEscrow, getAgent, toggleAutoPurchase, loading } = useAIAgent();
  const [escrow, setEscrow] = useState<AgentEscrow | null>(null);
  const [agent, setAgent] = useState<AIAgent | null>(null);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch escrow account
  useEffect(() => {
    const fetchEscrowData = async () => {
      if (!publicKey) return;
      try {
        const [escrowPDA] = getEscrowPDA(agentPDA, publicKey, PROGRAM_ID);
        const escrowData = await getEscrow(escrowPDA);
        setEscrow(escrowData);
      } catch (error) {
        // Escrow might not exist yet
        setEscrow(null);
      }
    };

    fetchEscrowData();
  }, [agentPDA, publicKey, getEscrow]);

  // Fetch agent data
  useEffect(() => {
    const fetchAgentData = async () => {
      if (!publicKey) return;
      try {
        const agentData = await getAgent(agentPDA);
        setAgent(agentData);
      } catch (error) {
        setAgent(null);
      }
    };

    fetchAgentData();
  }, [agentPDA, publicKey, getAgent]);

  const handleCreateEscrow = async () => {
    if (!publicKey) return;
    setActionLoading(true);
    try {
      await createEscrow(agentPDA);
      // Refresh escrow data
      const [escrowPDA] = getEscrowPDA(agentPDA, publicKey, PROGRAM_ID);
      const escrowData = await getEscrow(escrowPDA);
      setEscrow(escrowData);
    } catch (error) {
      console.error('Failed to create escrow:', error);
      addToast(`Failed to create escrow: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!publicKey || !escrow) return;
    const amountSol = parseFloat(amount);
    if (!amountSol || amountSol <= 0 || isNaN(amountSol)) {
      addToast('Please enter a valid amount', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const amountLamports = Math.floor(amountSol * 1e9);
      const [escrowPDA] = getEscrowPDA(agentPDA, publicKey, PROGRAM_ID);
      await depositToEscrow(escrowPDA, agentPDA, amountLamports);

      // Refresh escrow data
      const updatedEscrow = await getEscrow(escrowPDA);
      setEscrow(updatedEscrow);
      setAmount('');
      setShowDeposit(false);
    } catch (error) {
      console.error('Failed to deposit:', error);
      addToast(`Failed to deposit: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!publicKey || !escrow) return;
    const amountSol = parseFloat(amount);
    if (!amountSol || amountSol <= 0 || isNaN(amountSol)) {
      addToast('Please enter a valid amount', 'error');
      return;
    }

    const amountLamports = Math.floor(amountSol * 1e9);
    if (amountLamports > Number(escrow.balance)) {
      addToast('Insufficient escrow balance', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const [escrowPDA] = getEscrowPDA(agentPDA, publicKey, PROGRAM_ID);
      await withdrawFromEscrow(escrowPDA, agentPDA, amountLamports);

      // Refresh escrow data
      const updatedEscrow = await getEscrow(escrowPDA);
      setEscrow(updatedEscrow);
      setAmount('');
      setShowWithdraw(false);
    } catch (error) {
      console.error('Failed to withdraw:', error);
      addToast(`Failed to withdraw: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAuto = async () => {
    if (!publicKey || !agent) return;
    setActionLoading(true);
    try {
      await toggleAutoPurchase(
        agentPDA,
        agent.agentId,
        !agent.autoPurchaseEnabled
      );
      // Refresh agent data
      const updatedAgent = await getAgent(agentPDA);
      setAgent(updatedAgent);
    } catch (error) {
      console.error('Failed to toggle auto-purchase:', error);
      addToast(`Failed to toggle auto-purchase: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const balance = escrow ? lamportsToSol(escrow.balance) : '0.0000';
  const totalDeposited = escrow ? lamportsToSol(escrow.totalDeposited) : '0.0000';
  const totalWithdrawn = escrow ? lamportsToSol(escrow.totalWithdrawn) : '0.0000';
  const totalSpent = escrow ? lamportsToSol(escrow.totalSpent) : '0.0000';

  return (
    <NeoCard className="p-6">
      <div className="flex items-center justify-between mb-4 border-b-4 border-neo-black pb-2">
        <div>
          <h3 className="font-display font-bold text-xl">
            {nickname || 'AGENT ESCROW'}
          </h3>
          {nickname && (
            <p className="font-mono text-xs text-gray-500 mt-1">ESCROW DASHBOARD</p>
          )}
        </div>
        <NeoBadge variant={escrow ? 'green' : 'black'}>
          {escrow ? 'ACTIVE' : 'NOT CREATED'}
        </NeoBadge>
      </div>

      {!escrow ? (
        <div className="text-center py-8">
          <p className="font-mono text-sm mb-4">
            No escrow account found for this agent.
          </p>
          <NeoButton
            variant="primary"
            onClick={handleCreateEscrow}
            disabled={actionLoading || loading}
          >
            {actionLoading ? 'CREATING...' : 'CREATE ESCROW'}
          </NeoButton>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Balance Display */}
          <div className="bg-neutral-900 border-4 border-black p-4">
            <div className="text-center">
              <div className="font-mono text-xs text-gray-400 mb-1">CURRENT BALANCE</div>
              <div className="font-display font-extrabold text-4xl text-[#00FF41]">
                {balance} SOL
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4 font-mono text-sm">
            <div className="border-2 border-black p-3">
              <div className="text-gray-400">Total Deposited</div>
              <div className="font-bold">{totalDeposited} SOL</div>
            </div>
            <div className="border-2 border-black p-3">
              <div className="text-gray-400">Total Withdrawn</div>
              <div className="font-bold">{totalWithdrawn} SOL</div>
            </div>
            <div className="border-2 border-black p-3 col-span-2">
              <div className="text-gray-400">Total Spent on Tickets</div>
              <div className="font-bold text-[#FF00F5]">{totalSpent} SOL</div>
            </div>
          </div>

          {/* Auto-Purchase Quick Toggle */}
          {agent && (
            <div className="border-2 border-black p-3 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-sm font-bold">AUTO-PURCHASE</div>
                  <div className="font-mono text-xs">
                    {agent.autoPurchaseEnabled ? (
                      <span className="text-[#00FF41]">Enabled - Agent will buy tickets automatically</span>
                    ) : (
                      <span className="text-gray-500">Disabled - Agent will not auto-purchase</span>
                    )}
                  </div>
                </div>
                <NeoButton
                  variant={agent.autoPurchaseEnabled ? 'warning' : 'success'}
                  size="sm"
                  onClick={handleToggleAuto}
                  disabled={actionLoading || loading}
                >
                  {agent.autoPurchaseEnabled ? 'DISABLE' : 'ENABLE'}
                </NeoButton>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <NeoButton
              variant="success"
              className="flex-1"
              onClick={() => setShowDeposit(true)}
              disabled={loading || actionLoading}
            >
              DEPOSIT
            </NeoButton>
            <NeoButton
              variant="warning"
              className="flex-1"
              onClick={() => setShowWithdraw(true)}
              disabled={loading || actionLoading || Number(escrow.balance) === 0}
            >
              WITHDRAW
            </NeoButton>
          </div>

          {/* Deposit Modal */}
          <AnimatePresence>
            {showDeposit && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
                onClick={() => setShowDeposit(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md p-4"
                >
                  <NeoCard className="p-6">
                    <h3 className="font-display text-xl mb-4 text-[#00FF41]">
                      DEPOSIT TO ESCROW
                    </h3>
                    <NeoInput
                      label="Amount (SOL)"
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="Enter amount to deposit"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-6">
                      <NeoButton
                        variant="secondary"
                        onClick={() => setShowDeposit(false)}
                        disabled={actionLoading}
                      >
                        CANCEL
                      </NeoButton>
                      <NeoButton
                        variant="primary"
                        onClick={handleDeposit}
                        disabled={!amount || actionLoading}
                      >
                        {actionLoading ? 'DEPOSITING...' : 'DEPOSIT'}
                      </NeoButton>
                    </div>
                  </NeoCard>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Withdraw Modal */}
          <AnimatePresence>
            {showWithdraw && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
                onClick={() => setShowWithdraw(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md p-4"
                >
                  <NeoCard className="p-6">
                    <h3 className="font-display text-xl mb-4 text-[#FFEB3B]">
                      WITHDRAW FROM ESCROW
                    </h3>
                    <p className="font-mono text-xs mb-4">
                      Available: {balance} SOL
                    </p>
                    <NeoInput
                      label="Amount (SOL)"
                      type="number"
                      step="0.001"
                      min="0"
                      max={balance}
                      placeholder="Enter amount to withdraw"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-6">
                      <NeoButton
                        variant="secondary"
                        onClick={() => setShowWithdraw(false)}
                        disabled={actionLoading}
                      >
                        CANCEL
                      </NeoButton>
                      <NeoButton
                        variant="warning"
                        onClick={handleWithdraw}
                        disabled={!amount || actionLoading}
                      >
                        {actionLoading ? 'WITHDRAWING...' : 'WITHDRAW'}
                      </NeoButton>
                    </div>
                  </NeoCard>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </NeoCard>
  );
};
