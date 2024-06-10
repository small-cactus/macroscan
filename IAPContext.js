import React, { createContext, useState, useContext } from 'react';

const IAPContext = createContext();

export const IAPProvider = ({ children }) => {
  const [isIAPEnabled, setIsIAPEnabled] = useState(true);

  const toggleIAP = () => {
    setIsIAPEnabled(!isIAPEnabled);
  };

  return (
    <IAPContext.Provider value={{ isIAPEnabled, toggleIAP }}>
      {children}
    </IAPContext.Provider>
  );
};

export const useIAP = () => useContext(IAPContext);
