export const HowItWorksSection = () => {
  return (
    <section className="py-20 sm:py-24">
      <div className="container mx-auto px-6">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-center mb-4">
          From Zero to Automated
        </h2>
        <p className="text-xl text-center max-w-2xl mx-auto mb-20 text-gray-700">
          Getting started is simple. Follow these three steps to deploy your first
          agent and gain an immediate edge.
        </p>
        <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16 font-mono">
          {/* Step 1 */}
          <div className="flex items-center flex-col text-center">
            <div className="bg-neo-green text-black w-20 h-20 flex items-center justify-center font-bold text-4xl border-4 border-black -rotate-6">
              1
            </div>
            <h3 className="text-xl font-bold my-4">Connect & Fund</h3>
            <p className="max-w-xs">
              Link your Solana wallet and deposit USDC into your personal, secure
              escrow account.
            </p>
          </div>

          <div className="w-16 h-1 bg-black rotate-90 md:rotate-0" />

          {/* Step 2 */}
          <div className="flex items-center flex-col text-center">
            <div className="bg-neo-pink text-white w-20 h-20 flex items-center justify-center font-bold text-4xl border-4 border-black rotate-3">
              2
            </div>
            <h3 className="text-xl font-bold my-4">Configure Agent</h3>
            <p className="max-w-xs">
              Choose your target event and set your parameters, like the maximum
              price you're willing to pay.
            </p>
          </div>

          <div className="w-16 h-1 bg-black rotate-90 md:rotate-0" />

          {/* Step 3 */}
          <div className="flex items-center flex-col text-center">
            <div className="bg-black text-white w-20 h-20 flex items-center justify-center font-bold text-4xl border-4 border-black -rotate-2">
              3
            </div>
            <h3 className="text-xl font-bold my-4">Deploy & Win</h3>
            <p className="max-w-xs">
              Unleash your agent. It will monitor the sale and execute the
              purchase the moment it begins.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
