# Performance Optimization Plan - Memoization and Animation

## Overview

This plan addresses performance issues in the Hyligotchi frontend, focusing on:
- Replacing inefficient timers with requestAnimationFrame
- Implementing memoization to reduce unnecessary re-renders
- Consolidating multiple animation loops into a single system
- Achieving <16ms render times for smooth 60fps performance

## Current Performance Issues

### 1. Multiple Timers Running Continuously
- Character movement: `setInterval` every 3000ms
- Blinking animation: `setInterval` every 5000ms  
- API sync: `setInterval` every 30000ms
- Walking animation: Recursive `setTimeout` every 250ms

### 2. No Component Memoization
- Every state change triggers full component tree re-renders
- Large FullTamagotchi component (890 lines) causes cascading updates
- No optimization for static or rarely-changing components

### 3. Inefficient State Updates
- Character position updates trigger re-renders even when not visible
- No batching of related state changes
- Props passed through multiple levels without optimization

## Implementation Plan

### Phase 1: Create Animation System Foundation

#### 1.1 Create useAnimationFrame Hook
**File**: `src/hooks/useAnimationFrame.ts`
```typescript
// Single animation loop for all animations
export const useAnimationFrame = (callback: (deltaTime: number) => void) => {
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  
  useEffect(() => {
    const animate = (time: number) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current;
        callback(deltaTime);
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };
    
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [callback]);
};
```

#### 1.2 Create Animation Manager
**File**: `src/utils/animationManager.ts`
```typescript
// Centralized animation timing
export class AnimationManager {
  private animations: Map<string, { lastUpdate: number; interval: number; callback: () => void }>;
  
  update(deltaTime: number) {
    const now = Date.now();
    this.animations.forEach((animation, key) => {
      if (now - animation.lastUpdate >= animation.interval) {
        animation.callback();
        animation.lastUpdate = now;
      }
    });
  }
}
```

### Phase 2: Optimize useTamagotchiState Hook

#### 2.1 Replace setInterval with requestAnimationFrame
**File**: `src/hooks/useTamagotchiState.ts`
- Remove multiple `setInterval` calls
- Implement single animation loop using `useAnimationFrame`
- Add timing control for different animation frequencies

#### 2.2 Memoize Hook Return Value
- Use `useMemo` to prevent creating new objects on every render
- Only update when actual values change

### Phase 3: Component Memoization

#### 3.1 Memoize Pure Components
**Priority Order**:
1. `Character` - Frequently re-rendered with position updates
2. `StatBar` - Only needs updates when values change
3. `PooIndicator`, `SickIndicator` - Simple boolean visibility
4. All Icon components - Static, never need re-rendering
5. `CleaningAnimation` - Only when playing

**Pattern**:
```typescript
export const StatBar = React.memo<StatBarProps>(
  ({ label, value, max = 10 }) => {
    // Component implementation
  },
  (prevProps, nextProps) =>
    prevProps.value === nextProps.value &&
    prevProps.label === nextProps.label &&
    prevProps.max === nextProps.max
);
```

#### 3.2 Optimize Screen Components
- Add `React.memo` to all screen components
- Implement custom comparison functions for complex props

### Phase 4: Refactor FullTamagotchi Component

#### 4.1 Split into Smaller Components
- Extract game logic into custom hooks
- Create separate components for different concerns:
  - `GameStateManager` - API sync and state management
  - `ScreenRenderer` - Screen switching logic
  - `ActionHandler` - User interaction handlers

#### 4.2 Optimize Callbacks and Computed Values
- Use `useCallback` for all event handlers
- Use `useMemo` for computed styles and values
- Batch related state updates

### Phase 5: Implement Smart Re-render Prevention

#### 5.1 Create Custom Hooks for Selective Updates
```typescript
// Only re-render when specific values change
export const useSelectiveUpdate = <T>(
  value: T,
  selector: (value: T) => any
) => {
  const selectorRef = useRef(selector);
  const [selectedValue, setSelectedValue] = useState(() => selector(value));
  
  useEffect(() => {
    const newSelectedValue = selectorRef.current(value);
    setSelectedValue(prev => 
      shallowEqual(prev, newSelectedValue) ? prev : newSelectedValue
    );
  }, [value]);
  
  return selectedValue;
};
```

