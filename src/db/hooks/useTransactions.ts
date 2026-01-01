import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../database';
import type { Transaction, MonthYearFilter, Category } from '../../types';
import { getDolarBlue, convertToARS } from '../../services/exchangeRate';

export function useTransactions(filter?: MonthYearFilter) {
  return useLiveQuery(async () => {
    if (filter) {
      const startDate = new Date(filter.year, filter.month, 1);
      const endDate = new Date(filter.year, filter.month + 1, 0, 23, 59, 59);

      return db.transactions
        .where('date')
        .between(startDate, endDate)
        .reverse()
        .sortBy('date');
    }

    return db.transactions.orderBy('date').reverse().toArray();
  }, [filter?.month, filter?.year]);
}

export function useRecentTransactions(limit: number = 5) {
  return useLiveQuery(() =>
    db.transactions
      .orderBy('date')
      .reverse()
      .limit(limit)
      .toArray()
  , [limit]);
}

export function useMonthlyStats(months: number = 6) {
  return useLiveQuery(async () => {
    const now = new Date();
    const results: { month: string; income: number; expenses: number }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const transactions = await db.transactions
        .where('date')
        .between(startDate, endDate)
        .toArray();

      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amountARS, 0);

      const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amountARS, 0);

      const monthName = date.toLocaleDateString('es-AR', { month: 'short' });
      results.push({ month: monthName.charAt(0).toUpperCase() + monthName.slice(1), income, expenses });
    }

    return results;
  }, [months]);
}

export function useCategoryStats(filter?: MonthYearFilter) {
  return useLiveQuery(async () => {
    let transactions: Transaction[];

    if (filter) {
      const startDate = new Date(filter.year, filter.month, 1);
      const endDate = new Date(filter.year, filter.month + 1, 0, 23, 59, 59);

      transactions = await db.transactions
        .where('date')
        .between(startDate, endDate)
        .toArray();
    } else {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      transactions = await db.transactions
        .where('date')
        .between(startDate, endDate)
        .toArray();
    }

    const expenses = transactions.filter(t => t.type === 'expense');

    const byCategory = expenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amountARS;
      return acc;
    }, {} as Record<Category, number>);

    return byCategory;
  }, [filter?.month, filter?.year]);
}

export function useBalance() {
  return useLiveQuery(async () => {
    const transactions = await db.transactions.toArray();

    const totalARS = transactions.reduce((sum, t) => {
      const amount = t.type === 'income' ? t.amountARS : -t.amountARS;
      return sum + amount;
    }, 0);

    return { totalARS };
  });
}

export function useMonthSummary(filter?: MonthYearFilter) {
  return useLiveQuery(async () => {
    const now = new Date();
    const month = filter?.month ?? now.getMonth();
    const year = filter?.year ?? now.getFullYear();

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    const transactions = await db.transactions
      .where('date')
      .between(startDate, endDate)
      .toArray();

    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amountARS, 0);

    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amountARS, 0);

    return {
      income,
      expenses,
      balance: income - expenses
    };
  }, [filter?.month, filter?.year]);
}

export async function addTransaction(
  data: Omit<Transaction, 'id' | 'createdAt' | 'amountARS'> & { amountARS?: number }
): Promise<number | undefined> {
  let amountARS = data.amountARS;

  if (!amountARS) {
    const rate = await getDolarBlue();
    amountARS = convertToARS(data.amount, data.currency, rate);
  }

  return db.transactions.add({
    ...data,
    amountARS,
    createdAt: new Date()
  });
}

export async function updateTransaction(
  id: number,
  data: Partial<Omit<Transaction, 'id' | 'createdAt'>>
): Promise<void> {
  await db.transactions.update(id, data);
}

export async function deleteTransaction(id: number): Promise<void> {
  await db.transactions.delete(id);
}
