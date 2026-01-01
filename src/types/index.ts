// Currency types
export type Currency = 'ARS' | 'USD';

// Transaction types
export type TransactionType = 'income' | 'expense';

// Categories
export type ExpenseCategory =
  | 'comida'
  | 'transporte'
  | 'servicios'
  | 'ocio'
  | 'suscripciones'
  | 'otros';

export type IncomeCategory =
  | 'sueldo'
  | 'inversiones'
  | 'freelance'
  | 'otros';

export type Category = ExpenseCategory | IncomeCategory;

// Core entities
export interface Transaction {
  id?: number;
  type: TransactionType;
  amount: number;
  currency: Currency;
  amountARS: number;
  category: Category;
  description?: string;
  date: Date;
  createdAt: Date;
  exchangeRateUsed?: number;
  isRecurring?: boolean;
  recurringIncomeId?: number;
}

export interface RecurringIncome {
  id?: number;
  name: string;
  amount: number;
  currency: Currency;
  category: IncomeCategory;
  dayOfMonth: number;
  isActive: boolean;
  lastProcessedDate?: Date;
  createdAt: Date;
}

export interface RecurringExpense {
  id?: number;
  name: string;
  icon: string;
  amount: number;
  currency: Currency;
  category: ExpenseCategory;
  dayOfMonth: number;
  isActive: boolean;
  lastProcessedDate?: Date;
  createdAt: Date;
}

export interface QuickShortcut {
  id?: number;
  name: string;
  icon: string;
  category: ExpenseCategory;
  amount: number;
  currency: Currency;
  order: number;
  createdAt: Date;
}

export interface Budget {
  id?: number;
  category: ExpenseCategory;
  amount: number;
  currency: Currency;
  isActive: boolean;
  createdAt: Date;
}

export interface ExchangeRateCache {
  id: 'dolar-blue';
  compra: number;
  venta: number;
  fetchedAt: Date;
}

export interface AppSettings {
  id: 'settings';
  defaultCurrency: Currency;
  lastBackupDate?: Date;
}

// Assets / Patrimony
export type AssetType = 'efectivo' | 'banco' | 'inversiones' | 'crypto' | 'otros';

export interface Asset {
  id?: number;
  name: string;
  type: AssetType;
  amount: number;
  currency: Currency;
  createdAt: Date;
  updatedAt: Date;
}

// API response
export interface DolarApiResponse {
  moneda: string;
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

// Chart data types
export interface CategoryChartData {
  name: string;
  value: number;
  color: string;
}

export interface MonthlyChartData {
  month: string;
  income: number;
  expenses: number;
}

// Form types
export interface TransactionFormData {
  type: TransactionType;
  amount: string;
  currency: Currency;
  category: Category;
  description: string;
  date: Date;
}

export interface MonthYearFilter {
  month: number;
  year: number;
}
