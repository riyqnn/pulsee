import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PublicKey } from '@solana/web3.js';
import { NeoCard, NeoInput, NeoButton } from '../neo';

interface AddBudgetModalProps {
  agentPDA: PublicKey;
  onClose: () => void;
  onConfirm: (amountLamports: number) => Promise<void>;
}

export const AddBudgetModal: React.FC<AddBudgetModalProps> = ({
  agentPDA,
  onClose,
  onConfirm,
}) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const amountSol = parseFloat(amount);
    if (!amountSol || amountSol <= 0 || isNaN(amountSol)) {
      alert('Please enter a valid amount');
      return;
    }

    const amountLamports = Math.floor(amountSol * 1e9);
    setLoading(true);

    try {
      await onConfirm(amountLamports);
      setAmount('');
    } catch (error) {
      console.error('Failed to add budget:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
        >
          <NeoCard className="p-6 max-w-md w-full">
            <h3 className="font-display text-xl mb-4 text-neo-green flex items-center gap-2">
              <span className="w-2 h-2 bg-neo-green rounded-full animate-pulse"></span>
              ADD AGENT BUDGET
            </h3>

            <p className="font-mono text-sm text-gray-400 mb-4">
              Agent: {agentPDA.toBase58().slice(0, 8)}...{agentPDA.toBase58().slice(-8)}
            </p>

            <NeoInput
              label="Amount (SOL)"
              type="number"
              step="0.001"
              min="0"
              placeholder="Enter amount to add"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />

            <div className="flex justify-end gap-2 mt-6">
              <NeoButton
                variant="secondary"
                onClick={onClose}
                disabled={loading}
              >
                CANCEL
              </NeoButton>
              <NeoButton
                variant="primary"
                onClick={handleSubmit}
                disabled={!amount || loading}
              >
                {loading ? 'ADDING...' : 'ADD BUDGET'}
              </NeoButton>
            </div>
          </NeoCard>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
