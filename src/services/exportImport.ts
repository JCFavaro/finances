import { db } from '../db/database';
import type { Transaction, RecurringIncome, AppSettings } from '../types';

interface ExportData {
  version: number;
  exportedAt: string;
  data: {
    transactions: Transaction[];
    recurringIncomes: RecurringIncome[];
    settings: AppSettings | undefined;
  };
}

export async function exportData(): Promise<string> {
  const transactions = await db.transactions.toArray();
  const recurringIncomes = await db.recurringIncomes.toArray();
  const settings = await db.settings.get('settings');

  const exportData: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      transactions,
      recurringIncomes,
      settings
    }
  };

  return JSON.stringify(exportData, null, 2);
}

export async function importData(jsonString: string): Promise<void> {
  const parsed: ExportData = JSON.parse(jsonString);

  if (parsed.version !== 1) {
    throw new Error('Versión de backup no soportada');
  }

  if (!parsed.data || !Array.isArray(parsed.data.transactions)) {
    throw new Error('Formato de backup inválido');
  }

  await db.transaction('rw', [db.transactions, db.recurringIncomes, db.settings], async () => {
    await db.transactions.clear();
    await db.recurringIncomes.clear();

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
