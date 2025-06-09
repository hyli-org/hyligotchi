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
// Import default assets
import defaultDeviceImage from '../assets/hyligotchi-orange.png';

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
  createIdentityBlobs
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const tutorialRef = useRef<TutorialScreenRef>(null);
  
  // API state management
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasExistingTamagotchi, setHasExistingTamagotchi] = useState(false);
  
  // Use food balances hook with API and identity
  const { balances: foodBalances, consumeFood } = useFoodBalances(useAPI, identity);
  
  // Use health balances hook with API and identity
  const { balances: healthBalances, consumeHealth } = useHealthBalances(useAPI, identity);

  // Set up API client with identity
  useEffect(() => {
    if (useAPI && identity) {
      console.log('Setting API client identity:', identity);
      apiClient.setIdentity(identity);
    }
  }, [identity, useAPI]);

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

  // API-enabled tick function
  const handleTick = async () => {
    if (!useAPI || !identity) {
      setActionWithTimeout('Cannot tick without API');
      return;
    }
    
    try {
      setActionWithTimeout('Ticking...');
      await apiClient.tick(createIdentityBlobs);
      
      
      setActionWithTimeout('Time advanced!');
    } catch (err) {
      console.error('Tick error:', err);
      setActionWithTimeout('Failed to tick');
    }
  };

  // API-enabled clean function
  const handleClean = async () => {
    if (!useAPI || !identity) {
      localHandleClean();
      return;
    }
    
    try {
      setActionWithTimeout('Cleaning...');
      const apiGotchi = await apiClient.cleanPoop(createIdentityBlobs);
      
      // Update stats from API response
      const gameStats = apiResponseToGameState(apiGotchi);
      setHappiness(gameStats.happiness);
      setHunger(gameStats.hunger);
      if (apiGotchi.health) {
        setHealth(parseHealthStatus(apiGotchi.health));
      }
      updatePooState(apiGotchi);
      updateBornAt(apiGotchi);
      
      // Update balances
      //await refreshBalances();
      
      setActionWithTimeout('Cleaned poo!');
      
      // Play cleaning animation if poo was cleaned
      if (!apiGotchi.pooped && showPoo) {
        setIsCleaningAnimationPlaying(true);
        setTimeout(() => {
          setIsCleaningAnimationPlaying(false);
        }, 1000);
      }
    } catch (err) {
      console.error('Clean error:', err);
      setActionWithTimeout('Failed to clean');
    }
  };

  // API-enabled feeding functions
  const handleApiFeed = async (foodType: 'ORANJ' | 'HYLLAR') => {
    console.log('handleApiFeed called with:', foodType);
    console.log('API conditions:', { useAPI, identity, isInitialized });
    
    if (!useAPI || !identity || !isInitialized) {
      console.log('API conditions not met, returning false');
      // Fallback to local-only feeding
      return false;
    }
    
    try {
      // Map UI food types to API types
      const apiType = foodType === 'ORANJ' ? 'food' : 'sweets';
      console.log('Calling API method:', apiType === 'food' ? 'feedFood' : 'feedSweets');
      
      const apiGotchi = await apiClient[apiType === 'food' ? 'feedFood' : 'feedSweets'](1, createIdentityBlobs);
      console.log('API response:', apiGotchi);
      
      // Update stats from API response
      const gameStats = apiResponseToGameState(apiGotchi);
      setHappiness(gameStats.happiness);
      setHunger(gameStats.hunger);
      if (apiGotchi.health) {
        setHealth(parseHealthStatus(apiGotchi.health));
      }
      updatePooState(apiGotchi);
      updateBornAt(apiGotchi);
      
      // Don't update balances from pet stats - they come from indexer
      // Trigger a refresh of balances after feeding
      if (consumeFood) {
        console.log('Consuming food from balance...');
        await consumeFood(foodType === 'ORANJ' ? 'ORANJ' : 'HYLLAR', 1);
      }
      
      return true;
    } catch (err) {
      console.error('Feed error:', err);
      return false;
    }
  };
  
  const handleApiHealth = async () => {
    if (!useAPI || !identity || !isInitialized) {
      return false;
    }
    
    try {
      const apiGotchi = await apiClient.feedVitamins(1, createIdentityBlobs);
      
      // Update stats from API response
      const gameStats = apiResponseToGameState(apiGotchi);
      setHappiness(gameStats.happiness);
      setHunger(gameStats.hunger);
      if (apiGotchi.health) {
        setHealth(parseHealthStatus(apiGotchi.health));
      }
      updatePooState(apiGotchi);
      updateBornAt(apiGotchi);
      
      // Don't update balances from pet stats - they come from indexer
      // Trigger a refresh of balances after using health item
      if (consumeHealth) {
        await consumeHealth('VITAMIN_D', 1);
      }
      
      // After feeding vitamins, re-fetch the state to get updated health
      setTimeout(async () => {
        await refreshStateFromAPI();
      }, 1000);
      
      return true;
    } catch (err) {
      console.error('Health error:', err);
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

  // Handle resurrect
  const handleResurrect = async () => {
    if (!useAPI || !identity || !isInitialized) {
      return;
    }
    
    try {
      setActionWithTimeout('Resurrecting...');
      const apiGotchi = await apiClient.resurrect(createIdentityBlobs);
      
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

  // Load existing Tamagotchi when identity is set
  useEffect(() => {
    const loadTamagotchi = async () => {
      if (useAPI && identity && !isInitialized) {
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
          } else {
            console.log('No existing Tamagotchi found, will show tutorial');
            // No Tamagotchi exists - ready to show tutorial
          }
        } catch (err) {
          console.error('Error loading Tamagotchi:', err);
        }
      }
    };
    
    loadTamagotchi();
  }, [useAPI, identity, isInitialized, setHappiness, setHunger, setUsername, setHealth]);

  // Initialize new Tamagotchi when username is set in tutorial
  useEffect(() => {
    const createTamagotchi = async () => {
      if (useAPI && identity && tamagotchiUsername && !hasExistingTamagotchi) {
        
        try {
          console.log('Creating new Tamagotchi with name:', tamagotchiUsername);
          console.log('createIdentityBlobs function:', createIdentityBlobs);
          console.log('typeof createIdentityBlobs:', typeof createIdentityBlobs);
          
          if (!createIdentityBlobs) {
            throw new Error('createIdentityBlobs is not provided');
          }
          
          const apiGotchi = await apiClient.init(tamagotchiUsername, createIdentityBlobs);
          console.log('Successfully created Tamagotchi:', apiGotchi);
          
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
        } catch (err) {
          console.error('Init error:', err);
        }
      }
    };
    
    // Only create if we have a username but no existing Tamagotchi
    if (tamagotchiUsername && !hasExistingTamagotchi) {
      createTamagotchi();
    }
  }, [useAPI, identity, tamagotchiUsername, hasExistingTamagotchi, setHappiness, setHunger]);

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
    
    // Show tutorial screen if enabled and no Tamagotchi created yet
    if (showTutorial && useAPI && identity && !isInitialized) {
      return <TutorialScreen ref={tutorialRef} onCompleteTutorial={onTutorialComplete || (() => {})} username={tamagotchiUsername} setUsername={setUsername} />;
    } else if (showTutorial) {
      onTutorialComplete?.();
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
      
      {/* Tick Button - Only show when API is enabled */}
      {useAPI && identity && (
        <button
          onClick={handleTick}
          style={{
            position: 'absolute',
            top: 20,
            right: 70,
            background: 'rgba(0,0,0,0.5)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '14px',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Press Start 2P', monospace",
          }}
          title="Advance time (debug)"
        >
          ⏰ TICK
        </button>
      )}
      
      {/* Device Container */}
      <div style={{ 
        position: 'relative',
        ...getTransitionStyles()
      }}>
        <img
          ref={imgRef}
          src={deviceImage}
          alt="Hyligotchi Full View"
          draggable={false}
          style={{
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
        >
          {renderScreen()}
        </VirtualScreenOverlay>
        
        <ClickableZoneOverlay
          imgRef={imgRef}
          naturalZoneX={DEVICE_CONFIG.buttons.left.x}
          naturalZoneY={DEVICE_CONFIG.buttons.left.y}
          naturalZoneWidth={DEVICE_CONFIG.buttons.left.width}
          naturalZoneHeight={DEVICE_CONFIG.buttons.left.height}
          onClick={!isWalletConnected ? () => {} : showTutorial ? () => tutorialRef.current?.handleLeftButton() : menuActions.handleZoneClick}
        />
        <ClickableZoneOverlay
          imgRef={imgRef}
          naturalZoneX={DEVICE_CONFIG.buttons.middle.x}
          naturalZoneY={DEVICE_CONFIG.buttons.middle.y}
          naturalZoneWidth={DEVICE_CONFIG.buttons.middle.width}
          naturalZoneHeight={DEVICE_CONFIG.buttons.middle.height}
          onClick={!isWalletConnected ? (onConnectWallet || (() => {})) : showTutorial ? () => tutorialRef.current?.handleMiddleButton() : (health === 'Dead' || health === 'dead') ? handleResurrect : () => {
            console.log('Middle button clicked!');
            menuActions.handleZone2Click();
          }}
          backgroundColor="rgba(0, 255, 0, 0.5)"
        />
        <ClickableZoneOverlay
          imgRef={imgRef}
          naturalZoneX={DEVICE_CONFIG.buttons.right.x}
          naturalZoneY={DEVICE_CONFIG.buttons.right.y}
          naturalZoneWidth={DEVICE_CONFIG.buttons.right.width}
          naturalZoneHeight={DEVICE_CONFIG.buttons.right.height}
          onClick={!isWalletConnected ? () => {} : showTutorial ? () => tutorialRef.current?.handleRightButton() : menuActions.handleZone3Click}
          backgroundColor="rgba(0, 0, 255, 0.5)"
        />
      </div>
    </div>
    </WalletProvider>
  );
};

export default FullTamagotchi; 