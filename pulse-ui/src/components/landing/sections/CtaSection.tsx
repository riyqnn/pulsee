import { WalletButton } from '../../WalletButton';

export const CtaSection = () => {
  return (
    <section className="bg-neo-green py-20 sm:py-24 border-y-4 border-black">
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-black mb-6">
          Ready to Join the Revolution?
        </h2>
        <p className="text-xl md:text-2xl max-w-2xl mx-auto mb-10 text-black">
          Connect your wallet and deploy your first agent today. Stop missing
          out. Start winning.
        </p>
        <WalletButton />
      </div>
    </section>
  );
};
