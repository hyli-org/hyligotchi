import React, { useState, useRef, useEffect } from 'react';
import { DEVICE_CONFIG } from '../../config/deviceConfig';

interface CharacterProps {
  x: number;
  y: number;
  isBlinking: boolean;
  happiness: number;
}

const Character: React.FC<CharacterProps> = ({ x, y, isBlinking, happiness }) => {
  // Create a ref to store previous position for direction detection
  const prevPositionRef = useRef({ x, y });
  
  // Add state for walking animation
  const [currentDisplayX, setCurrentDisplayX] = useState(x);
  const walkingAnimationRef = useRef<NodeJS.Timeout | null>(null);
  
  // Walking animation logic
  useEffect(() => {
    // Clear any existing walking animation
    if (walkingAnimationRef.current) {
      clearTimeout(walkingAnimationRef.current);
    }
    
    // If target position is different from current display position, start walking
    if (x !== currentDisplayX) {
      const startX = currentDisplayX;
      const targetX = x;
      const distance = Math.abs(targetX - startX);
      const stepSize = 2; // Size of each step
      const stepDuration = 250; // Duration between steps in ms - increased from 100 to 250
      
      // Calculate number of steps needed
      const numSteps = Math.ceil(distance / stepSize);
      let currentStep = 0;
      
      const walkStep = () => {
        currentStep++;
        
        if (currentStep >= numSteps) {
          // Final step - ensure we reach exact target
          setCurrentDisplayX(targetX);
        } else {
          // Intermediate step
          const direction = targetX > startX ? 1 : -1;
          const newX = startX + (direction * stepSize * currentStep);
          // Make sure we don't overshoot
          const clampedX = direction === 1 ? Math.min(newX, targetX) : Math.max(newX, targetX);
          setCurrentDisplayX(clampedX);
          
          // Schedule next step
          walkingAnimationRef.current = setTimeout(walkStep, stepDuration);
        }
      };
      
      // Start the walking animation
      walkingAnimationRef.current = setTimeout(walkStep, stepDuration);
    }
    
    // Update previous position reference (only x matters now)
    prevPositionRef.current = { x, y: prevPositionRef.current.y };
    
    // Cleanup walking animation on unmount
    return () => {
      if (walkingAnimationRef.current) {
        clearTimeout(walkingAnimationRef.current);
      }
    };
  }, [x, currentDisplayX]);

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

export default Character; 