// ScanStatusContext.js
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ScanStatusContext = createContext({
  hasEverScanned: false,
  updateScanStatus: async (status) => {},
  isLoading: true,
});

export const ScanStatusProvider = ({ children }) => {
  const [hasEverScanned, setHasEverScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadInitialStatus = async () => {
      try {
        const scanned = await AsyncStorage.getItem('@has_ever_scanned');
        setHasEverScanned(scanned === 'true');
      } catch (e) {
        console.error("Failed to load scan status from AsyncStorage", e);
        // Keep default false state
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialStatus();
  }, []);

  const updateScanStatus = useCallback(async (status) => {
    try {
      setHasEverScanned(status);
      await AsyncStorage.setItem('@has_ever_scanned', status ? 'true' : 'false');
    } catch (e) {
      console.error("Failed to save scan status to AsyncStorage", e);
      // Optionally revert state if save fails, or notify user
    }
  }, []);

  return (
    <ScanStatusContext.Provider value={{ hasEverScanned, updateScanStatus, isLoading }}>
      {children}
    </ScanStatusContext.Provider>
  );
};

export const useScanStatus = () => useContext(ScanStatusContext); 