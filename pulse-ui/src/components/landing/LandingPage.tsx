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
      className="bg-[#FFEB3B] font-display text-neo-black overflow-x-hidden relative"
    >
      {/* Background Grid Pattern (Vibe Coder Aesthetic) */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#0000001a_1px,transparent_1px),linear-gradient(to_bottom,#0000001a_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Grain Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-50 bg-grain" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b-8 border-black">
        <div className="container mx-auto px-6 py-6 flex justify-between items-center">
          <Link to="/" className="font-black text-5xl tracking-tighter italic uppercase">
            PULSE
          </Link>
          <div className="flex items-center gap-6">
            
            <Link
              to="/"
              className="hidden md:flex items-center gap-2 bg-[#FF00F5] text-white font-black uppercase border-4 border-black px-8 py-3 shadow-[6px_6px_0_0_#000000] hover:shadow-none hover:translate-y-1 hover:translate-x-1 transition-all"
            >
              <span>LAUNCH APP</span>
              <ArrowRight className="w-6 h-6" />
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
      <footer className="border-t-8 border-black bg-white p-10 mt-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-black text-2xl uppercase italic">PULSE PROTOCOL</div>
          
          {/* LINK WAJIB BUAT GOOGLE VERIFICATION */}
          <div className="flex gap-8 font-mono text-sm font-bold uppercase">
            <Link to="/privacy" className="hover:text-[#FF00F5] underline">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-[#FF00F5] underline">Terms of Service</Link>
          </div>

          <div className="font-mono text-xs text-neutral-500 uppercase">
            © 2026 Secured by Solana
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;