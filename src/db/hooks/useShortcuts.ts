import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../database';
import type { QuickShortcut } from '../../types';

export function useShortcuts() {
  return useLiveQuery(() =>
    db.shortcuts.orderBy('order').toArray()
  );
}

export async function addShortcut(
  data: Omit<QuickShortcut, 'id' | 'createdAt' | 'order'>
): Promise<number | undefined> {
  // Get the max order to place new shortcut at the end
  const shortcuts = await db.shortcuts.toArray();
  const maxOrder = shortcuts.length > 0
    ? Math.max(...shortcuts.map(s => s.order))
    : -1;

  return db.shortcuts.add({
    ...data,
    order: maxOrder + 1,
    createdAt: new Date()
  });
}

export async function updateShortcut(
  id: number,
  data: Partial<Omit<QuickShortcut, 'id' | 'createdAt'>>
): Promise<void> {
  await db.shortcuts.update(id, data);
}

export async function deleteShortcut(id: number): Promise<void> {
  await db.shortcuts.delete(id);
}

export async function reorderShortcuts(shortcuts: QuickShortcut[]): Promise<void> {
  await db.transaction('rw', db.shortcuts, async () => {
    for (let i = 0; i < shortcuts.length; i++) {
      if (shortcuts[i].id) {
        await db.shortcuts.update(shortcuts[i].id!, { order: i });
      }
    }
  });
}
