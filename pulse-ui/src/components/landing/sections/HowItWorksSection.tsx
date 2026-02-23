export const HowItWorksSection = () => {
  return (
    <section className="py-20 sm:py-24">
      <div className="container mx-auto px-6">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-center mb-16">
          Three Steps to Glory
        </h2>
        <div className="relative grid md:grid-cols-3 gap-8 font-mono">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-black hidden md:block" />
          <div className="relative bg-white border-4 border-black p-8 shadow-neo z-10">
            <div className="absolute -top-6 -left-4 bg-neo-green text-black w-12 h-12 flex items-center justify-center font-bold text-2xl border-4 border-black">1</div>
            <h3 className="text-xl font-bold mb-2 mt-4">Connect Wallet</h3>
            <p>Link your Solana wallet to get started in seconds.</p>
          </div>
          <div className="relative bg-white border-4 border-black p-8 shadow-neo z-10">
            <div className="absolute -top-6 -left-4 bg-neo-pink text-white w-12 h-12 flex items-center justify-center font-bold text-2xl border-4 border-black">2</div>
            <h3 className="text-xl font-bold mb-2 mt-4">Fund Your Agent</h3>
            <p>Deposit USDC into a secure escrow to fund your AI agent.</p>
          </div>
          <div className="relative bg-white border-4 border-black p-8 shadow-neo z-10">
            <div className="absolute -top-6 -left-4 bg-neo-black text-white w-12 h-12 flex items-center justify-center font-bold text-2xl border-4 border-black">3</div>
            <h3 className="text-xl font-bold mb-2 mt-4">Deploy & Relax</h3>
            <p>Set your target, deploy your agent, and let it do the work.</p>
          </div>
        </div>
      </div>
    </section>
  );
};
