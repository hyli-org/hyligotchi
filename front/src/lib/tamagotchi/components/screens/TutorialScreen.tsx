import React, { useState, useImperativeHandle, useRef } from 'react';
import Character from '../ui/Character';

interface TutorialScreenProps {
  onCompleteTutorial: () => void;
  username: string;
  setUsername: (name: string) => void;
  onStepChange?: (step: number) => void;
}

export interface TutorialScreenRef {
  handleLeftButton: () => void;
  handleMiddleButton: () => void;
  handleRightButton: () => void;
}

// Story-driven introduction steps
const STORY_STEPS = [
  "...transmission detected... *static* ...help me...",
  "You've discovered a lost alien creature! It crash-landed near an orange grove.",
  "What should we call this little friend? Give them a name!",
  "Please take care of the alien! Make sure to keep him happy and healthy! ",
  "You can play minigames on Hyli testnet to earn some food and health for your alien friend!",
  "You're now guardian of {username}! Take good care of your citrus-loving friend! 🌟🍊"
];

const TutorialScreen = React.forwardRef<TutorialScreenRef, TutorialScreenProps>(({ 
  onCompleteTutorial,
  username,
  setUsername,
  onStepChange
}, ref) => {
  const [currentStep, setCurrentStep] = useState(0);
  
  // Notify parent of step changes
  React.useEffect(() => {
    onStepChange?.(currentStep);
  }, [currentStep, onStepChange]);
  const [isBlinking, setIsBlinking] = useState(false);
  const [tempName, setTempName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when reaching step 2
  React.useEffect(() => {
    if (currentStep === 2 && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [currentStep]);

  // Handle left button - now also advances the story
  const handleLeftButton = () => {
    if (currentStep === 2) { // Naming step
      if (tempName.trim()) {
        setUsername(tempName.trim());
        setCurrentStep(prev => prev + 1);
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 200);
      }
    } else if (currentStep < STORY_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    } else {
      onCompleteTutorial();
    }
  };

  // Handle middle button (advance to next step or complete tutorial)
  const handleMiddleButton = () => {
    if (currentStep === 2) { // Naming step
      if (tempName.trim()) {
        setUsername(tempName.trim());
        setCurrentStep(prev => prev + 1);
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 200);
      }
    } else if (currentStep < STORY_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    } else {
      onCompleteTutorial();
    }
  };

  // Handle right button (advance to next step)
  const handleRightButton = () => {
    if (currentStep === 2) { // Naming step
      if (tempName.trim()) {
        setUsername(tempName.trim());
        setCurrentStep(prev => prev + 1);
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 200);
      }
    } else if (currentStep < STORY_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    } else {
      onCompleteTutorial();
    }
  };

  // Expose button handlers to parent
  useImperativeHandle(ref, () => ({
    handleLeftButton,
    handleMiddleButton,
    handleRightButton
  }));

  // Different character happiness based on story progression
  const getCharacterHappiness = () => {
    if (currentStep === 0) return 3; // Scared/lost
    if (currentStep === 1) return 5; // Cautious
    if (currentStep === 2) return 6; // Getting comfortable
    if (currentStep === 3) return 7; // Happy to have a name
    if (currentStep === 4) return 8; // Trusting
    if (currentStep === 5) return 9; // Very happy and bonded
    return 9;
  };

  // Different background effects based on story
  const getBackgroundStyle = () => {
    if (currentStep === 0) {
      return { filter: 'brightness(0.7)', backgroundColor: '#a7b86d' }; // Darker, mysterious
    }
    return { backgroundColor: '#c3d68b' }; // Normal bright
  };

  // Get current story text with username replacement
  const getCurrentStoryText = () => {
    const storyText = STORY_STEPS[currentStep];
    return storyText.replace('{username}', username || 'your friend');
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      border: '1px solid #a7b86d',
      boxShadow: 'inset 0 0 10px rgba(0,0,0,0.2)',
      overflow: 'hidden',
      fontFamily: "'Press Start 2P', monospace",
      ...getBackgroundStyle()
    }}>
      {/* Story header */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '3%',
        height: '15%',
        fontSize: 'calc(min(1vw, 1vh) * 1.5)',
        color: '#333'
      }}>
        {currentStep === 0 ? '📡 SIGNAL DETECTED 📡' : 
         currentStep === 1 ? '👽 ALIEN DISCOVERED 👽' :
         currentStep === 2 ? '✏️ NAME YOUR FRIEND ✏️' :
         `🤝 BONDING ${currentStep - 2}/4 🤝`}
      </div>

      {/* Main Character Display */}
      <div style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Background pattern with story-appropriate styling */}
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          opacity: currentStep === 0 ? 0.05 : 0.1,
          zIndex: 0,
        }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: '120%',
              height: '20%',
              top: `${i * 20}%`,
              left: '-10%',
              borderRadius: '50%',
              border: '4px solid #333',
              transform: i % 2 === 0 ? 'scaleX(1.2)' : 'scaleX(1.5)',
            }}></div>
          ))}
        </div>
        
        {/* Character - showing emotional progression */}
        <Character 
          x={50}
          y={40}
          isBlinking={isBlinking}
          happiness={getCharacterHappiness()}
        />
        
        {/* Story dialogue bubble */}
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          minWidth: '85%',
          maxWidth: '95%',
          padding: '10px',
          backgroundColor: currentStep === 0 ? 'rgba(20,20,20,0.95)' : 'rgba(255,255,255,0.95)',
          color: currentStep === 0 ? '#00ff00' : '#333',
          border: currentStep === 0 ? '2px solid #00ff00' : '2px solid #333',
          borderRadius: '8px',
          fontSize: 'calc(min(1vw, 1vh) * 1.2)',
          textAlign: 'center',
          lineHeight: '1.4',
          zIndex: 10,
          boxShadow: currentStep === 0 ? '0 0 10px rgba(0,255,0,0.5)' : '2px 2px 4px rgba(0,0,0,0.3)',
          fontFamily: currentStep === 0 ? 'monospace' : "'Press Start 2P', monospace"
        }}>
          {getCurrentStoryText()}
          
          {/* Speech bubble tail */}
          <div style={{
            position: 'absolute',
            bottom: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '0',
            height: '0',
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: currentStep === 0 ? '8px solid rgba(20,20,20,0.95)' : '8px solid rgba(255,255,255,0.95)',
          }}></div>
        </div>

        {/* Name input field for step 2 */}
        {currentStep === 2 && (
          <div 
            style={{
              position: 'absolute',
              bottom: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              width: '80%',
              padding: '20px',
              display: 'flex',
              justifyContent: 'center',
              cursor: 'text',
            }}
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.focus();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Enter name..."
              maxLength={15}
              style={{
                padding: '8px 12px',
                fontSize: 'calc(min(1vw, 1vh) * 1.2)',
                fontFamily: "'Press Start 2P', monospace",
                border: '2px solid #333',
                borderRadius: '4px',
                textAlign: 'center',
                backgroundColor: '#fff',
                color: '#333',
                outline: 'none',
                boxShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                width: '200px',
                maxWidth: '100%',
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && tempName.trim()) {
                  handleMiddleButton();
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              autoFocus
            />
          </div>
        )}

        {/* Signal static effect for first step */}
        {currentStep === 0 && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0,255,0,0.03) 2px,
              rgba(0,255,0,0.03) 4px
            )`,
            zIndex: 5,
            pointerEvents: 'none'
          }}></div>
        )}
      </div>

      {/* Bottom instruction area */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '3%',
        height: '18%',
        fontSize: 'calc(min(1vw, 1vh) * 1)',
        color: '#333',
        textAlign: 'center'
      }}>
        {currentStep === STORY_STEPS.length - 1 ? (
          <div>
            MIDDLE: Start Your Journey! 🚀
          </div>
        ) : currentStep === 2 ? (
          <div>
            {tempName.trim() ? 'ANY BUTTON: Confirm name' : 'Type a name for your alien friend!'}
          </div>
        ) : (
          <div>
            {currentStep === 0 ? 'ANY BUTTON: Respond to signal' : 'RIGHT/MIDDLE: Continue story →'}
          </div>
        )}
      </div>
    </div>
  );
});

TutorialScreen.displayName = 'TutorialScreen';

export default TutorialScreen; 