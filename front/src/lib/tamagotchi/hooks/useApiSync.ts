import { useEffect, useRef, useCallback, useState } from 'react';
import { apiClient } from '../api/client';
import { apiResponseToGameState, parseHealthStatus } from '../utils/gameStateManager';

interface UseApiSyncProps {
  useAPI: boolean;
  identity?: string;
  apiUrl?: string;
  setHappiness: (value: number) => void;
  setHunger: (value: number) => void;
  setHealth: (value: 'Healthy' | 'Sick' | 'Dead' | 'healthy' | 'sick' | 'dead') => void;
  setUsername: (value: string) => void;
  setBornAt: (value: number | undefined) => void;
  updatePooState: (value: boolean | ((prev: boolean) => boolean)) => void;
}

/**
 * Custom hook that handles API synchronization for the Tamagotchi
 * Manages initial load, periodic sync, and state refresh
 */
export const useApiSync = ({
  useAPI,
  identity,
  apiUrl,
  setHappiness,
  setHunger,
  setHealth,
  setUsername,
  setBornAt,
  updatePooState
}: UseApiSyncProps) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasExistingTamagotchi, setHasExistingTamagotchi] = useState(false);
  const isMountedRef = useRef(true);
  
  // Set up API client with identity and URL
  useEffect(() => {
    if (useAPI && identity) {
      console.log('Setting API client identity:', identity);
      apiClient.setIdentity(identity);
      if (apiUrl) {
        apiClient.setBaseUrl(apiUrl);
      }
    }
  }, [identity, useAPI, apiUrl]);
  
  // Refresh state from API
  const refreshStateFromAPI = useCallback(async () => {
    if (!useAPI || !identity) return;
    
    try {
      const response = await apiClient.getState();
      if (!isMountedRef.current) return;
      
      console.log('Refreshed state from API:', response);
      const gameState = apiResponseToGameState(response);
      setHappiness(gameState.happiness);
      setHunger(gameState.hunger);
      const healthStatus = parseHealthStatus(response?.health);
      setHealth(healthStatus);
      setUsername(gameState.username || '');
      setBornAt(gameState.born_at);
      updatePooState(gameState.needs_cleaning);
    } catch (error) {
      console.error('Failed to refresh state from API:', error);
    }
  }, [useAPI, identity, setHappiness, setHunger, setHealth, setUsername, setBornAt, updatePooState]);
  
  // Load existing Tamagotchi on mount
  useEffect(() => {
    if (!useAPI || !identity) return;
    
    const loadExistingTamagotchi = async () => {
      try {
        console.log('Checking for existing Tamagotchi...');
        const response = await apiClient.getState();
        
        if (!isMountedRef.current) return;
        
        console.log('API response:', response);
        const gameState = apiResponseToGameState(response);
        
        if (gameState.is_dead) {
          console.log('Tamagotchi is dead, showing death screen');
          setIsInitialized(true);
          setHasExistingTamagotchi(true);
          setHealth('Dead');
          setUsername(gameState.username || '');
          setBornAt(gameState.born_at);
        } else if (gameState.exists) {
          console.log('Found existing Tamagotchi:', gameState);
          setHappiness(gameState.happiness);
          setHunger(gameState.hunger);
          const healthStatus = parseHealthStatus(response?.health);
      setHealth(healthStatus);
          setUsername(gameState.username || '');
          setBornAt(gameState.born_at);
          updatePooState(gameState.needs_cleaning);
          setIsInitialized(true);
          setHasExistingTamagotchi(true);
        } else {
          console.log('No existing Tamagotchi found');
          setIsInitialized(false);
          setHasExistingTamagotchi(false);
        }
      } catch (error) {
        console.error('Failed to load existing Tamagotchi:', error);
        setIsInitialized(false);
        setHasExistingTamagotchi(false);
      }
    };
    
    loadExistingTamagotchi();
  }, [useAPI, identity, setHappiness, setHunger, setHealth, setUsername, setBornAt, updatePooState]);
  
  // Periodic sync with server
  useEffect(() => {
    if (!useAPI || !identity || !isInitialized) return;
    
    const syncInterval = setInterval(() => {
      const refreshState = async () => {
        try {
          const response = await apiClient.getState();
          if (!isMountedRef.current) return;
          
          const gameState = apiResponseToGameState(response);
          setHappiness(gameState.happiness);
          setHunger(gameState.hunger);
          const healthStatus = parseHealthStatus(response?.health);
      setHealth(healthStatus);
          updatePooState(gameState.needs_cleaning);
          
          if (gameState.is_dead) {
            setHealth('Dead');
          }
        } catch (error) {
          console.error('Failed to sync state:', error);
        }
      };
      
      refreshState();
    }, 30000); // Sync every 30 seconds
    
    return () => clearInterval(syncInterval);
  }, [useAPI, identity, isInitialized, setHappiness, setHunger, setHealth, updatePooState]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  return {
    isInitialized,
    hasExistingTamagotchi,
    refreshStateFromAPI,
    setIsInitialized,
    setHasExistingTamagotchi
  };
};