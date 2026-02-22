// AI Agent Settings Component
// Creates agents using the deployed contract's create_ai_agent instruction
// Only the 7 required fields from the deployed contract are collected

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { NeoCard, NeoInput, NeoToggle, NeoButton } from '../neo';
import { useAIAgent } from '../../hooks/useAIAgent';
import { useAgentsContext } from '../../contexts/AgentsContext';

interface AgentSettingsProps {
  onClose?: () => void;
}

// Agent settings that match the deployed contract's create_ai_agent instruction (7 args)
export interface AgentSettings {
  agentId: string;
  name: string;
  maxBudgetPerTicket: number;
  totalBudget: number;
  autoPurchaseEnabled: boolean;
  autoPurchaseThreshold: number;
  maxTicketsPerEvent: number;
}

export const AgentSettings = ({ onClose }: AgentSettingsProps) => {
  const { createAgent } = useAIAgent();
  const { refresh } = useAgentsContext();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<AgentSettings>({
    agentId: '',
    name: '',
    maxBudgetPerTicket: 0.5,
    totalBudget: 1,
    autoPurchaseEnabled: true,
    autoPurchaseThreshold: 90,
    maxTicketsPerEvent: 4,
  });

  const handleSave = useCallback(async () => {
    if (!settings.agentId || !settings.name) {
      alert('Please provide both Agent ID and Name');
      return;
    }

    setLoading(true);
    try {
      // Create the agent
      const tx = await createAgent({
        agentId: settings.agentId,
        name: settings.name,
        maxBudgetPerTicket: Math.floor(settings.maxBudgetPerTicket * 1e9), // Convert SOL to lamports
        totalBudget: Math.floor(settings.totalBudget * 1e9),
        autoPurchaseEnabled: settings.autoPurchaseEnabled,
        autoPurchaseThreshold: Math.floor(settings.autoPurchaseThreshold * 100), // Convert % to bps
        maxTicketsPerEvent: settings.maxTicketsPerEvent,
      });

      // Wait a bit for the transaction to be confirmed and account to be created
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Refresh the agent list
      await refresh();

      // Show success message
      alert(` Agent "${settings.name}" created successfully!\n\nTransaction: ${tx}`);

      // Reset form
      setSettings({
        agentId: '',
        name: '',
        maxBudgetPerTicket: 0.5,
        totalBudget: 1,
        autoPurchaseEnabled: true,
        autoPurchaseThreshold: 90,
        maxTicketsPerEvent: 4,
      });

      // Close modal if provided
      onClose?.();
    } catch (error) {
      console.error('Failed to create agent:', error);
      alert(`Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [settings, createAgent, refresh, onClose]);

  return (
    <NeoCard className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ staggerChildren: 0.1 }}
      >
        <h3 className="font-display font-bold text-2xl mb-6 flex items-center gap-3">
          <span className="w-3 h-3 bg-neo-green rounded-full animate-pulse"></span>
          CREATE NEW AGENT
        </h3>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <NeoInput
              label="Agent ID"
              type="text"
              placeholder="e.g., MY_AGENT_001"
              value={settings.agentId}
              onChange={(e) => setSettings({ ...settings, agentId: e.target.value })}
            />
            <NeoInput
              label="Agent Name"
              type="text"
              placeholder="e.g., Ticket Hunter"
              value={settings.name}
              onChange={(e) => setSettings({ ...settings, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <NeoInput
              label="Max Budget Per Ticket (SOL)"
              type="number"
              step="0.01"
              value={settings.maxBudgetPerTicket}
              onChange={(e) => setSettings({ ...settings, maxBudgetPerTicket: Number(e.target.value) })}
            />
            <NeoInput
              label="Total Budget (SOL)"
              type="number"
              step="0.01"
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

          <NeoToggle
            label="Auto-Purchase Enabled"
            checked={settings.autoPurchaseEnabled}
            onChange={(checked) => setSettings({ ...settings, autoPurchaseEnabled: checked })}
          />

          <NeoButton
            variant="primary"
            className="w-full"
            onClick={handleSave}
            disabled={loading || !settings.agentId || !settings.name}
          >
            {loading ? 'CREATING AGENT...' : 'CREATE AGENT'}
          </NeoButton>
        </div>
      </motion.div>
    </NeoCard>
  );
};
