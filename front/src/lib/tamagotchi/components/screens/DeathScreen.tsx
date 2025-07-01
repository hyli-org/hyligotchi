import React from 'react';
import deadSvg from '../../assets/dead.svg';

interface DeathScreenProps {
  username?: string;
  onResurrect?: () => void;
  isResurrecting?: boolean;
}

const DeathScreen: React.FC<DeathScreenProps> = ({ isResurrecting = false }) => {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#c3d68b', // Dark background for death screen
      color: '#ffffff',
      fontFamily: "'Press Start 2P', monospace",
      textAlign: 'center',
      padding: '10px',
      boxSizing: 'border-box',
    }}>
      {/* Dead icon */}
      <div style={{
        width: '70%',
        height: '70%',
        marginBottom: '10px',
      }}>
        <img
          src={deadSvg}
          alt="Dead Hyligotchi"
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))',
          }}
        />
      </div>
      
      {/* 
      Death message
      <div style={{
        fontSize: 'calc(min(1.5vw, 1.5vh) * 2)',
        marginBottom: '10px',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
      }}>
        {username} has died
      </div>
      
      <div style={{
        fontSize: 'calc(min(1vw, 1vh) * 2)',
        marginBottom: '20px',
        opacity: 0.8,
      }}>
        They were too sick for too long
      </div>
      
      {onResurrect && (
        <div style={{
          marginTop: '20px',
          padding: '10px 20px',
          backgroundColor: '#333',
          border: '2px solid #666',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: 'calc(min(1vw, 1vh) * 2)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#444';
          e.currentTarget.style.borderColor = '#888';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#333';
          e.currentTarget.style.borderColor = '#666';
        }}
        onClick={onResurrect}>
          Resurrect
        </div>
      )} */}
      
      {/* Instructions or Pending Message */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        fontSize: 'calc(min(0.8vw, 0.8vh) * 1.5)',
        opacity: 1,
        color: '#000000',
      }}>
        {isResurrecting ? (
          <>
            <div style={{ marginBottom: '10px' }}>
              Resurrection ritual in progress...
            </div>
            <div style={{ fontSize: 'calc(min(0.7vw, 0.7vh) * 1.5)', opacity: 0.8 }}>
              Your Hyligotchi is being brought back to life.
              <br />
              Check back soon!
            </div>
          </>
        ) : (
          'Press middle button to resurrect'
        )}
      </div>
    </div>
  );
};

export default DeathScreen;