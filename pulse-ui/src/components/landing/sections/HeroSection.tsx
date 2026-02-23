export const HeroSection = () => {
  return (
    <section className="py-20 sm:py-32">
      <div className="container mx-auto px-6 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-4">
          The Future of Event Ticketing.
        </h1>
        <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-8 text-gray-700">
          Autonomous AI agents securing tickets for you on Solana. Seamless,
          secure, and brutally efficient.
        </p>
        <div className="inline-block bg-neo-pink p-2 shadow-neo">
          <div className="bg-white p-2 border-4 border-black">
            <p className="font-mono text-lg">
              Never miss out on an event again.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
