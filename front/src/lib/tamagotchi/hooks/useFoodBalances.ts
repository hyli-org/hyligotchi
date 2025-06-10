import { useState, useEffect, useCallback } from 'react';
import { 
  foodBalanceAPI, 
  foodBalanceUtils,
  EMPTY_FOOD_BALANCES 
} from '../utils/foodBalances';
import type { 
  FoodType, 
  FoodBalanceState
} from '../utils/foodBalances';

export const useFoodBalances = (useAPI: boolean = false, identity?: string, indexerUrl?: string) => {
  const [state, setState] = useState<FoodBalanceState>({
    balances: EMPTY_FOOD_BALANCES,
    loading: true, // Start with loading true since we need to fetch from server
    error: null
  });

  // Fetch balances from API
  const fetchBalances = useCallback(async () => {
    if (!useAPI || !identity) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const balances = await foodBalanceAPI.fetchBalances(identity, indexerUrl);
      setState({ balances, loading: false, error: null });
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch balances' 
      }));
    }
  }, [useAPI, identity, indexerUrl]);

  // Initialize - fetch from API if enabled
  useEffect(() => {
    if (useAPI && identity) {
      fetchBalances();
    }
  }, [useAPI, identity, indexerUrl, fetchBalances]);

  // Consume food - requires API connection
  const consumeFood = useCallback(async (foodType: FoodType, amount: number = 1) => {
    if (!useAPI || !identity) {
      throw new Error('API connection required to consume food');
    }
    
    // // Check if food is available
    // if (!foodBalanceUtils.hasFood(state.balances, foodType, amount)) {
    //   throw new Error(`Not enough ${foodType} available`);
    // }

    // Optimistic update
    const optimisticBalances = foodBalanceUtils.consumeFood(state.balances, foodType, amount);
    setState(prev => ({ ...prev, balances: optimisticBalances, error: null }));

    try {
      setState(prev => ({ ...prev, loading: true }));
      // Note: consumeFood API currently just returns fetched balances
      // This should be handled by the Hyligotchi feed endpoints
      const newBalances = await foodBalanceAPI.fetchBalances(identity, indexerUrl);
      setState({ balances: newBalances, loading: false, error: null });
      return newBalances;
    } catch (error) {
      // Rollback optimistic update on error
      setState(prev => ({ 
        ...prev, 
        balances: state.balances, // Revert to previous state
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to consume food' 
      }));
      throw error;
    }
  }, [state.balances, useAPI, identity]);

  // Add food - requires API connection (not implemented yet)
  const addFood = useCallback(async (_foodType: FoodType, _amount: number = 1) => {
    if (!useAPI || !identity) {
      throw new Error('API connection required to add food');
    }
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      // Note: addFood should interact with token contracts
      // For now, just refresh balances
      const newBalances = await foodBalanceAPI.fetchBalances(identity, indexerUrl);
      setState({ balances: newBalances, loading: false, error: null });
      return newBalances;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to add food' 
      }));
      throw error;
    }
  }, [useAPI, identity, indexerUrl]);

  // Check if food is available
  const hasFood = useCallback((foodType: FoodType, amount: number = 1) => {
    return foodBalanceUtils.hasFood(state.balances, foodType, amount);
  }, [state.balances]);

  // Get total food count
  const getTotalFood = useCallback(() => {
    return foodBalanceUtils.getTotalFood(state.balances);
  }, [state.balances]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    balances: state.balances,
    loading: state.loading,
    error: state.error,
    consumeFood,
    addFood,
    hasFood,
    getTotalFood,
    fetchBalances,
    clearError
  };
}; 