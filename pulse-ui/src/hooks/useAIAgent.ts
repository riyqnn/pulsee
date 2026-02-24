// AI Agent Operations Hook - Simplified for MVP
// Handles all agent-related transactions and queries

import { useMemo, useState, useCallback } from 'react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { useProgram } from './useProgram';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  getAgentPDA,
  getEscrowPDA,
  getEventPDA,
  getTierPDA,
  fetchUserAgents,
  fetchAgent,
  fetchEscrow,
} from '../utils/accounts';
import type {
  AIAgent,
  AgentEscrow,
  ProgramAccount,
} from '../types/pulse';
import { PROGRAM_ID } from './useProgram';
import { supabase } from '../utils/supabase';

interface CreateAgentInput {
  agentId: string;
  maxBudgetPerTicket: number | bigint;
  totalBudget: number | bigint;
}

interface UseAIAgentReturn {
  // Operations
  createAgent: (config: CreateAgentInput) => Promise<string>;
  createEscrow: (agentPDA: PublicKey) => Promise<string>;
  depositToEscrow: (escrowPDA: PublicKey, agentPDA: PublicKey, amountLamports: number) => Promise<string>;
  withdrawFromEscrow: (escrowPDA: PublicKey, agentPDA: PublicKey, amountLamports: number) => Promise<string>;

  // Agent control methods
  activateAgent: (agentPDA: PublicKey, agentId: string) => Promise<string>;
  deactivateAgent: (agentPDA: PublicKey, agentId: string) => Promise<string>;
  toggleAutoPurchase: (agentPDA: PublicKey, agentId: string, enabled: boolean) => Promise<string>;
  addAgentBudget: (agentPDA: PublicKey, agentId: string, amountLamports: number) => Promise<string>;
  updateAgentConfig: (agentPDA: PublicKey, agentId: string, maxBudgetPerTicket?: number, autoPurchaseThreshold?: number) => Promise<string>;

  // Core function - buy ticket with escrow
  buyTicketWithEscrow: (
    agentOwner: string,
    agentId: string,
    organizer: string,
    eventId: string,
    tierId: string
  ) => Promise<string>;

  // Mission Operations (Sektor 3)
  getAgentMissions: (ownerAddress: string) => Promise<any[]>;
  cancelMission: (missionId: string) => Promise<void>;

