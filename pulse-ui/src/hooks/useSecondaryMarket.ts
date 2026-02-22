// Secondary Market Operations Hook
// Handles marketplace listings and secondary market purchases
//
// NOTE: The following operations exist in lib.rs but are NOT in the deployed contract:
// - update_listing: Update listing price/duration (not deployed)
// - cancel_listing: Cancel an active listing (not deployed)
// - make_offer: Make an offer on a listing (not deployed)
// - accept_offer: Accept an offer on a listing (not deployed)
// - execute_dutch_auction_purchase: Execute Dutch auction (not deployed)
// - claim_expired_listing: Claim expired listing (not deployed)
//
// Only list_ticket_for_sale and buy_listed_ticket are available in the deployed contract.

import { useMemo, useState, useCallback } from 'react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { useProgram } from './useProgram';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  getConfigPDA,
  getListingPDA,
  fetchAllListings,
  fetchListing,
  getTimeRemaining,
  fetchConfig,
} from '../utils/accounts';
import type {
  ListTicketForSaleInput,
  MarketListing,
  ProgramAccount,
  SaleType,
} from '../types/pulse';
import { PROGRAM_ID } from './useProgram';
import { getSaleTypeString } from '../types/pulse';

interface BuyListedTicketInput {
  listingPDA: PublicKey;
}

interface UseSecondaryMarketReturn {
  // Operations
  listTicketForSale: (input: ListTicketForSaleInput & { ticketMint: PublicKey; eventPDA: PublicKey }) => Promise<string>;
  buyListedTicket: (input: BuyListedTicketInput) => Promise<string>;

  // Queries
  getAllListings: () => Promise<ProgramAccount<MarketListing>[]>;
  getListing: (listingPDA: PublicKey) => Promise<MarketListing | null>;
  getActiveListings: () => Promise<ProgramAccount<MarketListing>[]>;
  getListingsByEvent: (eventPDA: PublicKey) => Promise<ProgramAccount<MarketListing>[]>;

  // Dutch Auction Calculations
  calculateDutchPrice: (listing: MarketListing) => number;
  getCurrentPrice: (listing: MarketListing) => number;
  getTimeRemaining: (listing: MarketListing) => number;
  isListingExpired: (listing: MarketListing) => boolean;

  // Helpers
  formatSaleType: (saleType: SaleType) => string;
  calculateSavings: (listing: MarketListing) => number;
  calculateDiscount: (listing: MarketListing) => number;

  // State
  loading: boolean;
  error: Error | null;
  isReady: boolean;
}

