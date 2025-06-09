// Import assets as ES modules to get bundled URLs
import hyligotchiOrangePng from '../assets/hyligotchi-orange.png';
// import aliengotchiSvg from '../assets/aliengotchi.svg';
// import aliengotchiBlinkSvg from '../assets/aliengotchi-blink.svg';
import aliengotchiBackSvg from '../assets/aliengotchi-back.svg';
import babyHyligotchi from '../../../assets/baby-hyligotchi.svg';
import babyHyligotchiBlink from '../../../assets/baby-hyligotchi-blink.svg';

// Device configuration constants
export const DEVICE_CONFIG = {
  images: {
    hyligotchiFull: hyligotchiOrangePng,
    character: babyHyligotchi,
    characterBlink: babyHyligotchiBlink,
    characterBack: aliengotchiBackSvg
  },
  screen: {
    x: 220,
    y: 310, 
    width: 500,
    height: 500
  },
  buttons: {
    left: {
      x: 276,
      y: 870,
      width: 85,
      height: 85
    },
    middle: {
      x: 425,
      y: 908,
      width: 85,
      height: 85
    },
    right: {
      x: 573,
      y: 865,
      width: 85,
      height: 85
    }
  }
};

export const ACTION_CYCLE = ["food", "health_status", "clean", "stats", "light", "orderbook", "orange_ninja"]; 