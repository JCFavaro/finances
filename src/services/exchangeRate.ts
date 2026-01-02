import type { DolarApiResponse } from '../types';
import { CACHE_DURATION_MS, DOLAR_API_URL } from '../utils/constants';

export interface ExchangeRate {
  compra: number;
  venta: number;
}

interface CachedRate extends ExchangeRate {
  fetchedAt: number;
}

const STORAGE_KEY = 'exchange-rate-cache';

function getCachedRate(): CachedRate | null {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function setCachedRate(rate: ExchangeRate): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...rate,
      fetchedAt: Date.now(),
    }));
  } catch {
    // Ignore storage errors
  }
}

export async function getDolarBlue(): Promise<ExchangeRate> {
  const cached = getCachedRate();

  if (cached && Date.now() - cached.fetchedAt < CACHE_DURATION_MS) {
    return { compra: cached.compra, venta: cached.venta };
  }

  try {
    const response = await fetch(DOLAR_API_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rate');
    }

    const data: DolarApiResponse = await response.json();
    const rate = { compra: data.compra, venta: data.venta };

    setCachedRate(rate);

    return rate;
  } catch (error) {
    if (cached) {
      return { compra: cached.compra, venta: cached.venta };
    }
    throw error;
  }
}

export function convertToARS(amount: number, currency: 'ARS' | 'USD', rate: ExchangeRate): number {
  if (currency === 'ARS') {
    return amount;
  }
  return amount * rate.venta;
}
