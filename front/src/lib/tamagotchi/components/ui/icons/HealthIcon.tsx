import React from 'react';

const HealthIcon: React.FC = () => (
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
    <rect x="8" y="5" width="8" height="2" fill="#333" />
    <rect x="8" y="7" width="8" height="2" fill="#333" />
    <rect x="6" y="9" width="12" height="2" fill="#333" />
    <rect x="11" y="11" width="2" height="8" fill="#333" />
    <rect x="9" y="14" width="6" height="2" fill="#333" />
  </svg>
);

// Memoize since this is a static icon with no props
export default React.memo(HealthIcon); 