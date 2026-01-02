import type { CryptoTicker } from '../types';

export interface CryptoPrices {
  BTC: number;
  ETH: number;
}

const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';
const CACHE_KEY = 'crypto-prices-cache';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface CachedPrices extends CryptoPrices {
  fetchedAt: number;
}

function getCachedPrices(): CachedPrices | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function setCachedPrices(prices: CryptoPrices): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      ...prices,
      fetchedAt: Date.now(),
    }));
  } catch {
    // Ignore storage errors
  }
}

export async function getCryptoPrices(): Promise<CryptoPrices> {
  const cached = getCachedPrices();

  if (cached && Date.now() - cached.fetchedAt < CACHE_DURATION_MS) {
    return { BTC: cached.BTC, ETH: cached.ETH };
  }

  try {
    const response = await fetch(
      `${COINGECKO_API}?ids=bitcoin,ethereum&vs_currencies=usd`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch crypto prices');
    }

    const data = await response.json();

    const prices: CryptoPrices = {
      BTC: data.bitcoin?.usd ?? 0,
      ETH: data.ethereum?.usd ?? 0,
    };

    setCachedPrices(prices);
    return prices;
  } catch (error) {
    if (cached) {
      return { BTC: cached.BTC, ETH: cached.ETH };
    }
    // Return zeros if no cache and fetch failed
    return { BTC: 0, ETH: 0 };
  }
}

export function getCryptoValueUSD(ticker: CryptoTicker, quantity: number, prices: CryptoPrices): number {
  return quantity * (prices[ticker] ?? 0);
}
