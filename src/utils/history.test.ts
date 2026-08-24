import { describe, it, expect } from 'vitest';
import { goalContributionsInMonth } from './history';
import type { Goal } from '../types';

const baseGoal = (over: Partial<Goal>): Goal => ({
  id: 'g1', name: 'Test', targetAmount: 100000, savedAmount: 0,
  category: 'other', deadline: '2027-01', monthlyContribution: 0,
  notes: '', createdAt: '2026-01-01T00:00:00.000Z', completed: false, ...over,
});

describe('goalContributionsInMonth', () => {
  it('sums only contributions dated in the given month', () => {
    const goals: Goal[] = [
      baseGoal({ id: 'a', contributions: [
        { id: 'c1', amount: 3000, date: '2026-08-05' },
        { id: 'c2', amount: 2000, date: '2026-08-20' },
        { id: 'c3', amount: 9000, date: '2026-07-11' },
      ] }),
      baseGoal({ id: 'b', contributions: [{ id: 'c4', amount: 500, date: '2026-08-01' }] }),
    ];
    expect(goalContributionsInMonth(goals, '2026-08')).toBe(5500);
  });

  // Regression: the KSh 111,240 bug. A legacy goal with a large savedAmount
  // and NO dated contributions must contribute 0 to the current month.
  it('ignores lifetime savedAmount for legacy goals (no contributions log)', () => {
    const goals: Goal[] = [baseGoal({ savedAmount: 80000 })];
    expect(goalContributionsInMonth(goals, '2026-08')).toBe(0);
  });

  it('returns 0 for an empty goal list', () => {
    expect(goalContributionsInMonth([], '2026-08')).toBe(0);
  });
});
