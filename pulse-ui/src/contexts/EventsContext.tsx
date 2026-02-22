// Events Context Provider
// Provides global events data and operations

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
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
  getEventsOnSale: () => ProgramAccount<Event>[];
  getEventsByOrganizer: (organizer: PublicKey) => ProgramAccount<Event>[];
}

const EventsContext = createContext<EventsContextValue | undefined>(undefined);

interface EventsProviderProps {
  children: ReactNode;
  autoRefresh?: boolean; // Auto-refresh every 30 seconds
  refreshInterval?: number; // In milliseconds
}

export const EventsProvider: React.FC<EventsProviderProps> = ({
  children,
  autoRefresh = true,
  refreshInterval = 30000,
}) => {
  const { getAllEvents, isEventOnSale } = useEvents();
  const [events, setEvents] = useState<ProgramAccount<Event>[]>([]);
  const [eventTiers, _setEventTiers] = useState<Map<string, ProgramAccount<TicketTier>[]>>(new Map());
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
   * Refresh all events
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const fetchedEvents = await getAllEvents();
      setEvents(fetchedEvents);
      setLastUpdated(Date.now());
    } catch (err) {
      console.error('[EventsContext] Error fetching events:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [getAllEvents]);

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
        ...event.account,
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
    return events.filter((e) => e.account.isActive && !e.account.isCancelled);
  }, [events]);

  /**
   * Get all events currently on sale
   */
  const getEventsOnSale = useCallback((): ProgramAccount<Event>[] => {
    const onSale = events.filter((e) => {
      const result = isEventOnSale(e.account);
      return result;
    });
    return onSale;
  }, [events, isEventOnSale]);

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
    getEventsOnSale,
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

// Import useMemo
import { useMemo } from 'react';
