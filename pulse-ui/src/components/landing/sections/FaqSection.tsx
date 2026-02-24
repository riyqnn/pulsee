import { FaqItem } from './FaqItem';

const faqData = [
  {
    question: 'What is Pulse?',
    answer: 'Pulse is a decentralized, AI-powered platform on the Solana blockchain. It gives users an edge by deploying autonomous software agents to monitor and acquire event tickets the instant they go on sale, aiming to make ticket buying fairer and more efficient for everyone.',
  },
  {
    question: 'How do the AI agents actually work?',
    answer: 'You deposit USDC into a secure on-chain escrow, configure your agent with parameters (e.g., event, max price), and deploy it. The agent, a smart program, then watches the blockchain for the ticket sale to begin and executes the purchase automatically if your conditions are met.',
  },
  {
    question: 'Is this secure? Where do my funds go?',
    answer: 'Pulse is non-custodial and built for security. Your funds are held in a decentralized escrow contract on Solana, not by us. You retain full control and can withdraw your funds at any time before a purchase is made. The entire process is transparent on the blockchain.',
  },
  {
    question: 'What happens if an agent fails to get a ticket?',
    answer: 'While our agents give you a significant advantage, success isn\'t always guaranteed in high-demand sales. If your agent is unsuccessful, your funds remain securely in the escrow, and you can either withdraw them or redeploy the agent for a different event or the secondary market.',
  },
  {
    question: 'What can I do on the secondary marketplace?',
    answer: 'The secondary market is a peer-to-peer exchange for tickets acquired through the platform. If you miss an initial sale, you can buy tickets from other users. If you can no longer attend an event, you can list your ticket for sale.',
  },
];

export const FaqSection = () => {
  return (
    <section className="py-20 sm:py-24">
      <div className="container mx-auto px-6">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-center mb-4">
          Your Questions, Answered
        </h2>
        <p className="text-xl text-center max-w-2xl mx-auto mb-16 text-gray-700">
          Got questions? We've got answers. Here's a rundown of the most common
          inquiries we get about the Pulse protocol.
        </p>
        <div className="max-w-4xl mx-auto bg-white border-4 border-black shadow-neo">
          {faqData.map((item, index) => (
            <FaqItem key={index} question={item.question} answer={item.answer} />
          ))}
        </div>
      </div>
    </section>
  );
};
