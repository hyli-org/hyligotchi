// Food balance interface for type safety
export interface FoodBalances {
  ORANJ: number;
  HYLLAR: number;
}

// Food types for type safety
export type FoodType = 'ORANJ' | 'HYLLAR';

// Indexer balance response interface
export interface IndexerBalanceResponse {
  balance: string; // Balance as string from indexer
}

// Loading state interface
export interface FoodBalanceState {
  balances: FoodBalances;
  loading: boolean;
  error: string | null;
}

// Empty initial balances - data comes from server only
export const EMPTY_FOOD_BALANCES: FoodBalances = {
  ORANJ: 0,
  HYLLAR: 0
};

// API endpoints
const INDEXER_BASE_URL = import.meta.env.VITE_INDEXER_BASE_URL + '/v1/indexer/contract';


// API functions
export const foodBalanceAPI = {
  // Fetch current balances from indexer
  async fetchBalances(identity: string): Promise<FoodBalances> {
    if (!identity) {
      throw new Error('Identity is required to fetch balances');
    }

    try {
      // Fetch all balances in parallel
      const [oranjResponse, hyllarResponse] = await Promise.all([
        fetch(`${INDEXER_BASE_URL}/oranj/balance/${identity}`),
        fetch(`${INDEXER_BASE_URL}/oxygen/balance/${identity}`) // oxygen for HYLLAR
      ]);

      // Handle ORANJ balance
      let oranjBalance = 0;
      if (oranjResponse.ok) {
        try {
          const oranjData: IndexerBalanceResponse = await oranjResponse.json();
          oranjBalance = parseInt(oranjData.balance, 10) || 0;
        } catch {
          // If JSON parsing fails, assume 0 balance
          oranjBalance = 0;
        }
      }

      // Handle HYLLAR balance
      let hyllarBalance = 0;
      if (hyllarResponse.ok) {
        try {
          const hyllarData: IndexerBalanceResponse = await hyllarResponse.json();
          hyllarBalance = parseInt(hyllarData.balance, 10) || 0;
        } catch {
          // If JSON parsing fails, assume 0 balance
          hyllarBalance = 0;
        }
      }

      return {
        ORANJ: oranjBalance,
        HYLLAR: hyllarBalance
      };
    } catch (error) {
      console.error('Failed to fetch balances:', error);
      throw new Error('Failed to fetch food balances from indexer');
    }
  },

  // Note: Consume and add operations should be handled by the Hyligotchi server
  // These are kept for compatibility but will need to be refactored
  async consumeFood(_foodType: FoodType, _amount: number = 1, identity: string): Promise<FoodBalances> {
    // This should trigger a feed action on the Hyligotchi server
    // For now, just return the current balances
    console.warn('consumeFood should be handled by Hyligotchi server feed endpoints');
    return this.fetchBalances(identity);
  },

  async addFood(_foodType: FoodType, _amount: number = 1, identity: string): Promise<FoodBalances> {
    // This would require interaction with the token contracts
    console.warn('addFood requires interaction with token contracts');
    return this.fetchBalances(identity);
  }
};

// Utility functions for managing food balances (local operations)
export const foodBalanceUtils = {
  // Consume food (decrease balance) - local only
  consumeFood: (balances: FoodBalances, foodType: FoodType, amount: number = 1): FoodBalances => {
    return {
      ...balances,
      [foodType]: Math.max(0, balances[foodType] - amount)
    };
  },

  // Add food (increase balance) - local only
  addFood: (balances: FoodBalances, foodType: FoodType, amount: number = 1): FoodBalances => {
    return {
      ...balances,
      [foodType]: balances[foodType] + amount
    };
  },

  // Check if food is available
  hasFood: (balances: FoodBalances, foodType: FoodType, amount: number = 1): boolean => {
    return balances[foodType] >= amount;
  },

  // Get total food count
  getTotalFood: (balances: FoodBalances): number => {
    return balances.ORANJ + balances.HYLLAR;
  }
}; 