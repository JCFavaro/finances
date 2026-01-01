import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { getDolarBlue, type ExchangeRate } from '../services/exchangeRate';
import { processRecurringIncomes } from '../services/recurringProcessor';
import { initializeSettings } from '../db/database';
import { useOfflineStatus } from '../hooks/useOfflineStatus';

interface AppContextType {
  exchangeRate: ExchangeRate | null;
  isOnline: boolean;
  isLoading: boolean;
  refreshExchangeRate: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isOnline = useOfflineStatus();

  const refreshExchangeRate = useCallback(async () => {
    try {
      const rate = await getDolarBlue();
      setExchangeRate(rate);
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error);
    }
  }, []);

  useEffect(() => {
    async function initialize() {
      setIsLoading(true);
      try {
        await initializeSettings();
        await refreshExchangeRate();
        await processRecurringIncomes();
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, [refreshExchangeRate]);

  return (
    <AppContext.Provider value={{ exchangeRate, isOnline, isLoading, refreshExchangeRate }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
