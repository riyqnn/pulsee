import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { NeoCard, NeoBadge } from '../neo';

interface DutchAuction {
  id: string;
  eventName: string;
  ticketId: string;
  startPrice: number;
  currentPrice: number;
  endPrice: number;
  startTime: number;
  endTime: number;
  expiresAt: number;
}

const mockAuctions: DutchAuction[] = [
  {
    id: '1',
    eventName: 'NEON NIGHTS FESTIVAL 2024',
    ticketId: 'TIER_VIP_001',
    startPrice: 3.0,
    currentPrice: 2.15,
    endPrice: 1.5,
    startTime: Date.now() - 3600000,
    endTime: Date.now() + 7200000,
    expiresAt: Date.now() + 7200000,
  },
  {
    id: '2',
    eventName: 'SYMPHONY OF CODE',
    ticketId: 'TIER_ORC_042',
    startPrice: 1.2,
    currentPrice: 0.95,
    endPrice: 0.8,
    startTime: Date.now() - 1800000,
    endTime: Date.now() + 5400000,
    expiresAt: Date.now() + 5400000,
  },
];

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
  const [auctions, setAuctions] = useState<DutchAuction[]>(mockAuctions);

  useEffect(() => {
    const interval = setInterval(() => {
      setAuctions((prev) =>
        prev.map((auction) => {
          const elapsed = Date.now() - auction.startTime;
          const duration = auction.endTime - auction.startTime;
          const priceDrop = auction.startPrice - auction.endPrice;
          const currentPrice = Math.max(
            auction.endPrice,
            auction.startPrice - (priceDrop * elapsed) / duration
          );

          return { ...auction, currentPrice };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display font-extrabold text-5xl">SECONDARY MARKET</h2>
        <NeoBadge variant="pink">DUTCH AUCTION</NeoBadge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {auctions.map((auction) => (
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
                  currentPrice={auction.currentPrice}
                  endPrice={auction.endPrice}
                />
              </div>

              <CountdownTimer expiresAt={auction.expiresAt} />

              <div className="grid grid-cols-2 gap-4 pt-4 border-t-4 border-neo-black">
                <div className="font-mono text-sm">
                  <span className="text-neo-pink">SAVED:</span>
                  <span className="font-bold text-neo-green ml-2">
                    {(auction.startPrice - auction.currentPrice).toFixed(2)} SOL
                  </span>
                </div>
                <div className="font-mono text-sm text-right">
                  <span className="text-neo-pink">DROP:</span>
                  <span className="font-bold ml-2">
                    {(((auction.startPrice - auction.currentPrice) / auction.startPrice) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 font-bold bg-neo-pink text-neo-white border-4 border-neo-black hover:bg-neo-green hover:text-neo-black transition-colors"
              >
                BUY @ {auction.currentPrice.toFixed(2)} SOL
              </motion.button>
            </div>
          </NeoCard>
        ))}
      </div>
    </motion.div>
  );
};
