import React from 'react';
import chipSvg from '../../../assets/chip.svg';

const CasinoIcon: React.FC = () => (
  <img 
    src={chipSvg}
    alt="Casino Chip"
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

export default CasinoIcon; 