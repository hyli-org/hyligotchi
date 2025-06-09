export interface GameState {
  // Character stats
  happiness: number;
  hunger: number;
  health: number;
  healthStatus: 'Healthy' | 'Sick' | 'Dead' | 'healthy' | 'sick' | 'dead'; // Health status from server
  
  // Character state
  characterPosition: { x: number; y: number };
  isBlinking: boolean;
  
  // Environment state
  needsCleaning: boolean;
  showPoo: boolean;
  lastAction: string;
  
  // UI state (client-side only)
  selectedAction: string | null;
  
  // Balances (will come from server/blockchain)
  foodBalances: {
    ORANJ: number;
    HYLLAR: number;
  };
  healthBalances: {
    VITAMIN_D: number;
  };
  
  // Timestamps for server sync
  lastUpdated: number;
  version: number;
}

export interface GameAction {
  type: 'FEED' | 'CLEAN' | 'PLAY' | 'USE_HEALTH' | 'AUTO_DECAY' | 'SERVER_SYNC';
  payload?: any;
  timestamp: number;
}

export interface ServerGameState extends Omit<GameState, 'selectedAction'> {
  // Server will not manage UI-only state
  serverTimestamp: number;
} 