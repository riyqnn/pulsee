import { motion, AnimatePresence } from 'framer-motion';
import { EventCard } from './EventCard';
import { useEventsContext } from '../../contexts/EventsContext';
import { useEvents } from '../../hooks/useEvents';
import { useEffect, useState, useCallback } from 'react';
import { NeoButton } from '../neo'; 
import { CreateEventForm } from './CreateEventForm'; 
import { supabase } from '../../utils/supabase';

export const MarketplaceGrid = () => {
  const { events, loading: contextLoading, refresh } = useEventsContext();
  const { getEventTiers } = useEvents();
  const [eventsWithTiers, setEventsWithTiers] = useState<any[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadEventsWithTiers = useCallback(async () => {
  setLocalLoading(true);
  try {
    console.log("🛠️ Filtering by Supabase metadata...");
    const { data: metadata, error: sbError } = await supabase
      .from('events_metadata')
      .select('*');

    if (sbError) throw sbError;
    if (!metadata || metadata.length === 0) {
      setEventsWithTiers([]);
      return;
    }

    const eventsData = [];
    
    for (const meta of metadata) {
      try {
        const solEvent = events.find(e => e.publicKey.toBase58() === meta.event_pda);
        
        if (!solEvent) continue;

        const tiers = await getEventTiers(solEvent.publicKey);

        eventsData.push({
          id: solEvent.account.eventId,
          publicKey: solEvent.publicKey,
          name: meta.name,
          venue: meta.location,
          description: meta.description,
          image: meta.image_url,
          date: meta.event_start ? new Date(meta.event_start).toLocaleDateString() : 'TBD',

          soldOut: tiers.length > 0 && tiers.every((t) => 
            Number(t.account.currentSupply.toString()) >= Number(t.account.maxSupply.toString())
          ),
          ticketTiers: tiers.map((t) => ({
            tierId: t.account.tierId,
            name: t.account.name || t.account.tierId, 
            price: Number(t.account.price.toString()) / 1e9,
            available: Math.max(0, Number(t.account.maxSupply.toString()) - Number(t.account.currentSupply.toString())),
            maxSupply: Number(t.account.maxSupply.toString()),
          })),
        });
        
        await new Promise(r => setTimeout(r, 100)); 

      } catch (err) {
        console.error(`Gagal muat data blockchain untuk PDA: ${meta.event_pda}`, err);
      }
    }
    
    console.log("🚀 Marketplace Ready (DB Synced):", eventsData);
    setEventsWithTiers(eventsData);
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
           <p className="font-mono text-xl font-black italic">SYNCING HYBRID DATA...</p>
        </div>
      ) : eventsWithTiers.length === 0 ? (
        <div className="text-center py-20 border-8 border-black bg-neutral-100 shadow-[12px_12px_0_0_#000000]">
          <div className="font-mono text-2xl font-black text-neutral-600 uppercase">Blockchain Empty</div>
          <p className="font-mono text-sm text-neutral-500 mt-2 mb-6">No metadata found in Supabase for current on-chain events.</p>
          <NeoButton variant="secondary" onClick={() => setShowCreateModal(true)}>
            DEPLOY FIRST HYBRID EVENT
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
                   refresh(); // Paksa Context Solana refresh, yang akan trigger useEffect kita
                }} 
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};