import React, { createContext, useState, useContext } from 'react';

const IAPContext = createContext();

export const IAPProvider = ({ children }) => {
  const [isIAPEnabled, setIsIAPEnabled] = useState(false); // SET THIS TO TRUE FOR PRODUCTION USE

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
