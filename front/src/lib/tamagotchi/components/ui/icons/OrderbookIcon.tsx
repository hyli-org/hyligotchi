import React from 'react';
import iconUfoSvg from '../../../assets/icon-ufo.svg';

const OrderbookIcon: React.FC = () => (
  <img 
    src={iconUfoSvg}
    alt="UFO"
    style={{
      width: '100%',
      height: '100%',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
      objectFit: 'contain'
    }}
  />
);

export default OrderbookIcon; 