  // Queries
  getUserAgents: () => Promise<ProgramAccount<AIAgent>[]>;
  getAgent: (agentPDA: PublicKey) => Promise<AIAgent | null>;
  getEscrow: (escrowPDA: PublicKey) => Promise<AgentEscrow | null>;

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
   * Simplified version: agent_id, max_budget_per_ticket, total_budget
   */
  // Cari function createAgent di useAIAgent.ts dan ganti logic pemanggilannya:
  const createAgent = useCallback(
    async (config: any): Promise<string> => {
      if (!program || !publicKey) throw new Error('Wallet not connected');
      setLoading(true);
      try {
        // 1. Derivasi PDA Agent (seeds: [b"agent", owner, agent_id])
        const [agentPDA] = getAgentPDA(publicKey, config.agentId, PROGRAM_ID);

        // 2. Tembak instruksi sesuai urutan di lib.rs
        // create_ai_agent(agent_id, name, max_budget, total_budget, auto_purchase, threshold, max_tickets)
        const tx = await program.methods
          .createAiAgent(
            config.agentId,                    // String
            config.name,                       // String
            new BN(config.maxBudgetPerTicket), // u64
            new BN(config.totalBudget),        // u64
            config.autoPurchaseEnabled,        // bool
            config.autoPurchaseThreshold,      // u16
            config.maxTicketsPerEvent          // u32
          )
          .accounts({
            agent: agentPDA,
            owner: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        return tx;
      } catch (err) {
        console.error("Create Agent Error:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );
  /**
   * Create escrow for an agent
   */
  const createEscrow = useCallback(
    async (agentPDA: PublicKey): Promise<string> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        const [escrowPDA] = await getEscrowPDA(agentPDA, publicKey, PROGRAM_ID);

        const tx = await program.methods
          .createEscrow()
          .accounts({
            agent: agentPDA,
            escrow: escrowPDA,
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
   * Deposit to escrow
   */
  const depositToEscrow = useCallback(
  async (escrowPDA: PublicKey, agentPDA: PublicKey, amountLamports: number): Promise<string> => {
    if (!program || !publicKey) throw new Error('Wallet not connected');

    setLoading(true);
    try {
      const tx = await program.methods
        .depositToEscrow(new BN(amountLamports))
        .accounts({
          escrow: escrowPDA,
          agent: agentPDA,
          owner: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      return tx;
    } finally {
      setLoading(false);
    }
  },
  [program, publicKey]
);


/**
 * Withdraw from escrow
*/
  const withdrawFromEscrow = useCallback(
    async (escrowPDA: PublicKey, agentPDA: PublicKey, amountLamports: number): Promise<string> => {
      if (!program || !publicKey) throw new Error('Wallet not connected');
  
      setLoading(true);
      try {
        const tx = await program.methods
          .withdrawFromEscrow(new BN(amountLamports))
          .accounts({
            escrow: escrowPDA,
            agent: agentPDA,
            owner: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        return tx;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );
  

  /**
   * CORE FUNCTION: Buy ticket with escrow
   * Can be called by anyone (scheduler service)
   */
  const buyTicketWithEscrow = useCallback(
    async (
      agentOwner: string,
      agentId: string,
      organizer: string,
      eventId: string,
      tierId: string
    ): Promise<string> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        const agentOwnerPubkey = new PublicKey(agentOwner);
        const organizerPubkey = new PublicKey(organizer);

        // Derive all PDAs
        const [eventPDA] = await getEventPDA(organizerPubkey, eventId, PROGRAM_ID);
        const [tierPDA] = await getTierPDA(eventPDA, tierId, PROGRAM_ID);
        const [agentPDA] = await getAgentPDA(agentOwnerPubkey, agentId, PROGRAM_ID);
        const [escrowPDA] = await getEscrowPDA(agentPDA, agentOwnerPubkey, PROGRAM_ID);

        const tx = await program.methods
          .buyTicketWithEscrow(tierId)
          .accounts({
            event: eventPDA,
            tier: tierPDA,
            agent: agentPDA,
            escrow: escrowPDA,
            organizer: organizerPubkey,
            authority: publicKey, // Anyone can call this
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
   * Activate an agent
   */
  const activateAgent = useCallback(
    async (agentPDA: PublicKey, _agentId: string): Promise<string> => {
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
   * Deactivate an agent
   */
  const deactivateAgent = useCallback(
    async (agentPDA: PublicKey, _agentId: string): Promise<string> => {
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
   * Toggle auto-purchase for an agent
   */
  const toggleAutoPurchase = useCallback(
    async (agentPDA: PublicKey, _agentId: string, enabled: boolean): Promise<string> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        const tx = await program.methods
          .toggleAutoPurchase(enabled)
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
   */
  const addAgentBudget = useCallback(
    async (agentPDA: PublicKey, agentId: string, amountLamports: number): Promise<string> => {
      if (!program || !publicKey) throw new Error('Wallet not connected');

      try {
        const amountBN = new BN(amountLamports);

        // Pastikan pemanggilan instruksi sesuai dengan IDL
        const tx = await program.methods
          .addAgentBudget(amountBN)
          .accounts({
            agent: agentPDA, // PDA ini harus sesuai dengan seeds: ["agent", owner, agent_id]
            owner: publicKey,
          })
          .rpc();

        return tx;
      } catch (err) {
        console.error("Detail Error:", err);
        throw err;
      }
    },
    [program, publicKey]
  );

  /**
   * Update agent configuration
   */
  const updateAgentConfig = useCallback(
    async (
      agentPDA: PublicKey,
      _agentId: string,
      maxBudgetPerTicket?: number,
      autoPurchaseThreshold?: number
    ): Promise<string> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        const maxBudgetBN = maxBudgetPerTicket !== undefined ? new BN(maxBudgetPerTicket) : null;
        const thresholdBN = autoPurchaseThreshold !== undefined ? autoPurchaseThreshold : null;

        const tx = await program.methods
          .updateAgentConfig(maxBudgetBN, thresholdBN)
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
    // //FIXED: Pastikan program dikirim ke fetchUserAgents
    if (!connection || !publicKey || !program) {
      return [];
    }

    try {
      return await fetchUserAgents(connection, publicKey, PROGRAM_ID, program);
    } catch (err) {
      const error = err as Error;
      setError(error);
      return [];
    }
  }, [connection, publicKey, program]);

  /**
   * Fetch a single agent by PDA
   */
  const getAgent = useCallback(
    async (agentPDA: PublicKey): Promise<AIAgent | null> => {
      if (!connection || !program) return null;

      try {
        return await fetchAgent(connection, agentPDA, program);
      } catch (err) {
        return null;
      }
    },
    [connection, program]
  );

  /**
   * Fetch escrow by PDA
   */
  const getEscrow = useCallback(
    async (escrowPDA: PublicKey): Promise<AgentEscrow | null> => {
      if (!connection || !program) return null;

      try {
        return await fetchEscrow(connection, escrowPDA, program);
      } catch (err) {
        return null;
      }
    },
    [connection, program]
  );

  const getAgentMissions = useCallback(async (ownerAddress: string) => {
    const { data, error } = await supabase
      .from('agent_missions')
      .select('*')
      .eq('agent_owner', ownerAddress)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }, []);

  const cancelMission = useCallback(async (missionId: string) => {
    const { error } = await supabase
      .from('agent_missions')
      .update({ status: 'cancelled' })
      .eq('id', missionId);
    
    if (error) throw error;
  }, []);

  return {
    // Operations
    createAgent,
    createEscrow,
    depositToEscrow,
    withdrawFromEscrow,

    // Agent control
    activateAgent,
    deactivateAgent,
    toggleAutoPurchase,
    addAgentBudget,
    updateAgentConfig,

    // Core function
    buyTicketWithEscrow,

    // Queries
    getUserAgents,
    getAgent,
    getEscrow,

    getAgentMissions, 
    cancelMission,

    // State
    loading,
    error,
    isReady,
  };
};
