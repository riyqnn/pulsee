// Market Context Provider
// Provides marketplace data with real-time updates

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useSecondaryMarket } from '../hooks/useSecondaryMarket';
import { getTimeRemaining } from '../utils/accounts';
import type { MarketListing, ProgramAccount } from '../types/pulse';

interface MarketContextValue {
  // Data
  listings: ProgramAccount<MarketListing>[];
  activeListings: ProgramAccount<MarketListing>[];
  listingMap: Map<string, ProgramAccount<MarketListing>>;
  loading: boolean;
  error: Error | null;
  lastUpdated: number | null;

  // Statistics
  totalListings: number;
  activeListingsCount: number;
  dutchAuctionCount: number;
  fixedPriceCount: number;
  auctionCount: number;

  // Operations
  refresh: () => Promise<void>;
  getListing: (listingId: string) => ProgramAccount<MarketListing> | undefined;
  getListingByPubkey: (pubkey: PublicKey) => ProgramAccount<MarketListing> | undefined;

  // Filtering
  getListingsByEvent: (eventPubkey: PublicKey) => ProgramAccount<MarketListing>[];
  getListingsBySeller: (sellerPubkey: PublicKey) => ProgramAccount<MarketListing>[];
  getDutchAuctions: () => ProgramAccount<MarketListing>[];
  getFixedPriceListings: () => ProgramAccount<MarketListing>[];

  // Price calculations
  getCurrentPrice: (listing: MarketListing) => number;
  getTimeRemaining: (listing: MarketListing) => number;
}

const MarketContext = createContext<MarketContextValue | undefined>(undefined);

interface MarketProviderProps {
  children: ReactNode;
  autoRefresh?: boolean; // Auto-refresh every 30 seconds
  refreshInterval?: number; // In milliseconds
}

export const MarketProvider: React.FC<MarketProviderProps> = ({
  children,
  autoRefresh = true,
  refreshInterval = 30000,
}) => {
  const { getAllListings, getCurrentPrice } = useSecondaryMarket();
  const [listings, setListings] = useState<ProgramAccount<MarketListing>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Get active listings (non-expired)
  const activeListings = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return listings.filter((listing) => {
      const expiresAt = Number(listing.account.expiresAt);
      return listing.account.isActive && expiresAt > now;
    });
  }, [listings]);

  // Convert listings array to a map for easy lookup
  const listingMap = useMemo(() => {
    const map = new Map<string, ProgramAccount<MarketListing>>();
    listings.forEach((listing) => {
      map.set(listing.account.listingId, listing);
      map.set(listing.publicKey.toBase58(), listing);
    });
    return map;
  }, [listings]);

  // Calculate statistics
  const totalListings = listings.length;
  const activeListingsCount = activeListings.length;

  const dutchAuctionCount = useMemo(() => {
    return listings.filter((l) => {
      const saleType = l.account.saleType;
      return saleType && typeof saleType === 'object' && 'Dutch' in saleType;
    }).length;
  }, [listings]);

  const fixedPriceCount = useMemo(() => {
    return listings.filter((l) => {
      const saleType = l.account.saleType;
      return saleType && typeof saleType === 'object' && 'Fixed' in saleType;
    }).length;
  }, [listings]);

  const auctionCount = useMemo(() => {
    return listings.filter((l) => {
      const saleType = l.account.saleType;
      return saleType && typeof saleType === 'object' && 'Auction' in saleType;
    }).length;
  }, [listings]);

  /**
   * Refresh all listings
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const fetchedListings = await getAllListings();
      setListings(fetchedListings);
      setLastUpdated(Date.now());
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [getAllListings]);

  /**
   * Get a listing by its listing ID
   */
  const getListing = useCallback(
    (listingId: string): ProgramAccount<MarketListing> | undefined => {
      return listingMap.get(listingId);
    },
    [listingMap]
  );

  /**
   * Get a listing by its public key
   */
  const getListingByPubkey = useCallback(
    (pubkey: PublicKey): ProgramAccount<MarketListing> | undefined => {
      return listingMap.get(pubkey.toBase58());
    },
    [listingMap]
  );

  /**
   * Get listings by event
   */
  const getListingsByEvent = useCallback(
    (eventPubkey: PublicKey): ProgramAccount<MarketListing>[] => {
      return listings.filter((l) => l.account.event.equals(eventPubkey));
    },
    [listings]
  );

  /**
   * Get listings by seller
   */
  const getListingsBySeller = useCallback(
    (sellerPubkey: PublicKey): ProgramAccount<MarketListing>[] => {
      return listings.filter((l) => l.account.seller.equals(sellerPubkey));
    },
    [listings]
  );

  /**
   * Get all Dutch auction listings
   */
  const getDutchAuctions = useCallback((): ProgramAccount<MarketListing>[] => {
    return listings.filter((l) => {
      const saleType = l.account.saleType;
      return saleType && typeof saleType === 'object' && 'Dutch' in saleType;
    });
  }, [listings]);

  /**
   * Get all fixed price listings
   */
  const getFixedPriceListings = useCallback((): ProgramAccount<MarketListing>[] => {
    return listings.filter((l) => {
      const saleType = l.account.saleType;
      return saleType && typeof saleType === 'object' && 'Fixed' in saleType;
    });
  }, [listings]);

  /**
   * Get current price for a listing
   */
  const getCurrentPriceWrapper = useCallback((listing: MarketListing): number => {
    return getCurrentPrice(listing);
  }, [getCurrentPrice]);

  /**
   * Get time remaining for a listing
   */
  const getTimeRemainingWrapper = useCallback((listing: MarketListing): number => {
    return getTimeRemaining(listing.expiresAt);
  }, []);

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

  const value: MarketContextValue = {
    // Data
    listings,
    activeListings,
    listingMap,
    loading,
    error,
    lastUpdated,

    // Statistics
    totalListings,
    activeListingsCount,
    dutchAuctionCount,
    fixedPriceCount,
    auctionCount,

    // Operations
    refresh,
    getListing,
    getListingByPubkey,

    // Filtering
    getListingsByEvent,
    getListingsBySeller,
    getDutchAuctions,
    getFixedPriceListings,

    // Price calculations
    getCurrentPrice: getCurrentPriceWrapper,
    getTimeRemaining: getTimeRemainingWrapper,
  };

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
};

// ============== Hook ==============

export const useMarketContext = (): MarketContextValue => {
  const context = useContext(MarketContext);

  if (!context) {
    throw new Error('useMarketContext must be used within a MarketProvider');
  }

  return context;
};
