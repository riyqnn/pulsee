import { motion } from 'framer-motion';

export const HeroSection = () => {
  return (
    <section className="relative py-20 sm:py-32 overflow-hidden">
      {/* Decorative, animated blocks */}
      <motion.div
        className="absolute top-10 left-10 w-32 h-32 bg-neo-pink border-4 border-black"
        animate={{
          y: [0, -20, 0],
          rotate: [0, 10, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-40 h-40 bg-neo-green border-4 border-black"
        animate={{
          y: [0, 20, 0],
          x: [0, -10, 0],
          rotate: [0, -5, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
      />
       <motion.div
        className="absolute top-1/2 left-1/4 w-20 h-20 bg-white border-4 border-black"
        animate={{
          y: [0, 15, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
      />


      <div className="relative container mx-auto px-6 text-center z-10">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-6">
          The Future of Event Ticketing is{' '}
          <span className="bg-neo-pink text-white px-4 -skew-x-6 inline-block">
            Autonomous
          </span>
          .
        </h1>
        <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-12 text-gray-700">
          Stop racing against bots. Deploy your own. Pulse gives you the power of
          AI agents to secure tickets on Solana—seamlessly and securely.
        </p>
        <div className="inline-block bg-neo-green p-2 shadow-neo">
          <div className="bg-neo-black text-white p-4 border-4 border-neo-black">
            <p className="font-mono text-lg">
              Never miss a drop again.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
