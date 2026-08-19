import { useState, useCallback, useMemo, useEffect } from 'react';
import type { EmergencyFundData } from '../types';
import { generateId } from '../utils/expenses';
import { syncDoc, fetchDoc } from '../lib/sync';

const STORAGE_KEY = 'finwise_emergency_fund';
const DEFAULT: EmergencyFundData = {
  currentAmount: 0, targetMonths: 3,
  lastUpdated: new Date().toISOString().slice(0, 10), contributions: [],
};
const load = (): EmergencyFundData => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') ?? DEFAULT; } catch { return DEFAULT; }
};

export const useEmergencyFund = (monthlyExpenses: number) => {
  const [data, setData] = useState<EmergencyFundData>(load);

  // Hydrate the emergency fund from Firestore on mount.
  useEffect(() => {
    let alive = true;
    fetchDoc<EmergencyFundData>('emergencyFund').then(remote => {
      if (alive && remote) { setData(remote); localStorage.setItem(STORAGE_KEY, JSON.stringify(remote)); }
    });
    return () => { alive = false; };
  }, []);

  const save = (updated: EmergencyFundData) => {
    setData(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    syncDoc('emergencyFund', updated);
  };

  const targetAmount  = useMemo(() => Math.max(monthlyExpenses * data.targetMonths, 50_000), [monthlyExpenses, data.targetMonths]);
  const progressPct   = useMemo(() => targetAmount > 0 ? Math.min(100, Math.round((data.currentAmount / targetAmount) * 100)) : 0, [data.currentAmount, targetAmount]);
  const monthsCovered = useMemo(() => monthlyExpenses > 0 ? +(data.currentAmount / monthlyExpenses).toFixed(1) : 0, [data.currentAmount, monthlyExpenses]);

  const deposit = useCallback((amount: number, note = '') => {
    save({ ...data, currentAmount: data.currentAmount + amount, lastUpdated: new Date().toISOString().slice(0, 10),
      contributions: [{ id: generateId(), amount, date: new Date().toISOString().slice(0, 10), note }, ...data.contributions].slice(0, 50) });
  }, [data]);

  const withdraw = useCallback((amount: number, note = '') => {
    save({ ...data, currentAmount: Math.max(0, data.currentAmount - amount), lastUpdated: new Date().toISOString().slice(0, 10),
      contributions: [{ id: generateId(), amount: -amount, date: new Date().toISOString().slice(0, 10), note: note || 'Withdrawal' }, ...data.contributions].slice(0, 50) });
  }, [data]);

  const setTargetMonths  = useCallback((months: number) => save({ ...data, targetMonths: months }), [data]);
  const setCurrentAmount = useCallback((amount: number) => save({ ...data, currentAmount: Math.max(0, amount), lastUpdated: new Date().toISOString().slice(0, 10) }), [data]);

  return { data, targetAmount, progressPct, monthsCovered, deposit, withdraw, setTargetMonths, setCurrentAmount };
};
