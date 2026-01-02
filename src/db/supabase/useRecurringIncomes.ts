import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { RecurringIncome, Currency, IncomeCategory } from '../../types';

interface RecurringIncomeRow {
  id: number;
  user_id: string;
  name: string;
  amount: number;
  currency: string;
  category: string;
  day_of_month: number;
  is_active: boolean;
  last_processed_date: string | null;
  created_at: string;
}

function rowToRecurringIncome(row: RecurringIncomeRow): RecurringIncome {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    currency: row.currency as Currency,
    category: row.category as IncomeCategory,
    dayOfMonth: row.day_of_month,
    isActive: row.is_active,
    lastProcessedDate: row.last_processed_date ? new Date(row.last_processed_date) : undefined,
    createdAt: new Date(row.created_at),
  };
}

export function useRecurringIncomes() {
  const { user } = useAuth();
  const [incomes, setIncomes] = useState<RecurringIncome[] | undefined>(undefined);

  const fetchIncomes = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('recurring_incomes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setIncomes((data as RecurringIncomeRow[]).map(rowToRecurringIncome));
    }
  }, [user]);

  useEffect(() => {
    fetchIncomes();
  }, [fetchIncomes]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('recurring_incomes_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'recurring_incomes',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchIncomes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchIncomes]);

  return incomes;
}

export function useActiveRecurringIncomes() {
  const incomes = useRecurringIncomes();
  return incomes?.filter(i => i.isActive);
}

export async function addRecurringIncome(
  userId: string,
  data: Omit<RecurringIncome, 'id' | 'createdAt' | 'lastProcessedDate'>
): Promise<number | undefined> {
  const { data: result, error } = await supabase
    .from('recurring_incomes')
    .insert({
      user_id: userId,
      name: data.name,
      amount: data.amount,
      currency: data.currency,
      category: data.category,
      day_of_month: data.dayOfMonth,
      is_active: data.isActive,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error adding recurring income:', error);
    return undefined;
  }

  return result.id;
}

export async function updateRecurringIncome(
  id: number,
  data: Partial<Omit<RecurringIncome, 'id' | 'createdAt'>>
): Promise<void> {
  const updates: Record<string, unknown> = {};

  if (data.name !== undefined) updates.name = data.name;
  if (data.amount !== undefined) updates.amount = data.amount;
  if (data.currency !== undefined) updates.currency = data.currency;
  if (data.category !== undefined) updates.category = data.category;
  if (data.dayOfMonth !== undefined) updates.day_of_month = data.dayOfMonth;
  if (data.isActive !== undefined) updates.is_active = data.isActive;
  if (data.lastProcessedDate !== undefined) {
    updates.last_processed_date = data.lastProcessedDate?.toISOString() ?? null;
  }

  const { error } = await supabase
    .from('recurring_incomes')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating recurring income:', error);
  }
}

export async function deleteRecurringIncome(id: number): Promise<void> {
  const { error } = await supabase
    .from('recurring_incomes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting recurring income:', error);
  }
}

export async function toggleRecurringIncomeActive(id: number, isActive: boolean): Promise<void> {
  await updateRecurringIncome(id, { isActive });
}

export async function getActiveRecurringIncomesForProcessing(userId: string): Promise<RecurringIncome[]> {
  const { data, error } = await supabase
    .from('recurring_incomes')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error || !data) return [];

  return (data as RecurringIncomeRow[]).map(rowToRecurringIncome);
}

export async function markRecurringIncomeProcessed(id: number, date: Date): Promise<void> {
  await updateRecurringIncome(id, { lastProcessedDate: date });
}
