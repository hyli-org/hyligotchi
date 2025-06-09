import React from 'react';

interface ConnectWalletScreenProps {
  onConnectWallet?: () => void;
}

const ConnectWalletScreen: React.FC<ConnectWalletScreenProps> = ({ onConnectWallet }) => {
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
        fontSize: 'calc(min(1vw, 1vh) * 3)',
        marginBottom: '30px',
        color: '#333',
        textTransform: 'uppercase'
      }}>
        Wallet Required
      </div>

      <div style={{
        width: '80px',
        height: '80px',
        marginBottom: '30px'
      }}>
        <svg viewBox="0 0 24 24" fill="#586541">
          <path d="M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9zm-9-2h10V8H12v8zm4-2.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
        </svg>
      </div>

      <div style={{
        fontSize: 'calc(min(1vw, 1vh) * 2)',
        color: '#333',
        marginBottom: '30px',
        lineHeight: '1.5',
        maxWidth: '300px'
      }}>
        Connect your wallet to start playing with your Hyligotchi!
      </div>

      <button
        onClick={onConnectWallet}
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 'calc(min(1vw, 1vh) * 2.5)',
          color: '#c3d68b',
          backgroundColor: '#586541',
          border: '3px solid #333',
          borderRadius: '5px',
          padding: '15px 30px',
          cursor: 'pointer',
          textTransform: 'uppercase',
          boxShadow: '3px 3px 0px #333',
          transition: 'all 0.1s'
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'translate(2px, 2px)';
          e.currentTarget.style.boxShadow = '1px 1px 0px #333';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'translate(0, 0)';
          e.currentTarget.style.boxShadow = '3px 3px 0px #333';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translate(0, 0)';
          e.currentTarget.style.boxShadow = '3px 3px 0px #333';
        }}
      >
        Connect Wallet
      </button>

      <div style={{
        position: 'absolute',
        bottom: '20px',
        fontSize: 'calc(min(1vw, 1vh) * 1.5)',
        color: '#586541',
        opacity: 0.7
      }}>
        Press button to continue
      </div>
    </div>
  );
};

export default ConnectWalletScreen;