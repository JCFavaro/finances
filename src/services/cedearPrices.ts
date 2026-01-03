const PRICE_CACHE_KEY = 'cedear-prices-cache';
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export interface CedearInfo {
  symbol: string;
  name: string;
  price: number;
  currency: string;
}

export interface CedearPrices {
  [symbol: string]: number;
}

interface CachedPrices {
  prices: CedearPrices;
  fetchedAt: number;
}

function getCachedPrices(): CachedPrices | null {
  try {
    const cached = localStorage.getItem(PRICE_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function setCachedPrices(prices: CedearPrices): void {
  try {
    localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify({
      prices,
      fetchedAt: Date.now(),
    }));
  } catch {
    // Ignore storage errors
  }
}

// Common CEDEARs for quick search
const COMMON_CEDEARS: { symbol: string; name: string }[] = [
  { symbol: 'AAPL.BA', name: 'Apple' },
  { symbol: 'GOOGL.BA', name: 'Alphabet (Google)' },
  { symbol: 'MSFT.BA', name: 'Microsoft' },
  { symbol: 'AMZN.BA', name: 'Amazon' },
  { symbol: 'META.BA', name: 'Meta (Facebook)' },
  { symbol: 'NVDA.BA', name: 'NVIDIA' },
  { symbol: 'TSLA.BA', name: 'Tesla' },
  { symbol: 'MELI.BA', name: 'MercadoLibre' },
  { symbol: 'KO.BA', name: 'Coca-Cola' },
  { symbol: 'DIS.BA', name: 'Disney' },
  { symbol: 'BABA.BA', name: 'Alibaba' },
  { symbol: 'AMD.BA', name: 'AMD' },
  { symbol: 'NFLX.BA', name: 'Netflix' },
  { symbol: 'PBR.BA', name: 'Petrobras' },
  { symbol: 'VALE.BA', name: 'Vale' },
  { symbol: 'JPM.BA', name: 'JPMorgan' },
  { symbol: 'WMT.BA', name: 'Walmart' },
  { symbol: 'V.BA', name: 'Visa' },
  { symbol: 'JNJ.BA', name: 'Johnson & Johnson' },
  { symbol: 'XOM.BA', name: 'ExxonMobil' },
];

// Search for CEDEARs
export function searchCedear(query: string): { symbol: string; name: string }[] {
  if (!query || query.length < 1) return COMMON_CEDEARS.slice(0, 10);

  const q = query.toLowerCase();
  const filtered = COMMON_CEDEARS.filter(
    c => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
  );

  // If not found in common list, suggest adding .BA suffix
  if (filtered.length === 0) {
    const userSymbol = query.toUpperCase();
    const withBA = userSymbol.endsWith('.BA') ? userSymbol : `${userSymbol}.BA`;
    return [{ symbol: withBA, name: userSymbol.replace('.BA', '') }];
  }

  return filtered.slice(0, 10);
}

// Validate and get price - tries US first, then .BA for local Argentine stocks
export async function validateCedear(symbol: string): Promise<CedearInfo | null> {
  const baseTicker = symbol.toUpperCase().replace('.BA', '');

  // Try US ticker first
  const usResult = await fetchTickerPrice(baseTicker);
  if (usResult) {
    return usResult;
  }

  // If US not found, try .BA (Argentine market)
  const baResult = await fetchTickerPrice(`${baseTicker}.BA`);
  if (baResult) {
    return baResult;
  }

  return null;
}

async function fetchTickerPrice(ticker: string): Promise<CedearInfo | null> {
  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
    const response = await fetch(
      `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (!result) {
      return null;
    }

    const meta = result.meta;
    const price = meta.regularMarketPrice || meta.previousClose || 0;
    const currency = meta.currency || 'USD';

    return {
      symbol: ticker,
      name: meta.shortName || meta.symbol || ticker,
      price,
      currency,
    };
  } catch (error) {
    console.error(`Error fetching ${ticker}:`, error);
    return null;
  }
}

// Get prices for multiple symbols (stores by exact ticker used)
export async function getCedearPrices(symbols: string[]): Promise<CedearPrices> {
  if (!symbols.length) return {};

  const cached = getCachedPrices();
  const now = Date.now();

  // Check if all requested symbols are in cache and fresh
  if (cached && now - cached.fetchedAt < CACHE_DURATION_MS) {
    const allCached = symbols.every(s => s in cached.prices);
    if (allCached) {
      return cached.prices;
    }
  }

  const prices: CedearPrices = cached?.prices || {};

  // Fetch prices for each symbol
  for (const symbol of symbols) {
    const ticker = symbol.toUpperCase();

    // Skip if recently cached
    if (cached && now - cached.fetchedAt < CACHE_DURATION_MS && ticker in cached.prices) {
      continue;
    }

    const result = await fetchTickerPrice(ticker);
    if (result) {
      prices[ticker] = result.price;
    }
  }

  setCachedPrices(prices);
  return prices;
}

// Get cached CEDEAR price if available
export function getCachedCedearPrice(symbol: string): number | undefined {
  const cached = getCachedPrices();
  return cached?.prices[symbol.toUpperCase()];
}
