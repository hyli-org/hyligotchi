import React from 'react';
import './CleaningAnimation.css';

interface CleaningAnimationProps {
  isPlaying: boolean;
  position?: { x: number; y: number };
}

const CleaningAnimation: React.FC<CleaningAnimationProps> = ({ 
  isPlaying, 
  position = { x: 75, y: 60 }
}) => {
  if (!isPlaying) return null;

  return (
    <div style={{
      position: 'absolute',
      left: `${position.x}%`,
      top: `${position.y}%`,
      width: '60%',
      height: '60%',
      transform: 'translate(-50%, -50%)',
      zIndex: 4, // Above poo indicator
      pointerEvents: 'none',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none'
    }}>
      {/* Sparkle particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className={`cleaning-sparkle cleaning-sparkle-${i % 4}`}
          style={{
            position: 'absolute',
            width: '8px',
            height: '8px',
            backgroundColor: '#333',
            left: `${20 + (i % 3) * 20}%`,
            top: `${20 + Math.floor(i / 3) * 20}%`,
          }}
        />
      ))}
      
      {/* Central cleaning burst */}
      <div 
        className="cleaning-burst"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '40%',
          height: '40%',
          transform: 'translate(-50%, -50%)',
          border: '3px solid #333',
          borderRadius: '50%',
        }} 
      />
      
      {/* Retro sweep lines */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={`sweep-${i}`}
          className="cleaning-sweep"
          style={{
            position: 'absolute',
            left: '10%',
            top: `${30 + i * 15}%`,
            width: '80%',
            height: '3px',
            backgroundColor: '#333',
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
};

export default CleaningAnimation; 