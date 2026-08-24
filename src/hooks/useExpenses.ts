import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Expense, FinancialProfile, Goal } from '../types';
import { generateId, getCurrentMonth, filterByMonth } from '../utils/expenses';
import { calculateMonthlyBreakdown, getSpendingInsight, getUnnecessaryWarnings } from '../utils/calculations';
import { goalContributionsInMonth, monthlyHistory } from '../utils/history';
import { getDailyMultiplier } from '../utils/frequency';
import { syncCollection, syncDoc, deleteFromCollection } from '../lib/sync';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db, ensureAuthReady } from '../lib/firebase';

const STORAGE_KEY = 'finwise_expenses';
const PROFILE_KEY = 'finwise_profile';

const loadExpenses = (): Expense[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
};
const loadProfile = (): FinancialProfile => {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{"monthlyIncome":0,"currency":"KES"}'); }
  catch { return { monthlyIncome: 0, currency: 'KES' }; }
};

const getUid = (): string | null => {
  try {
    const p = JSON.parse(localStorage.getItem('finwise_auth_profile') || 'null');
    return p?.uid || null;
  } catch { return null; }
};

export const useExpenses = (billsTotal = 0, goals: Goal[] = []) => {
  const [expenses, setExpenses] = useState<Expense[]>(loadExpenses);
  const [profile, setProfile] = useState<FinancialProfile>(loadProfile);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  useEffect(() => {
    const uid = getUid();
    if (!uid) return;

    (async () => {
      try {
        await ensureAuthReady();
        const [expenseSnap, profileSnap, legacyProfileSnap] = await Promise.all([
          getDocs(collection(db, 'users', uid, 'expenses')),
          getDoc(doc(db, 'users', uid, 'data', 'financialProfile')),
          getDoc(doc(db, 'users', uid, 'data', 'profile')),
        ]);

        if (!expenseSnap.empty) {
          const remoteExpenses = expenseSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Expense);
          setExpenses(remoteExpenses);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteExpenses));
        }

        const remoteProfile = profileSnap.exists() ? profileSnap.data() : legacyProfileSnap.exists() ? legacyProfileSnap.data() : null;
        if (remoteProfile) {
          const nextProfile = {
            monthlyIncome: Number(remoteProfile.monthlyIncome || 0),
            currency: String(remoteProfile.currency || 'KES'),
            incomeStreams: remoteProfile.incomeStreams ?? undefined,
            incomeMode: remoteProfile.incomeMode ?? undefined,
            dailyAmount: remoteProfile.dailyAmount ? Number(remoteProfile.dailyAmount) : undefined,
            daysPerWeek: remoteProfile.daysPerWeek ? Number(remoteProfile.daysPerWeek) : undefined,
          } as FinancialProfile;
          setProfile(nextProfile);
          localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
        }
      } catch (e) {
        console.error('Failed to load expenses from Firebase:', e);
      }
    })();
  }, []);

  const saveProfile = (updated: FinancialProfile) => {
    setProfile(updated);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
    syncDoc('financialProfile', updated);
  };

  const addExpense = useCallback((data: Omit<Expense, 'id'>) => {
    const newExpense: Expense = { ...data, id: generateId() };
    const updated = [...expenses, newExpense];
    setExpenses(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    syncCollection('expenses', updated);
  }, [expenses]);

  const removeExpense = useCallback((id: string) => {
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    deleteFromCollection('expenses', id);
  }, [expenses]);

  const updateExpense = useCallback((id: string, patch: Partial<Omit<Expense, 'id'>>) => {
    const updated = expenses.map((e) => (e.id === id ? { ...e, ...patch } : e));
    setExpenses(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    syncCollection('expenses', updated);
  }, [expenses]);

  const updateProfile = useCallback((
    income: number,
    currency: string,
    streams?: import('../types').IncomeStream[],
    meta?: Partial<Pick<FinancialProfile, 'incomeMode' | 'dailyAmount' | 'daysPerWeek'>>,
  ) => {
    saveProfile({ monthlyIncome: income, currency, incomeStreams: streams, ...meta });
  }, []);

  const monthlyExpenses = useMemo(() => filterByMonth(expenses, selectedMonth), [expenses, selectedMonth]);
  const dailyMultiplier = useMemo(() => getDailyMultiplier(profile), [profile]);
  const goalsThisMonth = useMemo(() => goalContributionsInMonth(goals, selectedMonth), [goals, selectedMonth]);
  const breakdown = useMemo(() => calculateMonthlyBreakdown(monthlyExpenses, profile.monthlyIncome, billsTotal, goalsThisMonth, dailyMultiplier), [monthlyExpenses, profile.monthlyIncome, billsTotal, goalsThisMonth, dailyMultiplier]);
  const insight = useMemo(() => getSpendingInsight(breakdown, profile.monthlyIncome), [breakdown, profile.monthlyIncome]);
  const warnings = useMemo(() => getUnnecessaryWarnings(monthlyExpenses, profile.monthlyIncome), [monthlyExpenses, profile.monthlyIncome]);
  const history = useMemo(() => monthlyHistory(expenses, goals, billsTotal, profile.monthlyIncome, dailyMultiplier, 6, selectedMonth), [expenses, goals, billsTotal, profile.monthlyIncome, dailyMultiplier, selectedMonth]);

  return { expenses, monthlyExpenses, profile, selectedMonth, setSelectedMonth, breakdown, insight, warnings, history, goalsThisMonth, addExpense, removeExpense, updateExpense, updateProfile };
};
