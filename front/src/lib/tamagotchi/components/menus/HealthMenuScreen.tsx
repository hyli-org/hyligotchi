import React from 'react';
import type { HealthBalances } from '../../utils/healthBalances';

// Health Menu Screen Component
interface HealthMenuScreenProps {
  selectedHealth: 'VITAMIN';
  healthBalances: HealthBalances;
}

const HealthMenuScreen: React.FC<HealthMenuScreenProps> = ({ selectedHealth, healthBalances }) => {
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
      padding: '8%'
    }}>
      {/* Simple pixelated border pattern */}
      <div style={{
        position: 'absolute',
        top: '4%',
        left: '4%',
        right: '4%',
        height: '4px',
        background: 'repeating-linear-gradient(90deg, #333 0px, #333 4px, transparent 4px, transparent 8px)',
      }}></div>
      
      {/* Health Menu Title - more blocky */}
      <div style={{
        fontSize: 'calc(min(1vw, 1vh) * 4)',
        color: '#333',
        textAlign: 'center',
        marginTop: '8%',
        marginBottom: '15%',
        letterSpacing: '4px',
        lineHeight: '1.2'
      }}>
        HOSPITAL
      </div>
      
      {/* Health Options - simple list style */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12%',
        fontSize: 'calc(min(1vw, 1vh) * 3)',
        color: '#333'
      }}>
        {/* VITAMIN Option */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4%'
        }}>
          {/* Simple cursor indicator */}
          <div style={{
            width: '16px',
            height: '16px',
            marginRight: '10%',
            backgroundColor: selectedHealth === 'VITAMIN' ? '#333' : 'transparent',
            border: '2px solid #333'
          }}></div>
          <span style={{ letterSpacing: '3px', lineHeight: '1.3', flex: 1 }}>VITAMIN</span>
          <span style={{ 
            letterSpacing: '2px', 
            lineHeight: '1.3',
            fontSize: 'calc(min(1vw, 1vh) * 2.5)',
            color: '#555'
          }}>
            x{healthBalances.VITAMIN}
          </span>
        </div>
      </div>
      
      {/* Simple divider line */}
      <div style={{
        width: '80%',
        height: '2px',
        backgroundColor: '#333',
        margin: '18% auto 10% auto'
      }}></div>
      
      {/* Button Instructions - simplified */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        position: 'relative',
        fontSize: 'calc(min(1vw, 1vh) * 2)',
        color: '#666',
        letterSpacing: '2px',
        lineHeight: '1.2'
      }}>
        <div>OK</div>
        <div style={{
          position: 'absolute',
          right: 0
        }}>BACK</div>
      </div>
      
      {/* Bottom pixelated border */}
      <div style={{
        position: 'absolute',
        bottom: '4%',
        left: '4%',
        right: '4%',
        height: '4px',
        background: 'repeating-linear-gradient(90deg, #333 0px, #333 4px, transparent 4px, transparent 8px)',
      }}></div>
    </div>
  );
};

export default HealthMenuScreen; 