import type { Goal, Expense } from '../types';
import { filterByMonth } from './expenses';
import { calculateMonthlyBreakdown } from './calculations';

/**
 * Sum of a goal's dated contributions falling in `month` (YYYY-MM).
 * Legacy goals without a contributions log contribute 0 — their savedAmount
 * represents saving from prior months, not this month's spending.
 */
export const goalContributionsInMonth = (goals: Goal[], month: string): number =>
  goals.reduce(
    (sum, g) =>
      sum + (g.contributions ?? [])
        .filter((c) => c.date.startsWith(month))
        .reduce((s, c) => s + c.amount, 0),
    0,
  );

/** Shift a YYYY-MM string by `delta` months (negative = past). */
const shiftMonth = (month: string, delta: number): string => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** Unique months present in expenses (plus `current`), newest-first. */
export const availableMonths = (expenses: Expense[], current: string): string[] => {
  const set = new Set<string>([current]);
  for (const e of expenses) set.add(e.date.slice(0, 7));
  return [...set].sort().reverse();
};

export interface MonthPoint {
  month: string; spent: number; saved: number; necessary: number; unnecessary: number;
}

/**
 * Per-month derived history for the last `n` months ending at `anchor` (YYYY-MM),
 * oldest-first for left-to-right charting. Bills use the current monthly projection
 * for every month (payments are not dated yet — accepted tradeoff).
 */
export const monthlyHistory = (
  expenses: Expense[], goals: Goal[], billsMonthlyTotal: number,
  income: number, dailyMultiplier: number, n = 6, anchor = '',
): MonthPoint[] => {
  const end = anchor || new Date().toISOString().slice(0, 7);
  const points: MonthPoint[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const month = shiftMonth(end, -i);
    const monthExpenses = filterByMonth(expenses, month);
    const goalTotal = goalContributionsInMonth(goals, month);
    const b = calculateMonthlyBreakdown(monthExpenses, income, billsMonthlyTotal, goalTotal, dailyMultiplier);
    points.push({
      month,
      spent: b.totalExpenses,
      saved: b.savingsLeft,
      necessary: b.necessaryTotal,
      unnecessary: b.unnecessaryTotal,
    });
  }
  return points;
};
