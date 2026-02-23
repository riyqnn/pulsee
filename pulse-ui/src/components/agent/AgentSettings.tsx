// AI Agent Settings Component - Simplified MVP
// Creates agents using the simplified create_ai_agent instruction

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { NeoCard, NeoInput, NeoButton, NeoToggle } from '../neo';
import { useAIAgent } from '../../hooks/useAIAgent';
import { useAgentsContext } from '../../contexts/AgentsContext';

interface AgentSettingsProps {
  onClose?: () => void;
}

// Simplified agent settings - matches new contract
export interface AgentSettings {
  agentId: string;
  maxBudgetPerTicket: number;
  totalBudget: number;
  autoPurchaseEnabled: boolean;
  autoPurchaseThreshold: number;
}

export const AgentSettings = ({ onClose }: AgentSettingsProps) => {
  const { createAgent } = useAIAgent();
  const { refresh } = useAgentsContext();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<AgentSettings>({
    agentId: '',
    maxBudgetPerTicket: 0.5,
    totalBudget: 1,
    autoPurchaseEnabled: false,
    autoPurchaseThreshold: 100,
  });

  const handleSave = useCallback(async () => {
    if (!settings.agentId) {
      alert('Please provide an Agent ID');
      return;
    }

    setLoading(true);
    try {
      // Create the agent - simplified version
      const tx = await createAgent({
        agentId: settings.agentId,
        maxBudgetPerTicket: Math.floor(settings.maxBudgetPerTicket * 1e9), // Convert SOL to lamports
        totalBudget: Math.floor(settings.totalBudget * 1e9),
      });

      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Refresh the agent list
      await refresh();

      // Show success message
      alert(`Agent "${settings.agentId}" created successfully!\n\nTransaction: ${tx}`);

      // Reset form
      setSettings({
        agentId: '',
        maxBudgetPerTicket: 0.5,
        totalBudget: 1,
        autoPurchaseEnabled: false,
        autoPurchaseThreshold: 100,
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
          <NeoInput
            label="Agent ID"
            type="text"
            placeholder="e.g., MY_AGENT_001"
            value={settings.agentId}
            onChange={(e) => setSettings({ ...settings, agentId: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <NeoInput
              label="Max Budget Per Ticket (SOL)"
              type="number"
              step="0.01"
              min="0"
              value={settings.maxBudgetPerTicket}
              onChange={(e) => setSettings({ ...settings, maxBudgetPerTicket: Number(e.target.value) })}
            />
            <NeoInput
              label="Total Budget (SOL)"
              type="number"
              step="0.01"
              min="0"
              value={settings.totalBudget}
              onChange={(e) => setSettings({ ...settings, totalBudget: Number(e.target.value) })}
            />
          </div>

          {/* Automation Settings Section */}
          <div className="border-t-4 border-neo-black pt-4 mt-4">
            <h4 className="font-display font-bold text-lg mb-3">AUTOMATION SETTINGS</h4>
            <NeoToggle
              label="Enable Auto-Purchase"
              checked={settings.autoPurchaseEnabled}
              onChange={(checked) => setSettings({ ...settings, autoPurchaseEnabled: checked })}
            />
            {settings.autoPurchaseEnabled && (
              <div className="mt-4">
                <NeoInput
                  label="Auto-Purchase Threshold (%)"
                  type="number"
                  step="1"
                  min="1"
                  max="100"
                  value={settings.autoPurchaseThreshold}
                  onChange={(e) => setSettings({ ...settings, autoPurchaseThreshold: Number(e.target.value) })}
                  placeholder="e.g., 100"
                />
                <p className="font-mono text-xs text-gray-500 mt-2">
                  Agent will only auto-purchase tickets at or below this percentage of max budget
                </p>
              </div>
            )}
          </div>

          <div className="font-mono text-xs text-gray-500 border-t-2 border-neo-black pt-3">
            <p>• Agent will only buy tickets at or below max budget per ticket</p>
            <p>• Total budget is the lifetime spending limit</p>
            <p>• After creating, create an escrow and deposit SOL</p>
          </div>

          <NeoButton
            variant="primary"
            className="w-full"
            onClick={handleSave}
            disabled={loading || !settings.agentId}
          >
            {loading ? 'CREATING AGENT...' : 'CREATE AGENT'}
          </NeoButton>
        </div>
      </motion.div>
    </NeoCard>
  );
};
