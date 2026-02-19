import { motion } from 'framer-motion';
import { NeoCard, NeoBadge } from '../neo';

interface EventCardProps {
  event: {
    id: string;
    name: string;
    venue: string;
    date: string;
    image: string;
    soldOut: boolean;
    ticketTiers: {
      name: string;
      price: number;
      available: number;
    }[];
  };
}

export const EventCard = ({ event }: EventCardProps) => {
  return (
    <NeoCard hover className="relative overflow-hidden group">
      {event.soldOut && (
        <div className="stamp-sold-out">
          <span className="stamp-text">SOLD OUT</span>
        </div>
      )}

      <div className="aspect-video bg-neo-black overflow-hidden border-b-4 border-neo-black">
        <img
          src={event.image}
          alt={event.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-display font-bold text-xl leading-tight">{event.name}</h3>
          {!event.soldOut && <NeoBadge variant="green">AVAILABLE</NeoBadge>}
        </div>

        <div className="space-y-1 font-mono text-sm mb-4">
          <div className="flex items-center gap-2">
            <span className="text-neo-pink">◆</span>
            <span>{event.venue}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-neo-pink">◆</span>
            <span>{event.date}</span>
          </div>
        </div>

        <div className="border-t-4 border-neo-black pt-3 space-y-2">
          {event.ticketTiers.map((tier, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between font-mono text-sm"
            >
              <span>{tier.name}</span>
              <span className="font-bold">
                {tier.price} SOL
                <span className="text-neo-pink ml-2">({tier.available} left)</span>
              </span>
            </div>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full mt-4 py-3 font-bold border-4 border-neo-black transition-all ${
            event.soldOut
              ? 'bg-neo-black text-neo-white cursor-not-allowed'
              : 'bg-neo-green hover:bg-neo-pink hover:text-neo-white'
          }`}
          disabled={event.soldOut}
        >
          {event.soldOut ? 'SOLD OUT' : 'VIEW TICKETS'}
        </motion.button>
      </div>
    </NeoCard>
  );
};
