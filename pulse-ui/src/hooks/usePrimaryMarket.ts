// Primary Market Operations Hook
// Handles ticket purchasing and user operations

import { useMemo, useState, useCallback } from 'react';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { useProgram } from './useProgram';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  getTierPDA,
  getUserPDA,
  fetchUser,
  fetchEvent,
  fetchAgent,
} from '../utils/accounts';
import type { User, AIAgent } from '../types/pulse';
import { PROGRAM_ID } from './useProgram';

interface BuyTicketInput {
  eventPDA: PublicKey;
  tierId: string;
}

interface BuyTicketWithAgentInput {
  eventPDA: PublicKey;
  tierId: string;
  agentPDA: PublicKey;
  priceDealBps?: number;
}

interface CreateUserInput {
  username: string;
  email: string;
}

interface UsePrimaryMarketReturn {
  // Operations
  buyTicket: (input: BuyTicketInput) => Promise<string>;
  buyTicketWithAgent: (input: BuyTicketWithAgentInput) => Promise<string>;
  createUser: (input: CreateUserInput) => Promise<string>;
  validateTicket: (ticketPDA: PublicKey) => Promise<string>;

  // Queries
  getUser: (userPDA: PublicKey) => Promise<User | null>;
  getCurrentUser: () => Promise<User | null>;
  getAgent: (agentPDA: PublicKey) => Promise<AIAgent | null>;

  // Helpers
  calculatePrice: (price: number | bigint) => number;
  canAffordTicket: (ticketPrice: number, userBalance?: number) => boolean;

  // State
  loading: boolean;
  error: Error | null;
  isReady: boolean;
}

export const usePrimaryMarket = (): UsePrimaryMarketReturn => {
  const { program, connection, publicKey } = useProgram();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const isReady = useMemo(() => {
    return !!program && !!publicKey && wallet.signTransaction !== undefined;
  }, [program, publicKey, wallet]);

  /**
   * Buy a ticket from the primary market
   * Instruction: buy_ticket
   */
  const buyTicket = useCallback(
    async (input: BuyTicketInput): Promise<string> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        // Derive the tier PDA
        const [tierPDA] = await getTierPDA(input.eventPDA, input.tierId, PROGRAM_ID);

        // Derive the user PDA
        const [userPDA] = await getUserPDA(publicKey, PROGRAM_ID);

        // Get the event account to find the organizer
        const eventAccount = await fetchEvent(connection, input.eventPDA);
        if (!eventAccount) {
          throw new Error('Event not found');
        }

        const tx = await program.methods
          .buyTicket(input.tierId)
          .accounts({
            event: input.eventPDA,
            tier: tierPDA,
            user: userPDA,
            organizer: eventAccount.organizer,
            buyer: publicKey,
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
    [program, publicKey, connection]
  );

  /**
   * Buy a ticket using an AI agent
   * Instruction: buy_ticket_with_agent
   */
  const buyTicketWithAgent = useCallback(
    async (input: BuyTicketWithAgentInput): Promise<string> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        // Derive the tier PDA
        const [tierPDA] = await getTierPDA(input.eventPDA, input.tierId, PROGRAM_ID);

        // Get the agent account to find agent_id and owner
        const agentAccount = await fetchAgent(connection, input.agentPDA);
        if (!agentAccount) {
          throw new Error('Agent not found');
        }

        // Derive the user PDA (from agent owner)
        const [userPDA] = await getUserPDA(agentAccount.owner, PROGRAM_ID);

        // Check if user account exists, if not we need to create it
        // The user account must be created by the agent owner first
        const userExists = await connection.getAccountInfo(userPDA);
        if (!userExists) {
          // Check if the current wallet is the agent owner
          if (publicKey.equals(agentAccount.owner)) {
            try {
              await program.methods
                .createUser('Agent User', 'agent@pulse.local')
                .accounts({
                  user: userPDA,
                  owner: publicKey,
                  systemProgram: SystemProgram.programId,
                })
                .rpc();
              // Wait a moment for the account to be confirmed
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (createErr) {
              throw new Error('Failed to create user account. Agent owner needs to create a user account first.');
            }
          } else {
            throw new Error('User account not found. The agent owner must create a user account first.');
          }
        }

        // Get the event account to find the organizer
        const eventAccount = await fetchEvent(connection, input.eventPDA);
        if (!eventAccount) {
          throw new Error('Event not found');
        }
        // Check if agent has auto-purchase enabled
        if (!agentAccount.autoPurchaseEnabled) {
          try {
            // Try to toggle auto-purchase on
            await program.methods
              .toggleAutoPurchase()
              .accounts({
                agent: input.agentPDA,
                owner: publicKey,
              })
              .rpc();
            // Wait for confirmation
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (toggleErr) {
            throw new Error('Agent auto-purchase is disabled. Please enable auto-purchase on the agent first.');
          }
        }
        const tx = await program.methods
          .buyTicketWithAgent(input.tierId, new BN(input.priceDealBps || 0))
          .accounts({
            event: input.eventPDA,
            tier: tierPDA,
            agent: input.agentPDA,
            user: userPDA,
            agentOwner: agentAccount.owner,
            organizer: eventAccount.organizer,
            agentOwnerSigner: publicKey, // Must be the agent owner signing
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
    [program, publicKey, connection]
  );

  /**
   * Create a user account
   * Instruction: create_user
   */
  const createUser = useCallback(
    async (input: CreateUserInput): Promise<string> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        const [userPDA] = await getUserPDA(publicKey, PROGRAM_ID);

        const tx = await program.methods
          .createUser(input.username, input.email)
          .accounts({
            user: userPDA,
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
   * Validate a ticket
   * Instruction: validate_ticket
   * Note: This instruction needs to be added to the smart contract
   */
  const validateTicket = useCallback(
    async (_ticketPDA: PublicKey): Promise<string> => {
      // This would call a validate_ticket instruction
      // For now, it's a placeholder
      throw new Error('validate_ticket instruction not yet implemented in contract');
    },
    []
  );

  /**
   * Fetch a user account
   */
  const getUser = useCallback(
    async (userPDA: PublicKey): Promise<User | null> => {
      if (!connection) {
        return null;
      }

      try {
        return await fetchUser(connection, userPDA);
      } catch (err) {
        const error = err as Error;
        setError(error);
        return null;
      }
    },
    [connection]
  );

  /**
   * Fetch an AI agent account
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

  /**
   * Fetch the current user's account
   */
  const getCurrentUser = useCallback(async (): Promise<User | null> => {
    if (!connection || !publicKey) {
      return null;
    }

    try {
      const [userPDA] = await getUserPDA(publicKey, PROGRAM_ID);
      return await fetchUser(connection, userPDA);
    } catch (err) {
      const error = err as Error;
      setError(error);
      return null;
    }
  }, [connection, publicKey]);

  /**
   * Calculate ticket price in SOL
   */
  const calculatePrice = useCallback((price: number | bigint): number => {
    const lamports = typeof price === 'bigint' ? Number(price) : price;
    return lamports / LAMPORTS_PER_SOL;
  }, []);

  /**
   * Check if user can afford a ticket
   */
  const canAffordTicket = useCallback(
    (ticketPrice: number, userBalance?: number): boolean => {
      if (userBalance === undefined) {
        return false;
      }
      return userBalance >= ticketPrice;
    },
    []
  );

  return {
    // Operations
    buyTicket,
    buyTicketWithAgent,
    createUser,
    validateTicket,

    // Queries
    getUser,
    getCurrentUser,
    getAgent,

    // Helpers
    calculatePrice,
    canAffordTicket,

    // State
    loading,
    error,
    isReady,
  };
};
