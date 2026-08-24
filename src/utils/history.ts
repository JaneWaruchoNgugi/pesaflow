import type { Goal } from '../types';

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
