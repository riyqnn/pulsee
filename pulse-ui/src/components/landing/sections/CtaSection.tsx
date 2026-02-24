import { WalletButton } from '../../WalletButton';

export const CtaSection = () => {
  return (
    <section className="bg-neo-green py-20 sm:py-24 border-y-4 border-black">
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-black mb-6">
          Stop Competing. Start Dominating.
        </h2>
        <p className="text-xl md:text-2xl max-w-2xl mx-auto mb-10 text-black">
          The queue is for humans. Your AI agent doesn't wait. Connect your
          wallet and deploy your first agent in under a minute.
        </p>
        <WalletButton />
      </div>
    </section>
  );
};
