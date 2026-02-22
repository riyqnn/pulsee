import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EventDetailModal } from './EventDetailModal';
import type { PublicKey } from '@solana/web3.js';

interface EventCardProps {
  event: {
    id: string;
    name: string;
    venue: string;
    date: string;
    image: string;
    soldOut: boolean;
    publicKey: PublicKey;
    ticketTiers: {
      name: string;
      tierId: string;
      price: number;
      available: number;
      maxSupply: number;
    }[];
  };
}

export const EventCard = ({ event }: EventCardProps) => {
  const [showModal, setShowModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const minPrice = Math.min(...event.ticketTiers.map(t => t.price));
  const maxPrice = Math.max(...event.ticketTiers.map(t => t.price));
  const totalAvailable = event.ticketTiers.reduce((sum, t) => sum + t.available, 0);
  const totalMaxSupply = event.ticketTiers.reduce((sum, t) => sum + t.maxSupply, 0);
  const sellPercentage = totalMaxSupply > 0 ? Math.round((1 - totalAvailable / totalMaxSupply) * 100) : 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={() => setShowModal(true)}
        className="relative group cursor-pointer"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {/* Main Card */}
        <div
          className={`relative bg-white border-4 border-black transition-all duration-200 ${
            isHovered ? 'shadow-[12px_12px_0_0_#FF00F5] -translate-y-1 -translate-x-1' : 'shadow-[8px_8px_0_0_#000000]'
          }`}
        >
          {/* SOLD OUT Overlay */}
          <AnimatePresence>
            {event.soldOut && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, rotate: -15 }}
                animate={{ opacity: 1, scale: 1, rotate: -15 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm"
              >
                <div className="border-8 border-[#FF00F5] bg-white px-8 py-4">
                  <span className="font-extrabold text-4xl text-black tracking-wider" style={{ textShadow: '4px 4px 0 #FF00F5' }}>
                    SOLD OUT
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Image Section */}
          <div className="relative aspect-[4/3] overflow-hidden border-b-4 border-black bg-neutral-900">
            <motion.img
              src={event.image}
              alt={event.name}
              className="w-full h-full object-cover"
              animate={{ scale: isHovered ? 1.1 : 1 }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            />
            {/* Diagonal Price Tag */}
            <div className="absolute top-0 right-0 bg-[#00FF41] border-b-4 border-l-4 border-black px-4 py-2">
              <span className="font-mono font-bold text-sm text-black">
                FROM {minPrice.toFixed(2)} SOL
              </span>
            </div>
            {/* Live Status Indicator */}
            {!event.soldOut && totalAvailable > 0 && (
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute top-4 left-4 flex items-center gap-2 bg-black/90 border-2 border-white px-3 py-1"
              >
                <div className="w-2 h-2 rounded-full bg-[#00FF41]" />
                <span className="font-mono text-xs text-white font-bold">LIVE</span>
              </motion.div>
            )}
          </div>

          {/* Content */}
          <div className="p-5">
            {/* Title Row */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <h3 className="font-extrabold text-2xl leading-tight flex-1">
                {event.name}
              </h3>
              {!event.soldOut && (
                <motion.div
                  animate={{ scale: isHovered ? 1.05 : 1 }}
                  className="flex-shrink-0 bg-black text-white px-3 py-1 border-2 border-black"
                >
                  <span className="font-mono text-sm font-bold">
                    {totalAvailable} LEFT
                  </span>
                </motion.div>
              )}
            </div>

            {/* Venue & Date - Industrial Layout */}
            <div className="space-y-2 mb-5 font-mono text-sm">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-[#FF00F5] flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">LOC</span>
                </div>
                <span className="text-black font-medium">{event.venue}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-[#FF00F5] flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">DAT</span>
                </div>
                <span className="text-black font-medium">{event.date}</span>
              </div>
            </div>

            {/* Progress Bar - Sell Through */}
            {!event.soldOut && totalMaxSupply > 0 && (
              <div className="mb-4">
                <div className="flex justify-between font-mono text-xs mb-1">
                  <span className="text-neutral-500">SELL THROUGH</span>
                  <span className="font-bold">{sellPercentage}%</span>
                </div>
                <div className="h-3 bg-neutral-200 border-2 border-black overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${sellPercentage}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="h-full bg-gradient-to-r from-[#00FF41] to-[#00cc33]"
                  />
                </div>
              </div>
            )}

            {/* Price & Tiers Info */}
            <div className="border-t-4 border-black pt-4 mb-4">
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div>
                  <span className="text-neutral-500 block mb-1">PRICE RANGE</span>
                  <span className="font-bold text-base">
                    {minPrice === maxPrice
                      ? `${minPrice.toFixed(2)} SOL`
                      : `${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)} SOL`
                    }
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block mb-1">AVAILABLE TIERS</span>
                  <span className="font-bold text-base">{event.ticketTiers.length}</span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-4 font-extrabold text-lg border-4 border-black transition-all duration-200 ${
                event.soldOut
                  ? 'bg-black text-white cursor-not-allowed'
                  : 'bg-[#00FF41] text-black hover:bg-[#FF00F5] hover:text-white'
              }`}
              disabled={event.soldOut}
            >
              {event.soldOut ? 'SOLD OUT' : 'VIEW TICKETS'}
            </motion.button>
          </div>
        </div>

        {/* Corner Accent on Hover */}
        {isHovered && !event.soldOut && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#FF00F5] border-2 border-black z-10"
          />
        )}
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <EventDetailModal
            event={event}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};
