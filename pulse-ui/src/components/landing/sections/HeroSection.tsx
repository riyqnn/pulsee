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
  const headlineText = "Event Ticketing. Reimagined by AI.";
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
    <section className="relative h-[90vh] sm:h-screen flex items-center justify-center overflow-hidden bg-[#FFEB3B]">
      <DotGrid />

      {/* MORE Decorative, animated blocks */}
      <motion.div className="absolute top-10 right-10 w-32 h-32 sm:w-56 sm:h-56 bg-[#FF00F5] border-8 border-black z-10 shadow-[16px_16px_0_0_#000000]" animate={{ y: [0, -40, 0], x: [0, 20, 0], rotate: [0, -15, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute bottom-20 left-10 w-24 h-24 sm:w-48 sm:h-48 bg-[#00FF41] border-8 border-black z-10 shadow-[12px_12px_0_0_#000000]" animate={{ y: [0, 30, 0], rotate: [0, 20, 0] }} transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 1 }} />
      <motion.div className="absolute top-1/4 left-5 w-16 h-16 sm:w-24 sm:h-24 bg-white border-4 border-black z-10" animate={{ scale: [1, 1.3, 1], rotate: [0, 180, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }} />


      <motion.div
        className="relative container mx-auto px-4 text-center z-10"
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
      >
        <div className="bg-white border-8 border-black shadow-[32px_32px_0_0_#000000] p-8 sm:p-16 max-w-5xl mx-auto transform -rotate-1">
          <motion.h1
            className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter mb-6 leading-none uppercase italic"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {words.map((word, index) => (
              <motion.span
                key={index}
                variants={wordVariants}
                className={`inline-block mr-4 ${word === "AI." ? "bg-[#FF00F5] text-white px-6 skew-x-12 shadow-[8px_8px_0_0_#000]" : ""}`}
              >
                {word}
              </motion.span>
            ))}
          </motion.h1>
          <p className="text-xl sm:text-2xl md:text-3xl max-w-3xl mx-auto mb-10 text-black font-mono font-bold leading-tight">
            The first decentralized protocol that automates your entire event experience—from ticket sniping to flight logistics.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-3 bg-[#00FF41] text-black font-black border-4 border-black px-10 py-5 text-xl sm:text-2xl shadow-[8px_8px_0_0_#000] hover:shadow-none transition-all transform hover:-translate-y-1 hover:-translate-x-1"
            >
              <span>LAUNCH APP</span>
              <ArrowRight className="w-6 h-6 sm:w-8 h-8" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-3 bg-white text-black font-black border-4 border-black px-10 py-5 text-xl sm:text-2xl shadow-[8px_8px_0_0_#000] hover:shadow-none transition-all transform hover:-translate-y-1 hover:-translate-x-1"
            >
              <span>LEARN FLOW</span>
            </a>
          </div>
        </div>
      </motion.div>

      <Marquee />
    </section>
  );
};
