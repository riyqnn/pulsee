const faqData = [
  {
    question: 'What is Pulse?',
    answer: 'Pulse is a decentralized platform that allows users to deploy autonomous AI agents to acquire event tickets on the Solana blockchain. It aims to make ticket buying fairer and more efficient.',
  },
  {
    question: 'How do the AI agents work?',
    answer: 'You fund an agent with USDC, set your target event and price, and deploy it. The agent will then monitor the blockchain for the ticket sale and attempt to purchase it on your behalf based on your parameters.',
  },
  {
    question: 'Is it secure?',
    answer: 'Yes. Your funds are held in a decentralized escrow contract on Solana. You retain full control over your funds until a ticket is successfully purchased. The platform is non-custodial.',
  },
  {
    question: 'What is a secondary marketplace?',
    answer: 'If you miss the initial sale or wish to sell a ticket you acquired, you can use the secondary marketplace. Its a peer-to-peer market for trading tickets in a transparent way.',
  },
];

export const FaqSection = () => {
  return (
    <section className="py-20 sm:py-24">
      <div className="container mx-auto px-6">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-center mb-16">
          Frequently Asked Questions
        </h2>
        <div className="max-w-4xl mx-auto space-y-8">
          {faqData.map((item, index) => (
            <div key={index} className="bg-white border-4 border-black p-6 shadow-neo-sm">
              <h3 className="text-xl font-bold mb-3 text-neo-pink">{item.question}</h3>
              <p className="font-mono">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
