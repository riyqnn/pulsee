import { Zap, ShieldCheck, Ticket } from 'lucide-react';

export const FeaturesSection = () => {
  return (
    <section className="py-20 sm:py-24 bg-white border-y-4 border-black">
      <div className="container mx-auto px-6">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-center mb-16">
          Why Pulse?
        </h2>
        <div className="grid md:grid-cols-3 gap-12">
          <div className="bg-neo-gray border-4 border-black p-8 shadow-neo-sm">
            <Zap className="w-12 h-12 text-neo-pink mb-4" />
            <h3 className="text-2xl font-bold mb-2">AI-Powered Agents</h3>
            <p className="font-mono">
              Deploy autonomous agents that monitor and purchase tickets the
              moment they become available.
            </p>
          </div>
          <div className="bg-neo-gray border-4 border-black p-8 shadow-neo-sm">
            <ShieldCheck className="w-12 h-12 text-neo-green mb-4" />
            <h3 className="text-2xl font-bold mb-2">Decentralized & Secure</h3>
            <p className="font-mono">
              Built on Solana. Your assets are secure in a decentralized
              escrow, fully under your control.
            </p>
          </div>
          <div className="bg-neo-gray border-4 border-black p-8 shadow-neo-sm">
            <Ticket className="w-12 h-12 text-neo-black mb-4" />
            <h3 className="text-2xl font-bold mb-2">Secondary Marketplace</h3>
            <p className="font-mono">
              Missed the primary sale? Buy and sell tickets on a transparent
              and fair secondary market.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
