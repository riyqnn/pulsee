import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EventDetailModal } from './EventDetailModal';
import type { PublicKey } from '@solana/web3.js';

// Generate ticket SVG for preview
const generateTicketSVG = (
  eventName: string,
  venue: string,
  date: string,
  tierId: string
): string => {
  const ticketId = Math.random().toString(36).substring(2, 10).toUpperCase();

  const svg = `
    <svg width="500" height="300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient-${ticketId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#000000;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1" />
        </linearGradient>
        <pattern id="noise-${ticketId}" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="#ffffff" opacity="0.03"/>
        </pattern>
      </defs>

      <!-- Background -->
      <rect width="500" height="300" fill="url(#bgGradient-${ticketId})"/>
      <rect width="500" height="300" fill="url(#noise-${ticketId})"/>

      <!-- Border -->
      <rect x="2" y="2" width="496" height="296" fill="none" stroke="#00FF41" stroke-width="2"/>
      <rect x="6" y="6" width="488" height="288" fill="none" stroke="#FF00F5" stroke-width="1"/>

      <!-- Header Section -->
      <rect x="0" y="0" width="500" height="60" fill="#000000"/>
      <line x1="0" y1="60" x2="500" y2="60" stroke="#00FF41" stroke-width="2"/>

      <!-- Pulse Protocol Logo/Text -->
      <text x="30" y="40" font-family="Arial, sans-serif" font-weight="900" font-size="20" fill="#ffffff">PULSE</text>
      <text x="100" y="40" font-family="Arial, sans-serif" font-weight="300" font-size="16" fill="#00FF41">PROTOCOL</text>
      <text x="380" y="40" font-family="monospace" font-size="12" fill="#FF00F5" text-anchor="end">OFFICIAL TICKET</text>

      <!-- Event Name -->
      <text x="250" y="100" font-family="Arial, sans-serif" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle">${eventName}</text>

      <!-- Ticket Details -->
      <g transform="translate(50, 140)">
        <!-- Venue -->
        <text x="0" y="0" font-family="monospace" font-size="12" fill="#00FF41">VENUE</text>
        <text x="0" y="20" font-family="Arial, sans-serif" font-weight="700" font-size="16" fill="#ffffff">${venue}</text>

        <!-- Date -->
        <text x="200" y="0" font-family="monospace" font-size="12" fill="#00FF41">DATE</text>
        <text x="200" y="20" font-family="Arial, sans-serif" font-weight="700" font-size="16" fill="#ffffff">${date}</text>

        <!-- Tier Badge -->
        <rect x="350" y="-5" width="80" height="30" fill="#FF00F5"/>
        <text x="390" y="16" font-family="Arial, sans-serif" font-weight="900" font-size="14" fill="#000000" text-anchor="middle">${tierId.toUpperCase()}</text>
      </g>

      <!-- Divider -->
      <line x1="40" y1="180" x2="460" y2="180" stroke="#333333" stroke-width="1"/>

      <!-- Footer Section with Ticket ID -->
      <g transform="translate(50, 220)">
        <text x="0" y="0" font-family="monospace" font-size="10" fill="#888888">TICKET ID</text>
        <text x="0" y="20" font-family="monospace" font-size="14" fill="#00FF41">${ticketId}</text>

        <text x="350" y="0" font-family="monospace" font-size="10" fill="#888888">STATUS</text>
        <text x="350" y="20" font-family="monospace" font-size="14" fill="#ffffff">PREVIEW</text>
      </g>

      <!-- Verification Badge -->
      <circle cx="250" cy="270" r="20" fill="#000000" stroke="#00FF41" stroke-width="2"/>
      <text x="250" y="275" font-family="Arial" font-weight="900" font-size="16" fill="#00FF41" text-anchor="middle">✓</text>

      <!-- Corner Accents -->
      <rect x="2" y="2" width="10" height="10" fill="#FF00F5"/>
      <rect x="488" y="2" width="10" height="10" fill="#FF00F5"/>
      <rect x="2" y="288" width="10" height="10" fill="#FF00F5"/>
      <rect x="488" y="288" width="10" height="10" fill="#FF00F5"/>
    </svg>
  `;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

// Ticket Preview Modal Component
const TicketPreviewModal = ({ event, onClose }: { event: EventCardProps['event']; onClose: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 bg-white text-black px-6 py-3 border-4 border-black font-black font-mono text-sm hover:bg-[#FF00F5] hover:text-white transition-colors"
        >
          CLOSE
        </button>

        {/* Preview Label */}
        <div className="bg-[#00FF41] border-4 border-black px-4 py-2 inline-block mb-4 shadow-[2px_2px_0_0_#000000]">
          <span className="font-mono font-bold text-sm">NFT TICKET PREVIEW</span>
        </div>

        {/* Ticket Display */}
        <div className="bg-white border-8 border-black shadow-[16px_16px_0_0_#000000] overflow-hidden">
          {/* Ticket Image */}
          <div className="relative aspect-[5/3] bg-black">
            <img
              src={generateTicketSVG(event.name, event.venue, event.date, event.ticketTiers[0]?.tierId || 'VIP')}
              alt={`${event.name} Ticket Preview`}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
              <h2 className="font-black text-4xl md:text-5xl uppercase italic leading-none text-white drop-shadow-lg">
                {event.name}
              </h2>
            </div>
          </div>

          {/* Preview Info */}
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-[#00FF41] rounded-full animate-pulse" />
              <span className="font-mono text-sm font-bold text-[#FF00F5] uppercase tracking-widest">Pulse Protocol Verified Asset</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between border-b-2 border-gray-200 pb-2">
                  <span className="text-neutral-500">Event</span>
                  <span className="font-bold">{event.name}</span>
                </div>
                <div className="flex justify-between border-b-2 border-gray-200 pb-2">
                  <span className="text-neutral-500">Venue</span>
                  <span className="font-bold">{event.venue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Date</span>
                  <span className="font-bold">{event.date}</span>
                </div>
              </div>

              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between border-b-2 border-gray-200 pb-2">
                  <span className="text-neutral-500">Available Tiers</span>
                  <span className="font-bold">{event.ticketTiers.length}</span>
                </div>
                <div className="flex justify-between border-b-2 border-gray-200 pb-2">
                  <span className="text-neutral-500">Price Range</span>
                  <span className="font-bold">
                    {Math.min(...event.ticketTiers.map(t => t.price)).toFixed(2)} - {Math.max(...event.ticketTiers.map(t => t.price)).toFixed(2)} SOL
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Status</span>
                  <span className="font-bold bg-[#00FF41] text-black px-3 py-1 text-xs">
                    AVAILABLE
                  </span>
                </div>
              </div>
            </div>

            {/* Tier Previews */}
            <div>
              <h3 className="font-display font-bold text-lg uppercase border-b-4 border-black pb-2 mb-4">Available Tiers</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {event.ticketTiers.map((tier) => (
                  <div key={tier.tierId} className="border-4 border-black p-4 bg-neutral-50 shadow-[2px_2px_0_0_#000000]">
                    <div className="text-[10px] text-neutral-500 uppercase font-mono mb-1">TIER</div>
                    <div className="font-bold text-xl mb-2">{tier.name}</div>
                    <div className="text-[10px] text-neutral-500 uppercase font-mono mb-1">PRICE</div>
                    <div className="font-mono font-bold">{tier.price.toFixed(2)} SOL</div>
                    <div className="text-[10px] text-neutral-500 uppercase font-mono mt-2 mb-1">AVAILABLE</div>
                    <div className="font-mono text-sm">{tier.available} / {tier.maxSupply}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="bg-neutral-100 border-4 border-black p-4 font-mono text-xs">
              <p className="text-neutral-600">
                <span className="font-bold">NOTE:</span> This is a preview of what your NFT ticket will look like after purchase.
                Actual NFT will have unique ticket ID and blockchain verification.
              </p>
            </div>

            {/* Action Button */}
            <button
              onClick={() => {
                onClose();
                // Open the actual detail modal
              }}
              className="w-full border-4 border-black bg-[#00FF41] py-4 font-black font-bold text-lg hover:bg-[#FF00F5] hover:text-white transition-colors"
            >
              PURCHASE TICKETS
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

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
  const [showTicketPreview, setShowTicketPreview] = useState(false);
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

            {/* Venue & Date - Simple Text Layout */}
            <div className="space-y-2 mb-5 font-mono text-sm">
              <div className="text-neutral-600">
                <span className="text-neutral-500 uppercase">Location:</span>{' '}
                <span className="text-black font-medium">{event.venue}</span>
              </div>
              <div className="text-neutral-600">
                <span className="text-neutral-500 uppercase">Date:</span>{' '}
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

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTicketPreview(true);
                }}
                className="py-3 font-extrabold text-sm border-4 border-black transition-all duration-200 bg-white text-black hover:bg-[#FF00F5] hover:text-white"
              >
                PREVIEW TICKET
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`py-3 font-extrabold text-sm border-4 border-black transition-all duration-200 ${
                  event.soldOut
                    ? 'bg-black text-white cursor-not-allowed'
                    : 'bg-[#00FF41] text-black hover:bg-[#FF00F5] hover:text-white'
                }`}
                disabled={event.soldOut}
              >
                {event.soldOut ? 'SOLD OUT' : 'BUY TICKETS'}
              </motion.button>
            </div>
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
        {showTicketPreview && (
          <TicketPreviewModal
            event={event}
            onClose={() => setShowTicketPreview(false)}
          />
        )}
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
