import { FaqItem } from './FaqItem';

const faqData = [
  {
    question: 'What is Pulse?',
    answer: 'Pulse is a decentralized, AI-powered platform on the Solana blockchain. It gives users an edge by deploying autonomous software agents to monitor and acquire event tickets the instant they go on sale, aiming to make ticket buying fairer and more efficient for everyone.',
  },
  {
    question: 'How do the AI agents actually work?',
    answer: 'You create an agent, fund its dedicated on-chain escrow with SOL, and assign it a "mission" for a specific event. You define the strategy (like ticket tiers and quantity). The agent then executes this mission on-chain, purchasing tickets automatically based on your rules.',
  },
  {
    question: 'Is this secure? Where do my funds go?',
    answer: 'Pulse is non-custodial and built for security. Your funds are held in a decentralized escrow contract on Solana, not by us. You retain full control and can withdraw your SOL at any time. The entire process is transparent on the blockchain.',
  },
  {
    question: 'What happens if an agent fails its mission?',
    answer: 'While our agents give you a significant advantage, success isn\'t always guaranteed in high-demand sales. If your agent is unsuccessful, your funds remain securely in the escrow, and you can either withdraw them or redeploy the agent for a different event or the secondary market.',
  },
  {
    question: 'What is the "Turbo" mode?',
    answer: 'Turbo mode is an aggressive strategy for highly anticipated events. When enabled, your agent will submit transactions more frequently and rapidly to maximize its chances of success, though this may result in higher network fees. Use it wisely for drops you can\'t afford to miss.',
  },
];

export const FaqSection = () => {
  return (
    <section className="py-16 sm:py-24">
      <div className="container mx-auto px-6">
        <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-center mb-4">
          Your Questions, Answered
        </h2>
        <p className="text-lg sm:text-xl text-center max-w-2xl mx-auto mb-12 sm:mb-16 text-gray-700">
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
