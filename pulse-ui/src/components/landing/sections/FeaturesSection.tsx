import { Zap, ShieldCheck, Plane } from 'lucide-react';

export const FeaturesSection = () => {
  return (
    <section className="py-24 bg-black text-white overflow-hidden relative">
      {/* Decorative background text */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none select-none font-black text-[20vw] leading-none uppercase italic overflow-hidden whitespace-nowrap">
        NEURAL NET NEURAL NET NEURAL NET
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <h2 className="text-6xl sm:text-8xl font-black tracking-tighter text-center mb-6 uppercase italic">
          BEYOND TICKETING
        </h2>
        <p className="text-xl sm:text-3xl text-center max-w-4xl mx-auto mb-20 font-mono font-bold text-[#00FF41]">
          Pulse isn't just a marketplace. It's an automated ecosystem built on Solana.
        </p>
        
        <div className="grid md:grid-cols-3 gap-12">
          {/* Feature 1 */}
          <div className="bg-[#FF00F5] text-white border-8 border-white p-10 shadow-[16px_16px_0_0_#000] hover:shadow-none transition-all transform hover:translate-x-2 hover:translate-y-2">
            <div className="bg-white inline-block p-4 mb-6 border-4 border-black -rotate-12">
              <Zap className="w-12 h-12 text-[#FF00F5]" />
            </div>
            <h3 className="text-3xl font-black mb-4 uppercase italic">Agentic Speed</h3>
            <p className="font-mono font-bold text-lg leading-tight">
              AI agents operate on-chain, executing purchases at machine speed.
              Never lose to a bot again—deploy your own.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-[#00FF41] text-black border-8 border-black p-10 shadow-[16px_16px_0_0_#FF00F5] hover:shadow-none transition-all transform hover:translate-x-2 hover:translate-y-2">
            <div className="bg-black inline-block p-4 mb-6 border-4 border-white rotate-6">
              <ShieldCheck className="w-12 h-12 text-[#00FF41]" />
            </div>
            <h3 className="text-3xl font-black mb-4 uppercase italic">Secure Escrow</h3>
            <p className="font-mono font-bold text-lg leading-tight text-black/80">
              Non-custodial security. Your funds live in audited on-chain escrows.
              You maintain 100% control of your assets.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white text-black border-8 border-black p-10 shadow-[16px_16px_0_0_#FFEB3B] hover:shadow-none transition-all transform hover:translate-x-2 hover:translate-y-2">
            <div className="bg-[#FFEB3B] inline-block p-4 mb-6 border-4 border-black -rotate-3">
              <Plane className="w-12 h-12 text-black" />
            </div>
            <h3 className="text-3xl font-black mb-4 uppercase italic">Auto Logistics</h3>
            <p className="font-mono font-bold text-lg leading-tight">
              Pulse syncs with your Google Calendar and location to automatically 
              handle flight routing for every ticket you secure.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
