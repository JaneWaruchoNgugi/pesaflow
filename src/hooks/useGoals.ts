import { useState, useCallback, useEffect } from 'react';
import type { Goal } from '../types';
import { generateId } from '../utils/expenses';
import { syncCollection, deleteFromCollection, fetchCollection } from '../lib/sync';

const STORAGE_KEY = 'finwise_goals';
const load = (): Goal[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
};

export const useGoals = () => {
  const [goals, setGoals] = useState<Goal[]>(load);

  // Hydrate from Firestore on mount so goals load across devices, not just localStorage.
  useEffect(() => {
    let alive = true;
    fetchCollection<Goal>('goals').then(remote => {
      if (alive && remote) { setGoals(remote); localStorage.setItem(STORAGE_KEY, JSON.stringify(remote)); }
    });
    return () => { alive = false; };
  }, []);

  const persist = (updated: Goal[]) => {
    setGoals(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    syncCollection('goals', updated);
  };

  const addGoal = useCallback((data: Omit<Goal, 'id' | 'createdAt' | 'completed'>) => {
    persist([...goals, { ...data, id: generateId(), createdAt: new Date().toISOString(), completed: false }]);
  }, [goals]);

  const removeGoal = useCallback((id: string) => {
    const updated = goals.filter((g) => g.id !== id);
    setGoals(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    deleteFromCollection('goals', id);
  }, [goals]);

  const updateSaved = useCallback((id: string, amount: number) => {
    persist(goals.map((g) => {
      if (g.id !== id) return g;
      const updated = { ...g, savedAmount: Math.max(0, amount) };
      updated.completed = updated.savedAmount >= updated.targetAmount;
      return updated;
    }));
  }, [goals]);

  const contribute = useCallback((id: string, amount: number) => {
    const today = new Date().toISOString().slice(0, 10);
    persist(goals.map((g) => {
      if (g.id !== id) return g;
      const newSaved = g.savedAmount + amount;
      const entry = { id: generateId(), amount, date: today };
      return {
        ...g,
        savedAmount: newSaved,
        contributions: [...(g.contributions ?? []), entry],
        completed: newSaved >= g.targetAmount,
      };
    }));
  }, [goals]);

  const markComplete = useCallback((id: string) => {
    persist(goals.map((g) => g.id === id ? { ...g, completed: true, savedAmount: g.targetAmount } : g));
  }, [goals]);

  const activeGoals    = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);
  const totalTargeted  = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved     = goals.reduce((s, g) => s + g.savedAmount, 0);

  return { goals, activeGoals, completedGoals, totalTargeted, totalSaved, addGoal, removeGoal, updateSaved, contribute, markComplete };
};
