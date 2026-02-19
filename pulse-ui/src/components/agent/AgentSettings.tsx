import { useState } from 'react';
import { motion } from 'framer-motion';
import { NeoCard, NeoInput, NeoToggle, NeoButton } from '../neo';

interface AgentSettingsProps {
  onSave?: (settings: AgentSettings) => void;
}

export interface AgentSettings {
  maxBudgetPerTicket: number;
  totalBudget: number;
  autoPurchaseEnabled: boolean;
  autoPurchaseThreshold: number;
  maxTicketsPerEvent: number;
  requireVerification: boolean;
  allowCoordination: boolean;
}

export const AgentSettings = ({ onSave }: AgentSettingsProps) => {
  const [settings, setSettings] = useState<AgentSettings>({
    maxBudgetPerTicket: 5,
    totalBudget: 50,
    autoPurchaseEnabled: true,
    autoPurchaseThreshold: 90,
    maxTicketsPerEvent: 4,
    requireVerification: false,
    allowCoordination: true,
  });

  const handleSave = () => {
    onSave?.(settings);
  };

  return (
    <NeoCard className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ staggerChildren: 0.1 }}
      >
        <h3 className="font-display font-bold text-2xl mb-6 flex items-center gap-3">
          <span className="w-3 h-3 bg-neo-green rounded-full animate-pulse"></span>
          AGENT CONFIGURATION
        </h3>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <NeoInput
              label="Max Budget Per Ticket (SOL)"
              type="number"
              value={settings.maxBudgetPerTicket}
              onChange={(e) => setSettings({ ...settings, maxBudgetPerTicket: Number(e.target.value) })}
            />
            <NeoInput
              label="Total Budget (SOL)"
              type="number"
              value={settings.totalBudget}
              onChange={(e) => setSettings({ ...settings, totalBudget: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <NeoInput
              label="Purchase Threshold (%)"
              type="number"
              value={settings.autoPurchaseThreshold}
              onChange={(e) => setSettings({ ...settings, autoPurchaseThreshold: Number(e.target.value) })}
            />
            <NeoInput
              label="Max Tickets Per Event"
              type="number"
              value={settings.maxTicketsPerEvent}
              onChange={(e) => setSettings({ ...settings, maxTicketsPerEvent: Number(e.target.value) })}
            />
          </div>

          <div className="border-t-4 border-neo-black pt-6 space-y-4">
            <h4 className="font-display font-bold text-lg">PREFERENCE FLAGS</h4>

            <NeoToggle
              label="Auto-Purchase"
              checked={settings.autoPurchaseEnabled}
              onChange={(checked) => setSettings({ ...settings, autoPurchaseEnabled: checked })}
            />

            <NeoToggle
              label="Require Verification"
              checked={settings.requireVerification}
              onChange={(checked) => setSettings({ ...settings, requireVerification: checked })}
            />

            <NeoToggle
              label="Allow Agent Coordination"
              checked={settings.allowCoordination}
              onChange={(checked) => setSettings({ ...settings, allowCoordination: checked })}
            />
          </div>

          <NeoButton
            variant="primary"
            className="w-full"
            onClick={handleSave}
          >
            SAVE CONFIGURATION
          </NeoButton>
        </div>
      </motion.div>
    </NeoCard>
  );
};
