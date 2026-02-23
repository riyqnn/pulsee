// Primary Market Operations Hook - REMOVED in MVP
// Direct buy_ticket is removed, only buy_ticket_with_escrow exists

interface UsePrimaryMarketReturn {
  // Operations - all stubbed
  buyTicket: (...args: any[]) => Promise<never>;

  // Queries - all stubbed
  getUserTickets: (...args: any[]) => Promise<never[]>;

  // State
  loading: boolean;
  error: Error | null;
  isReady: boolean;
}

export const usePrimaryMarket = (): UsePrimaryMarketReturn => {
  return {
    // Operations - stubbed (use buy_ticket_with_escrow instead)
    buyTicket: async () => {
      throw new Error('Direct buy_ticket not available in MVP. Use buyTicketWithEscrow instead.');
    },

    // Queries - stubbed
    getUserTickets: async () => [],

    // State
    loading: false,
    error: null,
    isReady: false,
  };
};
