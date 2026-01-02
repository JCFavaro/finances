import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Transaction, Currency, ExpenseCategory, IncomeCategory, MonthYearFilter } from '../../types';

type Category = ExpenseCategory | IncomeCategory;

interface TransactionRow {
  id: number;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  amount_ars: number;
  category: string;
  description: string | null;
  date: string;
  exchange_rate_used: number | null;
  is_recurring: boolean | null;
  recurring_income_id: number | null;
  recurring_expense_id: number | null;
  created_at: string;
}

function rowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    currency: row.currency as Currency,
    amountARS: row.amount_ars,
    category: row.category as Category,
    description: row.description ?? undefined,
    date: new Date(row.date),
    createdAt: new Date(row.created_at),
    exchangeRateUsed: row.exchange_rate_used ?? undefined,
    isRecurring: row.is_recurring ?? undefined,
    recurringIncomeId: row.recurring_income_id ?? undefined,
  };
}

export function useTransactions(filter?: MonthYearFilter) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[] | undefined>(undefined);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (filter) {
      const startDate = new Date(filter.year, filter.month, 1).toISOString();
      const endDate = new Date(filter.year, filter.month + 1, 0, 23, 59, 59).toISOString();
      query = query.gte('date', startDate).lte('date', endDate);
    }

    const { data, error } = await query;

    if (!error && data) {
      setTransactions((data as TransactionRow[]).map(rowToTransaction));
    }
  }, [user, filter?.month, filter?.year]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('transactions_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchTransactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchTransactions]);

  return transactions;
}

export function useRecentTransactions(limit: number = 5) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[] | undefined>(undefined);

  useEffect(() => {
    if (!user) return;

    const fetchRecent = async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(limit);

      if (!error && data) {
        setTransactions((data as TransactionRow[]).map(rowToTransaction));
      }
    };

    fetchRecent();
  }, [user, limit]);

  return transactions;
}

export function useMonthSummary(filter?: MonthYearFilter) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<{ income: number; expenses: number; balance: number } | undefined>(undefined);

  useEffect(() => {
    if (!user) return;

    const fetchSummary = async () => {
      const now = new Date();
      const month = filter?.month ?? now.getMonth();
      const year = filter?.year ?? now.getFullYear();

      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('transactions')
        .select('type, amount_ars')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (!error && data) {
        const income = data
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + Number(t.amount_ars), 0);
        const expenses = data
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount_ars), 0);

        setSummary({ income, expenses, balance: income - expenses });
      }
    };

    fetchSummary();

    // Subscribe to changes
    const channel = supabase
      .channel('transactions_summary')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchSummary();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, filter?.month, filter?.year]);

  return summary;
}

export function useCategoryStats(filter?: MonthYearFilter) {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, number> | undefined>(undefined);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const now = new Date();
      const month = filter?.month ?? now.getMonth();
      const year = filter?.year ?? now.getFullYear();

      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('transactions')
        .select('category, amount_ars')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('date', startDate)
        .lte('date', endDate);

      if (!error && data) {
        const byCategory = data.reduce((acc, t) => {
          const cat = t.category;
          acc[cat] = (acc[cat] || 0) + Number(t.amount_ars);
          return acc;
        }, {} as Record<string, number>);

        setStats(byCategory);
      }
    };

    fetchStats();
  }, [user, filter?.month, filter?.year]);

  return stats;
}

export function useMonthlyStats(months: number = 6) {
  const { user } = useAuth();
  const [stats, setStats] = useState<{ month: string; income: number; expenses: number }[] | undefined>(undefined);

  useEffect(() => {
    if (!user) return;

    const fetchMonthlyStats = async () => {
      const now = new Date();
      const results: { month: string; income: number; expenses: number }[] = [];

      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const startDate = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();

        const { data } = await supabase
          .from('transactions')
          .select('type, amount_ars')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lte('date', endDate);

        const income = data?.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount_ars), 0) ?? 0;
        const expenses = data?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount_ars), 0) ?? 0;

        const monthName = date.toLocaleDateString('es-AR', { month: 'short' });
        results.push({ month: monthName.charAt(0).toUpperCase() + monthName.slice(1), income, expenses });
      }

      setStats(results);
    };

    fetchMonthlyStats();
  }, [user, months]);

  return stats;
}

export function useBalance() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!user) return;

    const fetchBalance = async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('type, amount_ars')
        .eq('user_id', user.id);

      if (!error && data) {
        const total = data.reduce((sum, t) => {
          const amount = Number(t.amount_ars);
          return t.type === 'income' ? sum + amount : sum - amount;
        }, 0);
        setBalance(total);
      }
    };

    fetchBalance();
  }, [user]);

  return balance;
}

export async function addTransaction(
  userId: string,
  data: Omit<Transaction, 'id' | 'createdAt'>
): Promise<number | undefined> {
  const { data: result, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: data.type,
      amount: data.amount,
      currency: data.currency,
      amount_ars: data.amountARS,
      category: data.category,
      description: data.description ?? null,
      date: data.date.toISOString(),
      exchange_rate_used: data.exchangeRateUsed ?? null,
      is_recurring: data.isRecurring ?? false,
      recurring_income_id: data.recurringIncomeId ?? null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error adding transaction:', error);
    return undefined;
  }

  return result.id;
}

export async function updateTransaction(
  id: number,
  data: Partial<Omit<Transaction, 'id' | 'createdAt'>>
): Promise<void> {
  const updates: Record<string, unknown> = {};

  if (data.type !== undefined) updates.type = data.type;
  if (data.amount !== undefined) updates.amount = data.amount;
  if (data.currency !== undefined) updates.currency = data.currency;
  if (data.amountARS !== undefined) updates.amount_ars = data.amountARS;
  if (data.category !== undefined) updates.category = data.category;
  if (data.description !== undefined) updates.description = data.description;
  if (data.date !== undefined) updates.date = data.date.toISOString();
  if (data.exchangeRateUsed !== undefined) updates.exchange_rate_used = data.exchangeRateUsed;

  const { error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating transaction:', error);
  }
}

export async function deleteTransaction(id: number): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting transaction:', error);
  }
}
