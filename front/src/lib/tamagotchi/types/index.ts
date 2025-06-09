// Core library types
export interface TamagotchiState {
  characterPosition: { x: number; y: number };
  isBlinking: boolean;
  happiness: number;
  hunger: number;
  lastAction: string;
  needsCleaning: boolean;
  showPoo: boolean;
  isCleaningAnimationPlaying: boolean;
}

// Tutorial types
export interface TutorialScreenRef {
  handleLeftButton: () => void;
  handleMiddleButton: () => void;
  handleRightButton: () => void;
}

// State change callback type
export interface PetStateChange {
  happiness: number;
  hunger: number;
  characterPosition: { x: number; y: number };
  needsCleaning: boolean;
  showPoo: boolean;
  foodBalances: import('../utils/foodBalances').FoodBalances;
  healthBalances: import('../utils/healthBalances').HealthBalances;
}

// Re-export common types
export type { FoodBalances, FoodType } from '../utils/foodBalances';
export type { HealthBalances, HealthType } from '../utils/healthBalances';
export type { TamagotchiLibraryProps } from '../TamagotchiLibrary'; 