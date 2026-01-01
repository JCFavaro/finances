import Dexie, { type EntityTable } from 'dexie';
import type { Transaction, RecurringIncome, ExchangeRateCache, AppSettings, Asset } from '../types';

const db = new Dexie('FinancesDB') as Dexie & {
  transactions: EntityTable<Transaction, 'id'>;
  recurringIncomes: EntityTable<RecurringIncome, 'id'>;
  exchangeRate: EntityTable<ExchangeRateCache, 'id'>;
  settings: EntityTable<AppSettings, 'id'>;
  assets: EntityTable<Asset, 'id'>;
};

db.version(1).stores({
  transactions: '++id, type, category, date, createdAt',
  recurringIncomes: '++id, isActive, dayOfMonth',
  exchangeRate: 'id',
  settings: 'id'
});

db.version(2).stores({
  transactions: '++id, type, category, date, createdAt',
  recurringIncomes: '++id, isActive, dayOfMonth',
  exchangeRate: 'id',
  settings: 'id',
  assets: '++id, type, currency'
});

export { db };

export async function initializeSettings(): Promise<void> {
  const existing = await db.settings.get('settings');
  if (!existing) {
    await db.settings.add({
      id: 'settings',
      defaultCurrency: 'ARS'
    });
  }
}

export async function clearAllData(): Promise<void> {
  await db.transaction('rw',
    [db.transactions, db.recurringIncomes, db.exchangeRate, db.settings, db.assets],
    async () => {
      await db.transactions.clear();
      await db.recurringIncomes.clear();
      await db.exchangeRate.clear();
      await db.settings.clear();
      await db.assets.clear();
    }
  );
}
