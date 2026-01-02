import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Budget, Currency, ExpenseCategory } from '../../types';

interface BudgetRow {
  id: number;
  user_id: string;
  category: string;
  amount: number;
  currency: string;
  is_active: boolean;
  created_at: string;
}

function rowToBudget(row: BudgetRow): Budget {
  return {
    id: row.id,
    category: row.category as ExpenseCategory,
    amount: row.amount,
    currency: row.currency as Currency,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
  };
}

export function useBudgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[] | undefined>(undefined);

  const fetchBudgets = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user.id);

    if (!error && data) {
      setBudgets((data as BudgetRow[]).map(rowToBudget));
    }
  }, [user]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('budgets_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'budgets',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchBudgets();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchBudgets]);

  return budgets;
}

export function useActiveBudgets() {
  const budgets = useBudgets();
  return budgets?.filter(b => b.isActive);
}

interface BudgetProgress {
  category: ExpenseCategory;
  spent: number;
  limit: number;
  percentage: number;
  isOver: boolean;
  currency: Currency;
}

export function useBudgetProgress(month: number, year: number) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<BudgetProgress[] | undefined>(undefined);

  useEffect(() => {
    if (!user) return;

    const fetchProgress = async () => {
      // Get active budgets
      const { data: budgets, error: budgetsError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (budgetsError || !budgets || budgets.length === 0) {
        setProgress([]);
        return;
      }

      // Get transactions for the month
      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('category, amount_ars')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('date', startDate)
        .lte('date', endDate);

      if (txError) {
        setProgress([]);
        return;
      }

      // Calculate spent per category
      const spentByCategory: Record<string, number> = {};
      for (const tx of transactions || []) {
        spentByCategory[tx.category] = (spentByCategory[tx.category] || 0) + tx.amount_ars;
      }

      // Build progress data
      const progressData: BudgetProgress[] = (budgets as BudgetRow[]).map(budget => {
        const spent = spentByCategory[budget.category] || 0;
        const limit = budget.amount;
        const percentage = limit > 0 ? (spent / limit) * 100 : 0;

        return {
          category: budget.category as ExpenseCategory,
          spent,
          limit,
          percentage,
          isOver: spent > limit,
          currency: budget.currency as Currency,
        };
      });

      setProgress(progressData);
    };

    fetchProgress();
  }, [user, month, year]);

  return progress;
}

export async function addBudget(
  userId: string,
  data: Omit<Budget, 'id' | 'createdAt'>
): Promise<number | undefined> {
  const { data: result, error } = await supabase
    .from('budgets')
    .insert({
      user_id: userId,
      category: data.category,
      amount: data.amount,
      currency: data.currency,
      is_active: data.isActive,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error adding budget:', error);
    return undefined;
  }

  return result.id;
}

export async function updateBudget(
  id: number,
  data: Partial<Omit<Budget, 'id' | 'createdAt'>>
): Promise<void> {
  const updates: Record<string, unknown> = {};

  if (data.category !== undefined) updates.category = data.category;
  if (data.amount !== undefined) updates.amount = data.amount;
  if (data.currency !== undefined) updates.currency = data.currency;
  if (data.isActive !== undefined) updates.is_active = data.isActive;

  const { error } = await supabase
    .from('budgets')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating budget:', error);
  }
}

export async function deleteBudget(id: number): Promise<void> {
  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting budget:', error);
  }
}

export async function toggleBudgetActive(id: number, isActive: boolean): Promise<void> {
  await updateBudget(id, { isActive });
}

export async function getBudgetByCategory(
  userId: string,
  category: ExpenseCategory
): Promise<Budget | undefined> {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('category', category)
    .single();

  if (error || !data) return undefined;

  return rowToBudget(data as BudgetRow);
}
