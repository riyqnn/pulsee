import { motion } from 'framer-motion';
import { EventCard } from './EventCard';
import { useEventsContext } from '../../contexts/EventsContext';
import { useEvents } from '../../hooks/useEvents';
import { formatTimestamp } from '../../utils/accounts';
import { useEffect, useState, useCallback } from 'react';

export const MarketplaceGrid = () => {
  const { events, loading, getEventsOnSale } = useEventsContext();
  const { getEventTiers } = useEvents();
  const [eventsWithTiers, setEventsWithTiers] = useState<any[]>([]);

  const loadEventsWithTiers = useCallback(async () => {
    const onSaleEvents = getEventsOnSale();

    const eventsData = await Promise.all(
      onSaleEvents.map(async (event) => {
        const tiers = await getEventTiers(event.publicKey);
        return {
          id: event.account.eventId,
          name: event.account.name,
          venue: event.account.venue,
          date: formatTimestamp(event.account.eventStartTime),
          image: event.account.imageUrl,
          soldOut: tiers.every((t) => Number(t.account.currentSupply) >= Number(t.account.maxSupply)),
          ticketTiers: tiers.map((t) => ({
            tierId: t.account.tierId,
            name: t.account.name,
            price: Number(t.account.price) / 1e9,
            available: Number(t.account.maxSupply) - Number(t.account.currentSupply),
            maxSupply: Number(t.account.maxSupply),
          })),
          publicKey: event.publicKey,
        };
      })
    );
    setEventsWithTiers(eventsData);
  }, [getEventsOnSale, getEventTiers]);

  useEffect(() => {
    loadEventsWithTiers();
  }, [events.length, loadEventsWithTiers]);

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
              <div className="w-4 h-4 bg-[#00FF41]" />
              <span className="font-mono text-sm tracking-widest text-neutral-500">PRIMARY MARKET</span>
            </div>
            <h2 className="font-black text-6xl md:text-7xl tracking-tight">
              ON-CHAIN<br />MARKETPLACE
            </h2>
          </div>
          <div className="hidden md:block text-right">
            <div className="font-mono text-sm text-neutral-500 mb-1">LIVE EVENTS</div>
            <div className="font-black text-5xl text-[#FF00F5]">{eventsWithTiers.length}</div>
          </div>
        </div>
        {/* Decorative element */}
        <div className="absolute -bottom-1 right-0 w-32 h-1 bg-[#FF00F5]" />
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-20">
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="font-mono text-2xl font-bold"
          >
            LOADING EVENTS FROM CHAIN...
          </motion.div>
        </div>
      ) : eventsWithTiers.length === 0 ? (
        <div className="text-center py-20 border-4 border-black bg-neutral-100">
          <div className="font-mono text-xl font-bold text-neutral-600">NO EVENTS CURRENTLY ON SALE</div>
          <div className="font-mono text-sm text-neutral-500 mt-2">CHECK BACK SOON</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {eventsWithTiers.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <EventCard event={event} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Mobile stats */}
      {eventsWithTiers.length > 0 && (
        <div className="md:hidden flex items-center justify-between font-mono text-sm border-t-4 border-black pt-4">
          <span className="text-neutral-500">TOTAL EVENTS</span>
          <span className="font-bold text-[#FF00F5]">{eventsWithTiers.length}</span>
        </div>
      )}
    </motion.div>
  );
};
