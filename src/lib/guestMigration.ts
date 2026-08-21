import { syncCollection, syncDoc } from './sync';
import { stripDemo, KEYS, DEMO_FLAG, type StorageLike } from './demoData';
import type { Expense, Goal, Bill, FinancialProfile } from '../types';

const store = (): StorageLike => localStorage;
const readArray = <T>(s: StorageLike, key: string): T[] => {
  try { return JSON.parse(s.getItem(key) || '[]'); } catch { return []; }
};

export interface GuestPayload {
  expenses: Expense[];
  goals: Goal[];
  bills: Bill[];
  profile: FinancialProfile | null;
}

/** Pure: read localStorage, strip demo items, return only user-created data. */
export const collectGuestData = (s: StorageLike): GuestPayload => {
  let profile: FinancialProfile | null = null;
  try {
    const p = JSON.parse(s.getItem(KEYS.profile) || 'null') as (FinancialProfile & { isDemo?: boolean }) | null;
    profile = p && !p.isDemo ? p : null;
  } catch { profile = null; }
  return {
    expenses: stripDemo(readArray<Expense>(s, KEYS.expenses)),
    goals: stripDemo(readArray<Goal>(s, KEYS.goals)),
    bills: stripDemo(readArray<Bill>(s, KEYS.bills)),
    profile,
  };
};

/**
 * On a guest signing up / logging in, strip demo data locally and push the user's
 * real data to Firestore. Safe for returning users: a demo-only session yields empty
 * arrays (syncCollection no-ops), and their cloud data loads on the reload the caller
 * triggers afterwards. Best-effort: never throws to the caller.
 */
export const migrateGuestDataToAccount = async (s: StorageLike = store()): Promise<void> => {
  const { expenses, goals, bills, profile } = collectGuestData(s);
  s.setItem(KEYS.expenses, JSON.stringify(expenses));
  s.setItem(KEYS.goals, JSON.stringify(goals));
  s.setItem(KEYS.bills, JSON.stringify(bills));
  s.setItem(KEYS.profile, JSON.stringify(profile ?? { monthlyIncome: 0, currency: 'KES' }));
  s.removeItem(DEMO_FLAG);
  try {
    if (expenses.length) await syncCollection('expenses', expenses);
    if (goals.length) await syncCollection('goals', goals);
    if (bills.length) await syncCollection('bills', bills);
    if (profile) await syncDoc('financialProfile', profile);
  } catch (e) {
    console.error('guest migration push failed (kept locally, will resync on edit):', e);
  }
};
