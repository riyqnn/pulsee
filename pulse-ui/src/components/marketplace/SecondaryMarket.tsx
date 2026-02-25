// Escrow Dashboard - Transformed from Secondary Market
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PublicKey } from '@solana/web3.js';
import { NeoCard, NeoButton, NeoInput } from '../neo';
import { useAgentsContext } from '../../contexts/AgentsContext';
import { useToast } from '../../contexts/ToastContext';
import { useAIAgent } from '../../hooks/useAIAgent';
import { getEscrowPDA, lamportsToSol, PROGRAM_ID } from '../../utils/accounts';
import { useWallet } from '@solana/wallet-adapter-react';
import type { AgentEscrow } from '../../types/pulse';

export const SecondaryMarket = () => {
  const { publicKey } = useWallet();
  const { agents, loading: agentsLoading } = useAgentsContext();
  const { addToast } = useToast();
  const { getEscrow, createEscrow, depositToEscrow, withdrawFromEscrow, loading } = useAIAgent();
  const [escrowData, setEscrowData] = useState<Map<string, AgentEscrow>>(new Map());
  const [selectedAgent, setSelectedAgent] = useState<PublicKey | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [amount, setAmount] = useState('');

  // Fetch all escrow accounts
  const fetchEscrowAccounts = async () => {
    if (!publicKey) return;

    const escrowMap = new Map<string, AgentEscrow>();
    for (const agent of agents) {
      try {
        const [escrowPDA] = getEscrowPDA(agent.publicKey, publicKey, PROGRAM_ID);
        const escrow = await getEscrow(escrowPDA);
        if (escrow) {
          escrowMap.set(agent.publicKey.toBase58(), escrow);
        }
      } catch {
        // Escrow might not exist
      }
    }
    setEscrowData(escrowMap);
  };

  useEffect(() => {
    fetchEscrowAccounts();
  }, [agents, publicKey]);

  const handleCreateEscrow = async (agentPDA: PublicKey) => {
    if (!publicKey) return;
    setActionLoading(true);
    try {
      await createEscrow(agentPDA);
      await fetchEscrowAccounts();
    } catch (error) {
      console.error('Failed to create escrow:', error);
      addToast(`Failed to create escrow: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!publicKey || !selectedAgent) return;
    const amountSol = parseFloat(amount);
    if (!amountSol || amountSol <= 0 || isNaN(amountSol)) {
      addToast('Please enter a valid amount', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const amountLamports = Math.floor(amountSol * 1e9);
      const [escrowPDA] = getEscrowPDA(selectedAgent, publicKey, PROGRAM_ID);
      await depositToEscrow(escrowPDA, selectedAgent, amountLamports);
      await fetchEscrowAccounts();
      setAmount('');
      setShowDepositModal(false);
    } catch (error) {
      console.error('Failed to deposit:', error);
      addToast(`Failed to deposit: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!publicKey || !selectedAgent) return;
    const amountSol = parseFloat(amount);
    if (!amountSol || amountSol <= 0 || isNaN(amountSol)) {
      addToast('Please enter a valid amount', 'error');
      return;
    }

    const escrow = escrowData.get(selectedAgent.toBase58());
    if (!escrow) return;

    const amountLamports = Math.floor(amountSol * 1e9);
    if (amountLamports > Number(escrow.balance)) {
      addToast('Insufficient escrow balance', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const [escrowPDA] = getEscrowPDA(selectedAgent, publicKey, PROGRAM_ID);
      await withdrawFromEscrow(escrowPDA, selectedAgent, amountLamports);
      await fetchEscrowAccounts();
      setAmount('');
      setShowWithdrawModal(false);
    } catch (error) {
      console.error('Failed to withdraw:', error);
      addToast(`Failed to withdraw: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate totals
  const totalEscrowBalance = Array.from(escrowData.values()).reduce((sum, e) => sum + Number(e.balance), 0);
  const totalDeposited = Array.from(escrowData.values()).reduce((sum, e) => sum + Number(e.totalDeposited), 0);
  const totalWithdrawn = Array.from(escrowData.values()).reduce((sum, e) => sum + Number(e.totalWithdrawn), 0);
  const totalSpent = Array.from(escrowData.values()).reduce((sum, e) => sum + Number(e.totalSpent), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      {/* Brutalist Header */}
      <div className="relative">
        <div className="flex items-end justify-between border-b-4 border-black pb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-4 h-4 bg-[#FFEB3B]" />
              <span className="font-mono text-sm tracking-widest text-neutral-500">ESCROW DASHBOARD</span>
            </div>
            <h2 className="font-black text-6xl md:text-7xl tracking-tight">
              AGENT<br/>ESCROWS
            </h2>
          </div>
          <div className="hidden md:block text-right">
            <div className="font-mono text-sm text-neutral-500 mb-1">TOTAL BALANCE</div>
            <div className="font-black text-5xl text-[#00FF41]">{lamportsToSol(totalEscrowBalance)} SOL</div>
          </div>
        </div>
        <div className="absolute -bottom-1 right-0 w-32 h-1 bg-[#00FF41]" />
      </div>

      {/* Loading State */}
      {agentsLoading ? (
        <div className="text-center py-20">
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="font-mono text-2xl font-bold"
          >
            LOADING ESCROW DATA...
          </motion.div>
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-20 border-4 border-black bg-neutral-100">
          <div className="font-mono text-xl font-bold text-neutral-600">NO AGENTS FOUND</div>
          <div className="font-mono text-sm text-neutral-500 mt-2">Create an agent first to manage escrows</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#00FF41] border-4 border-black p-4 shadow-[4px_4px_0_0_#000000]"
            >
              <div className="font-mono text-xs text-black font-bold mb-1">TOTAL BALANCE</div>
              <div className="font-black text-2xl">{lamportsToSol(totalEscrowBalance)} SOL</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_#000000]"
            >
              <div className="font-mono text-xs text-neutral-500 font-bold mb-1">TOTAL DEPOSITED</div>
              <div className="font-black text-2xl">{lamportsToSol(totalDeposited)} SOL</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_#000000]"
            >
              <div className="font-mono text-xs text-neutral-500 font-bold mb-1">TOTAL WITHDRAWN</div>
              <div className="font-black text-2xl">{lamportsToSol(totalWithdrawn)} SOL</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-[#FF00F5] border-4 border-black p-4 shadow-[4px_4px_0_0_#000000]"
            >
              <div className="font-mono text-xs text-white font-bold mb-1">TOTAL SPENT</div>
              <div className="font-black text-2xl">{lamportsToSol(totalSpent)} SOL</div>
            </motion.div>
          </div>

          {/* Escrow Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {agents.map((agent, index) => {
              const escrow = escrowData.get(agent.publicKey.toBase58());
              const balance = escrow ? lamportsToSol(escrow.balance) : '0.0000';
              const deposited = escrow ? lamportsToSol(escrow.totalDeposited) : '0.0000';
              const withdrawn = escrow ? lamportsToSol(escrow.totalWithdrawn) : '0.0000';
              const spent = escrow ? lamportsToSol(escrow.totalSpent) : '0.0000';

              return (
                <motion.div
                  key={agent.publicKey.toBase58()}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative group"
                >
                  <div className="bg-white border-4 border-black shadow-[8px_8px_0_0_#000000] transition-all duration-200 group-hover:shadow-[12px_12px_0_0_#00FF41] group-hover:-translate-y-1 group-hover:-translate-x-1">
                    {/* Header */}
                    <div className={`border-b-4 border-black p-4 ${escrow ? 'bg-[#00FF41]' : 'bg-neutral-300'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {escrow ? (
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="w-3 h-3 rounded-full bg-black"
                            />
                          ) : (
                            <div className="w-3 h-3 rounded-full bg-black/50" />
                          )}
                          <span className="font-mono font-black text-xl">{agent.account.name || agent.account.agentId}</span>
                        </div>
                        <div className={`px-3 py-1 font-mono text-xs font-bold border-2 border-black ${escrow ? 'bg-black text-white' : 'bg-white text-black'}`}>
                          {escrow ? 'ACTIVE' : 'NOT CREATED'}
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      {!escrow ? (
                        <div className="text-center py-6">
                          <p className="font-mono text-sm text-neutral-500 mb-4">No escrow account found</p>
                          <NeoButton
                            variant="primary"
                            className="w-full"
                            onClick={() => handleCreateEscrow(agent.publicKey)}
                            disabled={actionLoading || loading}
                          >
                            {actionLoading ? 'CREATING...' : 'CREATE ESCROW'}
                          </NeoButton>
                        </div>
                      ) : (
                        <>
                          {/* Balance Display */}
                          <div className="bg-black text-white p-4 text-center">
                            <div className="font-mono text-xs text-neutral-400 mb-1">CURRENT BALANCE</div>
                            <div className="font-black text-4xl text-[#00FF41]">{balance} SOL</div>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="border-2 border-black bg-neutral-50 p-2 text-center">
                              <div className="font-mono text-[10px] text-neutral-500 font-bold">DEPOSITED</div>
                              <div className="font-bold text-sm">{deposited}</div>
                            </div>
                            <div className="border-2 border-black bg-neutral-50 p-2 text-center">
                              <div className="font-mono text-[10px] text-neutral-500 font-bold">WITHDRAWN</div>
                              <div className="font-bold text-sm">{withdrawn}</div>
                            </div>
                            <div className="border-2 border-black bg-[#FF00F5] p-2 text-center">
                              <div className="font-mono text-[10px] text-white font-bold">SPENT</div>
                              <div className="font-bold text-sm text-white">{spent}</div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t-2 border-black">
                            <NeoButton
                              variant="success"
                              size="sm"
                              onClick={() => {
                                setSelectedAgent(agent.publicKey);
                                setShowDepositModal(true);
                              }}
                              disabled={loading || actionLoading}
                              className="font-mono text-xs"
                            >
                              DEPOSIT
                            </NeoButton>
                            <NeoButton
                              variant="warning"
                              size="sm"
                              onClick={() => {
                                setSelectedAgent(agent.publicKey);
                                setShowWithdrawModal(true);
                              }}
                              disabled={loading || actionLoading || Number(escrow.balance) === 0}
                              className="font-mono text-xs"
                            >
                              WITHDRAW
                            </NeoButton>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Corner Accent */}
                  {escrow && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      whileHover={{ opacity: 1, scale: 1 }}
                      className="absolute -bottom-2 -right-2 w-6 h-6 bg-[#00FF41] border-2 border-black z-10 pointer-events-none"
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      <AnimatePresence>
        {showDepositModal && selectedAgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowDepositModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md p-4"
            >
              <NeoCard className="p-6">
                <h3 className="font-display font-black text-2xl mb-4 text-[#00FF41]">DEPOSIT TO ESCROW</h3>
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
                    onClick={() => setShowDepositModal(false)}
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
        {showWithdrawModal && selectedAgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowWithdrawModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md p-4"
            >
              <NeoCard className="p-6">
                <h3 className="font-display font-black text-2xl mb-4 text-[#FFEB3B]">WITHDRAW FROM ESCROW</h3>
                {(() => {
                  const escrow = escrowData.get(selectedAgent.toBase58());
                  return escrow ? (
                    <p className="font-mono text-sm mb-4 border-2 border-black p-2 bg-neutral-50">
                      Available: <span className="font-bold">{lamportsToSol(escrow.balance)} SOL</span>
                    </p>
                  ) : null;
                })()}
                <NeoInput
                  label="Amount (SOL)"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="Enter amount to withdraw"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-6">
                  <NeoButton
                    variant="secondary"
                    onClick={() => setShowWithdrawModal(false)}
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
    </motion.div>
  );
};
