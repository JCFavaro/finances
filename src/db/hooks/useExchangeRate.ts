import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../database';
import { CACHE_DURATION_MS } from '../../utils/constants';

export function useExchangeRate() {
  return useLiveQuery(() => db.exchangeRate.get('dolar-blue'));
}

export function useIsRateStale() {
  const rate = useExchangeRate();

  if (!rate) return true;

  return Date.now() - rate.fetchedAt.getTime() > CACHE_DURATION_MS;
}
