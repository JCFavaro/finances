const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const PRICE_CACHE_KEY = 'crypto-prices-cache';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Map common symbols to CoinGecko IDs
const SYMBOL_TO_ID: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'ADA': 'cardano',
  'DOT': 'polkadot',
  'DOGE': 'dogecoin',
  'XRP': 'ripple',
  'MATIC': 'matic-network',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'AVAX': 'avalanche-2',
  'ATOM': 'cosmos',
  'LTC': 'litecoin',
};

// Convert symbol to CoinGecko ID
export function symbolToId(symbolOrId: string): string {
  const upper = symbolOrId.toUpperCase();
  return SYMBOL_TO_ID[upper] || symbolOrId.toLowerCase();
}

export interface CoinInfo {
  id: string;
  symbol: string;
  name: string;
}

export interface CryptoPrices {
  [coinId: string]: number;
}

interface CachedPrices {
  prices: CryptoPrices;
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

function setCachedPrices(prices: CryptoPrices): void {
  try {
    localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify({
      prices,
      fetchedAt: Date.now(),
    }));
  } catch {
    // Ignore storage errors
  }
}

// Search for crypto coins
export async function searchCrypto(query: string): Promise<CoinInfo[]> {
  if (!query || query.length < 2) return [];

  try {
    const response = await fetch(
      `${COINGECKO_API}/search?query=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error('Failed to search crypto');
    }

    const data = await response.json();
    return (data.coins || []).slice(0, 10).map((coin: { id: string; symbol: string; name: string }) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
    }));
  } catch (error) {
    console.error('Error searching crypto:', error);
    return [];
  }
}

// Get price for specific coins (accepts both symbols like BTC and IDs like bitcoin)
export async function getCryptoPrices(tickers: string[]): Promise<CryptoPrices> {
  if (!tickers.length) return {};

  const cached = getCachedPrices();
  const now = Date.now();

  // Check if all requested tickers are in cache and fresh
  if (cached && now - cached.fetchedAt < CACHE_DURATION_MS) {
    const allCached = tickers.every(t => t in cached.prices);
    if (allCached) {
      return cached.prices;
    }
  }

  // Convert tickers to CoinGecko IDs
  const tickerToId = new Map<string, string>();
  for (const ticker of tickers) {
    tickerToId.set(ticker, symbolToId(ticker));
  }
  const uniqueIds = [...new Set(tickerToId.values())];

  try {
    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=${uniqueIds.join(',')}&vs_currencies=usd`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch crypto prices');
    }

    const data = await response.json();

    // Map prices back to original tickers
    const prices: CryptoPrices = {};
    for (const [ticker, coinId] of tickerToId) {
      prices[ticker] = data[coinId]?.usd ?? 0;
    }

    // Merge with existing cache
    const mergedPrices = { ...(cached?.prices || {}), ...prices };
    setCachedPrices(mergedPrices);
    return mergedPrices;
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    // Return cached prices if available
    if (cached) {
      return cached.prices;
    }
    return {};
  }
}

// Validate if a coin exists
export async function validateCrypto(coinIdOrSymbol: string): Promise<CoinInfo | null> {
  const query = coinIdOrSymbol.toLowerCase();

  // Try searching first
  const results = await searchCrypto(query);

  // Find exact match by ID or symbol
  const exactMatch = results.find(
    coin => coin.id === query || coin.symbol.toLowerCase() === query
  );

  return exactMatch || (results.length > 0 ? results[0] : null);
}

// Get cached coin price if available
export function getCachedPrice(coinId: string): number | undefined {
  const cached = getCachedPrices();
  return cached?.prices[coinId];
}
