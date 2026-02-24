import { Zap, ShieldCheck, Ticket } from 'lucide-react';

export const FeaturesSection = () => {
  return (
    <section className="py-20 sm:py-24 bg-black text-white border-y-4 border-black">
      <div className="container mx-auto px-6">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-center mb-4">
          A Brutally Unfair Advantage
        </h2>
        <p className="text-xl text-center max-w-3xl mx-auto mb-16 text-gray-400">
          Pulse isn't just another tool. It's a new weapon in your arsenal, built with three core principles.
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white text-black border-4 border-black p-8 shadow-neo-sm hover:shadow-neo transition-shadow transform hover:-translate-y-1">
            <div className="bg-neo-pink inline-block p-3 mb-4 border-4 border-black">
              <Zap className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Speed & Autonomy</h3>
            <p className="font-mono">
              AI agents operate on-chain, executing purchases at machine speed.
              Set your strategy, deploy, and let the agent do the work.
            </p>
          </div>
          <div className="bg-white text-black border-4 border-black p-8 shadow-neo-sm hover:shadow-neo transition-shadow transform hover:-translate-y-1">
            <div className="bg-neo-green inline-block p-3 mb-4 border-4 border-black">
              <ShieldCheck className="w-10 h-10 text-black" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Security & Control</h3>
            <p className="font-mono">
              Non-custodial by design. Your funds live in a secure escrow on
              Solana, and you always have the final say.
            </p>
          </div>
          <div className="bg-white text-black border-4 border-black p-8 shadow-neo-sm hover:shadow-neo transition-shadow transform hover:-translate-y-1">
            <div className="bg-black inline-block p-3 mb-4 border-4 border-black">
              <Ticket className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Market Access</h3>
            <p className="font-mono">
              Seamlessly transition from primary sales to a transparent,
              on-chain secondary market to buy or sell tickets.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
