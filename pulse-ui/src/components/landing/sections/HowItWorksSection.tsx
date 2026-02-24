export const HowItWorksSection = () => {
  return (
    <section className="py-16 sm:py-24">
      <div className="container mx-auto px-6">
        <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-center mb-4">
          From Zero to Automated
        </h2>
        <p className="text-lg sm:text-xl text-center max-w-2xl mx-auto mb-16 sm:mb-20 text-gray-700">
          Getting started is simple. Follow these three steps to deploy your first
          agent and gain an immediate edge.
        </p>
        <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-12 font-mono">
          {/* Step 1 */}
          <div className="flex items-center flex-col text-center">
            <div className="bg-neo-green text-black w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center font-bold text-3xl sm:text-4xl border-4 border-black -rotate-6">
              1
            </div>
            <h3 className="text-xl font-bold my-4">Create Your Agent</h3>
            <p className="max-w-xs text-base sm:text-base">
              Give your AI agent a name and set its core parameters, like total budget and max price per ticket.
            </p>
          </div>

          <div className="w-12 h-1 sm:w-16 bg-black rotate-90 md:rotate-0" />

          {/* Step 2 */}
          <div className="flex items-center flex-col text-center">
            <div className="bg-neo-pink text-white w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center font-bold text-3xl sm:text-4xl border-4 border-black rotate-3">
              2
            </div>
            <h3 className="text-xl font-bold my-4">Fund the Escrow</h3>
            <p className="max-w-xs text-base sm:text-base">
              Create a dedicated, secure escrow account for your agent on Solana and deposit SOL to fund its operations.
            </p>
          </div>

          <div className="w-12 h-1 sm:w-16 bg-black rotate-90 md:rotate-0" />

          {/* Step 3 */}
          <div className="flex items-center flex-col text-center">
            <div className="bg-black text-white w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center font-bold text-3xl sm:text-4xl border-4 border-black -rotate-2">
              3
            </div>
            <h3 className="text-xl font-bold my-4">Deploy on a Mission</h3>
            <p className="max-w-xs text-base sm:text-base">
              Choose an event from the marketplace and assign your agent a mission with priority tiers and tactics.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};


