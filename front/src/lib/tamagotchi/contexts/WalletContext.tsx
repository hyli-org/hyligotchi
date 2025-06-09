import React, { createContext, useContext } from 'react';

interface WalletContextType {
  createIdentityBlobs?: () => [any, any];
}

const WalletContext = createContext<WalletContextType>({});

export const WalletProvider: React.FC<{ 
  children: React.ReactNode;
  createIdentityBlobs?: () => [any, any];
}> = ({ children, createIdentityBlobs }) => {
  return (
    <WalletContext.Provider value={{ createIdentityBlobs }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWalletFunctions = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletFunctions must be used within a WalletProvider');
  }
  return context;
};