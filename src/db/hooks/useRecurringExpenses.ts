import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../database';
import type { RecurringExpense } from '../../types';

export function useRecurringExpenses() {
  return useLiveQuery(() =>
    db.recurringExpenses.toArray()
  );
}

export function useActiveRecurringExpenses() {
  return useLiveQuery(() =>
    db.recurringExpenses
      .where('isActive')
      .equals(1)
      .toArray()
  );
}

export async function addRecurringExpense(
  data: Omit<RecurringExpense, 'id' | 'createdAt' | 'lastProcessedDate'>
): Promise<number | undefined> {
  return db.recurringExpenses.add({
    ...data,
    createdAt: new Date()
  });
}

export async function updateRecurringExpense(
  id: number,
  data: Partial<Omit<RecurringExpense, 'id' | 'createdAt'>>
): Promise<void> {
  await db.recurringExpenses.update(id, data);
}

export async function deleteRecurringExpense(id: number): Promise<void> {
  await db.recurringExpenses.delete(id);
}

export async function toggleRecurringExpenseActive(id: number, isActive: boolean): Promise<void> {
  await db.recurringExpenses.update(id, { isActive });
}
