import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DEVICE_CONFIG } from '../../config/deviceConfig';
import { useAnimationFrame } from '../../hooks/useAnimationFrame';

interface CharacterProps {
  x: number;
  y: number;
  isBlinking: boolean;
  happiness: number;
}

const CharacterComponent: React.FC<CharacterProps> = ({ x, isBlinking, happiness }) => {
  
  // Add state for walking animation
  const [currentDisplayX, setCurrentDisplayX] = useState(x);
  const isWalkingRef = useRef(false);
  const walkingProgressRef = useRef(0);
  const startXRef = useRef(x);
  const targetXRef = useRef(x);
  
  // Update target when x changes
  useEffect(() => {
    if (x !== targetXRef.current) {
      startXRef.current = currentDisplayX;
      targetXRef.current = x;
      walkingProgressRef.current = 0;
      isWalkingRef.current = true;
    }
  }, [x, currentDisplayX]);
  
  // Walking animation using RAF
  const animateWalking = useCallback((deltaTime?: number) => {
    if (!isWalkingRef.current) return;
    
    const walkSpeed = 0.02; // Speed multiplier for walking animation
    const dt = deltaTime || 16; // Default to 16ms if not provided
    walkingProgressRef.current += dt * walkSpeed;
    
    if (walkingProgressRef.current >= 1) {
      // Animation complete
      setCurrentDisplayX(targetXRef.current);
      isWalkingRef.current = false;
      walkingProgressRef.current = 0;
    } else {
      // Interpolate position
      const newX = startXRef.current + (targetXRef.current - startXRef.current) * walkingProgressRef.current;
      setCurrentDisplayX(newX);
    }
  }, []);
  
  // Use RAF for smooth animation
  useAnimationFrame(animateWalking);

  return (
    <div style={{
      position: 'absolute',
      width: '50%',
      height: '50%',
      left: `${currentDisplayX}%`, // Use currentDisplayX instead of x
      top: '35%', // Fixed y position
      transform: 'translate(-50%, -50%)', // Center the div on the x,y coordinates
      transition: 'none', // Remove transition since we're handling animation manually
    }}>
      <div style={{
        width: '100%',
        height: '100%',
        position: 'relative'
      }}>
        {/* Main character SVG - switch between normal and blinking only */}
        <img
          src={
            isBlinking ? DEVICE_CONFIG.images.characterBlink :
            DEVICE_CONFIG.images.character
          }
          alt="Hyligotchi Character"
          draggable={false}
          style={{ 
            width: '100%', 
            height: 'auto',
            position: 'absolute',
            left: '100%',
            top: '100%',
            transform: 'translate(-50%, -50%)', // Center the image in its container
            transition: 'opacity 0.1s ease-in-out',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none'
          }} 
        />
        
        {/* Overlaid happiness expression - always show */}
        <div style={{ 
          position: 'absolute', 
          bottom: '30%', 
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%', 
          textAlign: 'center',
          zIndex: 10
        }}>
          {happiness > 7 ? (
            // Happy mouth
            <div style={{ 
              width: '30%', 
              height: '10%', 
              background: 'black',
              borderRadius: '0 0 50% 50%',
              margin: '0 auto'
            }}></div>
          ) : happiness > 4 ? (
            // Neutral mouth
            <div style={{ 
              width: '25%', 
              height: '5%', 
              background: 'black',
              margin: '0 auto'
            }}></div>
          ) : (
            // Sad mouth
            <div style={{ 
              width: '30%', 
              height: '10%', 
              background: 'black',
              borderRadius: '50% 50% 0 0',
              margin: '0 auto'
            }}></div>
          )}
        </div>
      </div>
    </div>
  );
};

// Memoize the component with custom comparison
const Character = React.memo(CharacterComponent, (prevProps, nextProps) => {
  return (
    prevProps.x === nextProps.x &&
    prevProps.y === nextProps.y &&
    prevProps.isBlinking === nextProps.isBlinking &&
    prevProps.happiness === nextProps.happiness
  );
});

export default Character; 