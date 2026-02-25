import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { WalletButton } from '../WalletButton';
import {
  CtaSection,
  FaqSection,
  FeaturesSection,
  HeroSection,
  HowItWorksSection,
} from './sections';

const LandingPage = () => {
  return (
    <div
      className="bg-[#FFFDFA] font-display text-neo-black overflow-x-hidden"
      style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0)',
        backgroundSize: '20px 20px',
      }}
    >
      {/* Grain Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-50 bg-grain" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b-4 border-black">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="font-extrabold text-4xl tracking-tighter">
            PULSE
          </Link>
          <div className="flex items-center gap-4">
            
            <Link
              to="/"
              className="hidden sm:flex items-center gap-2 bg-[#00FF41] text-black font-black uppercase border-4 border-black px-6 py-2 shadow-[4px_4px_0_0_#000000] hover:shadow-none hover:translate-y-1 hover:translate-x-1 transition-all"
            >
              <span>Launch App</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            
            <WalletButton />
          </div>
        </div>
      </header>

      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <FaqSection />
        <CtaSection />
      </main>

      {/* Footer */}
      <footer className="bg-black text-white py-12 border-t-8 border-[#00FF41]">
        <div className="container mx-auto px-6 text-center font-mono">
          <p className="text-4xl font-black mb-2 italic">PULSE</p>
          <p className="text-[#00FF41] font-bold uppercase tracking-widest">
            Decentralized Agentic Ticketing on Solana.
          </p>
          <p className="mt-8 text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Pulse Protocol. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;