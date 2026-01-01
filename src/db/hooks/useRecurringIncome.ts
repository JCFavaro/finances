import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../database';
import type { RecurringIncome } from '../../types';

export function useRecurringIncomes() {
  return useLiveQuery(() =>
    db.recurringIncomes.toArray()
  );
}

export function useActiveRecurringIncomes() {
  return useLiveQuery(() =>
    db.recurringIncomes
      .where('isActive')
      .equals(1)
      .toArray()
  );
}

export async function addRecurringIncome(
  data: Omit<RecurringIncome, 'id' | 'createdAt' | 'lastProcessedDate'>
): Promise<number | undefined> {
  return db.recurringIncomes.add({
    ...data,
    createdAt: new Date()
  });
}

export async function updateRecurringIncome(
  id: number,
  data: Partial<Omit<RecurringIncome, 'id' | 'createdAt'>>
): Promise<void> {
  await db.recurringIncomes.update(id, data);
}

export async function deleteRecurringIncome(id: number): Promise<void> {
  await db.recurringIncomes.delete(id);
}

export async function toggleRecurringIncomeActive(id: number, isActive: boolean): Promise<void> {
  await db.recurringIncomes.update(id, { isActive });
}
