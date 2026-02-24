// Event Operations Hook - Simplified MVP
// Handles event and ticket tier operations

import { useMemo, useState, useCallback } from 'react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { useProgram } from './useProgram';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  getEventPDA,
  getTierPDA,
  fetchAllEvents,
  fetchEvent,
  fetchTicketTiers,
  fetchTier,
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
   * Create a new event - Simplified version
   * Only takes: eventId, organizerFeeBps
   */
  const createEvent = useCallback(
    async (config: any): Promise<string> => { // Pakai any dulu biar fleksibel atau update type CreateEventInput lo
      if (!program || !publicKey) throw new Error('Wallet not connected');

      setLoading(true);
      setError(null);

      try {
        const [eventPDA] = await getEventPDA(publicKey, config.eventId, PROGRAM_ID);

        // //TESTING YAAAAA: Sesuaikan urutan argumen dengan SC lib.rs lo
        const tx = await program.methods
          .createEvent(
            config.eventId,
            config.name,
            config.description,
            config.imageUrl,
            config.location,
            new BN(config.eventStart),
            new BN(config.eventEnd),
            new BN(config.saleStart),
            new BN(config.saleEnd),
            config.maxTickets, // u32
            config.organizerFeeBps // u16
          )
          .accounts({
            event: eventPDA,
            organizer: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        return tx;
      } catch (err) {
        console.error("Hook CreateEvent Error:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  /**
   * Create a ticket tier for an event - Simplified version
   * Only takes: tierId, price, maxSupply
   */
  const createTicketTier = useCallback(
    async (eventPDA: PublicKey, config: any): Promise<string> => {
      if (!program || !publicKey) throw new Error('Wallet not connected');

      setLoading(true);
      try {
        const [tierPDA] = await getTierPDA(eventPDA, config.tierId, PROGRAM_ID);

        // //TESTING YAAAAA: Sesuaikan urutan argumen createTicketTier
        const tx = await program.methods
          .createTicketTier(
            config.tierId,
            config.name, // Tambahan name
            config.description, // Tambahan desc
            new BN(config.price.toString()),
            new BN(config.maxSupply.toString())
          )
          .accounts({
            event: eventPDA,
            tier: tierPDA,
            organizer: publicKey,
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
  // Di useEvents.ts bagian getEvent
const getEvent = useCallback(
  async (eventPDA: PublicKey): Promise<Event | null> => {
    if (!connection || !program) return null;
    try {
      return await fetchEvent(connection, eventPDA, program); // Kirim program di sini
    } catch (err) {
      return null;
    }
  },
  [connection, program]
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
          publicKey: eventPDA,
          account: event,
          tiers: tiers.map((t) => t.account),
        };
      } catch (err) {
        const error = err as Error;
        setError(error);
        return null;
      }
    },
    [connection, program]
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

    // State
    loading,
    error,
    isReady,
  };
};
