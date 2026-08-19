import { useState, useCallback, useMemo, useEffect } from 'react';
import type { NetWorthItem } from '../types';
import { generateId } from '../utils/expenses';
import { calculateNetWorth } from "./netWorth.ts";
import { syncCollection, deleteFromCollection, fetchCollection } from '../lib/sync';

const STORAGE_KEY = 'finwise_networth';
const load = (): NetWorthItem[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
};

export const useNetWorth = () => {
  const [items, setItems] = useState<NetWorthItem[]>(load);

  // Hydrate from Firestore on mount so net-worth items load across devices.
  useEffect(() => {
    let alive = true;
    fetchCollection<NetWorthItem>('networth').then(remote => {
      if (alive && remote) { setItems(remote); localStorage.setItem(STORAGE_KEY, JSON.stringify(remote)); }
    });
    return () => { alive = false; };
  }, []);

  const persist = (updated: NetWorthItem[]) => {
    setItems(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    syncCollection('networth', updated);
  };

  const addItem    = useCallback((data: Omit<NetWorthItem, 'id'>) => persist([...items, { ...data, id: generateId() }]), [items]);

  const removeItem = useCallback((id: string) => {
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    deleteFromCollection('networth', id);
  }, [items]);

  const updateAmount = useCallback((id: string, amount: number) => persist(items.map((i) => i.id === id ? { ...i, amount } : i)), [items]);
  const summary      = useMemo(() => calculateNetWorth(items), [items]);

  return { items, summary, addItem, removeItem, updateAmount };
};
