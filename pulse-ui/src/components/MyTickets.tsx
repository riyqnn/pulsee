import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PublicKey } from '@solana/web3.js';
import { NeoCard } from './neo';
import { useSecondaryMarket } from '../hooks/useSecondaryMarket';
import { useProgram } from '../hooks/useProgram';
import { fetchUserTickets } from '../utils/accounts';
import { PROGRAM_ID } from '../hooks/useProgram';

interface MyTicketsProps {
  ownerPublicKey: PublicKey;
}

export const MyTickets = ({ ownerPublicKey }: MyTicketsProps) => {
  const { connection } = useProgram();
  const { listTicketForSale, loading: listingLoading } = useSecondaryMarket();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showListModal, setShowListModal] = useState<{ ticket: any; eventPDA: PublicKey } | null>(null);
  const [listPrice, setListPrice] = useState('0.1');
  const [duration, setDuration] = useState('3600');

  const fetchTickets = useCallback(async () => {
    if (!connection || !ownerPublicKey) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userTickets = await fetchUserTickets(connection, ownerPublicKey, PROGRAM_ID);
      setTickets(userTickets);
    } catch (error) {
      console.error('[MyTickets] Error fetching tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [connection, ownerPublicKey]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleListTicket = async () => {
    if (!showListModal) return;

    try {
      await listTicketForSale({
        ticketMint: showListModal.ticket.account.mint,
        eventPDA: showListModal.eventPDA,
        listingId: `LISTING_${Date.now()}`,
        listPrice: Math.floor(parseFloat(listPrice) * 1e9),
        duration: parseInt(duration),
      });

      alert('TICKET LISTED SUCCESSFULLY');
      setShowListModal(null);
      // Refresh tickets after listing
      fetchTickets();
    } catch (error) {
      alert(`LISTING FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20 font-mono">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-xl font-bold"
        >
          LOADING YOUR TICKETS...
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      {/* Header */}
      <div className="relative border-b-4 border-black pb-4">
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-12 bg-[#00FF41]" />
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-4 h-4 bg-[#00FF41]" />
                <span className="font-mono text-sm tracking-widest text-neutral-500">MY TICKETS</span>
              </div>
              <h2 className="font-black text-5xl md:text-6xl tracking-tight">
                YOUR<br />TICKETS
              </h2>
            </div>
          </div>
          <div className="hidden md:block text-right">
            <div className="font-mono text-sm text-neutral-500 mb-1">TOTAL TICKETS</div>
            <div className="font-black text-5xl text-[#FF00F5]">{tickets.length}</div>
          </div>
        </div>
        <div className="absolute -bottom-1 right-0 w-32 h-1 bg-[#FF00F5]" />
      </div>

      {/* Mobile stats */}
      {tickets.length > 0 && (
        <div className="md:hidden flex items-center justify-between font-mono text-sm border-t-4 border-black pt-4">
          <span className="text-neutral-500">TOTAL TICKETS</span>
          <span className="font-bold text-[#FF00F5]">{tickets.length}</span>
        </div>
      )}

      {tickets.length === 0 ? (
        <div className="bg-neutral-100 border-4 border-black p-16 text-center">
          <div className="space-y-6">
            <div className="font-mono text-8xl font-bold text-neutral-300">00</div>
            <div>
              <h3 className="font-black text-3xl mb-2">NO TICKETS YET</h3>
              <p className="font-mono text-neutral-600 mb-4">
                You haven't purchased any tickets from the marketplace
              </p>
              <div className="font-mono text-sm text-neutral-500">
                Go to MARKETPLACE tab to browse and buy tickets
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets.map((ticket, index) => (
            <motion.div
              key={ticket.publicKey.toBase58()}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <NeoCard className="overflow-hidden">
                {/* Ticket Header */}
                <div className="bg-black p-4 border-b-4 border-black">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-xs text-neutral-500 mb-1">TICKET ID</div>
                      <div className="font-mono text-sm text-white">
                        {ticket.publicKey.toBase58().slice(0, 8)}...
                      </div>
                    </div>
                    <div className="bg-[#00FF41] border-2 border-white px-3 py-1">
                      <span className="font-mono text-xs font-bold text-black">ACTIVE</span>
                    </div>
                  </div>
                </div>

                {/* Ticket Body */}
                <div className="p-5 space-y-4">
                  {/* Event Info */}
                  <div>
                    <div className="font-mono text-xs text-neutral-500 mb-1">EVENT</div>
                    <div className="font-mono text-sm font-bold">
                      Event: {ticket.account.event.toBase58().slice(0, 8)}...
                    </div>
                  </div>

                  {/* Tier & Price */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="font-mono text-xs text-neutral-500 mb-1">TIER</div>
                      <div className="font-bold text-lg">TIER #{ticket.account.tierId}</div>
                    </div>
                    <div>
                      <div className="font-mono text-xs text-neutral-500 mb-1">PRICE PAID</div>
                      <div className="font-bold text-lg text-[#00FF41]">
                        {(Number(ticket.account.pricePaid) / 1e9).toFixed(2)} SOL
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowListModal({ ticket, eventPDA: ticket.account.event })}
                    className="w-full py-3 font-bold border-4 border-black bg-[#FF00F5] text-white hover:bg-black hover:border-white transition-colors"
                  >
                    LIST FOR SALE
                  </motion.button>
                </div>
              </NeoCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* List Ticket Modal */}
      <AnimatePresence>
        {showListModal && (
          <>
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              onClick={() => setShowListModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
            >
              <div className="bg-white border-4 border-black shadow-[16px_16px_0_0_#000000] max-w-md w-full p-6 pointer-events-auto">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-[#FF00F5] flex items-center justify-center">
                    <span className="text-white font-bold text-sm">SEL</span>
                  </div>
                  <h3 className="font-black text-2xl">LIST TICKET FOR SALE</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="font-mono text-sm font-bold mb-2 block">LIST PRICE (SOL)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={listPrice}
                      onChange={(e) => setListPrice(e.target.value)}
                      className="w-full bg-white border-4 border-black p-3 font-mono text-lg focus:outline-none focus:shadow-[8px_8px_0_0_#FF00F5] focus:-translate-y-1 focus:-translate-x-1 transition-all"
                    />
                  </div>

                  <div>
                    <label className="font-mono text-sm font-bold mb-2 block">DURATION (SECONDS)</label>
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full bg-white border-4 border-black p-3 font-mono text-lg focus:outline-none focus:shadow-[8px_8px_0_0_#FF00F5] focus:-translate-y-1 focus:-translate-x-1 transition-all"
                    />
                    <div className="font-mono text-xs text-neutral-500 mt-2">
                      1 hour = 3600s | 1 day = 86400s | 1 week = 604800s
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowListModal(null)}
                      disabled={listingLoading}
                      className="flex-1 py-3 font-bold border-4 border-black bg-neutral-200 text-black hover:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      CANCEL
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleListTicket}
                      disabled={listingLoading || parseFloat(listPrice) <= 0}
                      className="flex-1 py-3 font-bold border-4 border-black bg-[#00FF41] text-black hover:bg-[#FF00F5] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {listingLoading ? 'LISTING...' : 'LIST TICKET'}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
