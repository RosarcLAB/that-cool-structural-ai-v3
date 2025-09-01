// contexts/StandardLoadsContext.tsx: Manages persistent standard load settings.

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { StandardLoads } from '../customTypes/types';

// The key used to store the settings in the browser's localStorage.
const LOCAL_STORAGE_KEY = 'structuralAiAssistant.standardLoads';

// Define the shape of the context data.
interface StandardLoadsContextType {
  standardLoads: StandardLoads;
  setStandardLoads: (loads: StandardLoads) => void;
}

// Initial default values, used only if nothing is in localStorage.
const defaultStandardLoads: StandardLoads = {
  floorDead: 0.5,
  floorLive: 1.5,
  roofDead: 0.5,
  roofLive: 0.25,
  roofWind: 0.85,
  wallDead: 0.4,
  wallLive: 0,
  wallWind: 0.85,
};

// Create the context with a default value (which will be overridden by the provider).
const StandardLoadsContext = createContext<StandardLoadsContextType | undefined>(undefined);

// Define the props for the provider component.
interface StandardLoadsProviderProps {
  children: ReactNode;
}

/**
 * The Provider component that wraps the application.
 * It manages the standard loads state and syncs it with localStorage.
 */
export const StandardLoadsProvider: React.FC<StandardLoadsProviderProps> = ({ children }) => {
  const [standardLoads, setStandardLoads] = useState<StandardLoads>(() => {
    try {
      const storedItem = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      // If there's a stored item, parse it. Otherwise, use the defaults.
      return storedItem ? JSON.parse(storedItem) : defaultStandardLoads;
    } catch (error) {
      console.error("Error reading from localStorage", error);
      return defaultStandardLoads;
    }
  });

  // Effect hook to write to localStorage whenever the standardLoads state changes.
  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(standardLoads));
    } catch (error) {
      console.error("Error writing to localStorage", error);
    }
  }, [standardLoads]);

  // The value provided to consuming components.
  const value = { standardLoads, setStandardLoads };

  return (
    <StandardLoadsContext.Provider value={value}>
      {children}
    </StandardLoadsContext.Provider>
  );
};

/**
 * A custom hook for consuming the StandardLoadsContext.
 * This makes it easy for any component to access the shared state.
 * @returns {StandardLoadsContextType} The context value.
 */
export const useStandardLoads = (): StandardLoadsContextType => {
  const context = useContext(StandardLoadsContext);
  if (context === undefined) {
    throw new Error('useStandardLoads must be used within a StandardLoadsProvider');
  }
  return context;
};