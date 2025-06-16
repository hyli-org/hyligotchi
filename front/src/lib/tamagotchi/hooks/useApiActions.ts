import { useCallback } from 'react';
import { apiClient } from '../api/client';

interface UseApiActionsProps {
  useAPI: boolean;
  identity?: string;
  consumeFood: (food: string) => boolean;
  consumeHealth: (item: string) => boolean;
  refreshStateFromAPI: () => Promise<void>;
  setActionWithTimeout: (action: string, timeout?: number) => void;
  showPoo: boolean;
  setShowPoo: (value: boolean) => void;
  setNeedsCleaning: (value: boolean) => void;
  setIsCleaningAnimationPlaying: (value: boolean) => void;
  createIdentityBlobs?: () => [any, any];
}

/**
 * Custom hook that handles API actions for the Tamagotchi
 * Manages feed, clean, health, and resurrection actions
 */
export const useApiActions = ({
  useAPI,
  identity,
  consumeFood,
  consumeHealth,
  refreshStateFromAPI,
  setActionWithTimeout,
  showPoo,
  setShowPoo,
  setNeedsCleaning,
  setIsCleaningAnimationPlaying,
  createIdentityBlobs
}: UseApiActionsProps) => {
  
  // Handle cleaning action
  const handleClean = useCallback(async () => {
    if (!showPoo) {
      setActionWithTimeout('Nothing to clean!');
      return;
    }
    
    if (useAPI && identity) {
      try {
        setIsCleaningAnimationPlaying(true);
        setActionWithTimeout('Cleaning...', 1000);
        
        const cleaningPromise = apiClient.cleanPoop(createIdentityBlobs);
        const animationPromise = new Promise(resolve => setTimeout(resolve, 1000));
        
        await Promise.all([cleaningPromise, animationPromise]);
        
        setShowPoo(false);
        setNeedsCleaning(false);
        setIsCleaningAnimationPlaying(false);
        setActionWithTimeout('Cleaned poo!');
        
        await refreshStateFromAPI();
      } catch (error) {
        console.error('Failed to clean:', error);
        setIsCleaningAnimationPlaying(false);
        setActionWithTimeout('Failed to clean!');
      }
    } else {
      // Offline mode cleaning logic
      setIsCleaningAnimationPlaying(true);
      setActionWithTimeout('Cleaning...', 1000);
      
      setTimeout(() => {
        setShowPoo(false);
        setNeedsCleaning(false);
        setIsCleaningAnimationPlaying(false);
        setActionWithTimeout('Cleaned poo!');
      }, 1000);
    }
  }, [useAPI, identity, showPoo, setShowPoo, setNeedsCleaning, setIsCleaningAnimationPlaying, 
      setActionWithTimeout, refreshStateFromAPI, createIdentityBlobs]);
  
  // Handle feeding action
  const handleApiFeed = useCallback(async (foodType: 'orange' | 'sweets') => {
    const hasItem = consumeFood(foodType);
    if (!hasItem) {
      setActionWithTimeout(`No ${foodType} available!`);
      return;
    }
    
    if (useAPI && identity) {
      try {
        setActionWithTimeout(`Feeding ${foodType}...`);
        if (foodType === 'orange') {
          await apiClient.feedFood(1, createIdentityBlobs);
        } else if (foodType === 'sweets') {
          await apiClient.feedSweets(1, createIdentityBlobs);
        }
        setActionWithTimeout(`Fed ${foodType}!`);
        await refreshStateFromAPI();
      } catch (error) {
        console.error('Failed to feed:', error);
        setActionWithTimeout('Failed to feed!');
        const message = error instanceof Error ? error.message : 'Unknown error';
        if (message.includes('already dead')) {
          setActionWithTimeout('Cannot feed a dead pet!');
        } else if (message.includes('too full')) {
          setActionWithTimeout('Pet is too full!');
        }
      }
    } else {
      // Offline mode feeding
      setActionWithTimeout(`Fed ${foodType}!`);
    }
  }, [useAPI, identity, consumeFood, setActionWithTimeout, refreshStateFromAPI, createIdentityBlobs]);
  
  // Handle health item usage
  const handleApiHealth = useCallback(async (item: 'vaccine' | 'medicine') => {
    const hasItem = consumeHealth(item);
    if (!hasItem) {
      setActionWithTimeout(`No ${item} available!`);
      return;
    }
    
    if (useAPI && identity) {
      try {
        setActionWithTimeout(`Using ${item}...`);
        if (item === 'vaccine' || item === 'medicine') {
          await apiClient.feedVitamins(1, createIdentityBlobs);
        }
        setActionWithTimeout(`Used ${item}!`);
        await refreshStateFromAPI();
      } catch (error) {
        console.error('Failed to use health item:', error);
        setActionWithTimeout('Failed to use item!');
        const message = error instanceof Error ? error.message : 'Unknown error';
        if (message.includes('not sick')) {
          setActionWithTimeout('Pet is not sick!');
        }
      }
    } else {
      // Offline mode health usage
      setActionWithTimeout(`Used ${item}!`);
    }
  }, [useAPI, identity, consumeHealth, setActionWithTimeout, refreshStateFromAPI, createIdentityBlobs]);
  
  // Handle resurrection
  const handleResurrect = useCallback(async () => {
    if (!useAPI || !identity) {
      setActionWithTimeout('Resurrection requires connection!');
      return;
    }
    
    if (!createIdentityBlobs) {
      setActionWithTimeout('Cannot resurrect without identity!');
      return;
    }
    
    try {
      setActionWithTimeout('Resurrecting...', 2000);
      await apiClient.resurrect(createIdentityBlobs);
      setActionWithTimeout('Resurrected!');
      await refreshStateFromAPI();
    } catch (error) {
      console.error('Failed to resurrect:', error);
      setActionWithTimeout('Failed to resurrect!');
    }
  }, [useAPI, identity, createIdentityBlobs, setActionWithTimeout, refreshStateFromAPI]);
  
  return {
    handleClean,
    handleApiFeed,
    handleApiHealth,
    handleResurrect
  };
};