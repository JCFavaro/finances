import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../database';
import type { Budget, ExpenseCategory } from '../../types';

export function useBudgets() {
  return useLiveQuery(() =>
    db.budgets.toArray()
  );
}

export function useActiveBudgets() {
  return useLiveQuery(() =>
    db.budgets
      .where('isActive')
      .equals(1)
      .toArray()
  );
}

export function useBudgetProgress(month: number, year: number) {
  return useLiveQuery(async () => {
    const budgets = await db.budgets.where('isActive').equals(1).toArray();

    if (budgets.length === 0) return [];

    // Get start and end of month
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    // Get all expenses for the month
    const transactions = await db.transactions
      .where('date')
      .between(startDate, endDate)
      .filter(t => t.type === 'expense')
      .toArray();

    // Calculate spent per category
    const spentByCategory: Record<string, number> = {};
    for (const tx of transactions) {
      const cat = tx.category;
      spentByCategory[cat] = (spentByCategory[cat] || 0) + tx.amountARS;
    }

    // Build progress data
    return budgets.map(budget => {
      const spent = spentByCategory[budget.category] || 0;
      const limit = budget.amount;
      const percentage = limit > 0 ? (spent / limit) * 100 : 0;

      return {
        category: budget.category,
        spent,
        limit,
        percentage,
        isOver: spent > limit,
        currency: budget.currency,
      };
    });
  }, [month, year]);
}

export async function addBudget(
  data: Omit<Budget, 'id' | 'createdAt'>
): Promise<number | undefined> {
  return db.budgets.add({
    ...data,
    createdAt: new Date()
  });
}

export async function updateBudget(
  id: number,
  data: Partial<Omit<Budget, 'id' | 'createdAt'>>
): Promise<void> {
  await db.budgets.update(id, data);
}

export async function deleteBudget(id: number): Promise<void> {
  await db.budgets.delete(id);
}

export async function toggleBudgetActive(id: number, isActive: boolean): Promise<void> {
  await db.budgets.update(id, { isActive });
}

export async function getBudgetByCategory(category: ExpenseCategory): Promise<Budget | undefined> {
  return db.budgets.where('category').equals(category).first();
}
