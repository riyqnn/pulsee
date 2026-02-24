// Events Context Provider - Simplified MVP
// Provides global events data and operations

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useEvents } from '../hooks/useEvents';
import type { Event, TicketTier, ProgramAccount, EventWithTiers } from '../types/pulse';

interface EventsContextValue {
  // Data
  events: ProgramAccount<Event>[];
  eventMap: Map<string, ProgramAccount<Event>>;
  eventTiers: Map<string, ProgramAccount<TicketTier>[]>;
  loading: boolean;
  error: Error | null;
  lastUpdated: number | null;

  // Operations
  refresh: () => Promise<void>;
  getEvent: (eventId: string) => ProgramAccount<Event> | undefined;
  getEventByPubkey: (pubkey: PublicKey) => ProgramAccount<Event> | undefined;
  getEventWithTiers: (pubkey: PublicKey) => EventWithTiers | undefined;
  getEventTiers: (eventPubkey: PublicKey) => ProgramAccount<TicketTier>[];

  // Filtering
  getActiveEvents: () => ProgramAccount<Event>[];
  getEventsByOrganizer: (organizer: PublicKey) => ProgramAccount<Event>[];
}

const EventsContext = createContext<EventsContextValue | undefined>(undefined);

interface EventsProviderProps {
  children: ReactNode;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const EventsProvider: React.FC<EventsProviderProps> = ({
  children,
  autoRefresh = true,
  refreshInterval = 30000,
}) => {
  const { getAllEvents, getEventTiers: fetchEventTiers } = useEvents();
  const [events, setEvents] = useState<ProgramAccount<Event>[]>([]);
  const [eventTiers, setEventTiers] = useState<Map<string, ProgramAccount<TicketTier>[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Convert events array to a map for easy lookup
  const eventMap = useMemo(() => {
    const map = new Map<string, ProgramAccount<Event>>();
    events.forEach((event) => {
      map.set(event.account.eventId, event);
      map.set(event.publicKey.toBase58(), event);
    });
    return map;
  }, [events]);

  /**
   * Refresh all events and their tiers
   */
  const refresh = useCallback(async () => {
    // Kita nggak set loading true di sini biar ga flickering pas auto-refresh
    setError(null);

    try {
      const fetchedEvents = await getAllEvents();
      console.log("[EventsContext] Fetched Events:", fetchedEvents.length);

      const tiersMap = new Map<string, ProgramAccount<TicketTier>[]>();
      
      // Load tiers secara pararel biar cepet
      await Promise.all(fetchedEvents.map(async (event) => {
        try {
          const tiers = await fetchEventTiers(event.publicKey);
          tiersMap.set(event.publicKey.toBase58(), tiers);
        } catch (err) {
          console.error(`Error tiers for ${event.account.eventId}:`, err);
        }
      }));

      setEvents(fetchedEvents);
      setEventTiers(tiersMap);
      setLastUpdated(Date.now());
      setLoading(false); // Selesaikan loading awal
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
  }, [getAllEvents, fetchEventTiers]);

  /**
   * Get an event by its event ID
   */
  const getEvent = useCallback(
    (eventId: string): ProgramAccount<Event> | undefined => {
      return eventMap.get(eventId);
    },
    [eventMap]
  );

  /**
   * Get an event by its public key
   */
  const getEventByPubkey = useCallback(
    (pubkey: PublicKey): ProgramAccount<Event> | undefined => {
      return eventMap.get(pubkey.toBase58());
    },
    [eventMap]
  );

  /**
   * Get an event with all its tiers
   */
  const getEventWithTiers = useCallback(
    (pubkey: PublicKey): EventWithTiers | undefined => {
      const event = getEventByPubkey(pubkey);
      if (!event) return undefined;

      const tiers = eventTiers.get(pubkey.toBase58()) || [];

      return {
        publicKey: event.publicKey,
        account: event.account,
        tiers: tiers.map((t) => t.account),
      };
    },
    [getEventByPubkey, eventTiers]
  );

  /**
   * Get all tiers for an event
   */
  const getEventTiers = useCallback(
    (eventPubkey: PublicKey): ProgramAccount<TicketTier>[] => {
      return eventTiers.get(eventPubkey.toBase58()) || [];
    },
    [eventTiers]
  );

  /**
   * Get all active events
   */
  const getActiveEvents = useCallback((): ProgramAccount<Event>[] => {
    return events.filter((e) => e.account.isActive);
  }, [events]);

  /**
   * Get events by organizer
   */
  const getEventsByOrganizer = useCallback(
    (organizer: PublicKey): ProgramAccount<Event>[] => {
      return events.filter((e) => e.account.organizer.equals(organizer));
    },
    [events]
  );

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh]);

  const value: EventsContextValue = {
    // Data
    events,
    eventMap,
    eventTiers,
    loading,
    error,
    lastUpdated,

    // Operations
    refresh,
    getEvent,
    getEventByPubkey,
    getEventWithTiers,
    getEventTiers,

    // Filtering
    getActiveEvents,
    getEventsByOrganizer,
  };

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
};

// ============== Hook ==============

export const useEventsContext = (): EventsContextValue => {
  const context = useContext(EventsContext);

  if (!context) {
    throw new Error('useEventsContext must be used within an EventsProvider');
  }

  return context;
};
