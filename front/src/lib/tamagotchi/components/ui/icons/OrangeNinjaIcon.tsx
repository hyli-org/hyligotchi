import React from 'react';
import orangeIconSvg from '../../../assets/orange-icon.svg';

const OrangeNinjaIcon: React.FC = () => (
<img 
    src={orangeIconSvg}
    alt="Orange Ninja"
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

export default OrangeNinjaIcon; 