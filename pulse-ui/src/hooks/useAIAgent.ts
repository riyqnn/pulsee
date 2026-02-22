// AI Agent Operations Hook
// Handles all agent-related transactions and queries

import { useMemo, useState, useCallback } from 'react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { useProgram } from './useProgram';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  getAgentPDA,
  fetchUserAgents,
  fetchAgent,
} from '../utils/accounts';
import type {
  CreateAIAgentInput,
  AIAgent,
  ProgramAccount,
} from '../types/pulse';
import { PROGRAM_ID } from './useProgram';

interface UseAIAgentReturn {
  // Operations
  createAgent: (config: CreateAIAgentInput) => Promise<string>;
  activateAgent: (agentPDA: PublicKey) => Promise<string>;
  deactivateAgent: (agentPDA: PublicKey) => Promise<string>;
  addBudget: (agentPDA: PublicKey, amount: number) => Promise<string>;
  toggleAutoPurchase: (agentPDA: PublicKey) => Promise<string>;

  // Queries
  getUserAgents: () => Promise<ProgramAccount<AIAgent>[]>;
  getAgent: (agentPDA: PublicKey) => Promise<AIAgent | null>;

  // State
  loading: boolean;
  error: Error | null;
  isReady: boolean;
}

export const useAIAgent = (): UseAIAgentReturn => {
  const { program, connection, publicKey } = useProgram();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const isReady = useMemo(() => {
    return !!program && !!publicKey && wallet.signTransaction !== undefined;
  }, [program, publicKey, wallet]);

  /**
   * Create a new AI agent
   * Instruction: create_ai_agent (simplified version)
   */
  const createAgent = useCallback(
    async (config: CreateAIAgentInput): Promise<string> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        const [agentPDA] = await getAgentPDA(publicKey, config.agentId, PROGRAM_ID);

        // Convert budget values to BN for u64 types
        const maxBudgetBN = typeof config.maxBudgetPerTicket === 'bigint'
          ? new BN(config.maxBudgetPerTicket.toString())
          : new BN(config.maxBudgetPerTicket);
        const totalBudgetBN = typeof config.totalBudget === 'bigint'
          ? new BN(config.totalBudget.toString())
          : new BN(config.totalBudget);

        // Use the simplified 7-argument version that's deployed on devnet
        const tx = await program.methods
          .createAiAgent(
            config.agentId,
            config.name,
            maxBudgetBN,
            totalBudgetBN,
            config.autoPurchaseEnabled,
            config.autoPurchaseThreshold,
            config.maxTicketsPerEvent
          )
          .accounts({
            agent: agentPDA,
            owner: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        return tx;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  /**
   * Activate an AI agent
   * Instruction: activate_agent
   */
  const activateAgent = useCallback(
    async (agentPDA: PublicKey): Promise<string> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        const tx = await program.methods
          .activateAgent()
          .accounts({
            agent: agentPDA,
            owner: publicKey,
          })
          .rpc();

        return tx;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  /**
   * Deactivate an AI agent
   * Instruction: deactivate_agent
   */
  const deactivateAgent = useCallback(
    async (agentPDA: PublicKey): Promise<string> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        const tx = await program.methods
          .deactivateAgent()
          .accounts({
            agent: agentPDA,
            owner: publicKey,
          })
          .rpc();

        return tx;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  /**
   * Add budget to an agent
   * Instruction: add_agent_budget
   */
  const addBudget = useCallback(
    async (agentPDA: PublicKey, amountLamports: number): Promise<string> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        const amountBN = new BN(amountLamports);

        const tx = await program.methods
          .addAgentBudget(amountBN)
          .accounts({
            agent: agentPDA,
            owner: publicKey,
          })
          .rpc();

        return tx;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  /**
   * Toggle auto-purchase for an agent
   * Instruction: toggle_auto_purchase
   * NOTE: IDL version has no arguments - it toggles between true/false
   * To set specific value, use update_ai_agent (when implemented)
   */
  const toggleAutoPurchase = useCallback(
    async (agentPDA: PublicKey): Promise<string> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        // IDL version has no args - just toggles
        const tx = await program.methods
          .toggleAutoPurchase()
          .accounts({
            agent: agentPDA,
            owner: publicKey,
          })
          .rpc();

        return tx;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  /**
   * Fetch all agents for the current user
   */
  const getUserAgents = useCallback(async (): Promise<ProgramAccount<AIAgent>[]> => {
    if (!connection || !publicKey) {
      return [];
    }

    try {
      return await fetchUserAgents(connection, publicKey, PROGRAM_ID);
    } catch (err) {
      const error = err as Error;
      setError(error);
      return [];
    }
  }, [connection, publicKey]);

  /**
   * Fetch a single agent by PDA
   */
  const getAgent = useCallback(
    async (agentPDA: PublicKey): Promise<AIAgent | null> => {
      if (!connection) {
        return null;
      }

      try {
        return await fetchAgent(connection, agentPDA);
      } catch (err) {
        const error = err as Error;
        setError(error);
        return null;
      }
    },
    [connection]
  );

  return {
    // Operations
    createAgent,
    activateAgent,
    deactivateAgent,
    addBudget,
    toggleAutoPurchase,

    // Queries
    getUserAgents,
    getAgent,

    // State
    loading,
    error,
    isReady,
  };
};
