import { db } from '../db/database';
import type { DolarApiResponse } from '../types';
import { CACHE_DURATION_MS, DOLAR_API_URL } from '../utils/constants';

export interface ExchangeRate {
  compra: number;
  venta: number;
}

export async function getDolarBlue(): Promise<ExchangeRate> {
  const cached = await db.exchangeRate.get('dolar-blue');

  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_DURATION_MS) {
    return { compra: cached.compra, venta: cached.venta };
  }

  try {
    const response = await fetch(DOLAR_API_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rate');
    }

    const data: DolarApiResponse = await response.json();

    await db.exchangeRate.put({
      id: 'dolar-blue',
      compra: data.compra,
      venta: data.venta,
      fetchedAt: new Date()
    });

    return { compra: data.compra, venta: data.venta };
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
