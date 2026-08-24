import { describe, it, expect } from 'vitest';
import { loanPaydownPct, totalLoanBalance } from './loans';
import type { Loan } from '../types';

const loan = (over: Partial<Loan>): Loan => ({
  id: 'l', name: 'L', category: 'personalLoan', principal: 100000, currentBalance: 100000,
  createdAt: '2026-01-01', ...over,
});

describe('loanPaydownPct', () => {
  it('is 0 at full balance, 100 when cleared, rounded in between', () => {
    expect(loanPaydownPct(loan({ principal: 100000, currentBalance: 100000 }))).toBe(0);
    expect(loanPaydownPct(loan({ principal: 100000, currentBalance: 0 }))).toBe(100);
    expect(loanPaydownPct(loan({ principal: 100000, currentBalance: 25000 }))).toBe(75);
  });
  it('clamps to 0..100 and handles principal <= 0', () => {
    expect(loanPaydownPct(loan({ principal: 0, currentBalance: 0 }))).toBe(0);
    expect(loanPaydownPct(loan({ principal: 100000, currentBalance: 150000 }))).toBe(0);
  });
});

describe('totalLoanBalance', () => {
  it('sums current balances', () => {
    expect(totalLoanBalance([loan({ currentBalance: 2380 }), loan({ currentBalance: 40000 })])).toBe(42380);
  });
  it('is 0 for an empty list', () => {
    expect(totalLoanBalance([])).toBe(0);
  });
});
