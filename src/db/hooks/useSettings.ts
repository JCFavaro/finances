import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../database';
import type { Currency } from '../../types';

export function useSettings() {
  return useLiveQuery(() => db.settings.get('settings'));
}

export async function updateDefaultCurrency(currency: Currency): Promise<void> {
  await db.settings.update('settings', { defaultCurrency: currency });
}
