import { db } from '../db/database';
import { getDolarBlue, convertToARS } from './exchangeRate';

export async function processRecurringIncomes(): Promise<number> {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const activeRecurring = await db.recurringIncomes
    .where('isActive')
    .equals(1)
    .toArray();

  const toProcess = activeRecurring.filter(r => r.dayOfMonth === dayOfMonth);

  if (toProcess.length === 0) {
    return 0;
  }

  let rate;
  try {
    rate = await getDolarBlue();
  } catch {
    // Can't process without exchange rate
    return 0;
  }

  let processedCount = 0;

  for (const recurring of toProcess) {
    // Check if already processed this month
    if (recurring.lastProcessedDate) {
      const lastMonth = recurring.lastProcessedDate.getMonth();
      const lastYear = recurring.lastProcessedDate.getFullYear();
      if (lastMonth === currentMonth && lastYear === currentYear) {
        continue;
      }
    }

    const amountARS = convertToARS(recurring.amount, recurring.currency, rate);

    await db.transactions.add({
      type: 'income',
      amount: recurring.amount,
      currency: recurring.currency,
      amountARS,
      category: recurring.category,
      description: recurring.name,
      date: today,
      createdAt: new Date(),
      isRecurring: true,
      recurringIncomeId: recurring.id,
      exchangeRateUsed: recurring.currency === 'USD' ? rate.venta : undefined
    });

    await db.recurringIncomes.update(recurring.id!, {
      lastProcessedDate: today
    });

    processedCount++;
  }

  return processedCount;
}

export async function processRecurringExpenses(): Promise<number> {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const activeRecurring = await db.recurringExpenses
    .where('isActive')
    .equals(1)
    .toArray();

  const toProcess = activeRecurring.filter(r => r.dayOfMonth === dayOfMonth);

  if (toProcess.length === 0) {
    return 0;
  }

  let rate;
  try {
    rate = await getDolarBlue();
  } catch {
    // Can't process without exchange rate
    return 0;
  }

  let processedCount = 0;

  for (const recurring of toProcess) {
    // Check if already processed this month
    if (recurring.lastProcessedDate) {
      const lastMonth = recurring.lastProcessedDate.getMonth();
      const lastYear = recurring.lastProcessedDate.getFullYear();
      if (lastMonth === currentMonth && lastYear === currentYear) {
        continue;
      }
    }

    const amountARS = convertToARS(recurring.amount, recurring.currency, rate);

    await db.transactions.add({
      type: 'expense',
      amount: recurring.amount,
      currency: recurring.currency,
      amountARS,
      category: recurring.category,
      description: `${recurring.icon} ${recurring.name}`,
      date: today,
      createdAt: new Date(),
      isRecurring: true,
      exchangeRateUsed: recurring.currency === 'USD' ? rate.venta : undefined
    });

    await db.recurringExpenses.update(recurring.id!, {
      lastProcessedDate: today
    });

    processedCount++;
  }

  return processedCount;
}