export const useSecondaryMarket = (): UseSecondaryMarketReturn => {
  const { program, connection, publicKey } = useProgram();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const isReady = useMemo(() => {
    return !!program && !!publicKey && wallet.signTransaction !== undefined;
  }, [program, publicKey, wallet]);

  /**
   * List a ticket for sale on the secondary market
   * Instruction: list_ticket_for_sale
   */
  const listTicketForSale = useCallback(
    async (input: ListTicketForSaleInput & { ticketMint: PublicKey; eventPDA: PublicKey }): Promise<string> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        const [configPDA] = await getConfigPDA(PROGRAM_ID);
        const [listingPDA] = await getListingPDA(input.ticketMint, input.listingId, PROGRAM_ID);

        const tx = await program.methods
          .listTicketForSale(input.listingId, input.listPrice, input.duration)
          .accounts({
            config: configPDA,
            event: input.eventPDA,
            ticket: input.ticketMint, // Note: In the actual contract, this would be the ticket account
            listing: listingPDA,
            seller: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        return tx;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  /**
   * Buy a ticket from the secondary market
   * Instruction: buy_listed_ticket
   */
  const buyListedTicket = useCallback(
    async (input: BuyListedTicketInput): Promise<string> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        const [configPDA] = await getConfigPDA(PROGRAM_ID);

        // Fetch the listing to get the event and seller
        const listing = await fetchListing(connection, input.listingPDA);
        if (!listing) {
          throw new Error('Listing not found');
        }

        // Fetch the config to get the treasury
        const config = await fetchConfig(connection, PROGRAM_ID);
        if (!config) {
          throw new Error('Config not found');
        }

        const tx = await program.methods
          .buyListedTicket()
          .accounts({
            config: configPDA,
            event: listing.event,
            listing: input.listingPDA,
            seller: listing.seller,
            buyer: publicKey,
            treasury: config.treasury,
            organizer: listing.event, // This would be the actual organizer from the event
          })
          .rpc();

        return tx;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  /**
   * Fetch all market listings
   */
  const getAllListings = useCallback(async (): Promise<ProgramAccount<MarketListing>[]> => {
    if (!connection) {
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const listings = await fetchAllListings(connection, PROGRAM_ID);
      return listings;
    } catch (err) {
      const error = err as Error;
      setError(error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [connection]);

  /**
   * Fetch a single listing
   */
  const getListing = useCallback(
    async (listingPDA: PublicKey): Promise<MarketListing | null> => {
      if (!connection) {
        return null;
      }

      try {
        return await fetchListing(connection, listingPDA);
      } catch (err) {
        const error = err as Error;
        setError(error);
        return null;
      }
    },
    [connection]
  );

  /**
   * Fetch only active listings
   */
  const getActiveListings = useCallback(async (): Promise<ProgramAccount<MarketListing>[]> => {
    const allListings = await getAllListings();
    const now = Math.floor(Date.now() / 1000);

    return allListings.filter((listing) => {
      const expiresAt = Number(listing.account.expiresAt);
      return listing.account.isActive && expiresAt > now;
    });
  }, [getAllListings]);

  /**
   * Fetch listings for a specific event
   */
  const getListingsByEvent = useCallback(
    async (eventPDA: PublicKey): Promise<ProgramAccount<MarketListing>[]> => {
      const allListings = await getAllListings();
      return allListings.filter((listing) =>
        listing.account.event.equals(eventPDA)
      );
    },
    [getAllListings]
  );

  /**
   * Calculate current price for a Dutch auction listing
   */
  const calculateDutchPrice = useCallback((listing: MarketListing): number => {
    const saleType = getSaleTypeString(listing.saleType);
    if (saleType !== 'Dutch') {
      return Number(listing.listPrice) / 1e9;
    }

    const now = Math.floor(Date.now() / 1000);
    const startTime = Number(listing.createdAt);
    const endTime = Number(listing.expiresAt);
    const startPrice = Number(listing.maxPrice);
    const endPrice = Number(listing.minPrice);

    // If listing hasn't started or has ended, return boundary prices
    if (now < startTime) return startPrice / 1e9;
    if (now >= endTime) return endPrice / 1e9;

    // Linear price decay calculation
    const duration = endTime - startTime;
    const elapsed = now - startTime;
    const priceDrop = startPrice - endPrice;
    const currentPrice = Math.max(
      endPrice,
      startPrice - (priceDrop * elapsed) / duration
    );

    return currentPrice / 1e9;
  }, []);

  /**
   * Get the current price for any listing
   */
  const getCurrentPrice = useCallback((listing: MarketListing): number => {
    const saleType = getSaleTypeString(listing.saleType);
    if (saleType === 'Dutch') {
      return calculateDutchPrice(listing);
    }
    return Number(listing.listPrice) / 1e9;
  }, [calculateDutchPrice]);

  /**
   * Get time remaining for a listing in seconds
   */
  const getTimeRemainingListing = useCallback((listing: MarketListing): number => {
    return getTimeRemaining(listing.expiresAt);
  }, []);

  /**
   * Check if a listing is expired
   */
  const isListingExpired = useCallback((listing: MarketListing): boolean => {
    return getTimeRemainingListing(listing) === 0;
  }, [getTimeRemainingListing]);

  /**
   * Format sale type for display
   */
  const formatSaleType = useCallback((saleType: SaleType): string => {
    return getSaleTypeString(saleType);
  }, []);

  /**
   * Calculate savings compared to original purchase price
   */
  const calculateSavings = useCallback((listing: MarketListing): number => {
    const originalPrice = Number(listing.originalPurchasePrice) / 1e9;
    const currentPrice = getCurrentPrice(listing);
    return Math.max(0, originalPrice - currentPrice);
  }, [getCurrentPrice]);

  /**
   * Calculate discount percentage
   */
  const calculateDiscount = useCallback((listing: MarketListing): number => {
    const originalPrice = Number(listing.originalPurchasePrice);
    if (originalPrice === 0) return 0;

    const currentPrice = getCurrentPrice(listing) * 1e9;
    const discount = ((originalPrice - currentPrice) / originalPrice) * 100;
    return Math.max(0, Math.min(100, discount));
  }, [getCurrentPrice]);

  return {
    // Operations
    listTicketForSale,
    buyListedTicket,

    // Queries
    getAllListings,
    getListing,
    getActiveListings,
    getListingsByEvent,

    // Dutch Auction Calculations
    calculateDutchPrice,
    getCurrentPrice,
    getTimeRemaining: getTimeRemainingListing,
    isListingExpired,

    // Helpers
    formatSaleType,
    calculateSavings,
    calculateDiscount,

    // State
    loading,
    error,
    isReady,
  };
};
