// Health balance interface for type safety
export interface HealthBalances {
  VITAMIN: number;
}

// Health types for type safety
export type HealthType = 'VITAMIN';

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
  VITAMIN: 0
};

// API functions
export const healthBalanceAPI = {
  // Fetch current balances from indexer
  async fetchBalances(identity: string, indexerUrl?: string): Promise<HealthBalances> {
    if (!identity) {
      throw new Error('Identity is required to fetch balances');
    }

    const baseUrl = indexerUrl || import.meta.env.VITE_INDEXER_BASE_URL || 'http://localhost:4008';
    const indexerBaseUrl = baseUrl + '/v1/indexer/contract';

    try {
      const response = await fetch(`${indexerBaseUrl}/vitamin/balance/${identity}`);
      
      let vitaminBalance = 0;
      if (response.ok) {
        try {
          const data: IndexerBalanceResponse = await response.json();
          vitaminBalance = parseInt(data.balance, 10) || 0;
        } catch {
          // If JSON parsing fails, assume 0 balance
          vitaminBalance = 0;
        }
      }

      return {
        VITAMIN: vitaminBalance
      };
    } catch (error) {
      console.error('Failed to fetch vitamin balance:', error);
      throw new Error('Failed to fetch health balances from indexer');
    }
  },

  // Note: Consume and add operations should be handled by the Hyligotchi server
  // These are kept for compatibility but will need to be refactored
  async consumeHealth(_healthType: HealthType, _amount: number = 1, identity: string, indexerUrl?: string): Promise<HealthBalances> {
    // This should trigger a feed action on the Hyligotchi server
    console.warn('consumeHealth should be handled by Hyligotchi server feed endpoints');
    return this.fetchBalances(identity, indexerUrl);
  },

  async addHealth(_healthType: HealthType, _amount: number = 1, identity: string, indexerUrl?: string): Promise<HealthBalances> {
    // This would require interaction with the token contracts
    console.warn('addHealth requires interaction with token contracts');
    return this.fetchBalances(identity, indexerUrl);
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
    return balances.VITAMIN;
  }
}; 