import React from 'react';

const FoodIcon: React.FC = () => (
  <svg 
    width="100%" 
    height="100%" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    style={{
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none'
    }}
  >
    <rect x="5" y="10" width="14" height="2" fill="#333" />
    <rect x="7" y="12" width="10" height="2" fill="#333" />
    <rect x="9" y="14" width="6" height="2" fill="#333" />
    <rect x="11" y="16" width="2" height="2" fill="#333" />
    <rect x="9" y="5" width="6" height="5" fill="#333" />
  </svg>
);

// Memoize since this is a static icon with no props
export default React.memo(FoodIcon); 