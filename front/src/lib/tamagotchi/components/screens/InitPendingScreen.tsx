import React from 'react';

interface InitPendingScreenProps {
  onRetry: () => void;
}

const InitPendingScreen: React.FC<InitPendingScreenProps> = ({ onRetry }) => {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#c3d68b',
      padding: '10%',
      boxSizing: 'border-box',
      textAlign: 'center',
      fontFamily: "'Press Start 2P', monospace",
    }}>
      {/* Loading Icon */}
      <div style={{
        fontSize: 'calc(min(4vw, 4vh))',
        marginBottom: '10%',
        animation: 'spin 2s linear infinite',
      }}>
        ⏳
      </div>

      {/* Error Message */}
      <div style={{
        fontSize: 'calc(min(1.2vw, 1.2vh))',
        color: '#333',
        lineHeight: '1.8',
        marginBottom: '10%',
        maxWidth: '80%',
      }}>
        HYLIGOTCHI NOT READY
        <br /><br />
        Your Hyligotchi might still
        <br />
        be initializing on-chain
        <br /><br />
        Please retry in a moment
      </div>

      {/* Retry Button */}
      <div 
        onClick={onRetry}
        style={{
          fontSize: 'calc(min(1vw, 1vh))',
          color: '#fff',
          backgroundColor: '#DF6445',
          padding: '3% 6%',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        RETRY NOW
      </div>

      {/* Help text */}
      <div style={{
        fontSize: 'calc(min(0.8vw, 0.8vh))',
        color: '#666',
        marginTop: '10%',
      }}>
        Or press any button to retry
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default InitPendingScreen;