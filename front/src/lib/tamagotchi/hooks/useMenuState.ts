import { useState } from 'react';
import { ACTION_CYCLE } from '../config/deviceConfig';
import type { FoodBalances, FoodType } from '../utils/foodBalances';
import type { HealthBalances, HealthType } from '../utils/healthBalances';

interface MenuState {
  selectedAction: string | null;
  inFoodMenu: boolean;
  inHealthMenu: boolean;
  inCasinoMenu: boolean;
  inOrderbookMenu: boolean;
  inOrangeNinjaMenu: boolean;
  inStatsMenu: boolean;
  selectedFood: FoodType;
  selectedHealth: HealthType;
}

interface MenuActions {
  handleZoneClick: () => void;
  handleZone2Click: () => void;
  handleZone3Click: () => void;
  handleFeed: (foodType: FoodType) => void;
  handleHealth: (healthType: HealthType) => void;
}

export const useMenuState = (
  foodBalances: FoodBalances,
  _setFoodBalances: (balances: FoodBalances) => void,
  healthBalances: HealthBalances,
  _setHealthBalances: (balances: HealthBalances) => void,
  setActionWithTimeout: (action: string, timeout?: number) => void,
  handleClean: () => void,
  handleApiFeed?: (foodType: FoodType) => Promise<boolean>,
  handleApiHealth?: (healthType: HealthType) => Promise<boolean>,
  onStatsMenuOpen?: () => void
): [MenuState, MenuActions] => {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [inFoodMenu, setInFoodMenu] = useState(false);
  const [inHealthMenu, setInHealthMenu] = useState(false);
  const [inCasinoMenu, setInCasinoMenu] = useState(false);
  const [inOrderbookMenu, setInOrderbookMenu] = useState(false);
  const [inOrangeNinjaMenu, setInOrangeNinjaMenu] = useState(false);
  const [inStatsMenu, setInStatsMenu] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodType>('ORANJ');
  const [selectedHealth, setSelectedHealth] = useState<HealthType>('VITAMIN');

  const handleZoneClick = () => {
    if (inFoodMenu) {
      setSelectedFood(current => current === 'ORANJ' ? 'OXYGEN' : 'ORANJ');
    } else if (inHealthMenu) {
      // Only one health option for now
    } else if (!inCasinoMenu && !inOrderbookMenu && !inOrangeNinjaMenu && !inStatsMenu) {
      setSelectedAction(currentSelectedAction => {
        if (currentSelectedAction === null) {
          return ACTION_CYCLE[0];
        }
        const currentIndex = ACTION_CYCLE.indexOf(currentSelectedAction);
        const nextIndex = (currentIndex + 1) % ACTION_CYCLE.length;
        return ACTION_CYCLE[nextIndex];
      });
    }
  };

  const handleZone2Click = () => {
    console.log('handleZone2Click called', { inFoodMenu, selectedFood });
    if (inFoodMenu) {
      console.log('In food menu, calling handleFeed with:', selectedFood);
      handleFeed(selectedFood);
    } else if (inHealthMenu) {
      handleHealth(selectedHealth);
    } else if (inStatsMenu) {
      // Stats menu doesn't have any actions on middle button
      return;
    } else if (inCasinoMenu) {
      window.open('https://ezcasino.testnet.hyli.org/', '_blank');
      setInCasinoMenu(false);
      setSelectedAction(null);
      setActionWithTimeout('Opened Casino!');
    } else if (inOrderbookMenu) {
      window.open('https://trail.testnet.hyli.org/', '_blank');
      setInOrderbookMenu(false);
      setSelectedAction(null);
      setActionWithTimeout('Opened Hyliquid!');
    } else if (inOrangeNinjaMenu) {
      window.open('https://faucet.testnet.hyli.org/', '_blank');
      setInOrangeNinjaMenu(false);
      setSelectedAction(null);
      setActionWithTimeout('Opened Orange Ninja!');
    } else if (selectedAction === "food") {
      setInFoodMenu(true);
      setSelectedFood('ORANJ');
    } else if (selectedAction === "health_status") {
      setInHealthMenu(true);
      setSelectedHealth('VITAMIN');
    } else if (selectedAction === "light") {
      setInCasinoMenu(true);
    } else if (selectedAction === "stats") {
      setInStatsMenu(true);
      onStatsMenuOpen?.();
    } else if (selectedAction === "orderbook") {
      setInOrderbookMenu(true);
    } else if (selectedAction === "orange_ninja") {
      setInOrangeNinjaMenu(true);
    } else if (selectedAction === "clean") {
      handleClean();
    }
  };

  const handleZone3Click = () => {
    if (inFoodMenu) {
      setInFoodMenu(false);
      setSelectedAction(null);
    } else if (inHealthMenu) {
      setInHealthMenu(false);
      setSelectedAction(null);
    } else if (inStatsMenu) {
      setInStatsMenu(false);
      setSelectedAction(null);
    } else if (inCasinoMenu) {
      setInCasinoMenu(false);
      setSelectedAction(null);
    } else if (inOrderbookMenu) {
      setInOrderbookMenu(false);
      setSelectedAction(null);
    } else if (inOrangeNinjaMenu) {
      setInOrangeNinjaMenu(false);
      setSelectedAction(null);
    } else {
      setSelectedAction(null);
    }
  };

  const handleFeed = async (foodType: FoodType) => {
    console.log('handleFeed called with:', foodType);
    console.log('handleApiFeed exists?', !!handleApiFeed);
    console.log('foodBalances:', foodBalances);
    
    // Check if balance > 0
    // if (foodBalances[foodType] <= 0) {
    //   setActionWithTimeout(`No ${foodType} left!`);
    //   return;
    // }

    // API is required for feeding
    if (!handleApiFeed) {
      console.log('No handleApiFeed function provided');
      setActionWithTimeout('API connection required!');
      return;
    }
    
    try {
      console.log('Calling handleApiFeed...');
      const success = await handleApiFeed(foodType);
      console.log('handleApiFeed returned:', success);
      
      if (success) {
        setActionWithTimeout(`Fed ${foodType}!`);
        setInFoodMenu(false);
        setSelectedAction(null);
      } else {
        setActionWithTimeout('Feeding failed!');
      }
    } catch (error) {
      console.error('Error in handleFeed:', error);
      setActionWithTimeout('Feeding error!');
    }
  };

  const handleHealth = async (healthType: HealthType) => {
    // Check if balance > 0
    if (healthBalances[healthType] <= 0) {
      setActionWithTimeout(`No ${healthType} left!`);
      return;
    }

    // API is required for using health items
    if (!handleApiHealth) {
      setActionWithTimeout('API connection required!');
      return;
    }
    
    const success = await handleApiHealth(healthType);
    if (success) {
      setActionWithTimeout(`Used ${healthType}!`);
      setInHealthMenu(false);
      setSelectedAction(null);
    } else {
      setActionWithTimeout('Health item use failed!');
    }
  };

  const menuState: MenuState = {
    selectedAction,
    inFoodMenu,
    inHealthMenu,
    inCasinoMenu,
    inOrderbookMenu,
    inOrangeNinjaMenu,
    inStatsMenu,
    selectedFood,
    selectedHealth
  };

  const menuActions: MenuActions = {
    handleZoneClick,
    handleZone2Click,
    handleZone3Click,
    handleFeed,
    handleHealth
  };

  return [menuState, menuActions];
}; 