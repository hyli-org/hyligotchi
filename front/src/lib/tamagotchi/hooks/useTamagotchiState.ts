import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAnimationFrame } from './useAnimationFrame';
import { AnimationManager } from '../utils/animationManager';

// Utility function to clamp values between min and max
const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, value));
};

export const useTamagotchiState = () => {
  const [characterPosition, setCharacterPosition] = useState({ x: 22.5, y: 22.5 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [happiness, setHappiness] = useState(0); // Will be set from server
  const [hunger, setHunger] = useState(0); // Will be set from server
  const [health, setHealth] = useState<'Healthy' | 'Sick' | 'Dead' | 'healthy' | 'sick' | 'dead'>('Healthy'); // Health state
  const [lastAction, setLastAction] = useState('');
  const [needsCleaning, setNeedsCleaning] = useState(false);
  const [showPoo, setShowPoo] = useState(false);
  const [isCleaningAnimationPlaying, setIsCleaningAnimationPlaying] = useState(false);
  const [username, setUsername] = useState('');
  const [bornAt, setBornAt] = useState<number | undefined>(undefined);

  // Create animation manager instance
  const animationManager = useRef(new AnimationManager());
  
  // Single animation loop using requestAnimationFrame
  useAnimationFrame(useCallback(() => {
    animationManager.current.update();
  }, []));
  
  // Register animations on mount
  useEffect(() => {
    const manager = animationManager.current;
    
    // Register character movement animation (every 3 seconds)
    manager.register('movement', 3000, () => {
      setCharacterPosition(prev => ({
        x: clamp(prev.x + (Math.random() * 10 - 5), 5, 95),
        y: clamp(prev.y + (Math.random() * 10 - 5), 5, 95)
      }));
    });
    
    // Register blinking animation (every 5 seconds)
    manager.register('blinking', 5000, () => {
      setIsBlinking(true);
      // Use a ref to avoid creating new timeouts on each blink
      const timer = setTimeout(() => setIsBlinking(false), 200);
      // Clean up timeout on unmount
      return () => clearTimeout(timer);
    });
    
    // Cleanup animations on unmount
    return () => {
      manager.clear();
    };
  }, []);

  // Stats are now managed by the server, not locally

  const setActionWithTimeout = useCallback((action: string, timeout = 2000) => {
    setLastAction(action);
    const timer = setTimeout(() => setLastAction(''), timeout);
    return () => clearTimeout(timer);
  }, []);

  const handleClean = useCallback(() => {
    // Only clean if there's poo, don't toggle
    if (showPoo) {
      setIsCleaningAnimationPlaying(true);
      setActionWithTimeout('Cleaning...', 1000);
      
      const cleanupTimer = setTimeout(() => {
        setShowPoo(false);
        setNeedsCleaning(false);
        setIsCleaningAnimationPlaying(false);
        // Happiness increase should come from server
        setActionWithTimeout('Cleaned poo!');
      }, 1000);
      
      return () => clearTimeout(cleanupTimer);
    } else {
      setActionWithTimeout('Nothing to clean!');
    }
  }, [showPoo, setActionWithTimeout]);

  // Memoize the return value to prevent creating new objects on every render
  return useMemo(() => ({
    characterPosition,
    setCharacterPosition,
    isBlinking,
    happiness,
    setHappiness,
    hunger,
    setHunger,
    health,
    setHealth,
    lastAction,
    needsCleaning,
    setNeedsCleaning,
    showPoo,
    setShowPoo,
    isCleaningAnimationPlaying,
    setIsCleaningAnimationPlaying,
    username,
    setUsername,
    bornAt,
    setBornAt,
    handleClean,
    setActionWithTimeout
  }), [
    characterPosition,
    isBlinking,
    happiness,
    hunger,
    health,
    lastAction,
    needsCleaning,
    showPoo,
    isCleaningAnimationPlaying,
    username,
    bornAt,
    handleClean,
    setActionWithTimeout
  ]);
}; 