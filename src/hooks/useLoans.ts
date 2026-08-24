import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Loan } from '../types';
import { generateId } from '../utils/expenses';
import { totalLoanBalance } from './loans';
import { syncCollection, deleteFromCollection, fetchCollection } from '../lib/sync';

const STORAGE_KEY = 'finwise_loans';
const load = (): Loan[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
};

export const useLoans = () => {
  const [loans, setLoans] = useState<Loan[]>(load);

  useEffect(() => {
    let alive = true;
    fetchCollection<Loan>('loans').then(remote => {
      if (alive && remote) { setLoans(remote); localStorage.setItem(STORAGE_KEY, JSON.stringify(remote)); }
    });
    return () => { alive = false; };
  }, []);

  const persist = (updated: Loan[]) => {
    setLoans(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    syncCollection('loans', updated);
  };

  const addLoan = useCallback((data: Omit<Loan, 'id' | 'createdAt'>) =>
    persist([...loans, { ...data, id: generateId(), createdAt: new Date().toISOString() }]), [loans]);

  const removeLoan = useCallback((id: string) => {
    const updated = loans.filter((l) => l.id !== id);
    setLoans(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    deleteFromCollection('loans', id);
  }, [loans]);

  const updateLoan = useCallback((id: string, patch: Partial<Omit<Loan, 'id'>>) =>
    persist(loans.map((l) => l.id === id ? { ...l, ...patch } : l)), [loans]);

  const recordPayment = useCallback((id: string, amount: number) => {
    const today = new Date().toISOString().slice(0, 10);
    persist(loans.map((l) => l.id === id ? {
      ...l,
      currentBalance: Math.max(0, l.currentBalance - amount),
      payments: [...(l.payments ?? []), { id: generateId(), amount, date: today }],
    } : l));
  }, [loans]);

  const totalOwed = useMemo(() => totalLoanBalance(loans), [loans]);

  return { loans, totalOwed, addLoan, removeLoan, updateLoan, recordPayment };
};
