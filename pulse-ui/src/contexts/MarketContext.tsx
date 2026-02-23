// Market Context Provider - REMOVED in MVP
// Secondary market is removed from simplified contract

import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

interface MarketContextValue {
  // All stubbed
  listings: any[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const MarketContext = createContext<MarketContextValue | undefined>(undefined);

interface MarketProviderProps {
  children: ReactNode;
}

export const MarketProvider: React.FC<MarketProviderProps> = ({ children }) => {
  const value: MarketContextValue = {
    listings: [],
    loading: false,
    refresh: async () => {
      throw new Error('Secondary market not available in MVP');
    },
  };

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
};

export const useMarketContext = (): MarketContextValue => {
  const context = useContext(MarketContext);

  if (!context) {
    throw new Error('useMarketContext must be used within a MarketProvider');
  }

  return context;
};
