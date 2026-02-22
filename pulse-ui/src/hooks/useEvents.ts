// Event Operations Hook
// Handles event and ticket tier operations
//
// NOTE: The following operations exist in lib.rs but are NOT in the deployed contract:
// - update_event: Update event details (not deployed)
// - cancel_event: Cancel an event (not deployed)
// - update_ticket_tier: Update tier details (not deployed)
// - disable_tier: Disable a ticket tier (not deployed)
//
// Only create_event and create_ticket_tier are available in the deployed contract.

import { useMemo, useState, useCallback } from 'react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { useProgram } from './useProgram';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  getEventPDA,
  getTierPDA,
  fetchAllEvents,
  fetchEvent,
  fetchTicketTiers,
  fetchTier,
  isSaleActive,
} from '../utils/accounts';
import type {
  CreateEventInput,
  CreateTicketTierInput,
  Event,
  TicketTier,
  ProgramAccount,
  EventWithTiers,
} from '../types/pulse';
import { PROGRAM_ID } from './useProgram';

interface UseEventsReturn {
  // Event Operations
  createEvent: (config: CreateEventInput) => Promise<string>;
  createTicketTier: (eventPDA: PublicKey, config: CreateTicketTierInput) => Promise<string>;

  // Queries
  getAllEvents: () => Promise<ProgramAccount<Event>[]>;
  getEvent: (eventPDA: PublicKey) => Promise<Event | null>;
  getEventTiers: (eventPDA: PublicKey) => Promise<ProgramAccount<TicketTier>[]>;
  getTier: (tierPDA: PublicKey) => Promise<TicketTier | null>;
  getEventWithTiers: (eventPDA: PublicKey) => Promise<EventWithTiers | null>;

  // Helpers
  isEventOnSale: (event: Event) => boolean;

  // State
  loading: boolean;
  error: Error | null;
  isReady: boolean;
}

export const useEvents = (): UseEventsReturn => {
  const { program, connection, publicKey } = useProgram();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const isReady = useMemo(() => {
    return !!program && !!publicKey && wallet.signTransaction !== undefined;
  }, [program, publicKey, wallet]);

  /**
   * Create a new event
   * Instruction: create_event
   */
  const createEvent = useCallback(
    async (config: CreateEventInput): Promise<string> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        const [eventPDA] = await getEventPDA(publicKey, config.eventId, PROGRAM_ID);

        const tx = await program.methods
          .createEvent(
            config.eventId,
            config.name,
            config.description,
            config.imageUrl,
            config.venue,
            config.eventStartTime,
            config.eventEndTime,
            config.saleStartTime,
            config.saleEndTime,
            config.maxTicketsPerUser,
            config.royaltyBps
          )
          .accounts({
            event: eventPDA,
            organizer: publicKey,
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
   * Create a ticket tier for an event
   * Instruction: create_ticket_tier
   */
  const createTicketTier = useCallback(
    async (eventPDA: PublicKey, config: CreateTicketTierInput): Promise<string> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        const [tierPDA] = await getTierPDA(eventPDA, config.tierId, PROGRAM_ID);

        const tx = await program.methods
          .createTicketTier(
            config.tierId,
            config.name,
            config.description,
            config.price,
            config.maxSupply
          )
          .accounts({
            event: eventPDA,
            tier: tierPDA,
            organizer: publicKey,
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
   * Fetch all events
   */
  const getAllEvents = useCallback(async (): Promise<ProgramAccount<Event>[]> => {
    if (!connection || !program) {
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const events = await fetchAllEvents(connection, PROGRAM_ID, program);
      return events;
    } catch (err) {
      const error = err as Error;
      setError(error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [connection, program]);

  /**
   * Fetch a single event
   */
  const getEvent = useCallback(
    async (eventPDA: PublicKey): Promise<Event | null> => {
      if (!connection) {
        return null;
      }

      try {
        return await fetchEvent(connection, eventPDA);
      } catch (err) {
        const error = err as Error;
        setError(error);
        return null;
      }
    },
    [connection]
  );

  /**
   * Fetch all ticket tiers for an event
   */
  const getEventTiers = useCallback(
    async (eventPDA: PublicKey): Promise<ProgramAccount<TicketTier>[]> => {
      if (!connection || !program) {
        return [];
      }

      try {
        return await fetchTicketTiers(connection, eventPDA, PROGRAM_ID, program);
      } catch (err) {
        const error = err as Error;
        setError(error);
        return [];
      }
    },
    [connection, program]
  );

  /**
   * Fetch a single ticket tier
   */
  const getTier = useCallback(
    async (tierPDA: PublicKey): Promise<TicketTier | null> => {
      if (!connection) {
        return null;
      }

      try {
        return await fetchTier(connection, tierPDA);
      } catch (err) {
        const error = err as Error;
        setError(error);
        return null;
      }
    },
    [connection]
  );

  /**
   * Fetch event with all its tiers
   */
  const getEventWithTiers = useCallback(
    async (eventPDA: PublicKey): Promise<EventWithTiers | null> => {
      if (!connection) {
        return null;
      }

      try {
        const event = await fetchEvent(connection, eventPDA);
        if (!event) return null;

        if (!program) return null;

        const tiers = await fetchTicketTiers(connection, eventPDA, PROGRAM_ID, program);

        return {
          ...event,
          tiers: tiers.map((t) => t.account),
        };
      } catch (err) {
        const error = err as Error;
        setError(error);
        return null;
      }
    },
    [connection]
  );

  /**
   * Check if an event is currently on sale
   */
  const isEventOnSale = useCallback(
    (event: Event): boolean => {
      return (
        event.isActive &&
        !event.isCancelled &&
        isSaleActive(event.saleStartTime, event.saleEndTime)
      );
    },
    []
  );

  return {
    // Event Operations
    createEvent,
    createTicketTier,

    // Queries
    getAllEvents,
    getEvent,
    getEventTiers,
    getTier,
    getEventWithTiers,

    // Helpers
    isEventOnSale,

    // State
    loading,
    error,
    isReady,
  };
};
