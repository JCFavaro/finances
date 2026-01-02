import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { getCryptoPrices, type CryptoPrices } from '../../services/cryptoPrices';
import type { Asset, Currency, AssetType, CryptoTicker } from '../../types';
import type { ExchangeRate } from '../../services/exchangeRate';

interface AssetRow {
  id: number;
  user_id: string;
  name: string;
  type: string;
  amount: number;
  currency: string;
  ticker: string | null;
  quantity: number | null;
  created_at: string;
  updated_at: string;
}

function rowToAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    name: row.name,
    type: row.type as AssetType,
    amount: row.amount,
    currency: row.currency as Currency,
    ticker: row.ticker as CryptoTicker | undefined,
    quantity: row.quantity ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export const ASSET_TYPES: { value: AssetType; label: string; icon: string }[] = [
  { value: 'efectivo', label: 'Efectivo', icon: '💵' },
  { value: 'banco', label: 'Banco', icon: '🏦' },
  { value: 'inversiones', label: 'Inversiones', icon: '📈' },
  { value: 'crypto', label: 'Crypto', icon: '₿' },
  { value: 'otros', label: 'Otros', icon: '💰' },
];

export const CRYPTO_TICKERS: { value: CryptoTicker; label: string; icon: string }[] = [
  { value: 'BTC', label: 'Bitcoin', icon: '₿' },
  { value: 'ETH', label: 'Ethereum', icon: 'Ξ' },
];

export function useAssets() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[] | undefined>(undefined);

  const fetchAssets = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAssets((data as AssetRow[]).map(rowToAsset));
    }
  }, [user]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('assets_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'assets',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchAssets();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchAssets]);

  return assets;
}

export function useCryptoPrices() {
  const [prices, setPrices] = useState<CryptoPrices | undefined>(undefined);

  useEffect(() => {
    getCryptoPrices().then(setPrices);
  }, []);

  return prices;
}

export function useAssetsSummary(exchangeRate?: ExchangeRate) {
  const assets = useAssets();
  const cryptoPrices = useCryptoPrices();

  if (!assets) return undefined;

  // Calculate crypto assets value in USD
  const cryptoAssets = assets.filter(a => a.type === 'crypto' && a.ticker && a.quantity);
  const totalCryptoUSD = cryptoAssets.reduce((sum, a) => {
    if (!cryptoPrices || !a.ticker || !a.quantity) return sum;
    const price = cryptoPrices[a.ticker] ?? 0;
    return sum + (a.quantity * price);
  }, 0);

  // Non-crypto assets
  const nonCryptoAssets = assets.filter(a => a.type !== 'crypto');

  const totalARS = nonCryptoAssets
    .filter(a => a.currency === 'ARS')
    .reduce((sum, a) => sum + a.amount, 0);

  const totalUSD = nonCryptoAssets
    .filter(a => a.currency === 'USD')
    .reduce((sum, a) => sum + a.amount, 0) + totalCryptoUSD;

  const totalUnifiedARS = totalARS + (exchangeRate ? totalUSD * exchangeRate.venta : 0);

  return {
    totalARS,
    totalUSD,
    totalCryptoUSD,
    totalUnifiedARS,
    count: assets.length,
    cryptoPrices,
  };
}

export async function addAsset(
  userId: string,
  data: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>
): Promise<number | undefined> {
  const { data: result, error } = await supabase
    .from('assets')
    .insert({
      user_id: userId,
      name: data.name,
      type: data.type,
      amount: data.amount,
      currency: data.currency,
      ticker: data.ticker ?? null,
      quantity: data.quantity ?? null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error adding asset:', error);
    return undefined;
  }

  return result.id;
}

export async function updateAsset(
  id: number,
  data: Partial<Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (data.name !== undefined) updates.name = data.name;
  if (data.type !== undefined) updates.type = data.type;
  if (data.amount !== undefined) updates.amount = data.amount;
  if (data.currency !== undefined) updates.currency = data.currency;
  if (data.ticker !== undefined) updates.ticker = data.ticker;
  if (data.quantity !== undefined) updates.quantity = data.quantity;

  const { error } = await supabase
    .from('assets')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating asset:', error);
  }
}

export async function deleteAsset(id: number): Promise<void> {
  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting asset:', error);
  }
}
