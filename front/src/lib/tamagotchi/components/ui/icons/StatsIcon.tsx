import React from 'react';

const StatsIcon: React.FC = () => (
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
    <rect x="6" y="16" width="2" height="2" fill="#333" />
    <rect x="10" y="14" width="2" height="4" fill="#333" />
    <rect x="14" y="10" width="2" height="8" fill="#333" />
    <rect x="18" y="6" width="2" height="12" fill="#333" />
  </svg>
);

// Memoize since this is a static icon with no props
export default React.memo(StatsIcon); 