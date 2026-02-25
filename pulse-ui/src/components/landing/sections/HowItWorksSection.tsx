export const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <h2 className="text-6xl sm:text-8xl font-black tracking-tighter text-center mb-6 uppercase italic">
          The Pulse Flow
        </h2>
        <p className="text-xl sm:text-2xl text-center max-w-3xl mx-auto mb-20 font-mono font-bold text-neutral-600">
          From creation to arrival, Pulse automates every step of the journey.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 font-mono">
          {/* Step 1 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-black translate-x-3 translate-y-3 group-hover:translate-x-5 group-hover:translate-y-5 transition-transform" />
            <div className="relative bg-[#00FF41] border-4 border-black p-8 h-full flex flex-col items-center text-center">
              <div className="bg-white text-black w-16 h-16 flex items-center justify-center font-black text-4xl border-4 border-black mb-6 -rotate-6">
                1
              </div>
              <h3 className="text-2xl font-black mb-4 uppercase">Create Event</h3>
              <p className="text-sm font-bold leading-relaxed">
                Organizers deploy smart contracts with tiered pricing and verified metadata on Solana.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-black translate-x-3 translate-y-3 group-hover:translate-x-5 group-hover:translate-y-5 transition-transform" />
            <div className="relative bg-[#FF00F5] text-white border-4 border-black p-8 h-full flex flex-col items-center text-center">
              <div className="bg-black text-white w-16 h-16 flex items-center justify-center font-black text-4xl border-4 border-black mb-6 rotate-3">
                2
              </div>
              <h3 className="text-2xl font-black mb-4 uppercase">Deploy Agent</h3>
              <p className="text-sm font-bold leading-relaxed">
                Users arm AI agents with budget and strategies to snipe tickets from the primary market.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-black translate-x-3 translate-y-3 group-hover:translate-x-5 group-hover:translate-y-5 transition-transform" />
            <div className="relative bg-[#FFEB3B] text-black border-4 border-black p-8 h-full flex flex-col items-center text-center">
              <div className="bg-white text-black w-16 h-16 flex items-center justify-center font-black text-4xl border-4 border-black mb-6 -rotate-2">
                3
              </div>
              <h3 className="text-2xl font-black mb-4 uppercase">Secure Ticket</h3>
              <p className="text-sm font-bold leading-relaxed">
                Agents execute on-chain transactions to mint verified NFT tickets instantly.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-black translate-x-3 translate-y-3 group-hover:translate-x-5 group-hover:translate-y-5 transition-transform" />
            <div className="relative bg-black text-[#00FF41] border-4 border-black p-8 h-full flex flex-col items-center text-center">
              <div className="bg-[#00FF41] text-black w-16 h-16 flex items-center justify-center font-black text-4xl border-4 border-black mb-6 rotate-6">
                4
              </div>
              <h3 className="text-2xl font-black mb-4 uppercase">AI Logistics</h3>
              <p className="text-sm font-bold leading-relaxed">
                Pulse syncs with your calendar and location to automatically book flight logistics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};


