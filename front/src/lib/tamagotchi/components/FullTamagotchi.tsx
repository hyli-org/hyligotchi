import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
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
import { useApiSync } from '../hooks/useApiSync';
import { useApiActions } from '../hooks/useApiActions';
import { apiClient } from '../api/client';
import { apiResponseToGameState } from '../utils/gameStateManager';
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
  
  // State for initialization
  const [showInitPending, setShowInitPending] = useState(false);
  
  // Use food balances hook with API and identity
  const { balances: foodBalances, hasFood } = useFoodBalances(useAPI, identity, indexerUrl);
  
  // Use health balances hook with API and identity
  const { balances: healthBalances, hasHealth } = useHealthBalances(useAPI, identity, indexerUrl);
  
  // Wrapper functions to convert between API types and what useApiActions expects
  const consumeFoodWrapper = useCallback((food: string): boolean => {
    if (food === 'orange' && hasFood('ORANJ')) {
      return true;
    } else if (food === 'sweets' && hasFood('OXYGEN')) {
      return true;
    }
    return false;
  }, [hasFood]);
  
  const consumeHealthWrapper = useCallback((item: string): boolean => {
    if ((item === 'vaccine' || item === 'medicine') && hasHealth('VITAMIN')) {
      return true;
    }
    return false;
  }, [hasHealth]);

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
    setActionWithTimeout
  } = useTamagotchiState();
  
  // Track tutorial step for z-index management
  const [tutorialStep, setTutorialStep] = useState(0);

  // Helper function to update poo state from API response
  const updatePooState = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    if (typeof value === 'boolean') {
      console.log('Updating poo state:', value);
      setShowPoo(value);
      setNeedsCleaning(value);
    } else {
      setShowPoo(value);
      setNeedsCleaning(value);
    }
  }, [setShowPoo, setNeedsCleaning]);
  
  // Use API sync hook
  const {
    hasExistingTamagotchi,
    refreshStateFromAPI,
    setIsInitialized,
    setHasExistingTamagotchi
  } = useApiSync({
    useAPI,
    identity,
    apiUrl,
    setHappiness,
    setHunger,
    setHealth,
    setUsername,
    setBornAt,
    updatePooState
  });
  
  // Use API actions hook
  const {
    handleClean: apiHandleClean,
    handleApiFeed,
    handleApiHealth,
    handleResurrect
  } = useApiActions({
    useAPI,
    identity,
    consumeFood: consumeFoodWrapper,
    consumeHealth: consumeHealthWrapper,
    refreshStateFromAPI,
    setActionWithTimeout,
    showPoo,
    setShowPoo,
    setNeedsCleaning,
    setIsCleaningAnimationPlaying,
    createIdentityBlobs
  });



  // Wrapper functions for menu state that return Promise<boolean>
  const handleApiFeedWrapper = useCallback(async (foodType: 'ORANJ' | 'OXYGEN'): Promise<boolean> => {
    try {
      if (foodType === 'ORANJ') {
        await handleApiFeed('orange');
      } else if (foodType === 'OXYGEN') {
        await handleApiFeed('sweets');
      }
      return true;
    } catch (error) {
      console.error('Feed error:', error);
      return false;
    }
  }, [handleApiFeed]);
  
  const handleApiHealthWrapper = useCallback(async (_healthType: 'VITAMIN'): Promise<boolean> => {
    try {
      await handleApiHealth('vaccine');
      return true;
    } catch (error) {
      console.error('Health error:', error);
      return false;
    }
  }, [handleApiHealth]);

  const [menuState, menuActions] = useMenuState(
    foodBalances,
    () => {}, // setFoodBalances not needed with hook
    healthBalances,
    () => {}, // setHealthBalances not needed with hook
    setActionWithTimeout,
    apiHandleClean,
    handleApiFeedWrapper,
    handleApiHealthWrapper,
    refreshStateFromAPI
  );


  // Store username when set in tutorial, but don't create Tamagotchi yet
  // The actual creation will happen when tutorial completes
  
  // Handle tutorial completion with API init
  const handleTutorialComplete = useCallback(async () => {
    if (useAPI && identity && tamagotchiUsername && !hasExistingTamagotchi) {
      try {
        console.log('Tutorial completed, creating new Tamagotchi with name:', tamagotchiUsername);
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
        updatePooState(apiGotchi.pooped || false);
        if (apiGotchi.born_at) {
          setBornAt(apiGotchi.born_at);
        }
        
        // Don't map server pet stats to food/health balances - they come from indexer
        
        setIsInitialized(true);
        setHasExistingTamagotchi(true);
      } catch (err: any) {
        console.error('Init error:', err);
        setShowInitPending(true);
      }
    }
    
    // Call the parent's onTutorialComplete if provided
    if (onTutorialComplete) {
      onTutorialComplete();
    }
  }, [useAPI, identity, tamagotchiUsername, hasExistingTamagotchi, createIdentityBlobs, setHappiness, setHunger, updatePooState, setBornAt, setIsInitialized, setHasExistingTamagotchi, onTutorialComplete]);

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
  const getTransitionStyles = useMemo(() => () => {
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
  }, [transitionState, transitionData]);

  const handleInitPendingRetry = useCallback(() => {
    setShowInitPending(false);
    setIsInitialized(false);
  }, [setShowInitPending, setIsInitialized]);

  const handleLeftButtonClick = useCallback(() => {
    if (!isWalletConnected) return;
    if (showInitPending) {
      handleInitPendingRetry();
    } else if (showTutorial) {
      tutorialRef.current?.handleLeftButton();
    } else {
      menuActions.handleZoneClick();
    }
  }, [isWalletConnected, showInitPending, handleInitPendingRetry, showTutorial, menuActions]);

  const handleMiddleButtonClick = useCallback(() => {
    if (!isWalletConnected) {
      onConnectWallet?.();
      return;
    }
    if (showInitPending) {
      handleInitPendingRetry();
    } else if (showTutorial) {
      tutorialRef.current?.handleMiddleButton();
    } else if (health === 'Dead' || health === 'dead') {
      handleResurrect();
    } else {
      console.log('Middle button clicked!');
      menuActions.handleZone2Click();
    }
  }, [isWalletConnected, onConnectWallet, showInitPending, handleInitPendingRetry, showTutorial, health, handleResurrect, menuActions]);

  const handleRightButtonClick = useCallback(() => {
    if (!isWalletConnected) return;
    if (showInitPending) {
      handleInitPendingRetry();
    } else if (showTutorial) {
      tutorialRef.current?.handleRightButton();
    } else {
      menuActions.handleZone3Click();
    }
  }, [isWalletConnected, showInitPending, handleInitPendingRetry, showTutorial, menuActions]);

  const handleBackgroundClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const handleShareButtonMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(1.05)';
    e.currentTarget.style.boxShadow = '0 6px 16px rgba(223, 100, 69, 0.6)';
  }, []);

  const handleShareButtonMouseLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.boxShadow = '0 4px 12px rgba(223, 100, 69, 0.4)';
  }, []);

  const handleShareToX = useCallback(() => {
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
  }, [tamagotchiUsername, health, happiness, hunger, showPoo]);

  const renderScreen = useCallback(() => {
    console.log('Current health state:', health);
    // Check if wallet is connected first
    if (!isWalletConnected) {
      return <WalletRequiredScreen />;
    }
    
    // Show tutorial screen if enabled and no existing Tamagotchi
    if (showTutorial && useAPI && identity && !hasExistingTamagotchi) {
      return <TutorialScreen 
        ref={tutorialRef} 
        onCompleteTutorial={handleTutorialComplete} 
        username={tamagotchiUsername} 
        setUsername={setUsername}
        onStepChange={setTutorialStep}
      />;
    }
    
    // Show init pending screen if needed
    if (showInitPending) {
      return <InitPendingScreen onRetry={handleInitPendingRetry} />;
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
  }, [isWalletConnected, showTutorial, useAPI, identity, hasExistingTamagotchi, handleTutorialComplete, tamagotchiUsername, setUsername, setTutorialStep, showInitPending, setShowInitPending, setIsInitialized, health, handleResurrect, menuState, foodBalances, healthBalances, hunger, happiness, bornAt, characterPosition, isBlinking, lastAction, showPoo, isCleaningAnimationPlaying]);

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
      onClick={handleBackgroundClick}
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
        onClick={handleShareToX}
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
        onMouseEnter={handleShareButtonMouseEnter}
        onMouseLeave={handleShareButtonMouseLeave}
        title="Share to X"
      >
        SHARE TO X
      </button>
      
      {/* 
          Device Container */}
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
          onClick={handleLeftButtonClick}
        />
        <ClickableZoneOverlay
          imgRef={imgRef}
          naturalZoneX={DEVICE_CONFIG.buttons.middle.x}
          naturalZoneY={DEVICE_CONFIG.buttons.middle.y}
          naturalZoneWidth={DEVICE_CONFIG.buttons.middle.width}
          naturalZoneHeight={DEVICE_CONFIG.buttons.middle.height}
          onClick={handleMiddleButtonClick}
          backgroundColor="rgba(0, 255, 0, 0.5)"
        />
        <ClickableZoneOverlay
          imgRef={imgRef}
          naturalZoneX={DEVICE_CONFIG.buttons.right.x}
          naturalZoneY={DEVICE_CONFIG.buttons.right.y}
          naturalZoneWidth={DEVICE_CONFIG.buttons.right.width}
          naturalZoneHeight={DEVICE_CONFIG.buttons.right.height}
          onClick={handleRightButtonClick}
          backgroundColor="rgba(0, 0, 255, 0.5)"
        />
      </div>
    </div>
    </WalletProvider>
  );
};

export default FullTamagotchi; 