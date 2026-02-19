import { motion } from 'framer-motion';
import { EventCard } from './EventCard';

const mockEvents = [
  {
    id: '1',
    name: 'NEON NIGHTS FESTIVAL 2024',
    venue: 'Cyber Arena, Tokyo',
    date: '2024-08-15 20:00',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
    soldOut: false,
    ticketTiers: [
      { name: 'General Admission', price: 0.5, available: 234 },
      { name: 'VIP Access', price: 1.2, available: 45 },
      { name: 'Backstage Pass', price: 2.5, available: 8 },
    ],
  },
  {
    id: '2',
    name: 'SYMPHONY OF CODE',
    venue: 'Opera House, Singapore',
    date: '2024-09-01 19:30',
    image: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800',
    soldOut: true,
    ticketTiers: [
      { name: 'Balcony', price: 0.3, available: 0 },
      { name: 'Orchestra', price: 0.8, available: 0 },
    ],
  },
  {
    id: '3',
    name: 'TECH UNLEASHED SUMMIT',
    venue: 'Convention Center, Seoul',
    date: '2024-10-12 09:00',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    soldOut: false,
    ticketTiers: [
      { name: 'Early Bird', price: 0.15, available: 156 },
      { name: 'Regular', price: 0.25, available: 412 },
      { name: 'All Access', price: 0.5, available: 78 },
    ],
  },
];

export const MarketplaceGrid = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display font-extrabold text-5xl">ON-CHAIN MARKETPLACE</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockEvents.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <EventCard event={event} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
