import React, { useEffect, useState } from 'react';

interface TransactionNotificationProps {
  txHash: string | null;
  onClose: () => void;
}

// Add pulse animation styles
const pulseKeyframes = `
  @keyframes pulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
    100% {
      transform: scale(1);
    }
  }
`;

const TransactionNotification: React.FC<TransactionNotificationProps> = ({ txHash, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (txHash) {
      setIsVisible(true);
      // Auto-hide after 1 second
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 200); // Wait for fade out animation
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [txHash, onClose]);

  if (!txHash) return null;

  const shortHash = `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;

  return (
    <>
      <style>{pulseKeyframes}</style>
    <div
      onClick={() => {
        window.open(`https://explorer.hyli.org/tx/${txHash}`, '_blank');
      }}
      style={{
        position: 'absolute',
        top: '70px',
        right: '20px',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        color: '#fff',
        padding: '16px 24px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        fontFamily: "'Press Start 2P', monospace",
        fontSize: '12px',
        zIndex: 10002,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(-10px)',
        transition: 'all 0.2s ease-in-out',
        pointerEvents: isVisible ? 'auto' : 'none',
        minWidth: '280px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        cursor: 'pointer',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1.02)';
        e.currentTarget.style.boxShadow = '0 6px 24px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
      }}
    >
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.3)',
      }}>
        <div style={{
          fontSize: '24px',
          animation: 'pulse 1s ease-in-out',
        }}>
          ✓
        </div>
      </div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        flex: 1,
      }}>
        <div style={{ 
          color: '#00ff88',
          fontSize: '14px',
          fontWeight: 'bold',
          letterSpacing: '0.5px',
        }}>
          TX SENT
        </div>
        <div style={{ 
          fontSize: '10px', 
          opacity: 0.7,
          letterSpacing: '0.3px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          {shortHash}
          <span style={{ fontSize: '8px', opacity: 0.5 }}>↗</span>
        </div>
      </div>
    </div>
    </>
  );
};

export default TransactionNotification;