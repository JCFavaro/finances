import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { RecurringExpense, Currency, ExpenseCategory } from '../../types';

interface RecurringExpenseRow {
  id: number;
  user_id: string;
  name: string;
  icon: string;
  amount: number;
  currency: string;
  category: string;
  day_of_month: number;
  is_active: boolean;
  last_processed_date: string | null;
  created_at: string;
}

function rowToRecurringExpense(row: RecurringExpenseRow): RecurringExpense {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    amount: row.amount,
    currency: row.currency as Currency,
    category: row.category as ExpenseCategory,
    dayOfMonth: row.day_of_month,
    isActive: row.is_active,
    lastProcessedDate: row.last_processed_date ? new Date(row.last_processed_date) : undefined,
    createdAt: new Date(row.created_at),
  };
}

export function useRecurringExpenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<RecurringExpense[] | undefined>(undefined);

  const fetchExpenses = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setExpenses((data as RecurringExpenseRow[]).map(rowToRecurringExpense));
    }
  }, [user]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('recurring_expenses_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'recurring_expenses',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchExpenses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchExpenses]);

  return expenses;
}

export function useActiveRecurringExpenses() {
  const expenses = useRecurringExpenses();
  return expenses?.filter(e => e.isActive);
}

export async function addRecurringExpense(
  userId: string,
  data: Omit<RecurringExpense, 'id' | 'createdAt' | 'lastProcessedDate'>
): Promise<number | undefined> {
  const { data: result, error } = await supabase
    .from('recurring_expenses')
    .insert({
      user_id: userId,
      name: data.name,
      icon: data.icon,
      amount: data.amount,
      currency: data.currency,
      category: data.category,
      day_of_month: data.dayOfMonth,
      is_active: data.isActive,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error adding recurring expense:', error);
    return undefined;
  }

  return result.id;
}

export async function updateRecurringExpense(
  id: number,
  data: Partial<Omit<RecurringExpense, 'id' | 'createdAt'>>
): Promise<void> {
  const updates: Record<string, unknown> = {};

  if (data.name !== undefined) updates.name = data.name;
  if (data.icon !== undefined) updates.icon = data.icon;
  if (data.amount !== undefined) updates.amount = data.amount;
  if (data.currency !== undefined) updates.currency = data.currency;
  if (data.category !== undefined) updates.category = data.category;
  if (data.dayOfMonth !== undefined) updates.day_of_month = data.dayOfMonth;
  if (data.isActive !== undefined) updates.is_active = data.isActive;
  if (data.lastProcessedDate !== undefined) {
    updates.last_processed_date = data.lastProcessedDate?.toISOString() ?? null;
  }

  const { error } = await supabase
    .from('recurring_expenses')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating recurring expense:', error);
  }
}

export async function deleteRecurringExpense(id: number): Promise<void> {
  const { error } = await supabase
    .from('recurring_expenses')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting recurring expense:', error);
  }
}

export async function toggleRecurringExpenseActive(id: number, isActive: boolean): Promise<void> {
  await updateRecurringExpense(id, { isActive });
}

export async function getActiveRecurringExpensesForProcessing(userId: string): Promise<RecurringExpense[]> {
  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error || !data) return [];

  return (data as RecurringExpenseRow[]).map(rowToRecurringExpense);
}

export async function markRecurringExpenseProcessed(id: number, date: Date): Promise<void> {
  await updateRecurringExpense(id, { lastProcessedDate: date });
}
