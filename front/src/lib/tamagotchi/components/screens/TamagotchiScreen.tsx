import React, { useMemo } from 'react';
import Character from '../ui/Character';
import PooIndicator from '../ui/PooIndicator';
import SickIndicator from '../ui/SickIndicator';
import CleaningAnimation from '../ui/CleaningAnimation';
import { 
  FoodIcon, 
  CasinoIcon, 
  HealthIcon, 
  OrderbookIcon, 
  StatsIcon, 
  OrangeNinjaIcon, 
  CleanIcon 
} from '../ui/icons';

interface TamagotchiScreenProps {
  characterPosition: { x: number; y: number };
  isBlinking: boolean;
  happiness: number;
  healthStatus?: 'Healthy' | 'Sick' | 'Dead' | 'healthy' | 'sick' | 'dead';
  lastAction: string;
  selectedAction: string | null;
  showPoo: boolean;
  isCleaningAnimationPlaying: boolean;
}

const TamagotchiScreenComponent: React.FC<TamagotchiScreenProps> = ({
  characterPosition,
  isBlinking,
  happiness,
  healthStatus = 'Healthy',
  lastAction,
  selectedAction,
  showPoo,
  isCleaningAnimationPlaying
}) => {
  // Memoize icon opacity calculations
  const iconOpacities = useMemo(() => ({
    food: selectedAction === null ? 0.25 : (selectedAction === "food" ? 1 : 0.25),
    health: selectedAction === null ? 0.25 : (selectedAction === "health_status" ? 1 : 0.25),
    clean: selectedAction === null ? 0.25 : (selectedAction === "clean" ? 1 : 0.25),
    stats: selectedAction === null ? 0.25 : (selectedAction === "stats" ? 1 : 0.25),
    casino: selectedAction === null ? 0.25 : (selectedAction === "light" ? 1 : 0.25),
    orderbook: selectedAction === null ? 0.25 : (selectedAction === "orderbook" ? 1 : 0.25),
    orangeNinja: selectedAction === null ? 0.25 : (selectedAction === "orange_ninja" ? 1 : 0.25)
  }), [selectedAction]);
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      backgroundColor: '#c3d68b', // Greenish LCD background color
      border: '1px solid #a7b86d',
      boxShadow: 'inset 0 0 10px rgba(0,0,0,0.2)',
      overflow: 'hidden',
      fontFamily: "'Press Start 2P', monospace" // Pixel font
    }}>
      {/* Status Icons Row - Icons appear in their fixed positions with dynamic opacity */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between', 
        padding: '3%',
        height: '18%', 
      }}>
        <div style={{ 
          width: '22%', 
          height: '100%', 
          position: 'relative',
          transform: 'scale(1.3)', 
          transformOrigin: 'center center'
        }}>
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            opacity: iconOpacities.food
          }}>
            <FoodIcon />
          </div>
        </div>
        
        <div style={{ 
          width: '22%', 
          height: '100%',
          transform: 'scale(1.3)', 
          transformOrigin: 'center center'
        }}>
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            opacity: iconOpacities.health
          }}>
            <HealthIcon />
          </div>
        </div>
        
        <div style={{ 
          width: '22%', 
          height: '100%',
          transform: 'scale(1.3)', 
          transformOrigin: 'center center'
        }}>
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            opacity: iconOpacities.clean
          }}>
            <CleanIcon />
          </div>
        </div>
        
        <div style={{ 
          width: '22%', 
          height: '100%', 
          position: 'relative',
          transform: 'scale(1.3)', 
          transformOrigin: 'center center'
        }}>
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            opacity: iconOpacities.stats
          }}>
            <StatsIcon />
          </div>
        </div>
      </div>

      {/* Main Character Display - Slightly reduced to give more space to icons */}
      <div style={{
        flex: 1,
        position: 'relative',
      }}>
        {/* Background pattern (waves) */}
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          opacity: 0.1,
          zIndex: 0,
        }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: '120%',
              height: '20%',
              top: `${i * 20}%`,
              left: '-10%',
              borderRadius: '50%',
              border: '4px solid #333',
              transform: i % 2 === 0 ? 'scaleX(1.2)' : 'scaleX(1.5)',
            }}></div>
          ))}
        </div>
        
        {/* Animated Character */}
        <Character 
          x={characterPosition.x} 
          y={characterPosition.y} 
          isBlinking={isBlinking}
          happiness={happiness}
        />
        
        {/* Poo Indicator */}
        <PooIndicator visible={showPoo} />
        
        {/* Sick Indicator */}
        <SickIndicator visible={healthStatus === 'Sick' || healthStatus === 'sick'} />
        
        {/* Cleaning Animation */}
        <CleaningAnimation isPlaying={isCleaningAnimationPlaying} />
        
        {/* Action feedback */}
        {lastAction && (
          <div style={{
            position: 'absolute',
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '5px',
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '4px',
            fontSize: 'calc(min(1vw, 1vh) * 2)',
            color: '#333',
          }}>
            {lastAction}
          </div>
        )}
      </div>

      {/* Bottom Icons/Menu - Icons appear in their fixed positions with dynamic opacity */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around', 
        padding: '3%',
        height: '18%',
      }}>
        <div style={{ 
          width: '25%', 
          height: '100%', 
          transform: 'scale(1.4)', 
          transformOrigin: 'center center'
        }}>
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            opacity: iconOpacities.casino
          }}>
            <CasinoIcon />
          </div>
        </div>
        
        <div style={{ 
          width: '25%', 
          height: '100%', 
          transform: 'scale(1.4)', 
          transformOrigin: 'center center'
        }}>
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            opacity: iconOpacities.orderbook
          }}>
            <OrderbookIcon />
          </div>
        </div>
        
        <div style={{ 
          width: '25%', 
          height: '100%', 
          transform: 'scale(1.4)', 
          transformOrigin: 'center center'
        }}>
          <div style={{
            width: '90%', height: '90%',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            opacity: iconOpacities.orangeNinja
          }}>
            <OrangeNinjaIcon />
          </div>
        </div>
      </div>
    </div>
  );
};

// Memoize the component with custom comparison
const TamagotchiScreen = React.memo(TamagotchiScreenComponent, (prevProps, nextProps) => {
  return (
    prevProps.characterPosition.x === nextProps.characterPosition.x &&
    prevProps.characterPosition.y === nextProps.characterPosition.y &&
    prevProps.isBlinking === nextProps.isBlinking &&
    prevProps.happiness === nextProps.happiness &&
    prevProps.healthStatus === nextProps.healthStatus &&
    prevProps.lastAction === nextProps.lastAction &&
    prevProps.selectedAction === nextProps.selectedAction &&
    prevProps.showPoo === nextProps.showPoo &&
    prevProps.isCleaningAnimationPlaying === nextProps.isCleaningAnimationPlaying
  );
});

export default TamagotchiScreen; 