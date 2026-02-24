import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { NeoCard, NeoInput, NeoButton, NeoToggle } from '../neo';
import { useToast } from '../../contexts/ToastContext';
import { useAIAgent } from '../../hooks/useAIAgent';
import { useAgentsContext } from '../../contexts/AgentsContext';

interface AgentSettingsProps {
  onClose?: () => void;
}

// Menyesuaikan interface dengan logic Auto-ID
export interface AgentSettings {
  agentName: string;
  maxBudgetPerTicket: number;
  totalBudget: number;
  autoPurchaseEnabled: boolean;
  autoPurchaseThreshold: number;
}

export const AgentSettings = ({ onClose }: AgentSettingsProps) => {
  const { createAgent } = useAIAgent();
  const { addToast } = useToast();
  const { refresh } = useAgentsContext();
  const [loading, setLoading] = useState(false);
  
  // //UI MAS HEAD STYLE: Initial state
  const [settings, setSettings] = useState<AgentSettings>({
    agentName: '',
    maxBudgetPerTicket: 0.5,
    totalBudget: 1,
    autoPurchaseEnabled: true,
    autoPurchaseThreshold: 100,
  });

  const handleSave = useCallback(async () => {
    if (!settings.agentName) {
      addToast('Please provide an Agent Nickname', 'warning');
      return;
    }

    setLoading(true);
    try {
      /** * //LOGIC PUNYA LO: Auto-generate ID 
       * Pake format AGENT-timestamp biar unik
       */
      const autoAgentId = `AGENT-${Date.now()}`;

      // //LOGIC PUNYA LO: Kirim name & id ke Smart Contract
      const tx = await createAgent({
        agentId: autoAgentId,
        name: settings.agentName,
        maxBudgetPerTicket: Math.floor(settings.maxBudgetPerTicket * 1e9), // SOL to lamports
        totalBudget: Math.floor(settings.totalBudget * 1e9),
        autoPurchaseEnabled: settings.autoPurchaseEnabled,
        autoPurchaseThreshold: settings.autoPurchaseThreshold,
        maxTicketsPerEvent: 3 // Default limit safety
      });

      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Refresh global context
      await refresh();

      addToast(`Agent "${settings.agentName}" created successfully! ID: ${autoAgentId}`, 'success');

      // Reset form
      setSettings({
        agentName: '',
        maxBudgetPerTicket: 0.5,
        totalBudget: 1,
        autoPurchaseEnabled: true,
        autoPurchaseThreshold: 100,
      });

      onClose?.();
    } catch (error) {
      console.error('Failed to create agent:', error);
      addToast(`Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
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
        {/* //COPYWRITING MAS HEAD */}
        <h3 className="font-display font-bold text-2xl mb-6 flex items-center gap-3 uppercase">
          <span className="w-3 h-3 bg-neo-green rounded-full animate-pulse"></span>
          Create New Agent
        </h3>

        <div className="space-y-6">
          {/* //LOGIC PUNYA LO: Cukup input Nickname */}
          <NeoInput
            label="Agent Nickname"
            type="text"
            placeholder="e.g., Si Joki Konser"
            value={settings.agentName}
            onChange={(e) => setSettings({ ...settings, agentName: e.target.value })}
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

          {/* //COPYWRITING MAS HEAD: Automation Settings Section */}
          <div className="border-t-4 border-neo-black pt-4 mt-4">
            <h4 className="font-display font-bold text-lg mb-3 uppercase">Automation Settings</h4>
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
                <p className="font-mono text-[10px] text-gray-500 mt-2 uppercase italic leading-tight">
                  Agent will only auto-purchase tickets at or below this percentage of max budget
                </p>
              </div>
            )}
          </div>

          {/* //COPYWRITING MAS HEAD: Bullet points */}
          <div className="font-mono text-[10px] text-gray-500 border-t-2 border-neo-black pt-3 uppercase space-y-1">
            <p>• Agent will only buy tickets at or below max budget per ticket</p>
            <p>• Total budget is the lifetime spending limit</p>
            <p>• After creating, initialize an escrow and deposit SOL</p>
          </div>

          <NeoButton
            variant="primary"
            className="w-full font-bold uppercase tracking-widest"
            onClick={handleSave}
            disabled={loading || !settings.agentName}
          >
            {loading ? 'Birthing Agent...' : 'Create Agent'}
          </NeoButton>
        </div>
      </motion.div>
    </NeoCard>
  );
};