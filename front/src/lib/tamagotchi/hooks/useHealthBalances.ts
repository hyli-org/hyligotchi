import { useState, useEffect, useCallback } from 'react';
import { 
  healthBalanceAPI, 
  healthBalanceUtils,
  EMPTY_HEALTH_BALANCES 
} from '../utils/healthBalances';
import type { 
  HealthType, 
  HealthBalanceState
} from '../utils/healthBalances';

export const useHealthBalances = (useAPI: boolean = false, identity?: string) => {
  const [state, setState] = useState<HealthBalanceState>({
    balances: EMPTY_HEALTH_BALANCES,
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
      const balances = await healthBalanceAPI.fetchBalances(identity);
      setState({ balances, loading: false, error: null });
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch balances' 
      }));
    }
  }, [useAPI, identity]);

  // Initialize - fetch from API if enabled
  useEffect(() => {
    if (useAPI && identity) {
      fetchBalances();
    }
  }, [useAPI, identity, fetchBalances]);

  // Consume health item - requires API connection
  const consumeHealth = useCallback(async (healthType: HealthType, amount: number = 1) => {
    if (!useAPI || !identity) {
      throw new Error('API connection required to consume health items');
    }
    
    // Check if health item is available
    if (!healthBalanceUtils.hasHealth(state.balances, healthType, amount)) {
      throw new Error(`Not enough ${healthType} available`);
    }

    // Optimistic update
    const optimisticBalances = healthBalanceUtils.consumeHealth(state.balances, healthType, amount);
    setState(prev => ({ ...prev, balances: optimisticBalances, error: null }));

    try {
      setState(prev => ({ ...prev, loading: true }));
      // Note: consumeHealth API currently just returns fetched balances
      // This should be handled by the Hyligotchi feed endpoints
      const newBalances = await healthBalanceAPI.fetchBalances(identity);
      setState({ balances: newBalances, loading: false, error: null });
      return newBalances;
    } catch (error) {
      // Rollback optimistic update on error
      setState(prev => ({ 
        ...prev, 
        balances: state.balances, // Revert to previous state
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to consume health item' 
      }));
      throw error;
    }
  }, [state.balances, useAPI, identity]);

  // Add health item - requires API connection (not implemented yet)
  const addHealth = useCallback(async (_healthType: HealthType, _amount: number = 1) => {
    if (!useAPI || !identity) {
      throw new Error('API connection required to add health items');
    }
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      // Note: addHealth should interact with token contracts
      // For now, just refresh balances
      const newBalances = await healthBalanceAPI.fetchBalances(identity);
      setState({ balances: newBalances, loading: false, error: null });
      return newBalances;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to add health item' 
      }));
      throw error;
    }
  }, [useAPI, identity]);

  // Check if health item is available
  const hasHealth = useCallback((healthType: HealthType, amount: number = 1) => {
    return healthBalanceUtils.hasHealth(state.balances, healthType, amount);
  }, [state.balances]);

  // Get total health items count
  const getTotalHealth = useCallback(() => {
    return healthBalanceUtils.getTotalHealth(state.balances);
  }, [state.balances]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    balances: state.balances,
    loading: state.loading,
    error: state.error,
    consumeHealth,
    addHealth,
    hasHealth,
    getTotalHealth,
    fetchBalances,
    clearError
  };
};