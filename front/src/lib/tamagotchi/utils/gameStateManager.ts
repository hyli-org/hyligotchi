import type { GameState, GameAction, ServerGameState } from '../types/gameState';
import { apiClient, type ApiGotchi } from '../api/client';

// Helper function to parse health status from API response
export const parseHealthStatus = (health?: string | { [key: string]: number }): 'Healthy' | 'Sick' | 'Dead' => {
  if (!health) return 'Healthy';
  
  // If it's already a string, return it
  if (typeof health === 'string') {
    return health as 'Healthy' | 'Sick' | 'Dead';
  }
  
  // If it's an object like {"Sick": 1490}, extract the key
  if (typeof health === 'object') {
    const status = Object.keys(health)[0];
    if (status === 'Sick' || status === 'Dead') {
      return status;
    }
  }
  
  return 'Healthy';
};

// This should not be used - all state comes from server
export const createInitialGameState = (): GameState => ({
  // All values from server
  happiness: 0,
  hunger: 0,
  health: 0,
  healthStatus: 'Healthy',
  
  // Character state
  characterPosition: { x: 22.5, y: 22.5 },
  isBlinking: false,
  
  // Environment state
  needsCleaning: false,
  showPoo: false,
  lastAction: '',
  
  // UI state
  selectedAction: null,
  
  // Balances from API
  foodBalances: { ORANJ: 0, OXYGEN: 0 },
  healthBalances: { VITAMIN: 0 },
  
  // Timestamps
  lastUpdated: Date.now(),
  version: 1,
});

// Game logic functions - these will mirror server logic
export const gameStateReducer = (state: GameState, action: GameAction): GameState => {
  const newState = { ...state };
  
  switch (action.type) {
    case 'CLEAN':
      if (newState.showPoo) {
        // Cleaning removes poo
        newState.showPoo = false;
        newState.needsCleaning = false;
        newState.happiness = Math.min(10, newState.happiness + 1);
        newState.lastAction = 'Cleaned poo!';
      } else {
        // For demo: clicking clean when no poo creates poo
        newState.showPoo = true;
        newState.needsCleaning = true;
        newState.lastAction = 'Poo appeared!';
      }
      break;
      
    case 'PLAY':
      newState.happiness = Math.min(10, newState.happiness + 2);
      newState.hunger = Math.max(1, newState.hunger - 0.5);
      newState.lastAction = 'Played!';
      break;
      
    case 'AUTO_DECAY':
      // Automatic stat decay over time
      newState.happiness = Math.max(1, newState.happiness - 0.1);
      newState.hunger = Math.max(1, newState.hunger - 0.2);
      
      // Randomly generate poo based on hunger/time
      if (!newState.showPoo && Math.random() < 0.1 && newState.hunger < 5) {
        newState.showPoo = true;
        newState.needsCleaning = true;
      }
      break;
      
    case 'SERVER_SYNC':
      // Update state from server (will be implemented later)
      if (action.payload && action.payload.version > newState.version) {
        return { ...newState, ...action.payload };
      }
      break;
  }
  
  newState.lastUpdated = action.timestamp;
  newState.version += 1;
  
  return newState;
};

// Utility to prepare state for server sync
export const prepareForServerSync = (state: GameState): ServerGameState => {
  const serverState = { ...state };
  // Remove UI-only properties
  delete (serverState as any).selectedAction;
  return {
    ...serverState,
    serverTimestamp: Date.now(),
  };
};

// Convert API response to game state updates
export const apiResponseToGameState = (apiGotchi: ApiGotchi | null): {
  happiness: number;
  hunger: number;
  health: number;
  username?: string;
  born_at?: number;
  needs_cleaning: boolean;
  exists: boolean;
  is_dead: boolean;
} => {
  if (!apiGotchi) {
    return {
      happiness: 0,
      hunger: 0,
      health: 0,
      needs_cleaning: false,
      exists: false,
      is_dead: false
    };
  }
  
  // Map server stats to game stats
  // Server tracks: activity, food, sweets, vitamins (all out of 10)
  // Frontend tracks: happiness, hunger, health
  
  const happiness = Math.min(10, Math.max(0, apiGotchi.sweets));
  const hunger = Math.min(10, Math.max(0, apiGotchi.food)); // Direct mapping, higher food = higher hunger value
  const health = Math.min(10, Math.max(0, apiGotchi.vitamins));
  
  // Check if the pet is dead based on health status
  const healthStatus = parseHealthStatus(apiGotchi.health);
  const is_dead = healthStatus === 'Dead';
  
  return {
    happiness,
    hunger,
    health,
    username: apiGotchi.name,
    born_at: apiGotchi.born_at,
    needs_cleaning: apiGotchi.pooped || false,
    exists: true,
    is_dead
  };
};

// Initialize a new Hyligotchi
export const initializeHyligotchi = async (name: string): Promise<GameState | null> => {
  try {
    const apiGotchi = await apiClient.init(name);
    const initialState = createInitialGameState();
    const serverStats = apiResponseToGameState(apiGotchi);
    return { ...initialState, ...serverStats };
  } catch (error) {
    console.error('Failed to initialize Hyligotchi:', error);
    return null;
  }
};

// Load current state from server
export const loadStateFromServer = async (currentState: GameState): Promise<GameState> => {
  try {
    const apiGotchi = await apiClient.getState();
    if (apiGotchi) {
      const serverStats = apiResponseToGameState(apiGotchi);
      return { ...currentState, ...serverStats, lastUpdated: Date.now() };
    }
    return currentState;
  } catch (error) {
    console.error('Failed to load state from server:', error);
    return currentState; // Return current state on error
  }
};

// Feed actions
export const feedHyligotchi = async (type: 'food' | 'sweets' | 'vitamins', amount: number, currentState: GameState): Promise<GameState> => {
  try {
    let apiGotchi: ApiGotchi;
    
    switch (type) {
      case 'food':
        apiGotchi = await apiClient.feedFood(amount);
        break;
      case 'sweets':
        apiGotchi = await apiClient.feedSweets(amount);
        break;
      case 'vitamins':
        apiGotchi = await apiClient.feedVitamins(amount);
        break;
    }
    
    const serverStats = apiResponseToGameState(apiGotchi);
    return { 
      ...currentState, 
      ...serverStats, 
      lastAction: `Fed ${type}!`,
      lastUpdated: Date.now() 
    };
  } catch (error) {
    console.error(`Failed to feed ${type}:`, error);
    return currentState; // Return current state on error
  }
};

// Check if API is available
export const isApiAvailable = (): boolean => {
  return apiClient.isAvailable();
}; 