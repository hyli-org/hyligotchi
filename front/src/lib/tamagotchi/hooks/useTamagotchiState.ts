import { useState, useEffect } from 'react';

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

  // Character random movement
  useEffect(() => {
    const moveInterval = setInterval(() => {
      setCharacterPosition(prev => ({
        x: Math.max(5, Math.min(100, prev.x + (Math.random() * 10 - 5))),
        y: Math.max(5, Math.min(100, prev.y + (Math.random() * 10 - 5)))
      }));
    }, 3000);
    
    return () => clearInterval(moveInterval);
  }, []);

  // Blinking animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 5000);
    
    return () => clearInterval(blinkInterval);
  }, []);

  // Stats are now managed by the server, not locally

  const setActionWithTimeout = (action: string, timeout = 2000) => {
    setLastAction(action);
    setTimeout(() => setLastAction(''), timeout);
  };



  const handleClean = () => {
    // Only clean if there's poo, don't toggle
    if (showPoo) {
      setIsCleaningAnimationPlaying(true);
      setActionWithTimeout('Cleaning...', 1000);
      
      setTimeout(() => {
        setShowPoo(false);
        setNeedsCleaning(false);
        setIsCleaningAnimationPlaying(false);
        // Happiness increase should come from server
        setActionWithTimeout('Cleaned poo!');
      }, 1000);
    } else {
      setActionWithTimeout('Nothing to clean!');
    }
  };

  return {
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
  };
}; 