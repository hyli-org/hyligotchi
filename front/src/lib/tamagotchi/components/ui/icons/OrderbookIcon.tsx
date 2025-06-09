import React from 'react';
import orderbookSvg from '../../../assets/orderbook.svg';

const OrderbookIcon: React.FC = () => (
  <img 
    src={orderbookSvg}
    alt="Orderbook"
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