import React, { useRef, useState, useEffect } from 'react';
import FoodMenuScreen from './menus/FoodMenuScreen';
import HealthMenuScreen from './menus/HealthMenuScreen';
import CasinoMenuScreen from './menus/CasinoMenuScreen';
import OrderbookMenuScreen from './menus/OrderbookMenuScreen';
import OrangeNinjaScreen from './menus/OrangeNinja';
import StatsMenuScreen from './menus/StatsMenuScreen';
import TamagotchiScreen from './screens/TamagotchiScreen';
import TutorialScreen from './screens/TutorialScreen';
import WalletRequiredScreen from './screens/WalletRequiredScreen';
import DeathScreen from './screens/DeathScreen';
import InitPendingScreen from './screens/InitPendingScreen';
import type { TutorialScreenRef } from './screens/TutorialScreen';
import VirtualScreenOverlay from './ui/VirtualScreenOverlay';
import ClickableZoneOverlay from './ui/ClickableZoneOverlay';
import { DEVICE_CONFIG } from '../config/deviceConfig';
import { useTamagotchiState } from '../hooks/useTamagotchiState';
import { useMenuState } from '../hooks/useMenuState';
import { useFoodBalances } from '../hooks/useFoodBalances';
import { useHealthBalances } from '../hooks/useHealthBalances';
import { apiClient } from '../api/client';
import { apiResponseToGameState, parseHealthStatus } from '../utils/gameStateManager';
import { WalletProvider } from '../contexts/WalletContext';
import TransactionNotification from './ui/TransactionNotification';
// Import default assets
import defaultDeviceImage from '../assets/hyligotchi-orange.png';
import defaultDeviceImageL from '../assets/hyligotchi-orange-left.png';
import defaultDeviceImageM from '../assets/hyligotchi-orange-middle.png';
import defaultDeviceImageR from '../assets/hyligotchi-orange-right.png';
import transparentDevice from '../assets/hyligotchi-orange-trans.png';;

// Preload gotchi images
const imgL=new Image();
imgL.src=defaultDeviceImageL;
const imgM=new Image();
imgM.src=defaultDeviceImageM;
const imgR=new Image();
imgR.src=defaultDeviceImageR;

