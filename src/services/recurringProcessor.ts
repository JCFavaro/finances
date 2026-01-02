import { supabase } from '../lib/supabase';
import { getDolarBlue, convertToARS } from './exchangeRate';
import type { Currency } from '../types';

interface RecurringIncomeRow {
  id: number;
  name: string;
  amount: number;
  currency: string;
  category: string;
  day_of_month: number;
  is_active: boolean;
  last_processed_date: string | null;
}

interface RecurringExpenseRow {
  id: number;
  name: string;
  icon: string;
  amount: number;
  currency: string;
  category: string;
  day_of_month: number;
  is_active: boolean;
  last_processed_date: string | null;
}

export async function processRecurringIncomes(userId: string): Promise<number> {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const { data: activeRecurring, error } = await supabase
    .from('recurring_incomes')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error || !activeRecurring) return 0;

  const toProcess = (activeRecurring as RecurringIncomeRow[]).filter(
    r => r.day_of_month === dayOfMonth
  );

  if (toProcess.length === 0) {
    return 0;
  }

  let rate;
  try {
    rate = await getDolarBlue();
  } catch {
    return 0;
  }

  let processedCount = 0;

  for (const recurring of toProcess) {
    // Check if already processed this month
    if (recurring.last_processed_date) {
      const lastDate = new Date(recurring.last_processed_date);
      const lastMonth = lastDate.getMonth();
      const lastYear = lastDate.getFullYear();
      if (lastMonth === currentMonth && lastYear === currentYear) {
        continue;
      }
    }

    const amountARS = convertToARS(
      recurring.amount,
      recurring.currency as Currency,
      rate
    );

    // Add transaction
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'income',
        amount: recurring.amount,
        currency: recurring.currency,
        amount_ars: amountARS,
        category: recurring.category,
        description: recurring.name,
        date: today.toISOString(),
        is_recurring: true,
        recurring_income_id: recurring.id,
        exchange_rate_used: recurring.currency === 'USD' ? rate.venta : null,
      });

    if (txError) continue;

    // Update last processed date
    await supabase
      .from('recurring_incomes')
      .update({ last_processed_date: today.toISOString() })
      .eq('id', recurring.id);

    processedCount++;
  }

  return processedCount;
}

export async function processRecurringExpenses(userId: string): Promise<number> {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const { data: activeRecurring, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error || !activeRecurring) return 0;

  const toProcess = (activeRecurring as RecurringExpenseRow[]).filter(
    r => r.day_of_month === dayOfMonth
  );

  if (toProcess.length === 0) {
    return 0;
  }

  let rate;
  try {
    rate = await getDolarBlue();
  } catch {
    return 0;
  }

  let processedCount = 0;

  for (const recurring of toProcess) {
    // Check if already processed this month
    if (recurring.last_processed_date) {
      const lastDate = new Date(recurring.last_processed_date);
      const lastMonth = lastDate.getMonth();
      const lastYear = lastDate.getFullYear();
      if (lastMonth === currentMonth && lastYear === currentYear) {
        continue;
      }
    }

    const amountARS = convertToARS(
      recurring.amount,
      recurring.currency as Currency,
      rate
    );

    // Add transaction
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'expense',
        amount: recurring.amount,
        currency: recurring.currency,
        amount_ars: amountARS,
        category: recurring.category,
        description: `${recurring.icon} ${recurring.name}`,
        date: today.toISOString(),
        is_recurring: true,
        recurring_expense_id: recurring.id,
        exchange_rate_used: recurring.currency === 'USD' ? rate.venta : null,
      });

    if (txError) continue;

    // Update last processed date
    await supabase
      .from('recurring_expenses')
      .update({ last_processed_date: today.toISOString() })
      .eq('id', recurring.id);

    processedCount++;
  }

  return processedCount;
}
