import React from 'react';

const WalletRequiredScreen: React.FC = () => {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#c3d68b',
      border: '1px solid #a7b86d',
      borderRadius: '10px',
      padding: '20px',
      boxSizing: 'border-box',
      boxShadow: 'inset 0 0 10px rgba(0,0,0,0.2)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: "'Press Start 2P', monospace",
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: 'calc(min(1vw, 1vh) * 2.5)',
        marginBottom: '20px',
        color: '#333',
        textTransform: 'uppercase',
        lineHeight: 1.4
      }}>
        WALLET REQUIRED
      </div>

      <div style={{
        width: '60px',
        height: '60px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <svg viewBox="0 0 24 24" fill="#586541" width="100%" height="100%">
          <path d="M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9zm-9-2h10V8H12v8zm4-2.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
        </svg>
      </div>

      <div style={{
        fontSize: 'calc(min(1vw, 1vh) * 1.8)',
        color: '#586541',
        marginBottom: '25px',
        lineHeight: 1.6
      }}>
        PRESS MIDDLE BUTTON
      </div>

      <div style={{
        fontSize: 'calc(min(1vw, 1vh) * 1.8)',
        color: '#586541',
        lineHeight: 1.6
      }}>
        TO CONNECT
      </div>

      {/* Visual indicator for middle button */}
      <div style={{
        position: 'absolute',
        bottom: '15px',
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
      }}>
        <div style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#a7b86d',
          opacity: 0.5
        }} />
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: '#586541',
          animation: 'pulse 2s infinite'
        }} />
        <div style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#a7b86d',
          opacity: 0.5
        }} />
      </div>

      <style>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(88, 101, 65, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(88, 101, 65, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(88, 101, 65, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default WalletRequiredScreen;