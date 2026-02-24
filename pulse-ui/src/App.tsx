import { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentCommandCenter } from './components/agent';
import { MarketplaceGrid, SecondaryMarket } from './components/marketplace';
import { MyTickets } from './components/MyTickets';
import { WalletButton } from './components/WalletButton';
import { AgentsProvider, useAgentsContext } from './contexts/AgentsContext';
import { EventsProvider } from './contexts/EventsContext';
import { MarketProvider } from './contexts/MarketContext';
import { useProgram } from './hooks/useProgram';
import LandingPage from './components/landing/LandingPage';

type Tab = 'agents' | 'marketplace' | 'secondary' | 'tickets';

function MainApp() {
  const [activeTab, setActiveTab] = useState<Tab>('agents');
  const { connectionStatus, programId, publicKey } = useProgram();
  const { activeAgents } = useAgentsContext();

  const tabs: { id: Tab; label: string; count?: string | number }[] = [
    { id: 'agents', label: 'AGENT COMMAND', count: activeAgents },
    { id: 'marketplace', label: 'MARKETPLACE' },
    { id: 'secondary', label: 'SECONDARY', count: 'LIVE' },
    { id: 'tickets', label: 'MY TICKETS' },
  ];

  const getTabClass = (isActive: boolean) => `
    relative px-6 py-3 font-display font-bold text-lg border-4 transition-all
    ${isActive
      ? 'bg-[#00FF41] border-black shadow-[4px_4px_0px_0px_#000000] -translate-y-1 -translate-x-1'
      : 'bg-white border-black hover:bg-[#F5F5F5]'
    }
  `;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-neo-white)' }}>
      {/* Grain overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04] z-50"
        style={{
          backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22 opacity=%221%22/%3E%3C/svg%3E')"
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b-4 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <Link to="/home" className="font-display font-extrabold text-4xl sm:text-5xl tracking-tighter">
                PULSE
              </Link>
              <span className="hidden sm:inline-block font-mono text-sm bg-black text-white px-3 py-1 border-2 border-black">
                v1.0.0
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <WalletButton />
            </motion.div>
          </div>
        </div>
      </header>

      {/* Navigation */}
     <nav className="bg-white border-b-4 border-black sticky top-[76px] z-30 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-4 py-5 px-6 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={getTabClass(activeTab === tab.id)}
                whileHover={activeTab === tab.id ? {} : { 
                  scale: 1.02,
                  shadow: "4px 4px 0px 0px #000000" 
                }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="flex items-center gap-3">
                  <span className="tracking-tighter uppercase">{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="font-mono text-[10px] bg-black text-white px-2 py-0.5 border-2 border-black shadow-[2px_2px_0px_0px_#FF00F5]">
                      {tab.count}
                    </span>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'agents' && <AgentCommandCenter />}
            {activeTab === 'marketplace' && <MarketplaceGrid />}
            {activeTab === 'secondary' && <SecondaryMarket />}
            {activeTab === 'tickets' && publicKey && (
              <MyTickets ownerPublicKey={publicKey} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-black mt-12 py-8 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="font-display font-bold text-xl mb-4">PULSE PROTOCOL</h4>
              <p className="font-mono text-sm" style={{ color: 'var(--color-neo-green)' }}>
                Autonomous AI-powered ticket acquisition on Solana
              </p>
            </div>
            <div>
              <h4 className="font-display font-bold text-xl mb-4">CONTRACTS</h4>
              <div className="font-mono text-xs space-y-1">
                <p style={{ color: 'var(--color-neo-pink)' }}>Program ID:</p>
                <p className="break-all">{programId?.toBase58().slice(0, 8)}...{programId?.toBase58().slice(-8)}</p>
              </div>
            </div>
            <div>
              <h4 className="font-display font-bold text-xl mb-4">NETWORK</h4>
              <p className="font-mono text-sm">Solana Devnet</p>
              {connectionStatus && (
                <div className="flex items-center gap-2 mt-2">
                  <span className={`w-2 h-2 rounded-full ${connectionStatus.connected ? 'bg-neo-green' : 'bg-neo-pink'}`} />
                  <span className="font-mono text-xs">{connectionStatus.connected ? 'Connected' : 'Disconnected'}</span>
                </div>
              )}
              {connectionStatus?.slot && (
                <p className="font-mono text-xs mt-1">Slot: {connectionStatus.slot.toLocaleString()}</p>
              )}
            </div>
          </div>
          <div className="border-t-2 border-white mt-8 pt-8 text-center font-mono text-xs">
            <p>BUILT WITH ANCHOR • REACT • SOLANA</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainApp />} />
      <Route path="/home" element={<LandingPage />} />
    </Routes>
  );
}

export default App;
