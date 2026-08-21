import type { Expense, Goal, Bill, FinancialProfile } from '../types';

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export const DEMO_FLAG = 'pesaflow_demo_seeded';
export const KEYS = {
  authProfile: 'finwise_auth_profile',
  profile: 'finwise_profile',
  expenses: 'finwise_expenses',
  goals: 'finwise_goals',
  bills: 'finwise_bills',
} as const;

const store = (): StorageLike => localStorage;

export function stripDemo(items: any[]): any[];
export function stripDemo<T extends { isDemo?: boolean }>(items: T[]): T[];
export function stripDemo<T extends { isDemo?: boolean }>(items: T[]): T[] {
  return items.filter(i => !i.isDemo);
}

const readArray = <T>(s: StorageLike, key: string): T[] => {
  try { return JSON.parse(s.getItem(key) || '[]'); } catch { return []; }
};

export const buildDemoProfile = (): FinancialProfile =>
  ({ monthlyIncome: 45000, currency: 'KES', isDemo: true });

export const buildDemoExpenses = (): Expense[] => ([
  { id: 'demo-e1', name: 'Matatu fare',   amount: 3000, category: 'transport',     type: 'necessary',   date: '2026-08-03', isRecurring: false, isDemo: true },
  { id: 'demo-e2', name: 'Data bundles',  amount: 1000, category: 'utilities',     type: 'necessary',   date: '2026-08-05', isRecurring: false, isDemo: true },
  { id: 'demo-e3', name: 'Lunch (kibanda)', amount: 4500, category: 'food',        type: 'necessary',   date: '2026-08-07', isRecurring: false, isDemo: true },
  { id: 'demo-e4', name: 'Betika',        amount: 2000, category: 'entertainment', type: 'unnecessary', date: '2026-08-09', isRecurring: false, isDemo: true },
  { id: 'demo-e5', name: 'Airtime',       amount: 500,  category: 'utilities',     type: 'necessary',   date: '2026-08-10', isRecurring: false, isDemo: true },
]);

export const buildDemoGoals = (): Goal[] => ([
  { id: 'demo-g1', name: 'Plot deposit', targetAmount: 200000, savedAmount: 15000, category: 'property', deadline: '2027-06', monthlyContribution: 5000, notes: 'Sample goal — clear it and add your own.', createdAt: '2026-08-01T00:00:00Z', completed: false, isDemo: true },
]);

export const buildDemoBills = (): Bill[] => ([
  { id: 'demo-b1', name: 'Rent', amount: 12000, category: 'rent', dueDay: 5, frequency: 'monthly', status: 'upcoming', notes: '', isRecurring: true, isDemo: true },
]);

export const shouldSeedDemo = (s: StorageLike): boolean => {
  if (s.getItem(KEYS.authProfile)) return false;
  if (s.getItem(DEMO_FLAG)) return false;
  const empty =
    readArray(s, KEYS.expenses).length === 0 &&
    readArray(s, KEYS.goals).length === 0 &&
    readArray(s, KEYS.bills).length === 0;
  return empty;
};

export const seedDemoIfNeeded = (s: StorageLike = store()): boolean => {
  if (!shouldSeedDemo(s)) return false;
  s.setItem(KEYS.profile,  JSON.stringify(buildDemoProfile()));
  s.setItem(KEYS.expenses, JSON.stringify(buildDemoExpenses()));
  s.setItem(KEYS.goals,    JSON.stringify(buildDemoGoals()));
  s.setItem(KEYS.bills,    JSON.stringify(buildDemoBills()));
  s.setItem(DEMO_FLAG, '1');
  return true;
};

export const clearDemoData = (s: StorageLike = store()): void => {
  s.setItem(KEYS.expenses, JSON.stringify(stripDemo(readArray<Expense>(s, KEYS.expenses))));
  s.setItem(KEYS.goals,    JSON.stringify(stripDemo(readArray<Goal>(s, KEYS.goals))));
  s.setItem(KEYS.bills,    JSON.stringify(stripDemo(readArray<Bill>(s, KEYS.bills))));
  s.setItem(KEYS.profile,  JSON.stringify({ monthlyIncome: 0, currency: 'KES' } as FinancialProfile));
};
