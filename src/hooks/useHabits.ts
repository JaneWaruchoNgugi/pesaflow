import { useState, useCallback, useEffect } from 'react';
import type { Habit } from '../types';
import { generateId } from '../utils/expenses';
import { syncDoc, fetchDoc } from '../lib/sync';

const STORAGE_KEY = 'finwise_habits';
const TODAY = () => new Date().toISOString().slice(0, 10);

// Apply the "reset done flags at the start of a new day" rule to any habit list.
const applyDailyReset = (list: Habit[]): Habit[] => {
  const today = TODAY();
  return list.map(h => (h.lastResetDate !== today && h.done ? { ...h, done: false, lastResetDate: today } : h));
};

const DEFAULT_HABITS: Omit<Habit, 'id'>[] = [
  { text: 'Check PesaFlow dashboard', done: false, createdAt: new Date().toISOString() },
  { text: 'Log every expense (no matter how small)', done: false, createdAt: new Date().toISOString() },
  { text: 'Avoid impulse purchases — apply the 48-hour rule', done: false, createdAt: new Date().toISOString() },
  { text: 'Check upcoming bills due this week', done: false, createdAt: new Date().toISOString() },
  { text: 'Move savings to MMF / SACCO on payday', done: false, createdAt: new Date().toISOString() },
];

const load = (): Habit[] => {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!data) {
      // Seed defaults on first load
      return DEFAULT_HABITS.map((h) => ({ ...h, id: generateId() }));
    }
    // Auto-reset "done" flags at start of new day
    const today = TODAY();
    return data.map((h: Habit) => {
      if (h.lastResetDate !== today && h.done) {
        return { ...h, done: false, lastResetDate: today };
      }
      return h;
    });
  } catch {
    return DEFAULT_HABITS.map((h) => ({ ...h, id: generateId() }));
  }
};

export const useHabits = () => {
  const [habits, setHabits] = useState<Habit[]>(load);

  // Hydrate habits from Firestore on mount (stored as a data/habits doc).
  useEffect(() => {
    let alive = true;
    fetchDoc<{ items: Habit[] }>('habits').then(remote => {
      if (alive && remote?.items?.length) {
        const next = applyDailyReset(remote.items);
        setHabits(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
    });
    return () => { alive = false; };
  }, []);

  const save = (updated: Habit[]) => {
    setHabits(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    syncDoc('habits', { items: updated });
  };

  const addHabit = useCallback((text: string) => {
    const h: Habit = { id: generateId(), text: text.trim(), done: false, createdAt: new Date().toISOString() };
    save([...habits, h]);
  }, [habits]);

  const removeHabit = useCallback((id: string) => {
    save(habits.filter((h) => h.id !== id));
  }, [habits]);

  const toggleHabit = useCallback((id: string) => {
    save(habits.map((h) =>
      h.id === id ? { ...h, done: !h.done, lastResetDate: TODAY() } : h
    ));
  }, [habits]);

  const resetAll = useCallback(() => {
    save(habits.map((h) => ({ ...h, done: false, lastResetDate: TODAY() })));
  }, [habits]);

  const completedCount = habits.filter((h) => h.done).length;
  const completionPct = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

  return { habits, completedCount, completionPct, addHabit, removeHabit, toggleHabit, resetAll };
};
