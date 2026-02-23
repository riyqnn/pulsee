// Secondary Market Operations Hook - REMOVED in MVP
// Secondary market is removed from simplified contract

interface UseSecondaryMarketReturn {
  // Operations - all stubbed
  listTicketForSale: (...args: any[]) => Promise<never>;
  buyListedTicket: (...args: any[]) => Promise<never>;

  // Queries - all stubbed
  getAllListings: () => Promise<never[]>;
  getListing: (...args: any[]) => Promise<null>;
  getActiveListings: () => Promise<never[]>;
  getListingsByEvent: (...args: any[]) => Promise<never[]>;

  // Helpers - all stubbed
  calculateDutchPrice: (...args: any[]) => number;
  getCurrentPrice: (...args: any[]) => number;
  getTimeRemaining: (...args: any[]) => number;
  isListingExpired: (...args: any[]) => boolean;

  // State
  loading: boolean;
  error: Error | null;
  isReady: boolean;
}

export const useSecondaryMarket = (): UseSecondaryMarketReturn => {
  return {
    // Operations - stubbed
    listTicketForSale: async () => {
      throw new Error('Secondary market not available in MVP');
    },
    buyListedTicket: async () => {
      throw new Error('Secondary market not available in MVP');
    },

    // Queries - stubbed
    getAllListings: async () => [],
    getListing: async () => null,
    getActiveListings: async () => [],
    getListingsByEvent: async () => [],

    // Helpers - stubbed
    calculateDutchPrice: () => 0,
    getCurrentPrice: () => 0,
    getTimeRemaining: () => 0,
    isListingExpired: () => true,

    // State
    loading: false,
    error: null,
    isReady: false,
  };
};
