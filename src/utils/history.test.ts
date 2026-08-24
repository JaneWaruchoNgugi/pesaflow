import { describe, it, expect } from 'vitest';
import { goalContributionsInMonth, availableMonths, monthlyHistory, categoryBreakdown, expensesWithBills } from './history';
import type { Goal, Expense, MonthlyBreakdown, Bill } from '../types';

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

const exp = (over: Partial<Expense>): Expense => ({
  id: 'e', name: 'x', amount: 0, category: 'food', type: 'necessary',
  date: '2026-08-10', isRecurring: false, ...over,
});

describe('availableMonths', () => {
  it('returns unique months newest-first, including the current month', () => {
    const expenses = [exp({ date: '2026-07-02' }), exp({ date: '2026-08-09' }), exp({ date: '2026-08-20' })];
    const months = availableMonths(expenses, '2026-08');
    expect(months).toEqual(['2026-08', '2026-07']);
  });
});

describe('monthlyHistory', () => {
  it('derives spent and saved per month from dated data', () => {
    const expenses = [
      exp({ date: '2026-08-05', amount: 10000, category: 'food', type: 'necessary' }),
      exp({ date: '2026-07-05', amount: 4000, category: 'food', type: 'necessary' }),
    ];
    const goals = [{
      id: 'g', name: 'G', targetAmount: 1, savedAmount: 50000, category: 'other' as const,
      deadline: '2027-01', monthlyContribution: 0, notes: '', createdAt: '2026-01-01', completed: false,
      contributions: [{ id: 'c', amount: 2000, date: '2026-08-01' }],
    }];
    // billsTotal 3000, income 50000, dailyMultiplier 30, months anchored at 2026-08
    const hist = monthlyHistory(expenses, goals, 3000, 50000, 30, 2, '2026-08');
    expect(hist.map((h) => h.month)).toEqual(['2026-07', '2026-08']); // oldest-first for charting
    const aug = hist[1];
    // spent = expenses 10000 + bills 3000 + goal-this-month 2000 = 15000
    expect(aug.spent).toBe(15000);
    expect(aug.saved).toBe(35000); // 50000 - 15000
    const jul = hist[0];
    // spent = 4000 + 3000 bills + 0 goal = 7000
    expect(jul.spent).toBe(7000);
    expect(jul.saved).toBe(43000);
  });
});

describe('categoryBreakdown', () => {
  it('lists non-zero categories sorted by amount desc', () => {
    const breakdown = {
      totalExpenses: 0, necessaryTotal: 0, unnecessaryTotal: 0, savingsLeft: 0,
      byCategory: { food: 3000, transport: 8000, shopping: 0 },
    } as unknown as MonthlyBreakdown;
    expect(categoryBreakdown(breakdown)).toEqual([
      { category: 'transport', amount: 8000 },
      { category: 'food', amount: 3000 },
    ]);
  });
});

const bill2 = (over: Partial<Bill>): Bill => ({
  id: 'b', name: 'B', amount: 0, category: 'other', dueDay: 1, frequency: 'monthly',
  status: 'upcoming', notes: '', isRecurring: true, ...over,
});

describe('expensesWithBills', () => {
  it('totals expenses + bills, excludes goals, itemizes bills', () => {
    const expenses = [
      exp({ date: '2026-08-01', amount: 8000, category: 'transport', type: 'necessary' }),
      exp({ date: '2026-08-02', amount: 1200, category: 'diningOut', type: 'unnecessary' }),
    ];
    const bills = [
      bill2({ id: 'r', name: 'Rent', category: 'rent', amount: 5000 }),
      bill2({ id: 'w', name: 'Wifi', category: 'internet', amount: 2000 }),
    ];
    const r = expensesWithBills(expenses, bills, 30);
    expect(r.billsSubtotal).toBe(7000);
    expect(r.total).toBe(16200);      // 8000 + 1200 + 7000
    expect(r.necessary).toBe(15000);  // 8000 transport + 7000 bills
    expect(r.unnecessary).toBe(1200);
    expect(r.billRows).toHaveLength(2);
    expect(r.categoryRows.map((c) => c.category)).toEqual(['transport', 'diningOut']);
  });

  it('empty bills yields subtotal 0', () => {
    const r = expensesWithBills([], [], 30);
    expect(r.billsSubtotal).toBe(0);
    expect(r.total).toBe(0);
  });
});
