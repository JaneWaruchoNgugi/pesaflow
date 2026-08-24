import { describe, it, expect } from 'vitest';
import { deriveNetWorth } from './netWorth';
import type { NetWorthItem } from '../types';

const item = (over: Partial<NetWorthItem>): NetWorthItem => ({
  id: 'm', name: 'Manual', amount: 0, category: 'cash', type: 'asset', notes: '', ...over,
});

describe('deriveNetWorth', () => {
  it('sums manual assets and liabilities with no sources', () => {
    const items = [
      item({ id: 'a', amount: 100000, type: 'asset', category: 'property' }),
      item({ id: 'l', amount: 40000, type: 'liability', category: 'mortgage' }),
    ];
    const r = deriveNetWorth(items, { investments: 0, goalSavings: 0, emergencyFund: 0 });
    expect(r.totalAssets).toBe(100000);
    expect(r.totalLiabilities).toBe(40000);
    expect(r.netWorth).toBe(60000);
    expect(r.assetLines).toHaveLength(1);
    expect(r.assetLines[0].auto).toBe(false);
  });

  it('adds virtual asset lines for investments, goals, emergency fund when > 0', () => {
    const r = deriveNetWorth([], { investments: 30000, goalSavings: 12000, emergencyFund: 8000 });
    expect(r.totalAssets).toBe(50000);
    expect(r.assetLines.map((l) => l.id)).toEqual(['auto:investments', 'auto:goals', 'auto:emergency']);
    expect(r.assetLines.every((l) => l.auto)).toBe(true);
  });

  it('omits zero-value virtual lines', () => {
    const r = deriveNetWorth([], { investments: 5000, goalSavings: 0, emergencyFund: 0 });
    expect(r.assetLines).toHaveLength(1);
    expect(r.assetLines[0].id).toBe('auto:investments');
  });

  it('combines manual and virtual; netWorth = assets - liabilities', () => {
    const items = [item({ id: 'l', amount: 20000, type: 'liability', category: 'carLoan' })];
    const r = deriveNetWorth(items, { investments: 50000, goalSavings: 0, emergencyFund: 0 });
    expect(r.totalAssets).toBe(50000);
    expect(r.totalLiabilities).toBe(20000);
    expect(r.netWorth).toBe(30000);
  });

  it('adds an auto liability line per loan with balance > 0', () => {
    const r = deriveNetWorth([], {
      investments: 0, goalSavings: 0, emergencyFund: 0,
      loans: [
        { id: 'x', name: 'Mkopa phone', currentBalance: 2380, category: 'personalLoan' },
        { id: 'y', name: 'Cleared',      currentBalance: 0,    category: 'carLoan' },
      ],
    });
    expect(r.totalLiabilities).toBe(2380);
    expect(r.liabilityLines).toHaveLength(1);
    expect(r.liabilityLines[0].id).toBe('loan:x');
    expect(r.liabilityLines[0].auto).toBe(true);
    expect(r.netWorth).toBe(-2380);
  });

  it('combines manual liabilities with loan liability lines', () => {
    const items = [{ id: 'm', name: 'Credit card', amount: 5000, category: 'creditCard' as const, type: 'liability' as const, notes: '' }];
    const r = deriveNetWorth(items, {
      investments: 10000, goalSavings: 0, emergencyFund: 0,
      loans: [{ id: 'x', name: 'Loan', currentBalance: 3000, category: 'personalLoan' }],
    });
    expect(r.totalAssets).toBe(10000);
    expect(r.totalLiabilities).toBe(8000); // 5000 manual + 3000 loan
    expect(r.netWorth).toBe(2000);
  });
});
