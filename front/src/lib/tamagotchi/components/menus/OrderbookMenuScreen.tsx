import React from 'react';

interface OrderbookMenuScreenProps {
  // No props needed for this simple menu
}

const OrderbookMenuScreen: React.FC<OrderbookMenuScreenProps> = () => {
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
      
      {/* Orderbook Menu Title - more blocky */}
      <div style={{
        fontSize: 'calc(min(1vw, 1vh) * 3.5)',
        color: '#333',
        textAlign: 'center',
        marginTop: '8%',
        marginBottom: '5%',
        letterSpacing: '4px',
        lineHeight: '1.2'
      }}>
        HYLIQUID
      </div>
      
      {/* Orderbook Message */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 'calc(min(1vw, 1vh) * 2.5)',
        color: '#333',
        textAlign: 'center',
        lineHeight: '1.5',
        letterSpacing: '2px',
        padding: '5%'
      }}>
        <div style={{ marginBottom: '2%' }}>TO BUY MORE</div>
        <div style={{ marginBottom: '2%' }}>VITAMIN D, TRADE</div>
        <div style={{ marginBottom: '8%' }}>ON HYLIQUID</div>
        
      </div>
      
      {/* Simple divider line */}
      <div style={{
        width: '80%',
        height: '2px',
        backgroundColor: '#333',
        margin: '8% auto 8% auto'
      }}></div>
      
      {/* Button Instructions - simplified */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        position: 'relative',
        fontSize: 'calc(min(1vw, 1vh) * 1.4)',
        color: '#666',
        letterSpacing: '2px',
        lineHeight: '1.2'
      }}>
        <div>ENTER</div>
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

export default OrderbookMenuScreen; 