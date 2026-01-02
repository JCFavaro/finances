import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { QuickShortcut, Currency, ExpenseCategory } from '../../types';

interface ShortcutRow {
  id: number;
  user_id: string;
  name: string;
  icon: string;
  category: string;
  amount: number;
  currency: string;
  sort_order: number;
  created_at: string;
}

function rowToShortcut(row: ShortcutRow): QuickShortcut {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    category: row.category as ExpenseCategory,
    amount: row.amount,
    currency: row.currency as Currency,
    order: row.sort_order,
    createdAt: new Date(row.created_at),
  };
}

export function useShortcuts() {
  const { user } = useAuth();
  const [shortcuts, setShortcuts] = useState<QuickShortcut[] | undefined>(undefined);

  const fetchShortcuts = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('shortcuts')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setShortcuts((data as ShortcutRow[]).map(rowToShortcut));
    }
  }, [user]);

  useEffect(() => {
    fetchShortcuts();
  }, [fetchShortcuts]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('shortcuts_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shortcuts',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchShortcuts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchShortcuts]);

  return shortcuts;
}

export async function addShortcut(
  userId: string,
  data: Omit<QuickShortcut, 'id' | 'createdAt' | 'order'>
): Promise<number | undefined> {
  // Get max order
  const { data: existing } = await supabase
    .from('shortcuts')
    .select('sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const maxOrder = existing && existing.length > 0 ? existing[0].sort_order : -1;

  const { data: result, error } = await supabase
    .from('shortcuts')
    .insert({
      user_id: userId,
      name: data.name,
      icon: data.icon,
      category: data.category,
      amount: data.amount,
      currency: data.currency,
      sort_order: maxOrder + 1,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error adding shortcut:', error);
    return undefined;
  }

  return result.id;
}

export async function updateShortcut(
  id: number,
  data: Partial<Omit<QuickShortcut, 'id' | 'createdAt'>>
): Promise<void> {
  const updates: Record<string, unknown> = {};

  if (data.name !== undefined) updates.name = data.name;
  if (data.icon !== undefined) updates.icon = data.icon;
  if (data.category !== undefined) updates.category = data.category;
  if (data.amount !== undefined) updates.amount = data.amount;
  if (data.currency !== undefined) updates.currency = data.currency;
  if (data.order !== undefined) updates.sort_order = data.order;

  const { error } = await supabase
    .from('shortcuts')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating shortcut:', error);
  }
}

export async function deleteShortcut(id: number): Promise<void> {
  const { error } = await supabase
    .from('shortcuts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting shortcut:', error);
  }
}

export async function reorderShortcuts(shortcuts: QuickShortcut[]): Promise<void> {
  for (let i = 0; i < shortcuts.length; i++) {
    if (shortcuts[i].id) {
      await supabase
        .from('shortcuts')
        .update({ sort_order: i })
        .eq('id', shortcuts[i].id);
    }
  }
}
