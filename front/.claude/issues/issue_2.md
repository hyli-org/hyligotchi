# Performance Optimization - Memoization and Animation

  Priority: HighLabels: performance, optimization

  Problem:
  No memoization, multiple timers, inefficient animations causing unnecessary re-renders.

  Current Code Issues:

  1. Character movement (useTamagotchiState.ts:17-26):
  useEffect(() => {
    const moveInterval = setInterval(() => {
      setCharacterPosition(prev => ({
        x: Math.max(5, Math.min(100, prev.x + (Math.random() * 10 - 5))),
        y: Math.max(5, Math.min(100, prev.y + (Math.random() * 10 - 5)))
      }));
    }, 3000);

    return () => clearInterval(moveInterval);
  }, []);

  2. No memoized components:
  // Current: Every prop change re-renders entire component tree
  export const StatBar: React.FC<StatBarProps> = ({ label, value, max = 10 }) => {

  Desired Solution:
  // 1. Use requestAnimationFrame for smooth animations
  const useCharacterMovement = () => {
    const [position, setPosition] = useState({ x: 50, y: 50 });
    const rafRef = useRef<number>();

    useEffect(() => {
      let lastUpdate = Date.now();

      const animate = () => {
        const now = Date.now();
        if (now - lastUpdate > 3000) {
          setPosition(prev => ({
            x: clamp(prev.x + (Math.random() * 10 - 5), 5, 100),
            y: clamp(prev.y + (Math.random() * 10 - 5), 5, 100)
          }));
          lastUpdate = now;
        }
        rafRef.current = requestAnimationFrame(animate);
      };

      rafRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(rafRef.current!);
    }, []);

    return position;
  };

  // 2. Memoize pure components
  export const StatBar = React.memo<StatBarProps>(({ label, value, max = 10 }) => {
    // Component implementation
  }, (prevProps, nextProps) =>
    prevProps.value === nextProps.value &&
    prevProps.label === nextProps.label
  );

  Performance Targets:
  - Reduce re-renders by 70%
  - Single animation loop for all movements
  - Memoize all pure components
  - Lazy load heavy components
  - Profile and optimize render performance < 16ms

