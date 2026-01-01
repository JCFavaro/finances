import type { ExpenseCategory, IncomeCategory } from '../types';

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; icon: string; color: string }[] = [
  { value: 'comida', label: 'Comida', icon: '🍔', color: '#ef4444' },
  { value: 'transporte', label: 'Transporte', icon: '🚗', color: '#3b82f6' },
  { value: 'servicios', label: 'Servicios', icon: '💡', color: '#eab308' },
  { value: 'ocio', label: 'Ocio', icon: '🎮', color: '#8b5cf6' },
  { value: 'suscripciones', label: 'Suscripciones', icon: '📱', color: '#ec4899' },
  { value: 'otros', label: 'Otros', icon: '📦', color: '#6b7280' },
];

export const INCOME_CATEGORIES: { value: IncomeCategory; label: string; icon: string; color: string }[] = [
  { value: 'sueldo', label: 'Sueldo', icon: '💼', color: '#10b981' },
  { value: 'inversiones', label: 'Inversiones', icon: '📈', color: '#06b6d4' },
  { value: 'freelance', label: 'Freelance', icon: '💻', color: '#f59e0b' },
  { value: 'otros', label: 'Otros', icon: '💰', color: '#6b7280' },
];

export const CATEGORY_COLORS: Record<string, string> = {
  comida: '#ef4444',
  transporte: '#3b82f6',
  servicios: '#eab308',
  ocio: '#8b5cf6',
  suscripciones: '#ec4899',
  sueldo: '#10b981',
  inversiones: '#06b6d4',
  freelance: '#f59e0b',
  otros: '#6b7280',
};

export const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export const DOLAR_API_URL = 'https://dolarapi.com/v1/dolares/blue';
