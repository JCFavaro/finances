import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../database';
import type { Asset, AssetType } from '../../types';

export function useAssets() {
  return useLiveQuery(() => db.assets.toArray());
}

export function useAssetsSummary(exchangeRate?: { compra: number; venta: number }) {
  const assets = useLiveQuery(() => db.assets.toArray());

  if (!assets) return null;

  const rate = exchangeRate?.venta ?? 1;

  let totalARS = 0;
  let totalUSD = 0;

  for (const asset of assets) {
    if (asset.currency === 'ARS') {
      totalARS += asset.amount;
    } else {
      totalUSD += asset.amount;
    }
  }

  // Total unificado en ARS
  const totalUnifiedARS = totalARS + (totalUSD * rate);

  return {
    totalARS,
    totalUSD,
    totalUnifiedARS,
    count: assets.length,
  };
}

export async function addAsset(asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<number | undefined> {
  const now = new Date();
  return db.assets.add({
    ...asset,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateAsset(id: number, updates: Partial<Omit<Asset, 'id' | 'createdAt'>>): Promise<number> {
  return db.assets.update(id, {
    ...updates,
    updatedAt: new Date(),
  });
}

export async function deleteAsset(id: number): Promise<void> {
  await db.assets.delete(id);
}

// Asset type labels and icons
export const ASSET_TYPES: { value: AssetType; label: string; icon: string }[] = [
  { value: 'efectivo', label: 'Efectivo', icon: '💵' },
  { value: 'banco', label: 'Banco', icon: '🏦' },
  { value: 'inversiones', label: 'Inversiones', icon: '📈' },
  { value: 'crypto', label: 'Crypto', icon: '₿' },
  { value: 'otros', label: 'Otros', icon: '💰' },
];
