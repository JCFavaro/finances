import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { getCryptoPrices, type CryptoPrices } from '../../services/cryptoPrices';
import { getCedearPrices, type CedearPrices } from '../../services/cedearPrices';
import type { Asset, Currency, AssetType } from '../../types';
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
  purchase_price: number | null;
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
    ticker: row.ticker ?? undefined,
    quantity: row.quantity ?? undefined,
    purchasePrice: row.purchase_price ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export const ASSET_TYPES: { value: AssetType; label: string; icon: string }[] = [
  { value: 'efectivo', label: 'Efectivo', icon: '💵' },
  { value: 'banco', label: 'Banco', icon: '🏦' },
  { value: 'inversiones', label: 'Inversiones', icon: '📈' },
  { value: 'crypto', label: 'Crypto', icon: '₿' },
  { value: 'cedear', label: 'CEDEAR', icon: '📊' },
  { value: 'otros', label: 'Otros', icon: '💰' },
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

export function useAssetPrices(assets: Asset[] | undefined) {
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrices>({});
  const [cedearPrices, setCedearPrices] = useState<CedearPrices>({});
  const [loadingCrypto, setLoadingCrypto] = useState(false);
  const [loadingCedear, setLoadingCedear] = useState(false);

  useEffect(() => {
    if (!assets) return;

    // Get unique crypto coin IDs
    const cryptoAssets = assets.filter(a => a.type === 'crypto' && a.ticker);
    const cryptoIds = [...new Set(cryptoAssets.map(a => a.ticker!))];

    if (cryptoIds.length > 0) {
      setLoadingCrypto(true);
      getCryptoPrices(cryptoIds)
        .then(setCryptoPrices)
        .finally(() => setLoadingCrypto(false));
    }

    // Get unique CEDEAR symbols
    const cedearAssets = assets.filter(a => a.type === 'cedear' && a.ticker);
    const cedearSymbols = [...new Set(cedearAssets.map(a => a.ticker!))];

    if (cedearSymbols.length > 0) {
      setLoadingCedear(true);
      getCedearPrices(cedearSymbols)
        .then(setCedearPrices)
        .finally(() => setLoadingCedear(false));
    }
  }, [assets]);

  const isLoadingPrices = loadingCrypto || loadingCedear;

  return { cryptoPrices, cedearPrices, isLoadingPrices };
}

export function useAssetsSummary(exchangeRate?: ExchangeRate) {
  const assets = useAssets();
  const { cryptoPrices, cedearPrices, isLoadingPrices } = useAssetPrices(assets);

  if (!assets) return undefined;

  // Calculate crypto assets value in USD
  const cryptoAssets = assets.filter(a => a.type === 'crypto' && a.ticker && a.quantity);
  const totalCryptoUSD = cryptoAssets.reduce((sum, a) => {
    if (!a.ticker || !a.quantity) return sum;
    const price = cryptoPrices[a.ticker] ?? 0;
    return sum + (a.quantity * price);
  }, 0);

  // Calculate CEDEAR assets value (can be USD or ARS)
  const cedearAssets = assets.filter(a => a.type === 'cedear' && a.ticker && a.quantity);
  const totalCedearUSD = cedearAssets
    .filter(a => a.currency === 'USD')
    .reduce((sum, a) => {
      if (!a.ticker || !a.quantity) return sum;
      const price = cedearPrices[a.ticker] ?? 0;
      return sum + (a.quantity * price);
    }, 0);
  const totalCedearARS = cedearAssets
    .filter(a => a.currency === 'ARS')
    .reduce((sum, a) => {
      if (!a.ticker || !a.quantity) return sum;
      const price = cedearPrices[a.ticker] ?? 0;
      return sum + (a.quantity * price);
    }, 0);

  // Non-crypto/CEDEAR assets
  const otherAssets = assets.filter(a => a.type !== 'crypto' && a.type !== 'cedear');

  const totalARS = otherAssets
    .filter(a => a.currency === 'ARS')
    .reduce((sum, a) => sum + a.amount, 0) + totalCedearARS;

  const totalUSD = otherAssets
    .filter(a => a.currency === 'USD')
    .reduce((sum, a) => sum + a.amount, 0) + totalCryptoUSD + totalCedearUSD;

  const totalUnifiedARS = totalARS + (exchangeRate ? totalUSD * exchangeRate.venta : 0);

  return {
    totalARS,
    totalUSD,
    totalCryptoUSD,
    totalCedearUSD,
    totalUnifiedARS,
    count: assets.length,
    cryptoPrices,
    cedearPrices,
    isLoadingPrices,
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
      purchase_price: data.purchasePrice ?? null,
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
  if (data.purchasePrice !== undefined) updates.purchase_price = data.purchasePrice;

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
