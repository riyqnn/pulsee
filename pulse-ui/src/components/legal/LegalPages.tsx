import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const LegalLayout = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="min-h-screen bg-[#FFFDFA] p-8 font-mono">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto bg-white border-8 border-black p-8 shadow-[16px_16px_0_0_#000000]"
    >
      <Link to="/home" className="inline-block mb-8 bg-black text-white px-4 py-2 font-black uppercase hover:bg-[#FF00F5] transition-colors">
        {"<"} Back to Home
      </Link>
      <h1 className="text-5xl font-black uppercase italic mb-8 border-b-8 border-black pb-4">{title}</h1>
      <div className="space-y-6 text-lg leading-relaxed">
        {children}
      </div>
    </motion.div>
  </div>
);

export const PrivacyPolicy = () => (
  <LegalLayout title="Privacy Policy">
    <p className="bg-[#00FF41] p-4 border-4 border-black font-bold">
      Pulse Protocol collects your email and calendar data solely to provide automated ticketing services.
    </p>
    <p>1. <strong>Data Collection:</strong> We access your Google Calendar data (read-only) to identify scheduling conflicts.</p>
    <p>2. <strong>Data Usage:</strong> Your data is used only for AI-agent reasoning. We do not store your full calendar history.</p>
    <p>3. <strong>Sharing:</strong> We do not share your personal data with third parties.</p>
    <p className="italic text-sm mt-8 border-t-4 border-black pt-4 text-neutral-500 underline">Last Updated: February 2026</p>
  </LegalLayout>
);

export const TermsOfService = () => (
  <LegalLayout title="Terms of Service">
    <p className="bg-[#FFEB3B] p-4 border-4 border-black font-bold">
      By using Pulse, you authorize our AI Agents to scan your calendar for scheduling conflicts.
    </p>
    <p>1. <strong>Agent Authority:</strong> You authorize Pulse AI Agents to execute transactions on your behalf using your escrowed funds.</p>
    <p>2. <strong>Responsibility:</strong> Pulse is not responsible for ticket availability or third-party airline schedule changes.</p>
    <p>3. <strong>Instant Settlement:</strong> All ticket sales on Solana are final and settled on-chain.</p>
    <p className="italic text-sm mt-8 border-t-4 border-black pt-4 text-neutral-500 underline">Last Updated: February 2026</p>
  </LegalLayout>
);