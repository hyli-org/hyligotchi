import React from 'react';
import Character from '../ui/Character';

// Stats Menu Screen Component
interface StatsMenuScreenProps {
  hunger: number; // 1-10 scale from useTamagotchiState
  happiness: number; // 1-10 scale from useTamagotchiState
  username?: string;
  bornAt?: number; // Block number when the pet was born
}

const StatsMenuScreen: React.FC<StatsMenuScreenProps> = ({ hunger, happiness, username, bornAt }) => {
  // Display values directly out of 10
  const hungerValue = Math.round(hunger);
  const happinessValue = Math.round(happiness);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      backgroundColor: '#c3d68b', // Same LCD background
      border: '1px solid #a7b86d',
      boxShadow: 'inset 0 0 10px rgba(0,0,0,0.2)',
      overflow: 'hidden',
      fontFamily: "'Press Start 2P', monospace",
      padding: '3%'
    }}>
      {/* Simple pixelated border pattern */}
      <div style={{
        position: 'absolute',
        top: '2%',
        left: '2%',
        right: '2%',
        height: '2px',
        background: 'repeating-linear-gradient(90deg, #333 0px, #333 4px, transparent 4px, transparent 8px)',
      }}></div>
      
      {/* Username as Title */}
      <div style={{
        fontSize: 'calc(min(1vw, 1vh) * 2.5)',
        color: '#333',
        textAlign: 'center',
        marginTop: '1%',
        letterSpacing: '2px',
        lineHeight: '1.2',
        textTransform: 'uppercase'
      }}>
        {username || 'UNKNOWN'}
      </div>

      {/* Character Display - taking most of the space */}
      <div style={{
        position: 'relative',
        height: '60%',
        width: '100%',
        marginBottom: '3%'
      }}>
        <Character 
          x={25} 
          y={30} 
          isBlinking={false} 
          happiness={happiness} 
        />
      </div>
      
      {/* Compact Stats Display */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        gap: '2%',
        fontSize: 'calc(min(1vw, 1vh) * 1.3)',
        color: '#333',
        backgroundColor: 'rgba(0,0,0,0.08)',
        border: '2px solid #333',
        borderRadius: '4px',
        padding: '2% 1%',
        marginBottom: '2%'
      }}>
        {/* Hunger Stat */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px'
        }}>
          <div style={{ 
            fontSize: 'calc(min(1vw, 1vh) * 1.1)',
            letterSpacing: '1px'
          }}>
            HUNGER
          </div>
          <div style={{
            fontSize: 'calc(min(1vw, 1vh) * 1.4)',
            fontWeight: 'bold',
            color: hungerValue <= 3 ? '#c63946' : '#333'
          }}>
            {hungerValue}/10
          </div>
        </div>
        
        {/* Vertical divider */}
        <div style={{
          width: '2px',
          height: '40px',
          backgroundColor: '#333',
          opacity: 0.3
        }}></div>

        {/* Happiness Stat */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px'
        }}>
          <div style={{ 
            fontSize: 'calc(min(1vw, 1vh) * 1.1)',
            letterSpacing: '1px'
          }}>
            HAPPY
          </div>
          <div style={{
            fontSize: 'calc(min(1vw, 1vh) * 1.4)',
            fontWeight: 'bold',
            color: happinessValue <= 3 ? '#c63946' : '#333'
          }}>
            {happinessValue}/10
          </div>
        </div>

        {/* Vertical divider */}
        <div style={{
          width: '2px',
          height: '40px',
          backgroundColor: '#333',
          opacity: 0.3
        }}></div>

        {/* Born At */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px'
        }}>
          <div style={{ 
            fontSize: 'calc(min(1vw, 1vh) * 1.1)',
            letterSpacing: '1px'
          }}>
            BORN AT
          </div>
          <div style={{
            fontSize: 'calc(min(1vw, 1vh) * 1.2)',
            fontWeight: 'bold'
          }}>
            {bornAt ? `BLOCK ${bornAt}` : 'UNKNOWN'}
          </div>
        </div>
      </div>
      
      {/* Simple divider line */}
      <div style={{
        width: '60%',
        height: '1px',
        backgroundColor: '#333',
        margin: '1% auto',
        opacity: 0.5
      }}></div>
      
      {/* Bottom pixelated border */}
      <div style={{
        position: 'absolute',
        bottom: '2%',
        left: '2%',
        right: '2%',
        height: '2px',
        background: 'repeating-linear-gradient(90deg, #333 0px, #333 4px, transparent 4px, transparent 8px)',
      }}></div>
    </div>
  );
};

export default StatsMenuScreen; 