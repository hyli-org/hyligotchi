import React from 'react';

interface WalletIconProps {
  width?: number;
  height?: number;
  fill?: string;
}

const WalletIcon: React.FC<WalletIconProps> = ({ 
  width = 24, 
  height = 24, 
  fill = '#586541' 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 24 24" 
    fill={fill}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9zm-9-2h10V8H12v8zm4-2.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
  </svg>
);

export default WalletIcon;