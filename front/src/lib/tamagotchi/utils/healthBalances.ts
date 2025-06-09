// Health balance interface for type safety
export interface HealthBalances {
  VITAMIN_D: number;
}

// Health types for type safety
export type HealthType = 'VITAMIN_D';

// Indexer balance response interface
export interface IndexerBalanceResponse {
  balance: string; // Balance as string from indexer
}

// Loading state interface
export interface HealthBalanceState {
  balances: HealthBalances;
  loading: boolean;
  error: string | null;
}

// Empty initial balances - data comes from server only
export const EMPTY_HEALTH_BALANCES: HealthBalances = {
  VITAMIN_D: 0
};

// API endpoints
const INDEXER_BASE_URL = 'http://localhost:4008/v1/indexer/contract';

// API functions
export const healthBalanceAPI = {
  // Fetch current balances from indexer
  async fetchBalances(identity: string): Promise<HealthBalances> {
    if (!identity) {
      throw new Error('Identity is required to fetch balances');
    }

    try {
      const response = await fetch(`${INDEXER_BASE_URL}/vitamin_d/balance/${identity}`);
      
      let vitaminDBalance = 0;
      if (response.ok) {
        try {
          const data: IndexerBalanceResponse = await response.json();
          vitaminDBalance = parseInt(data.balance, 10) || 0;
        } catch {
          // If JSON parsing fails, assume 0 balance
          vitaminDBalance = 0;
        }
      }

      return {
        VITAMIN_D: vitaminDBalance
      };
    } catch (error) {
      console.error('Failed to fetch vitamin D balance:', error);
      throw new Error('Failed to fetch health balances from indexer');
    }
  },

  // Note: Consume and add operations should be handled by the Hyligotchi server
  // These are kept for compatibility but will need to be refactored
  async consumeHealth(_healthType: HealthType, _amount: number = 1, identity: string): Promise<HealthBalances> {
    // This should trigger a feed action on the Hyligotchi server
    console.warn('consumeHealth should be handled by Hyligotchi server feed endpoints');
    return this.fetchBalances(identity);
  },

  async addHealth(_healthType: HealthType, _amount: number = 1, identity: string): Promise<HealthBalances> {
    // This would require interaction with the token contracts
    console.warn('addHealth requires interaction with token contracts');
    return this.fetchBalances(identity);
  }
};

// Utility functions for managing health balances (local operations)
export const healthBalanceUtils = {
  // Consume health item (decrease balance) - local only
  consumeHealth: (balances: HealthBalances, healthType: HealthType, amount: number = 1): HealthBalances => {
    return {
      ...balances,
      [healthType]: Math.max(0, balances[healthType] - amount)
    };
  },

  // Add health item (increase balance) - local only
  addHealth: (balances: HealthBalances, healthType: HealthType, amount: number = 1): HealthBalances => {
    return {
      ...balances,
      [healthType]: balances[healthType] + amount
    };
  },

  // Check if health item is available
  hasHealth: (balances: HealthBalances, healthType: HealthType, amount: number = 1): boolean => {
    return balances[healthType] >= amount;
  },

  // Get total health items count
  getTotalHealth: (balances: HealthBalances): number => {
    return balances.VITAMIN_D;
  }
}; 