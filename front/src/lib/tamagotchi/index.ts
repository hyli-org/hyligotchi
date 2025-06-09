/// <reference path="../types.d.ts" />

// Main library export
export { default as TamagotchiLibrary } from './TamagotchiLibrary';
export type { TamagotchiLibraryProps } from './TamagotchiLibrary';

// Component exports for advanced users
export { default as MiniTamagotchi } from './components/MiniTamagotchi';
export { default as FullTamagotchi } from './components/FullTamagotchi';

// Hook exports
export { useTamagotchiState } from './hooks/useTamagotchiState';
export { useMenuState } from './hooks/useMenuState';
export { useFoodBalances } from './hooks/useFoodBalances';
export { useHealthBalances } from './hooks/useHealthBalances';
export { useWalletFunctions } from './contexts/WalletContext';

// Type exports
export type { FoodBalances, FoodType } from './utils/foodBalances';
export type { HealthBalances, HealthType } from './utils/healthBalances';

// Centralized types export
export type { 
  TamagotchiState, 
  TutorialScreenRef, 
  PetStateChange 
} from './types';

// Utility exports
export { foodBalanceUtils, EMPTY_FOOD_BALANCES } from './utils/foodBalances';
export { healthBalanceUtils, EMPTY_HEALTH_BALANCES } from './utils/healthBalances';
export { parseHealthStatus } from './utils/gameStateManager';

// Config exports
export { DEVICE_CONFIG, ACTION_CYCLE } from './config/deviceConfig'; 