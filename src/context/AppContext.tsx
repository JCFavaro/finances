import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { getDolarBlue, type ExchangeRate } from '../services/exchangeRate';
import { processRecurringIncomes, processRecurringExpenses } from '../services/recurringProcessor';
import { useAuth } from './AuthContext';

interface AppContextType {
  exchangeRate: ExchangeRate | null;
  isLoading: boolean;
  refreshExchangeRate: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      if (!user) return;

      setIsLoading(true);
      try {
        await refreshExchangeRate();
        await processRecurringIncomes(user.id);
        await processRecurringExpenses(user.id);
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, [user, refreshExchangeRate]);

  return (
    <AppContext.Provider value={{ exchangeRate, isLoading, refreshExchangeRate }}>
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
