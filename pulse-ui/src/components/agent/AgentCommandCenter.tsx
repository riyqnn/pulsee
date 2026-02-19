import { motion } from 'framer-motion';
import { NeoCard, NeoBadge } from '../neo';
import { LiveLog } from './LiveLog';
import { AgentSettings } from './AgentSettings';

export const AgentCommandCenter = () => {
  const agents = [
    { id: 'AGENT_01', status: 'active', tickets: 3, saved: '2.5 SOL' },
    { id: 'AGENT_02', status: 'active', tickets: 1, saved: '0.8 SOL' },
    { id: 'AGENT_03', status: 'warning', tickets: 0, saved: '0 SOL' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display font-extrabold text-5xl">AGENT COMMAND CENTER</h2>
        <NeoBadge variant="green">3 AGENTS ACTIVE</NeoBadge>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Agent Status Panel */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <NeoCard className="p-4">
            <h3 className="font-display font-bold text-xl mb-4 border-b-4 border-neo-black pb-2">
              AGENT STATUS
            </h3>
            <div className="space-y-3">
              {agents.map((agent) => (
                <motion.div
                  key={agent.id}
                  className="flex items-center justify-between p-3 border-4 border-neo-black bg-neo-gray"
                >
                  <div className="flex items-center gap-3">
                    <span className={`status-dot status-${agent.status}`} />
                    <span className="font-mono font-bold">{agent.id}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">{agent.tickets} tickets</div>
                    <div className="font-mono text-xs text-neo-green">{agent.saved}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </NeoCard>

          <NeoCard className="p-4">
            <h3 className="font-display font-bold text-xl mb-4 border-b-4 border-neo-black pb-2">
              STATISTICS
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between font-mono">
                <span>Total Purchases:</span>
                <span className="font-bold">47</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>Total Saved:</span>
                <span className="font-bold text-neo-green">12.3 SOL</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>Success Rate:</span>
                <span className="font-bold">94.2%</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>Active Events:</span>
                <span className="font-bold">8</span>
              </div>
            </div>
          </NeoCard>
        </div>

        {/* Live Log */}
        <div className="col-span-12 lg:col-span-5">
          <NeoCard className="h-full">
            <div className="border-b-4 border-neo-black p-4">
              <h3 className="font-display font-bold text-xl flex items-center gap-2">
                <span className="w-3 h-3 bg-neo-pink rounded-full animate-blink"></span>
                LIVE ACTIVITY LOG
              </h3>
            </div>
            <div className="p-4">
              <LiveLog />
            </div>
          </NeoCard>
        </div>

        {/* Settings */}
        <div className="col-span-12 lg:col-span-3">
          <AgentSettings />
        </div>
      </div>
    </motion.div>
  );
};
