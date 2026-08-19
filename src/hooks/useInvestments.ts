import { useState, useCallback, useMemo, useEffect } from 'react';
import type{ Investment, InvestmentStatus } from '../types';
import { generateId, getCurrentMonth } from '../utils/expenses';
import { calculateInvestmentSummary, filterInvestmentsByMonth } from '../utils/investments';
import { syncCollection, deleteFromCollection, fetchCollection } from '../lib/sync';

const STORAGE_KEY = 'finwise_investments';
const load = (): Investment[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
};

export const useInvestments = () => {
  const [investments, setInvestments] = useState<Investment[]>(load);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  // Hydrate from Firestore on mount so investments load across devices.
  useEffect(() => {
    let alive = true;
    fetchCollection<Investment>('investments').then(remote => {
      if (alive && remote) { setInvestments(remote); localStorage.setItem(STORAGE_KEY, JSON.stringify(remote)); }
    });
    return () => { alive = false; };
  }, []);

  const persist = (updated: Investment[]) => {
    setInvestments(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    syncCollection('investments', updated);
  };

  const addInvestment = useCallback((data: Omit<Investment, 'id'>) => {
    persist([...investments, { ...data, id: generateId() }]);
  }, [investments]);

  const removeInvestment = useCallback((id: string) => {
    const updated = investments.filter((i) => i.id !== id);
    setInvestments(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    deleteFromCollection('investments', id);
  }, [investments]);

  const updateStatus = useCallback((id: string, status: InvestmentStatus) => {
    persist(investments.map((i) => (i.id === id ? { ...i, status } : i)));
  }, [investments]);

  const monthlyInvestments = useMemo(() => filterInvestmentsByMonth(investments, selectedMonth), [investments, selectedMonth]);
  const summary = useMemo(() => calculateInvestmentSummary(investments, selectedMonth), [investments, selectedMonth]);

  return { investments, monthlyInvestments, selectedMonth, setSelectedMonth, summary, addInvestment, removeInvestment, updateStatus };
};
