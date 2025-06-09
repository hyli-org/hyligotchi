import React, { forwardRef } from 'react';
// Import default asset
import defaultDeviceImage from '../assets/hyligotchi-orange.png';

interface MiniTamagotchiProps {
  size: number;
  position: 'fixed' | 'absolute' | 'relative';
  style?: React.CSSProperties;
  onClick?: () => void;
  deviceImage?: string;
}

const MiniTamagotchi = forwardRef<HTMLDivElement, MiniTamagotchiProps>(({
  size,
  position,
  style,
  onClick,
  deviceImage = defaultDeviceImage
}, ref) => {
  return (
    <div
      ref={ref}
      style={{
        position,
        width: size,
        height: size,
        cursor: onClick ? 'pointer' : 'default',
        zIndex: 1000,
        ...style
      }}
      onClick={onClick}
    >
      <img
        src={deviceImage}
        alt="Tamagotchi Device"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          transition: 'transform 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (onClick) {
            e.currentTarget.style.transform = 'scale(1.05)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        draggable={false}
      />
    </div>
  );
});

MiniTamagotchi.displayName = 'MiniTamagotchi';

export default MiniTamagotchi; 