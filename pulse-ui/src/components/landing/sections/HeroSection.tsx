import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

// Marquee component remains the same
const Marquee = () => (
  <div className="absolute inset-x-0 bottom-0 sm:bottom-10 h-16 bg-neo-pink border-y-4 border-black flex items-center overflow-hidden z-20">
    <motion.div
      className="flex whitespace-nowrap"
      animate={{ x: ['0%', '-100%'] }} // Corrected direction for natural left scroll
      transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
    >
      {[...Array(8)].map((_, i) => (
        <span key={i} className="font-mono text-xl sm:text-2xl font-bold text-white px-8">
          • NEVER MISS A DROP • SECURE YOUR SEAT • DEPLOY THE BOTS •
        </span>
      ))}
    </motion.div>
  </div>
);

// New component for the animated grid background
const DotGrid = () => {
  return (
    <div className="absolute inset-0 z-0">
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-black rounded-full"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: 1 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: 'loop',
            delay: Math.random() * 5,
          }}
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
        />
      ))}
    </div>
  );
};

// Main Hero Section Component - More GACOR version
export const HeroSection = () => {
  const headlineText = "Stop Racing Bots. Deploy Your Own.";
  const words = headlineText.split(" ");

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const wordVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section className="relative h-[90vh] sm:h-screen flex items-center justify-center overflow-hidden bg-[#FFFDFA]">
      <DotGrid />

      {/* MORE Decorative, animated blocks */}
      <motion.div className="absolute top-5 left-5 w-24 h-24 sm:w-40 sm:h-40 bg-neo-green border-4 border-black z-10" animate={{ y: [0, -25, 0], x: [0, 10, 0], rotate: [0, 15, 0] }} transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute bottom-1/4 right-5 w-20 h-20 sm:w-28 sm:h-28 bg-black z-10" animate={{ y: [0, 20, 0], rotate: [0, -20, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 1 }} />
      <motion.div className="absolute top-1/2 left-1/4 w-12 h-12 sm:w-16 sm:h-16 bg-white border-4 border-black z-10" animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }} />
      <motion.div className="hidden sm:block absolute bottom-10 left-10 w-20 h-20 bg-neo-yellow border-4 border-black z-10" animate={{ x: [0, 30, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 3 }} />


      <motion.div
        className="relative container mx-auto px-4 text-center z-10"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
      >
        <div className="bg-white border-4 border-black shadow-[12px_12px_0_0_#000000] p-6 sm:p-10 max-w-4xl mx-auto">
          <motion.h1
            className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tighter mb-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {words.map((word, index) => (
              <motion.span
                key={index}
                variants={wordVariants}
                className={`inline-block mr-3 ${word === "Own." ? "bg-neo-pink text-white px-4 -skew-x-6" : ""}`}
              >
                {word}
              </motion.span>
            ))}
          </motion.h1>
          <p className="text-base sm:text-xl md:text-2xl max-w-2xl mx-auto mb-8 text-gray-800 font-mono">
            Pulse gives you the power of AI agents to secure tickets on Solana—seamlessly and autonomously.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-3 bg-neo-green text-neo-black font-bold border-4 border-neo-black px-6 py-3 sm:px-8 sm:py-4 text-lg sm:text-xl shadow-[6px_6px_0_0_#000] hover:shadow-none transition-all transform hover:-translate-y-1 hover:-translate-x-1"
          >
            <span>Enter App & Deploy</span>
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </Link>
        </div>
      </motion.div>

      <Marquee />
    </section>
  );
};
