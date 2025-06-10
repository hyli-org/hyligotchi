import React, { useState, useRef, useCallback } from 'react';
import MiniTamagotchi from './components/MiniTamagotchi';
import FullTamagotchi from './components/FullTamagotchi';

export interface TamagotchiLibraryProps {
  enabled: boolean;
  
  // Mini widget configuration
  position?: 'fixed' | 'absolute' | 'relative';
  style?: React.CSSProperties;
  miniSize?: number; // Default: 120px
  miniRef?: (el: HTMLDivElement | null) => void; // Ref callback for mini widget
  
  // Interaction
  expandOnClick?: boolean; // Default: true
  onExpand?: () => void;
  onCollapse?: () => void;
  onStateChange?: (state: any) => void;
  
  // Tutorial configuration
  showTutorial?: boolean; // Default: true - whether to show tutorial for new users
  onTutorialComplete?: () => void; // Callback when tutorial is completed
  
  // User configuration
  username?: string; // Not used for now
  
  // Asset configuration
  deviceImage?: string; // Default: '/hyligotchi-full.png'
  backgroundImage?: string; // Default: '/background.png'
  
  // Wallet configuration
  isWalletConnected?: boolean;
  onConnectWallet?: () => void;
  
  // API configuration
  identity?: string; // User identity for API authentication
  useAPI?: boolean; // Whether to use API integration (default: true if identity provided)
  apiUrl?: string; // API URL for the Hyligotchi server (default: 'http://localhost:4008')
  indexerUrl?: string; // Indexer URL for balance queries (default: 'http://localhost:4008')
  
  // Advanced wallet functions
  createIdentityBlobs?: () => [any, any]; // Function to create signed identity blobs
}

type TransitionState = 'mini' | 'expanding' | 'full' | 'collapsing';

interface TransitionData {
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
}

const TamagotchiLibrary: React.FC<TamagotchiLibraryProps> = ({
  enabled,
  position = 'fixed',
  style = { bottom: 20, right: 20 },
  miniSize = 120,
  miniRef,
  expandOnClick = true,
  onExpand,
  onCollapse,
  onStateChange,
  showTutorial = true,
  onTutorialComplete,
  username,
  deviceImage,
  backgroundImage,
  isWalletConnected = false,
  onConnectWallet,
  identity,
  useAPI = true,
  apiUrl,
  indexerUrl,
  createIdentityBlobs
}) => {
  const [transitionState, setTransitionState] = useState<TransitionState>('mini');
  const [transitionData, setTransitionData] = useState<TransitionData | null>(null);
  const localMiniRef = useRef<HTMLDivElement>(null);
  
  if (!enabled) return null;
  
  const handleExpand = useCallback(() => {
    if (!expandOnClick || !localMiniRef.current) return;
    
    // Get mini widget's current position
    const rect = localMiniRef.current.getBoundingClientRect();
    setTransitionData({
      startX: rect.left + rect.width / 2,
      startY: rect.top + rect.height / 2,
      startWidth: rect.width,
      startHeight: rect.height,
    });
    
    setTransitionState('expanding');
    onExpand?.();
    
    // Start the transition
    setTimeout(() => {
      setTransitionState('full');
    }, 50);
  }, [expandOnClick, onExpand]);
  
  const handleCollapse = useCallback(() => {
    setTransitionState('collapsing');
    onCollapse?.();
    
    // Complete the transition back to mini
    setTimeout(() => {
      setTransitionState('mini');
      setTransitionData(null);
    }, 300);
  }, [onCollapse]);
  
  return (
    <>
      {/* Mini Widget */}
      {(transitionState === 'mini' || transitionState === 'collapsing') && (
        <MiniTamagotchi 
          ref={(el) => {
            localMiniRef.current = el;
            if (miniRef) miniRef(el);
          }}
          size={miniSize}
          position={position}
          style={{
            ...style,
            opacity: transitionState === 'collapsing' ? 0 : 1,
            transition: transitionState === 'collapsing' ? 'opacity 0.3s ease' : 'none',
          }}
          onClick={handleExpand}
          deviceImage={deviceImage}
        />
      )}
      
      {/* Full Screen Modal with Transition */}
      {(transitionState === 'expanding' || transitionState === 'full') && (
        <FullTamagotchi 
          onClose={handleCollapse}
          onStateChange={onStateChange}
          showTutorial={showTutorial}
          onTutorialComplete={onTutorialComplete}
          username={username}
          deviceImage={deviceImage}
          backgroundImage={backgroundImage}
          transitionState={transitionState}
          transitionData={transitionData}
          isWalletConnected={isWalletConnected}
          onConnectWallet={onConnectWallet}
          identity={identity}
          useAPI={useAPI}
          apiUrl={apiUrl}
          indexerUrl={indexerUrl}
          createIdentityBlobs={createIdentityBlobs}
        />
      )}
    </>
  );
};

export default TamagotchiLibrary; 