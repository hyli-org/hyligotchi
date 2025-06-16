# Replace Magic Numbers with Constants

  Priority: MediumLabels: refactoring, maintainability

  Problem:
  Hardcoded values throughout codebase make it difficult to maintain and understand.

  Current Code Examples:
  // useTamagotchiState.ts:20-22
  x: Math.max(5, Math.min(100, prev.x + (Math.random() * 10 - 5))),
  y: Math.max(5, Math.min(100, prev.y + (Math.random() * 10 - 5)))

  // Character.tsx:31-32
  const stepSize = 2; // Size of each step
  const stepDuration = 250; // Duration between steps in ms

  // Various files
  setInterval(..., 30000); // What is 30000?

  Desired Solution:
  // constants/game.ts
  export const GAME_CONSTANTS = {
    MOVEMENT: {
      MIN_POSITION: 5,
      MAX_POSITION: 100,
      RANDOM_RANGE: 10,
      UPDATE_INTERVAL: 3000,
    },
    CHARACTER: {
      STEP_SIZE: 2,
      STEP_DURATION_MS: 250,
      BLINK_INTERVAL_MS: 5000,
    },
    SYNC: {
      API_SYNC_INTERVAL_MS: 30_000, // 30 seconds
    },
    STATS: {
      MAX_VALUE: 10,
      MIN_VALUE: 0,
      DEFAULT_VALUE: 5,
    }
  } as const;

  // Usage
  x: clamp(
    prev.x + randomRange(GAME_CONSTANTS.MOVEMENT.RANDOM_RANGE),
    GAME_CONSTANTS.MOVEMENT.MIN_POSITION,
    GAME_CONSTANTS.MOVEMENT.MAX_POSITION
  )

  Acceptance Criteria:
  - Extract all magic numbers to constants
  - Group related constants
  - Add descriptive names and comments
  - Use TypeScript const assertions

