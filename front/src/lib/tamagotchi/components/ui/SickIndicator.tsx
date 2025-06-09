import React from 'react';
import sickIcon from '../../assets/sick-icon.svg';

interface SickIndicatorProps {
  visible: boolean;
  position?: { x: number; y: number };
}

const SickIndicator: React.FC<SickIndicatorProps> = ({ 
  visible, 
  position = { x: 85, y: 20 } // Default position on the top right
}) => {
  if (!visible) return null;

  return (
    <div style={{
      position: 'absolute',
      left: `${position.x}%`,
      top: `${position.y}%`,
      width: '30%',
      height: '30%',
      transform: 'translate(-50%, -50%)',
      zIndex: 3, // Above character but below UI
      pointerEvents: 'none', // Don't interfere with clicks
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none'
    }}>
      <img
        src={sickIcon}
        alt="Sick indicator"
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

export default SickIndicator;