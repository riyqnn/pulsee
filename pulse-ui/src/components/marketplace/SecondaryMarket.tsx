import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { NeoCard, NeoBadge } from '../neo';
import { useMarketContext } from '../../contexts/MarketContext';
import { useSecondaryMarket } from '../../hooks/useSecondaryMarket';
import { useEventsContext } from '../../contexts/EventsContext';
import { getSaleTypeString } from '../../types/pulse';

const CountdownTimer = ({ expiresAt }: { expiresAt: number }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(expiresAt));

  function calculateTimeLeft(expiresAt: number) {
    return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(expiresAt));
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="flex gap-2 items-center">
      <span className="font-mono text-sm">EXPIRES IN:</span>
      <div className="flex gap-1">
        <span className="countdown-digit text-2xl">{String(hours).padStart(2, '0')}</span>
        <span className="font-mono text-2xl">:</span>
        <span className="countdown-digit text-2xl">{String(minutes).padStart(2, '0')}</span>
        <span className="font-mono text-2xl">:</span>
        <span className="countdown-digit text-2xl">{String(seconds).padStart(2, '0')}</span>
      </div>
    </div>
  );
};

const PriceDecayChart = ({ startPrice, currentPrice, endPrice }: { startPrice: number; currentPrice: number; endPrice: number }) => {
  const progress = ((startPrice - currentPrice) / (startPrice - endPrice)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between font-mono text-sm">
        <span>Start: {startPrice} SOL</span>
        <span className="text-neo-green font-bold">{currentPrice.toFixed(2)} SOL</span>
        <span>End: {endPrice} SOL</span>
      </div>
      <div className="h-4 bg-neo-white border-4 border-neo-black relative overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
          className="h-full bg-neo-green absolute top-0 left-0"
        />
      </div>
      <div className="text-center font-mono text-xs text-neo-pink">
        {progress.toFixed(1)}% TO FLOOR PRICE
      </div>
    </div>
  );
};

export const SecondaryMarket = () => {
  const { activeListings, loading } = useMarketContext();
  const { getCurrentPrice } = useSecondaryMarket();
  const { getEventByPubkey } = useEventsContext();

  // Convert listings to auction format
  const auctions = activeListings
    .filter((listing) => {
      const saleType = getSaleTypeString(listing.account.saleType);
      return saleType === 'Dutch';
    })
    .map((listing) => {
      const event = getEventByPubkey(listing.account.event);
      return {
        id: listing.account.listingId,
        eventName: event?.account.name || 'Unknown Event',
        ticketId: listing.account.tierId,
        startPrice: Number(listing.account.maxPrice) / 1e9,
        currentPrice: getCurrentPrice(listing.account),
        endPrice: Number(listing.account.minPrice) / 1e9,
        startTime: Number(listing.account.createdAt) * 1000,
        endTime: Number(listing.account.expiresAt) * 1000,
        expiresAt: Number(listing.account.expiresAt) * 1000,
        publicKey: listing.publicKey,
        listing: listing.account,
      };
    });

  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      const newPrices: Record<string, number> = {};
      auctions.forEach((auction) => {
        newPrices[auction.id] = getCurrentPrice(auction.listing);
      });
      setCurrentPrices(newPrices);
    }, 1000);

    return () => clearInterval(interval);
  }, [auctions, getCurrentPrice]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display font-extrabold text-5xl">SECONDARY MARKET</h2>
        <NeoBadge variant="pink">{auctions.length} DUTCH AUCTIONS</NeoBadge>
      </div>

      {loading ? (
        <div className="text-center py-12 font-mono">Loading listings...</div>
      ) : auctions.length === 0 ? (
        <div className="text-center py-12 font-mono">No active Dutch auctions</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {auctions.map((auction) => {
            const currentPrice = currentPrices[auction.id] || auction.currentPrice;
            const savings = auction.startPrice - currentPrice;
            const drop = ((auction.startPrice - currentPrice) / auction.startPrice) * 100;

            return (
              <NeoCard key={auction.id} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display font-bold text-xl">{auction.eventName}</h3>
                      <p className="font-mono text-sm text-neo-pink">{auction.ticketId}</p>
                    </div>
                    <NeoBadge variant="pink">LIVE</NeoBadge>
                  </div>

                  <div className="border-y-4 border-neo-black py-4">
                    <PriceDecayChart
                      startPrice={auction.startPrice}
                      currentPrice={currentPrice}
                      endPrice={auction.endPrice}
                    />
                  </div>

                  <CountdownTimer expiresAt={auction.expiresAt} />

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t-4 border-neo-black">
                    <div className="font-mono text-sm">
                      <span className="text-neo-pink">SAVED:</span>
                      <span className="font-bold text-neo-green ml-2">
                        {savings.toFixed(2)} SOL
                      </span>
                    </div>
                    <div className="font-mono text-sm text-right">
                      <span className="text-neo-pink">DROP:</span>
                      <span className="font-bold ml-2">{drop.toFixed(1)}%</span>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 font-bold bg-neo-pink text-neo-white border-4 border-neo-black hover:bg-neo-green hover:text-neo-black transition-colors"
                  >
                    BUY @ {currentPrice.toFixed(2)} SOL
                  </motion.button>
                </div>
              </NeoCard>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
