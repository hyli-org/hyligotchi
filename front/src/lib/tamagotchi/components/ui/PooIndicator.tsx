import React from 'react';
import pooSvg from '../../assets/poo.svg';

interface PooIndicatorProps {
  visible: boolean;
  position?: { x: number; y: number };
}

const PooIndicator: React.FC<PooIndicatorProps> = ({ 
  visible, 
  position = { x: 75, y: 60 } // Default position on the right side
}) => {
  if (!visible) return null;

  return (
    <div style={{
      position: 'absolute',
      left: `${position.x}%`,
      top: `${position.y}%`,
      width: '45%',
      height: '45%',
      transform: 'translate(-50%, -50%)',
      zIndex: 3, // Above character but below UI
      pointerEvents: 'none', // Don't interfere with clicks
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none'
    }}>
      <img
        src={pooSvg}
        alt="Poo indicator"
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))', // Subtle shadow for better visibility
        }}
      />
    </div>
  );
};

export default PooIndicator; 