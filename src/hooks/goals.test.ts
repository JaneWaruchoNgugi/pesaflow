import { describe, it, expect } from 'vitest';
import { projectEndowment } from './goals';
import type { Goal } from '../types';

const goal = (over: Partial<Goal>): Goal => ({
  id: 'g', name: 'E', targetAmount: 1, savedAmount: 0, category: 'insurance',
  deadline: '', monthlyContribution: 0, notes: '', createdAt: '2026-01-01', completed: false, ...over,
});

describe('projectEndowment', () => {
  it('regular endowment: single maturity payout above contributions', () => {
    const r = projectEndowment(goal({ endowmentType: 'regular', termYears: 10, interestRate: 12, savedAmount: 100000 }))!;
    expect(r.totalPayouts).toBe(1);
    expect(r.schedule).toHaveLength(1);
    expect(r.maturityValue).toBeGreaterThan(100000);
    expect(r.interestEarned).toBe(r.maturityValue - r.contributed);
  });

  it('anticipated: floor(term/interval) equal payouts at the right years', () => {
    const r = projectEndowment(goal({ endowmentType: 'anticipated', termYears: 20, payoutIntervalYears: 5, interestRate: 10, savedAmount: 200000 }))!;
    expect(r.totalPayouts).toBe(4);
    expect(r.schedule.map((s) => s.year)).toEqual([5, 10, 15, 20]);
    expect(r.perPayout).toBe(Math.round(r.maturityValue / 4));
    expect(r.schedule.every((s) => s.amount === r.perPayout)).toBe(true);
  });

  it('returns null when not an insurance endowment or missing fields', () => {
    expect(projectEndowment(goal({ category: 'mmf', endowmentType: 'regular', termYears: 10, interestRate: 12 }))).toBeNull();
    expect(projectEndowment(goal({ termYears: 10, interestRate: 12 }))).toBeNull();
    expect(projectEndowment(goal({ endowmentType: 'regular', interestRate: 12 }))).toBeNull();
    expect(projectEndowment(goal({ endowmentType: 'regular', termYears: 10 }))).toBeNull();
  });
});
