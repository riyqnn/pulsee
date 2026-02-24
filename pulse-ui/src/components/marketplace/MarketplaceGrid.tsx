import { motion, AnimatePresence } from 'framer-motion';
import { EventCard } from './EventCard';
import { useEventsContext } from '../../contexts/EventsContext';
import { useEvents } from '../../hooks/useEvents';
import { useEffect, useState, useCallback } from 'react';
import { NeoButton } from '../neo'; 
import { CreateEventForm } from './CreateEventForm'; 

export const MarketplaceGrid = () => {
  const { events, loading: contextLoading, refresh } = useEventsContext();
  const { getEventTiers } = useEvents();
  const [eventsWithTiers, setEventsWithTiers] = useState<any[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadEventsWithTiers = useCallback(async () => {
    // //TESTING YAAAAA: Jangan pakai getActiveEvents dulu, ambil semua aja buat debugging
    if (events.length === 0) {
      setEventsWithTiers([]);
      return;
    }

    setLocalLoading(true);
    try {
      const eventsData = await Promise.all(
        events.map(async (event) => {
          try {
            const tiers = await getEventTiers(event.publicKey);
            
            // //TESTING YAAAAA: Parse data mentah dari BN ke String/Number dengan aman
            return {
              id: event.account.eventId,
              name: event.account.name || `Event ${event.account.eventId}`, 
              venue: event.account.location || 'Solana Devnet',
              date: event.account.eventStart 
                ? new Date(Number(event.account.eventStart.toString()) * 1000).toLocaleDateString() 
                : 'TBD',
              image: event.account.imageUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${event.account.eventId}`,
              description: event.account.description,
              // Jika ga ada tiers, jangan dianggap sold out, tapi kasih 0
              soldOut: tiers.length > 0 && tiers.every((t) => Number(t.account.currentSupply.toString()) >= Number(t.account.maxSupply.toString())),
              ticketTiers: tiers.map((t) => ({
                tierId: t.account.tierId,
                name: t.account.name || t.account.tierId, 
                price: Number(t.account.price.toString()) / 1e9,
                available: Math.max(0, Number(t.account.maxSupply.toString()) - Number(t.account.currentSupply.toString())),
                maxSupply: Number(t.account.maxSupply.toString()),
              })),
              publicKey: event.publicKey,
            };
          } catch (tierErr) {
            console.error("Error loading tiers for event:", event.account.eventId, tierErr);
            return null;
          }
        })
      );
      
      // //TESTING YAAAAA: Filter null dan mastikan cuma nampilin yang ada Tiers-nya
      const validEvents = eventsData.filter(e => e !== null && e.ticketTiers.length > 0);
      console.log("🚀 Valid Events for UI:", validEvents);
      setEventsWithTiers(validEvents);
    } catch (err) {
      console.error("Critical error in loadEventsWithTiers:", err);
    } finally {
      setLocalLoading(false);
    }
  }, [events, getEventTiers]);

  useEffect(() => {
    loadEventsWithTiers();
  }, [events, loadEventsWithTiers]);

  const isLoading = contextLoading || localLoading;

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
            <h2 className="font-black text-6xl md:text-7xl tracking-tight uppercase">
              Pulse<br />Market
            </h2>
          </div>
          
          <div className="flex flex-col items-end gap-4">
            <NeoButton 
              variant="primary" 
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-4 text-xl shadow-[8px_8px_0_0_#000000] border-4 border-black"
            >
              + CREATE EVENT
            </NeoButton>
            <div className="hidden md:block text-right">
              <div className="font-mono text-sm text-neutral-500 mb-1 tracking-tighter">ON-CHAIN EVENTS</div>
              <div className="font-black text-5xl text-[#FF00F5]">{eventsWithTiers.length}</div>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-1 right-0 w-32 h-1 bg-[#FF00F5]" />
      </div>

      {/* Grid Content */}
      {isLoading ? (
        <div className="text-center py-20">
           <div className="inline-block w-12 h-12 border-8 border-black border-t-[#00FF41] rounded-full animate-spin mb-4"></div>
           <p className="font-mono text-xl font-black">SYNCING WITH SOLANA...</p>
        </div>
      ) : eventsWithTiers.length === 0 ? (
        <div className="text-center py-20 border-8 border-black bg-neutral-100 shadow-[12px_12px_0_0_#000000]">
          <div className="font-mono text-2xl font-black text-neutral-600">BLOCKCHAIN IS EMPTY</div>
          <p className="font-mono text-sm text-neutral-500 mt-2 mb-6">Run demo script or create your own event below</p>
          <NeoButton variant="secondary" onClick={() => setShowCreateModal(true)}>
            DEPLOY FIRST EVENT
          </NeoButton>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {eventsWithTiers.map((event, index) => (
            <motion.div key={event.id + index} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}>
              <EventCard event={event} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Popup */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowCreateModal(false)}
                className="absolute -top-12 right-0 text-white font-mono hover:text-[#FF00F5] font-bold"
              >
                [ CLOSE / ESC ]
              </button>

              <CreateEventForm 
                onSuccess={() => {
                   setShowCreateModal(false);
                   refresh(); 
                }} 
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};