interface FullTamagotchiProps {
  onClose: () => void;
  onStateChange?: (state: any) => void;
  showTutorial?: boolean; // Whether to show tutorial - controlled by parent
  onTutorialComplete?: () => void; // Callback when tutorial is completed
  username?: string;
  deviceImage?: string;
  backgroundImage?: string;
  transitionState?: 'expanding' | 'full';
  transitionData?: {
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null;
  isWalletConnected?: boolean;
  onConnectWallet?: () => void;
  identity?: string;
  useAPI?: boolean;
  apiUrl?: string;
  indexerUrl?: string;
  createIdentityBlobs?: () => [any, any];
}

const FullTamagotchi: React.FC<FullTamagotchiProps> = ({
  onClose,
  onStateChange,
  showTutorial = false,
  onTutorialComplete,
  deviceImage = defaultDeviceImage,
  transitionState = 'full',
  transitionData,
  isWalletConnected = false,
  onConnectWallet,
  identity,
  useAPI = true,
  apiUrl,
  indexerUrl,
  createIdentityBlobs
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const tutorialRef = useRef<TutorialScreenRef>(null);

  const [clickedButton, setClickedButton] = useState<"left" | "middle" | "right" | null>(null);
  const [actualImage, setActualImage] = useState<string>(deviceImage);
  // When a button is clicked, change the image source for a couple hundred milliseconds
  useEffect(() => {
    if (clickedButton) {
      const newSrc = {
        "left": defaultDeviceImageL,
        "middle": defaultDeviceImageM,
        "right": defaultDeviceImageR
      };
      setActualImage(newSrc[clickedButton]);
      
      const timeoutId = setTimeout(() => {
        setActualImage(deviceImage); // Reset to original image
        setClickedButton(null); // Clear clicked button state
      }, 200); // Change back after 200ms
      
      return () => clearTimeout(timeoutId); // Cleanup on unmount or re-render
    }
  }, [clickedButton, actualImage, deviceImage]);

  // API state management
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasExistingTamagotchi, setHasExistingTamagotchi] = useState(false);
  const [showInitPending, setShowInitPending] = useState(false);
  const [currentTxHash, setCurrentTxHash] = useState<string | null>(null);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  
  // Use food balances hook with API and identity
  const { balances: foodBalances, consumeFood } = useFoodBalances(useAPI, identity, indexerUrl);
  
  // Use health balances hook with API and identity
  const { balances: healthBalances, consumeHealth } = useHealthBalances(useAPI, identity, indexerUrl);

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

  // Use custom hooks for state management (without tutorial state)
  const {
    characterPosition,
    isBlinking,
    happiness,
    setHappiness,
    hunger,
    setHunger,
    health,
    setHealth,
    lastAction,
    needsCleaning,
    showPoo,
    setShowPoo,
    setNeedsCleaning,
    isCleaningAnimationPlaying,
    setIsCleaningAnimationPlaying,
    username: tamagotchiUsername,
    setUsername,
    bornAt,
    setBornAt,
    handleClean: localHandleClean,
    setActionWithTimeout
  } = useTamagotchiState();
  
  // Track tutorial step for z-index management
  const [tutorialStep, setTutorialStep] = useState(0);

  // Helper function to update poo state from API response
  const updatePooState = (apiGotchi: any) => {
    if (apiGotchi.pooped !== undefined) {
      console.log('Updating poo state from API:', apiGotchi.pooped);
      setShowPoo(apiGotchi.pooped);
      setNeedsCleaning(apiGotchi.pooped);
    }
  };

  // Helper function to update born_at from API response
  const updateBornAt = (apiGotchi: any) => {
    if (apiGotchi.born_at !== undefined) {
      console.log('Updating born_at from API:', apiGotchi.born_at);
      setBornAt(apiGotchi.born_at);
    }
  };


  // API-enabled clean function with optimistic updates
  const handleClean = async () => {
    if (!useAPI || !identity) {
      localHandleClean();
      return;
    }
    
    // Check if there's actually poo to clean
    if (!showPoo) {
      setActionWithTimeout('Nothing to clean!');
      return;
    }
    
    // Optimistically update UI immediately
    setShowPoo(false);
    setNeedsCleaning(false);
    setIsCleaningAnimationPlaying(true);
    setActionWithTimeout('Cleaning...');
    
    try {
      const apiGotchi = await apiClient.cleanPoop(createIdentityBlobs);
      
      // Show transaction notification
      const txHash = apiClient.getLastTxHash();
      if (txHash) {
        setCurrentTxHash(txHash);
      }
      
      // Update stats from API response
      const gameStats = apiResponseToGameState(apiGotchi);
      setHappiness(gameStats.happiness);
      setHunger(gameStats.hunger);
      if (apiGotchi.health) {
        setHealth(parseHealthStatus(apiGotchi.health));
      }
      updatePooState(apiGotchi);
      updateBornAt(apiGotchi);
      
      setActionWithTimeout('Cleaned poo!');
      
      // Animation cleanup
      setTimeout(() => {
        setIsCleaningAnimationPlaying(false);
      }, 1000);
    } catch (err) {
      console.error('Clean error:', err);
      setActionWithTimeout('Failed to clean');
      // Just refresh state from server on error
      await refreshStateFromAPI();
    }
  };

  // API-enabled feeding functions with optimistic updates
  const handleApiFeed = async (foodType: 'ORANJ' | 'OXYGEN') => {
    console.log('handleApiFeed called with:', foodType);
    console.log('API conditions:', { useAPI, identity, isInitialized });
    
    if (!useAPI || !identity || !isInitialized) {
      console.log('API conditions not met, returning false');
      // Fallback to local-only feeding
      return false;
    }
    
    // Check balance before proceeding
    if (foodBalances[foodType] <= 0) {
      console.log('No balance for:', foodType);
      setActionWithTimeout(`No ${foodType} left!`);
      return false;
    }
    
    // Calculate optimistic stat changes
    const hungerIncrease = foodType === 'ORANJ' ? 2 : 1;
    const happinessIncrease = foodType === 'OXYGEN' ? 1 : 0;
    
    // Apply optimistic updates immediately
    setHunger(Math.min(10, hunger + hungerIncrease));
    setHappiness(Math.min(10, happiness + happinessIncrease));
    setActionWithTimeout(`Feeding ${foodType}...`);
    
    // Optimistically consume food balance
    if (consumeFood) {
      console.log('Optimistically consuming food from balance...');
      consumeFood(foodType === 'ORANJ' ? 'ORANJ' : 'OXYGEN', 1);
    }
    
    try {
      // Map UI food types to API types
      const apiType = foodType === 'ORANJ' ? 'food' : 'sweets';
      console.log('Calling API method:', apiType === 'food' ? 'feedFood' : 'feedSweets');
      
      const apiGotchi = await apiClient[apiType === 'food' ? 'feedFood' : 'feedSweets'](1, createIdentityBlobs);
      console.log('API response:', apiGotchi);
      
      // Show transaction notification
      const txHash = apiClient.getLastTxHash();
      if (txHash) {
        setCurrentTxHash(txHash);
      }
      
      // Update stats from API response
      const gameStats = apiResponseToGameState(apiGotchi);
      setHappiness(gameStats.happiness);
      setHunger(gameStats.hunger);
      if (apiGotchi.health) {
        setHealth(parseHealthStatus(apiGotchi.health));
      }
      updatePooState(apiGotchi);
      updateBornAt(apiGotchi);
      
      setActionWithTimeout(`Fed ${foodType}!`);
      
      return true;
    } catch (err) {
      console.error('Feed error:', err);
      setActionWithTimeout('Feeding failed!');
      // Refresh state from server on error
      await refreshStateFromAPI();
      return false;
    }
  };
  
  const handleApiHealth = async (healthType: 'VITAMIN') => {
    if (!useAPI || !identity || !isInitialized) {
      return false;
    }
    
    // Check balance before proceeding
    if (healthBalances[healthType] <= 0) {
      console.log('No balance for:', healthType);
      setActionWithTimeout(`No ${healthType} left!`);
      return false;
    }
    
    // Optimistically update health status if sick
    if (health === 'Sick' || health === 'sick') {
      setHealth('Healthy');
    }
    setActionWithTimeout(`Using ${healthType}...`);
    
    // Optimistically consume health balance
    if (consumeHealth) {
      consumeHealth(healthType, 1);
    }
    
    try {
      const apiGotchi = await apiClient.feedVitamins(1, createIdentityBlobs);
      
      // Show transaction notification
      const txHash = apiClient.getLastTxHash();
      if (txHash) {
        setCurrentTxHash(txHash);
      }
      
      // Update stats from API response
      const gameStats = apiResponseToGameState(apiGotchi);
      setHappiness(gameStats.happiness);
      setHunger(gameStats.hunger);
      if (apiGotchi.health) {
        setHealth(parseHealthStatus(apiGotchi.health));
      }
      updatePooState(apiGotchi);
      updateBornAt(apiGotchi);
      
      setActionWithTimeout(`Used ${healthType}!`);
      
      // After feeding vitamins, re-fetch the state to get updated health
      setTimeout(async () => {
        await refreshStateFromAPI();
      }, 1000);
      
      return true;
    } catch (err) {
      console.error('Health error:', err);
      setActionWithTimeout('Health item use failed!');
      // Refresh state from server on error
      await refreshStateFromAPI();
      return false;
    }
  };

  // Force refresh state from API
  const refreshStateFromAPI = async () => {
    if (!useAPI || !identity || !isInitialized) return;
    
    try {
      const apiGotchi = await apiClient.getState();
      
      if (apiGotchi) {
        // Update stats from API response
        const gameStats = apiResponseToGameState(apiGotchi);
        setHappiness(gameStats.happiness || happiness);
        setHunger(gameStats.hunger || hunger);
        if (apiGotchi.health) {
          console.log('Setting health status from API:', apiGotchi.health);
          setHealth(parseHealthStatus(apiGotchi.health));
        }
        updatePooState(apiGotchi);
        updateBornAt(apiGotchi);
      updateBornAt(apiGotchi);
        
        // Don't update balances from pet stats - they come from indexer
      }
    } catch (err) {
      console.error('Failed to refresh state:', err);
    }
  };

  // Handle resurrect with optimistic updates
  const handleResurrect = async () => {
    if (!useAPI || !identity || !isInitialized) {
      return;
    }
    
    // Optimistically resurrect
    setHealth('Healthy');
    setHappiness(5);
    setHunger(5);
    setShowPoo(false);
    setNeedsCleaning(false);
    setActionWithTimeout('Resurrecting...');
    
    try {
      const apiGotchi = await apiClient.resurrect(createIdentityBlobs);
      
      // Show transaction notification
      const txHash = apiClient.getLastTxHash();
      if (txHash) {
        setCurrentTxHash(txHash);
      }
      
      // Update stats from API response
      const gameStats = apiResponseToGameState(apiGotchi);
      setHappiness(gameStats.happiness);
      setHunger(gameStats.hunger);
      if (apiGotchi.health) {
        setHealth(parseHealthStatus(apiGotchi.health));
      }
      updatePooState(apiGotchi);
      updateBornAt(apiGotchi);
      
      setActionWithTimeout('Resurrected!');
      
      // Refresh state after a moment
      setTimeout(async () => {
        await refreshStateFromAPI();
      }, 1000);
    } catch (err) {
      console.error('Resurrect error:', err);
      setActionWithTimeout('Failed to resurrect');
      // Refresh state from server on error
      await refreshStateFromAPI();
    }
  };

  const [menuState, menuActions] = useMenuState(
    foodBalances,
    () => {}, // setFoodBalances not needed with hook
    healthBalances,
    () => {}, // setHealthBalances not needed with hook
    setActionWithTimeout,
    handleClean,
    handleApiFeed,
    handleApiHealth,
    refreshStateFromAPI
  );

  // Load existing Tamagotchi on mount (triggered by click from mini view)
  useEffect(() => {
    const loadTamagotchi = async () => {
      if (useAPI && identity) {
        console.log('Checking for existing Tamagotchi for identity:', identity);
        
        try {
          // Try to load existing Tamagotchi data
          const apiGotchi = await apiClient.getState();
          
          if (apiGotchi) {
            console.log('Found existing Tamagotchi:', apiGotchi);
            
            // Update stats from API response
            const gameStats = apiResponseToGameState(apiGotchi);
            setHappiness(gameStats.happiness);
            setHunger(gameStats.hunger);
            if (apiGotchi.health) {
              console.log('Initial health from API:', apiGotchi.health, 'Type:', typeof apiGotchi.health);
              setHealth(parseHealthStatus(apiGotchi.health));
            }
            updatePooState(apiGotchi);
          updateBornAt(apiGotchi);
            updateBornAt(apiGotchi);
        updateBornAt(apiGotchi);
      updateBornAt(apiGotchi);
            
            // Set the username from API
            if (apiGotchi.name) {
              setUsername(apiGotchi.name);
            }
            console.log('Initial load - health status:', apiGotchi.health);
            
            // Don't map server pet stats to food/health balances - they come from indexer
            
            setIsInitialized(true);
            setHasExistingTamagotchi(true);
            
            // If we found a Tamagotchi and tutorial was requested, complete it
            if (showTutorial && onTutorialComplete) {
              onTutorialComplete();
            }
          } else {
            console.log('No existing Tamagotchi found');
            setIsInitialized(true);
            // No Tamagotchi exists
          }
        } catch (err: any) {
          console.error('Error loading Tamagotchi:', err);
          // Only show init pending if we're not showing tutorial
          if (!showTutorial) {
            setShowInitPending(true);
            // Remove tutorial completed flag so user can retry with tutorial
            localStorage.removeItem('hyligotchi-tutorial-completed');
          }
          setIsInitialized(true); // Prevent infinite loading
        }
      }
    };
    
    // Only load on mount (when component is opened from mini view)
    loadTamagotchi();
  }, []); // Empty dependency array - only runs once on mount

  // Initialize new Tamagotchi when tutorial is completed
  useEffect(() => {
    const createTamagotchi = async () => {
      if (useAPI && identity && tamagotchiUsername && !hasExistingTamagotchi && tutorialCompleted) {
        
        try {
          console.log('Creating new Tamagotchi with name:', tamagotchiUsername);
          console.log('createIdentityBlobs function:', createIdentityBlobs);
          console.log('typeof createIdentityBlobs:', typeof createIdentityBlobs);
          
          if (!createIdentityBlobs) {
            throw new Error('createIdentityBlobs is not provided');
          }
          
          const apiGotchi = await apiClient.init(tamagotchiUsername, createIdentityBlobs);
          console.log('Successfully created Tamagotchi:', apiGotchi);
          
          // Show transaction notification
          const txHash = apiClient.getLastTxHash();
          if (txHash) {
            setCurrentTxHash(txHash);
          }
          
          // Update stats from API response
          const gameStats = apiResponseToGameState(apiGotchi);
          setHappiness(gameStats.happiness);
          setHunger(gameStats.hunger);
          updatePooState(apiGotchi);
          updateBornAt(apiGotchi);
        updateBornAt(apiGotchi);
      updateBornAt(apiGotchi);
          
          // Don't map server pet stats to food/health balances - they come from indexer
          
          setIsInitialized(true);
          setHasExistingTamagotchi(true);
        } catch (err: any) {
          console.error('Init error:', err);
        }
      }
    };
    
    // Only create if we have a username, tutorial is completed, but no existing Tamagotchi
    if (tamagotchiUsername && !hasExistingTamagotchi && tutorialCompleted) {
      createTamagotchi();
    }
  }, [useAPI, identity, tamagotchiUsername, hasExistingTamagotchi, tutorialCompleted, setHappiness, setHunger, updatePooState]);

  // Periodic sync with server
  useEffect(() => {
    if (!useAPI || !identity || !isInitialized) return;
    
    const syncInterval = setInterval(async () => {
      try {
        const apiGotchi = await apiClient.getState();
        
        if (apiGotchi) {
          console.log('Periodic sync - API response:', apiGotchi);
          console.log('Current health before update:', health);
          // Update stats from API response
          const gameStats = apiResponseToGameState(apiGotchi);
          setHappiness(gameStats.happiness || happiness);
          setHunger(gameStats.hunger || hunger);
          if (apiGotchi.health) {
            console.log('Periodic sync - setting health:', apiGotchi.health, 'Type:', typeof apiGotchi.health);
            // Force update even if same value to trigger re-render
            setHealth(prev => {
              const newHealth = parseHealthStatus(apiGotchi.health);
              console.log('Previous health:', prev, 'New health:', newHealth);
              return newHealth;
            });
          }
          updatePooState(apiGotchi);
          updateBornAt(apiGotchi);
        updateBornAt(apiGotchi);
      updateBornAt(apiGotchi);
          
          // Don't update balances from pet stats - they come from indexer
        }
      } catch (err) {
        console.error('Sync error:', err);
      }
    }, 30000); // Sync every 30 seconds
    
    return () => clearInterval(syncInterval);
  }, [useAPI, identity, isInitialized, setHappiness, setHunger, setHealth]);

  // Debug health state changes
  useEffect(() => {
    console.log('Health state changed to:', health);
  }, [health]);

  // Emit state changes with optimized callback
  const lastEmittedState = useRef<any>(null);
  
  useEffect(() => {
    if (onStateChange) {
      const currentState = {
        happiness,
        hunger,
        characterPosition,
        needsCleaning,
        showPoo,
        foodBalances,
        healthBalances
      };
      
      // Only emit if state has meaningfully changed
      const hasChanged = !lastEmittedState.current || 
        lastEmittedState.current.happiness !== happiness ||
        lastEmittedState.current.hunger !== hunger ||
        lastEmittedState.current.needsCleaning !== needsCleaning ||
        lastEmittedState.current.showPoo !== showPoo ||
        JSON.stringify(lastEmittedState.current.foodBalances) !== JSON.stringify(foodBalances) ||
        JSON.stringify(lastEmittedState.current.healthBalances) !== JSON.stringify(healthBalances);
      
      if (hasChanged) {
        lastEmittedState.current = currentState;
        onStateChange(currentState);
      }
    }
  }, [happiness, hunger, needsCleaning, showPoo, foodBalances, healthBalances, onStateChange]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Calculate transition styles
  const getTransitionStyles = () => {
    if (transitionState === 'expanding' && transitionData) {
      // Start from mini position/size
      return {
        transform: `translate(${transitionData.startX - window.innerWidth / 2}px, ${transitionData.startY - window.innerHeight / 2}px) scale(${transitionData.startWidth / 400})`,
        transition: 'none',
      };
    } else if (transitionState === 'full') {
      // End at center with full size
      return {
        transform: 'translate(0, 0) scale(1)',
        transition: 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)',
      };
    }
    return {};
  };

  const renderScreen = () => {
    console.log('Current health state:', health);
    // Check if wallet is connected first
    if (!isWalletConnected) {
      return <WalletRequiredScreen />;
    }
    
    // Show tutorial screen if enabled and no existing Tamagotchi
    if (showTutorial && useAPI && identity && !hasExistingTamagotchi) {
      return <TutorialScreen 
        ref={tutorialRef} 
        onCompleteTutorial={() => {
          setTutorialCompleted(true);
          if (onTutorialComplete) {
            onTutorialComplete();
          }
        }} 
        username={tamagotchiUsername} 
        setUsername={setUsername}
        onStepChange={setTutorialStep}
      />;
    }
    
    // Show init pending screen if needed
    if (showInitPending) {
      return <InitPendingScreen onRetry={() => {
        setShowInitPending(false);
        setIsInitialized(false);
      }} />;
    }
    
    // Show death screen if dead
    if (health === 'Dead' || health === 'dead') {
      return <DeathScreen username={tamagotchiUsername} onResurrect={handleResurrect} />;
    }
    
    if (menuState.inFoodMenu) {
      return <FoodMenuScreen selectedFood={menuState.selectedFood} foodBalances={foodBalances} />;
    }
    if (menuState.inHealthMenu) {
      return <HealthMenuScreen selectedHealth={menuState.selectedHealth} healthBalances={healthBalances} />;
    }
    if (menuState.inStatsMenu) {
      return <StatsMenuScreen hunger={hunger} happiness={happiness} username={tamagotchiUsername} bornAt={bornAt} />;
    }
    if (menuState.inCasinoMenu) {
      return <CasinoMenuScreen />;
    }
    if (menuState.inOrderbookMenu) {
      return <OrderbookMenuScreen />;
    }
    if (menuState.inOrangeNinjaMenu) {
      return <OrangeNinjaScreen />;
    }
    return (
      <TamagotchiScreen 
        characterPosition={characterPosition}
        isBlinking={isBlinking}
        happiness={happiness}
        healthStatus={health}
        lastAction={lastAction}
        selectedAction={menuState.selectedAction}
        showPoo={showPoo}
        isCleaningAnimationPlaying={isCleaningAnimationPlaying}
      />
    );
  };

  return (
    <WalletProvider createIdentityBlobs={createIdentityBlobs}>
      <div
        style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        backgroundColor: 'rgba(0, 0, 0, 0.8)', // Dark overlay instead of blurred background
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'rgba(0,0,0,0.5)',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: 40,
          height: 40,
          cursor: 'pointer',
          fontSize: '20px',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ×
      </button>
      
      {/* Share to X Button */}
      <button
        onClick={() => {
          // Generate dynamic share text based on metrics
          const happinessMessages = {
            low: [
              `My Hyligotchi is in full existential crisis mode. Thoughts and prayers welcome.`
            ],
            mid: [
              `Things aren't going too well for ${tamagotchiUsername || 'my Hyligotchi'}, but I'm taking good care of it and we're on the right track. Phew!`,
              `Mid-tier vibes, but we're coping.`,
              `Not quite thriving, not quite dying. My Hyligotchi is just... there.`
            ],
            high: [
              `${tamagotchiUsername || 'My Hyligotchi'} is in a good mood − not perfect, but good, cozy, calm, serene. It's all good vibes from here.`,
              `My Hyligotchi is emotionally stable. Weird flex, I know.`
            ],
            perfect: [
              `Have you met ${tamagotchiUsername || 'my Hyligotchi'}? It's in an amazing mood right now, I've taken good care of it!`,
              `Perfect mood, clean logs, full health. Who even is this functional little guy?`,
              `My Hyligotchi is living its best zk life. You love to see it.`
            ]
          };

          const deathMessages = [
            `I have some tragic news: my Hyligotchi just died.`,
            `I might want to practice keeping my Hyligotchi alive before considering having kids.`,
            `One small step for me, one fatal misstep for my Hyligotchi.`
          ];

          const healthyMessages = [
            `Happy to report that my Hyligotchi ${tamagotchiUsername || ''} is on a health streak!`,
            `I guess my Hyligotchi is hitting the gym a lot because it's on a health streak!`,
            `My Hyligotchi is doing well. I'm better at keeping it alive than I am at houseplants!`,
            `Can I put "keeping my Hyligotchi alive" on my CV?`,
            `Some people grow tomatoes. I'm growing a thriving Hyligotchi.`
          ];

          const sickMessages = [
            `Uh-oh. Can I save my Hyligotchi? What do you think?`,
            `Really thankful for Hyli being French right now, because my Hyligotchi needs healthcare.`,
            `Hyligotchi is sick. I repeat, we have a zkEMERGENCY.`,
            `${tamagotchiUsername || 'My Hyligotchi'} is sick. I'm stressed. We're both suffering.`
          ];

          const pooMessages = [
            `My Hyligotchi just went PooPoo`,
            `zk more like zkaka`,
            `The true Hyli testnet experience is having to change my Hyligotchi's diapers`,
            `Proof-of-poo verified. It's a mess in there.`,
            `Hyligotchi log update: one very orange deposit.`
          ];

          const hungerMessages = {
            starving: [
              `I forgot to feed ${tamagotchiUsername || 'my Hyligotchi'}. Again.`,
              `Apparently, proofs aren't enough to feed a Hyligotchi.`,
              `I regret to inform you my Hyligotchi has entered famine mode.`
            ],
            hungry: [
              `My Hyligotchi is hungry, but it's being chill about it. For now.`,
              `${tamagotchiUsername || 'My Hyligotchi'} is not starving, but it's definitely eyeing the emergency oranges.`,
              `This level of hunger is technically manageable. Emotionally? Less so.`
            ],
            satisfied: [
              `I fed ${tamagotchiUsername || 'my Hyligotchi'} and it didn't die. I'm calling that a win.`,
              `Healthy appetite, clean logs, zero complaints. That's the Hyli way.`
            ],
            full: [
              `I may have overfed ${tamagotchiUsername || 'my Hyligotchi'}. It's round and very sleepy.`,
              `Hyligotchi's full. Possibly too full.`,
              `${tamagotchiUsername || 'My Hyligotchi'} has achieved peak satiety. Nice!`
            ]
          };

          let shareText = '';
          
          // Check death first
          if (health === 'Dead' || health === 'dead') {
            shareText = deathMessages[Math.floor(Math.random() * deathMessages.length)];
          } 
          // Check health status
          else if (health === 'Sick' || health === 'sick') {
            shareText = sickMessages[Math.floor(Math.random() * sickMessages.length)];
          }
          // Otherwise randomly choose between poo, hunger, and happiness-based messages
          else {
            // Random selection between different message types
            const messageOptions = [];
            
            // Add poo option if applicable
            if (showPoo) {
              messageOptions.push('poo');
            }
            
            // Always add happiness and hunger options
            messageOptions.push('happiness', 'hunger');
            
            // If healthy and happy, add health option
            if ((health === 'Healthy' || health === 'healthy') && happiness > 6) {
              messageOptions.push('health');
            }
            
            // Randomly select message type
            const selectedType = messageOptions[Math.floor(Math.random() * messageOptions.length)];
            
            if (selectedType === 'poo') {
              shareText = pooMessages[Math.floor(Math.random() * pooMessages.length)];
            } else if (selectedType === 'hunger') {
              // Select hunger message based on hunger level
              let hungerMsg;
              if (hunger <= 3) {
                hungerMsg = hungerMessages.starving;
              } else if (hunger <= 6) {
                hungerMsg = hungerMessages.hungry;
              } else if (hunger <= 8) {
                hungerMsg = hungerMessages.satisfied;
              } else {
                hungerMsg = hungerMessages.full;
              }
              shareText = hungerMsg[Math.floor(Math.random() * hungerMsg.length)];
            } else if (selectedType === 'health') {
              shareText = healthyMessages[Math.floor(Math.random() * healthyMessages.length)];
            } else {
              // Happiness-based messages
              let messages;
              if (happiness <= 3) {
                messages = happinessMessages.low;
              } else if (happiness <= 6) {
                messages = happinessMessages.mid;
              } else if (happiness <= 8) {
                messages = happinessMessages.high;
              } else {
                messages = happinessMessages.perfect;
              }
              shareText = messages[Math.floor(Math.random() * messages.length)];
            }
          }
          
          shareText += `\n\nPlay Hyligotchi on @hyli_org!`;
          
          const shareUrl = 'https://hyli.fun';
          const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
          window.open(tweetUrl, '_blank', 'width=600,height=400');
        }}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          background: '#DF6445',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          padding: '16px 32px',
          cursor: 'pointer',
          fontSize: '18px',
          fontWeight: 'bold',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Press Start 2P', monospace",
          boxShadow: '0 4px 12px rgba(223, 100, 69, 0.4)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(223, 100, 69, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(223, 100, 69, 0.4)';
        }}
        title="Share to X"
      >
        SHARE TO X
      </button>
      
