import { db } from '../db/database';
import type { Transaction, RecurringIncome, RecurringExpense, QuickShortcut, Budget, AppSettings, Asset } from '../types';

interface ExportData {
  version: number;
  exportedAt: string;
  data: {
    transactions: Transaction[];
    recurringIncomes: RecurringIncome[];
    recurringExpenses?: RecurringExpense[];
    shortcuts?: QuickShortcut[];
    budgets?: Budget[];
    settings: AppSettings | undefined;
    assets?: Asset[];
  };
}

export async function exportData(): Promise<string> {
  const transactions = await db.transactions.toArray();
  const recurringIncomes = await db.recurringIncomes.toArray();
  const recurringExpenses = await db.recurringExpenses.toArray();
  const shortcuts = await db.shortcuts.toArray();
  const budgets = await db.budgets.toArray();
  const settings = await db.settings.get('settings');
  const assets = await db.assets.toArray();

  const exportData: ExportData = {
    version: 2,
    exportedAt: new Date().toISOString(),
    data: {
      transactions,
      recurringIncomes,
      recurringExpenses,
      shortcuts,
      budgets,
      settings,
      assets
    }
  };

  return JSON.stringify(exportData, null, 2);
}

export async function importData(jsonString: string): Promise<void> {
  const parsed: ExportData = JSON.parse(jsonString);

  if (parsed.version !== 1 && parsed.version !== 2) {
    throw new Error('Versión de backup no soportada');
  }

  if (!parsed.data || !Array.isArray(parsed.data.transactions)) {
    throw new Error('Formato de backup inválido');
  }

  await db.transaction('rw', [db.transactions, db.recurringIncomes, db.recurringExpenses, db.shortcuts, db.budgets, db.settings, db.assets], async () => {
    await db.transactions.clear();
    await db.recurringIncomes.clear();
    await db.recurringExpenses.clear();
    await db.shortcuts.clear();
    await db.budgets.clear();
    await db.assets.clear();

    // Convert date strings back to Date objects
    const transactions = parsed.data.transactions.map(t => ({
      ...t,
      date: new Date(t.date),
      createdAt: new Date(t.createdAt)
    }));

    const recurringIncomes = parsed.data.recurringIncomes.map(r => ({
      ...r,
      createdAt: new Date(r.createdAt),
      lastProcessedDate: r.lastProcessedDate ? new Date(r.lastProcessedDate) : undefined
    }));

    await db.transactions.bulkAdd(transactions);
    await db.recurringIncomes.bulkAdd(recurringIncomes);

    // Import recurring expenses if they exist in the backup
    if (parsed.data.recurringExpenses && Array.isArray(parsed.data.recurringExpenses)) {
      const recurringExpenses = parsed.data.recurringExpenses.map(r => ({
        ...r,
        createdAt: new Date(r.createdAt),
        lastProcessedDate: r.lastProcessedDate ? new Date(r.lastProcessedDate) : undefined
      }));
      await db.recurringExpenses.bulkAdd(recurringExpenses);
    }

    // Import shortcuts if they exist in the backup
    if (parsed.data.shortcuts && Array.isArray(parsed.data.shortcuts)) {
      const shortcuts = parsed.data.shortcuts.map(s => ({
        ...s,
        createdAt: new Date(s.createdAt)
      }));
      await db.shortcuts.bulkAdd(shortcuts);
    }

    // Import budgets if they exist in the backup
    if (parsed.data.budgets && Array.isArray(parsed.data.budgets)) {
      const budgets = parsed.data.budgets.map(b => ({
        ...b,
        createdAt: new Date(b.createdAt)
      }));
      await db.budgets.bulkAdd(budgets);
    }

    // Import assets if they exist in the backup
    if (parsed.data.assets && Array.isArray(parsed.data.assets)) {
      const assets = parsed.data.assets.map(a => ({
        ...a,
        createdAt: new Date(a.createdAt),
        updatedAt: new Date(a.updatedAt)
      }));
      await db.assets.bulkAdd(assets);
    }

    if (parsed.data.settings) {
      await db.settings.put(parsed.data.settings);
    }
  });

  // Update last backup date
  await db.settings.update('settings', {
    lastBackupDate: new Date()
  });
}

export function downloadAsFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
