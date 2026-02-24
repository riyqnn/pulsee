import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useAIAgent } from '../hooks/useAIAgent';
import { useProgram } from '../hooks/useProgram';
import type { AIAgent, ProgramAccount } from '../types/pulse';
import { supabase } from '../utils/supabase';

interface AgentsContextValue {
  // Data
  agents: ProgramAccount<AIAgent>[];
  missions: any[];
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
  activeMissionsCount: number;

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
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const AgentsProvider: React.FC<AgentsProviderProps> = ({ 
  children,
  autoRefresh = true,
  refreshInterval = 10000 
}) => {
  const { getUserAgents } = useAIAgent();
  const { publicKey, connection } = useProgram();
  
  const [agents, setAgents] = useState<ProgramAccount<AIAgent>[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  
  const subscriptionIdsRef = useRef<number[]>([]);

  // ==========================================
  // 1. CALCULATE DERIVED STATE (MEMOIZED)
  // ==========================================
  
  // Create Map for O(1) lookup
  const agentMap = useMemo(() => {
    const map = new Map<string, ProgramAccount<AIAgent>>();
    agents.forEach((agent) => {
      map.set(agent.account.agentId, agent);
      map.set(agent.publicKey.toBase58(), agent);
    });
    return map;
  }, [agents]);

  // Statistics Calculation
  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.account.isActive).length;
  
  const totalTicketsPurchased = useMemo(() => agents.reduce((sum, a) => {
    return sum + Number(a.account.ticketsPurchased.toString() || '0');
  }, 0), [agents]);

  const totalBudgetSpent = useMemo(() => agents.reduce((sum, a) => {
    return sum + (Number(a.account.spentBudget.toString() || '0') / 1e9);
  }, 0), [agents]);

  const totalMoneySaved = 0; // Standardize for MVP

  const activeMissionsCount = useMemo(() => 
    missions.filter(m => m.status === 'active').length, 
  [missions]);

  // ==========================================
  // 2. OPERATIONS
  // ==========================================

  const refresh = useCallback(async () => {
    if (!publicKey) {
      setAgents([]);
      setMissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch On-chain Agents
      const fetchedAgents = await getUserAgents();
      setAgents(fetchedAgents);

      // Fetch Off-chain Missions
      const { data: fetchedMissions, error: supabaseError } = await supabase
        .from('agent_missions')
        .select('*')
        .eq('agent_owner', publicKey.toBase58())
        .order('created_at', { ascending: false });
      
      if (supabaseError) throw supabaseError;
      setMissions(fetchedMissions || []);
      
      setLastUpdated(Date.now());
    } catch (err: any) {
      console.error("Refresh AgentsContext failed:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [publicKey, getUserAgents]);

  const getAgent = useCallback((agentId: string) => agentMap.get(agentId), [agentMap]);
  
  const getAgentByPubkey = useCallback((pubkey: PublicKey) => 
    agentMap.get(pubkey.toBase58()), [agentMap]
  );

  const getActiveAgents = useCallback(() => agents.filter((a) => a.account.isActive), [agents]);
  const getInactiveAgents = useCallback(() => agents.filter((a) => !a.account.isActive), [agents]);
  const getAgentsByOwner = useCallback((owner: PublicKey) => 
    agents.filter((a) => a.account.owner.equals(owner)), [agents]
  );

  // ==========================================
  // 3. LISTENERS & SYNC
  // ==========================================

  // Initial Load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh Interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => refresh(), refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh]);

  // Real-time Mission Monitoring (Supabase)
  useEffect(() => {
    if (!publicKey) return;

    const missionChannel = supabase
      .channel('mission-updates')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'agent_missions',
          filter: `agent_owner=eq.${publicKey.toBase58()}` 
        },
        () => {
          console.log("🔔 Mission update detected, syncing...");
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(missionChannel);
    };
  }, [publicKey, refresh]);

  // Real-time Account Monitoring (Solana WebSocket)
  useEffect(() => {
    if (!publicKey || !connection) return;

    const setupAccountMonitoring = async () => {
      try {
        const agentAccounts = await getUserAgents();
        const agentPubkeys = agentAccounts.map(a => a.publicKey);

        agentPubkeys.forEach(pubkey => {
          const subId = connection.onAccountChange(pubkey, () => refresh(), 'confirmed');
          subscriptionIdsRef.current.push(subId);
        });
      } catch (err) {
        console.error('Failed to setup account monitoring:', err);
      }
    };

    setupAccountMonitoring();

    return () => {
      subscriptionIdsRef.current.forEach(id => connection.removeAccountChangeListener(id));
      subscriptionIdsRef.current = [];
    };
  }, [publicKey, connection, getUserAgents, refresh]);

  // ==========================================
  // 4. PROVIDER VALUE
  // ==========================================

  const value: AgentsContextValue = {
    agents,
    missions,
    agentMap,
    loading,
    error,
    lastUpdated,
    totalAgents,
    activeAgents,
    totalTicketsPurchased,
    totalBudgetSpent,
    totalMoneySaved,
    activeMissionsCount,
    refresh,
    getAgent,
    getAgentByPubkey,
    getActiveAgents,
    getInactiveAgents,
    getAgentsByOwner,
  };

  return <AgentsContext.Provider value={value}>{children}</AgentsContext.Provider>;
};

export const useAgentsContext = (): AgentsContextValue => {
  const context = useContext(AgentsContext);
  if (!context) {
    throw new Error('useAgentsContext must be used within an AgentsProvider');
  }
  return context;
};