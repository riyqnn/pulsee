// Agents Context Provider
// Provides global AI agents data and operations

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useAIAgent } from '../hooks/useAIAgent';
import { useProgram } from '../hooks/useProgram';
import type { AIAgent, ProgramAccount } from '../types/pulse';

interface AgentsContextValue {
  // Data
  agents: ProgramAccount<AIAgent>[];
  agentMap: Map<string, ProgramAccount<AIAgent>>;
  loading: boolean;
  error: Error | null;
  lastUpdated: number | null;

  // Statistics
  totalAgents: number;
  activeAgents: number;
  totalTicketsPurchased: number;
  totalBudgetSpent: number;
  totalMoneySaved: number;

  // Operations
  refresh: () => Promise<void>;
  getAgent: (agentId: string) => ProgramAccount<AIAgent> | undefined;
  getAgentByPubkey: (pubkey: PublicKey) => ProgramAccount<AIAgent> | undefined;

  // Filtering
  getActiveAgents: () => ProgramAccount<AIAgent>[];
  getInactiveAgents: () => ProgramAccount<AIAgent>[];
  getAgentsByOwner: (owner: PublicKey) => ProgramAccount<AIAgent>[];
}

const AgentsContext = createContext<AgentsContextValue | undefined>(undefined);

interface AgentsProviderProps {
  children: ReactNode;
  autoRefresh?: boolean; // Auto-refresh every 10 seconds
  refreshInterval?: number; // In milliseconds
}

export const AgentsProvider: React.FC<AgentsProviderProps> = ({
  children,
  autoRefresh = true,
  refreshInterval = 10000, // 10 seconds for faster updates
}) => {
  const { getUserAgents } = useAIAgent();
  const { publicKey, connection } = useProgram();
  const [agents, setAgents] = useState<ProgramAccount<AIAgent>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const subscriptionIdsRef = useRef<number[]>([]);

  // Convert agents array to a map for easy lookup
  const agentMap = useMemo(() => {
    const map = new Map<string, ProgramAccount<AIAgent>>();
    agents.forEach((agent) => {
      map.set(agent.account.agentId, agent);
      map.set(agent.publicKey.toBase58(), agent);
    });
    return map;
  }, [agents]);

  // Calculate statistics with safe number conversion
  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.account.isActive).length;
  
  const totalTicketsPurchased = useMemo(() => agents.reduce((sum, a) => {
    // FIXED: Konversi ke String dulu baru ke Number biar ga overflow
    const tickets = Number(a.account.ticketsPurchased.toString() || '0');
    return sum + tickets;
  }, 0), [agents]);

  const totalBudgetSpent = useMemo(() => agents.reduce((sum, a) => {
    // FIXED: Bagi 1e9 (lamports to SOL) setelah jadi string
    const spent = Number(a.account.spentBudget.toString() || '0') / 1e9;
    return sum + spent;
  }, 0), [agents]);
  // moneySaved removed in simplified MVP
  const totalMoneySaved = 0;

  /**
   * Refresh all agents
   */
  const refresh = useCallback(async () => {
    if (!publicKey) {
      setAgents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fetchedAgents = await getUserAgents();
      setAgents(fetchedAgents);
      setLastUpdated(Date.now());
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [publicKey, getUserAgents]);

  /**
   * Get an agent by its agent ID
   */
  const getAgent = useCallback(
    (agentId: string): ProgramAccount<AIAgent> | undefined => {
      return agentMap.get(agentId);
    },
    [agentMap]
  );

  /**
   * Get an agent by its public key
   */
  const getAgentByPubkey = useCallback(
    (pubkey: PublicKey): ProgramAccount<AIAgent> | undefined => {
      return agentMap.get(pubkey.toBase58());
    },
    [agentMap]
  );

  /**
   * Get all active agents
   */
  const getActiveAgents = useCallback((): ProgramAccount<AIAgent>[] => {
    return agents.filter((a) => a.account.isActive);
  }, [agents]);

  /**
   * Get all inactive agents
   */
  const getInactiveAgents = useCallback((): ProgramAccount<AIAgent>[] => {
    return agents.filter((a) => !a.account.isActive);
  }, [agents]);

  /**
   * Get agents by owner
   */
  const getAgentsByOwner = useCallback(
    (owner: PublicKey): ProgramAccount<AIAgent>[] => {
      return agents.filter((a) => a.account.owner.equals(owner));
    },
    [agents]
  );

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh]);

  // Real-time monitoring via WebSocket
  useEffect(() => {
    if (!publicKey || !connection) return;

    const setupAccountMonitoring = async () => {
      try {
        // Get all agent accounts
        const agentAccounts = await getUserAgents();
        const agentPubkeys = agentAccounts.map(a => a.publicKey);

        // Subscribe to account changes
        agentPubkeys.forEach(pubkey => {
          const subscriptionId = connection.onAccountChange(
            pubkey,
            (_accountInfo) => {
              // Refresh all agents when any agent changes
              refresh();
            },
            'confirmed'
          );
          subscriptionIdsRef.current.push(subscriptionId);
        });
      } catch (err) {
        console.error('Failed to setup account monitoring:', err);
      }
    };

    setupAccountMonitoring();

    // Cleanup subscriptions on unmount or when publicKey changes
    return () => {
      subscriptionIdsRef.current.forEach(id => {
        connection.removeAccountChangeListener(id);
      });
      subscriptionIdsRef.current = [];
    };
  }, [publicKey, connection, getUserAgents, refresh]);

  const value: AgentsContextValue = {
    // Data
    agents,
    agentMap,
    loading,
    error,
    lastUpdated,

    // Statistics
    totalAgents,
    activeAgents,
    totalTicketsPurchased,
    totalBudgetSpent,
    totalMoneySaved,

    // Operations
    refresh,
    getAgent,
    getAgentByPubkey,

    // Filtering
    getActiveAgents,
    getInactiveAgents,
    getAgentsByOwner,
  };

  return <AgentsContext.Provider value={value}>{children}</AgentsContext.Provider>;
};

// ============== Hook ==============

export const useAgentsContext = (): AgentsContextValue => {
  const context = useContext(AgentsContext);

  if (!context) {
    throw new Error('useAgentsContext must be used within an AgentsProvider');
  }

  return context;
};