#### 5.2 Implement Context Splitting
- Split large context into smaller, focused contexts
- Prevent unnecessary re-renders from unrelated state changes

## Performance Targets and Metrics

### Goals
1. **Reduce re-renders by 70%**
   - Measure: React DevTools Profiler
   - Current: ~100 renders/minute during idle
   - Target: <30 renders/minute during idle

2. **Single animation loop**
   - Current: 4+ independent timers
   - Target: 1 requestAnimationFrame loop

3. **Render performance <16ms**
   - Measure: Chrome Performance tab
   - Current: ~25-30ms worst case
   - Target: <16ms for 60fps

4. **Memory usage reduction**
   - Reduce memory leaks from intervals
   - Proper cleanup of animations

### Testing Strategy
1. Use React DevTools Profiler to identify render hotspots
2. Chrome Performance tab for frame timing analysis
3. Memory profiler for leak detection
4. Create performance benchmarks for regression testing

## Implementation Order

1. **Week 1**: Animation System
   - Create `useAnimationFrame` hook
   - Refactor `useTamagotchiState` to use RAF
   - Test character movement and blinking

2. **Week 2**: Component Memoization
   - Add `React.memo` to all pure components
   - Implement custom comparison functions
   - Measure render reduction

3. **Week 3**: FullTamagotchi Refactor
   - Split into smaller components
   - Optimize callbacks and computed values
   - Implement selective updates

4. **Week 4**: Testing and Optimization
   - Performance profiling
   - Fine-tune memoization
   - Document performance gains

## Code Examples for Implementation

### Character Component with Memoization
```typescript
export const Character = React.memo<CharacterProps>(
  ({ x, y, blinking, happiness, size = 48, walking = false }) => {
    // Use RAF for walking animation instead of setTimeout
    const stepRef = useRef(0);
    
    useAnimationFrame(useCallback((deltaTime) => {
      if (walking) {
        stepRef.current = (stepRef.current + deltaTime * 0.004) % 4;
      }
    }, [walking]));
    
    return (
      <div className="character" style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%)`,
      }}>
        {/* Character rendering */}
      </div>
    );
  },
  (prev, next) => 
    prev.x === next.x &&
    prev.y === next.y &&
    prev.blinking === next.blinking &&
    prev.happiness === next.happiness &&
    prev.walking === next.walking
);
```

### Optimized useTamagotchiState
```typescript
export const useTamagotchiState = () => {
  const [characterPosition, setCharacterPosition] = useState({ x: 50, y: 50 });
  const [isBlinking, setIsBlinking] = useState(false);
  
  const animationManager = useRef(new AnimationManager());
  
  // Single animation loop
  useAnimationFrame(useCallback((deltaTime) => {
    animationManager.current.update(deltaTime);
  }, []));
  
  useEffect(() => {
    // Register animations
    animationManager.current.register('movement', 3000, () => {
      setCharacterPosition(prev => ({
        x: clamp(prev.x + (Math.random() * 10 - 5), 5, 95),
        y: clamp(prev.y + (Math.random() * 10 - 5), 5, 95)
      }));
    });
    
    animationManager.current.register('blinking', 5000, () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    });
    
    return () => animationManager.current.clear();
  }, []);
  
  // Memoize return value
  return useMemo(() => ({
    characterPosition,
    isBlinking
  }), [characterPosition, isBlinking]);
};
```

## Success Criteria

1. All components using `React.memo` where appropriate
2. Single `requestAnimationFrame` loop managing all animations
3. No memory leaks from timers
4. Smooth 60fps performance during gameplay
5. Reduced CPU usage during idle state
6. Clear performance metrics showing 70% reduction in re-renders

## Notes for Implementation

- Start with the most frequently updated components (Character, position updates)
- Use React DevTools Profiler throughout to validate improvements
- Consider lazy loading heavy components not immediately visible
- Document any trade-offs made for performance
- Keep accessibility in mind when optimizing animations
- Test on lower-end devices to ensure broad compatibility