      {/* Transaction Notification */}
      <TransactionNotification 
        txHash={currentTxHash} 
        onClose={() => setCurrentTxHash(null)} 
      />
      
      {/* Device Container */}
      <div style={{ 
        position: 'relative',
        ...getTransitionStyles()
      }}>
        <img
          ref={imgRef}
          src={transparentDevice}
          alt="Hyligotchi Full View"
          draggable={false}
          style={{
            backgroundImage: `url(${actualImage}), url(${deviceImage})`,
            backgroundSize: 'contain',
            maxWidth: '100%',
            maxHeight: 'calc(100vh - 40px)',
            objectFit: 'contain',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            position: 'relative',
            zIndex: 2,
          }}
        />
        
        <VirtualScreenOverlay
          imgRef={imgRef}
          naturalScreenX={DEVICE_CONFIG.screen.x}
          naturalScreenY={DEVICE_CONFIG.screen.y}
          naturalScreenWidth={DEVICE_CONFIG.screen.width}
          naturalScreenHeight={DEVICE_CONFIG.screen.height}
          style={{ zIndex: (showTutorial && tutorialStep === 2) ? 2 : 1 }}
        >
          {renderScreen()}
        </VirtualScreenOverlay>
        
        <ClickableZoneOverlay
          imgRef={imgRef}
          naturalZoneX={DEVICE_CONFIG.buttons.left.x}
          naturalZoneY={DEVICE_CONFIG.buttons.left.y}
          naturalZoneWidth={DEVICE_CONFIG.buttons.left.width}
          naturalZoneHeight={DEVICE_CONFIG.buttons.left.height}
          onClick={() => {
            setClickedButton('left');
            return !isWalletConnected ? () => {} : showInitPending ? () => { setShowInitPending(false); setIsInitialized(false); } : showTutorial ? () => tutorialRef.current?.handleLeftButton() : menuActions.handleZoneClick
          }}
        />
        <ClickableZoneOverlay
          imgRef={imgRef}
          naturalZoneX={DEVICE_CONFIG.buttons.middle.x}
          naturalZoneY={DEVICE_CONFIG.buttons.middle.y}
          naturalZoneWidth={DEVICE_CONFIG.buttons.middle.width}
          naturalZoneHeight={DEVICE_CONFIG.buttons.middle.height}
          onClick={() => {
            setClickedButton('middle');
            return !isWalletConnected ? (onConnectWallet || (() => {})) : showInitPending ? () => { setShowInitPending(false); setIsInitialized(false); } : showTutorial ? () => tutorialRef.current?.handleMiddleButton() : (health === 'Dead' || health === 'dead') ? handleResurrect : () => {
              menuActions.handleZone2Click();
            }
          }}
          backgroundColor="rgba(0, 255, 0, 0.5)"
        />
        <ClickableZoneOverlay
          imgRef={imgRef}
          naturalZoneX={DEVICE_CONFIG.buttons.right.x}
          naturalZoneY={DEVICE_CONFIG.buttons.right.y}
          naturalZoneWidth={DEVICE_CONFIG.buttons.right.width}
          naturalZoneHeight={DEVICE_CONFIG.buttons.right.height}
          onClick={() => {
            setClickedButton('right');
            return !isWalletConnected ? () => {} : showInitPending ? () => { setShowInitPending(false); setIsInitialized(false); } : showTutorial ? () => tutorialRef.current?.handleRightButton() : menuActions.handleZone3Click
          }}
          backgroundColor="rgba(0, 0, 255, 0.5)"
        />
      </div>
    </div>
    </WalletProvider>
  );
};

export default FullTamagotchi; 