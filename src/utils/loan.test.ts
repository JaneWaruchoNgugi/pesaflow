import { describe, it, expect } from 'vitest';
import { estimateLoan } from './loan';

describe('estimateLoan', () => {
  it('computes the standard amortising monthly payment', () => {
    // 100,000 at 12%/yr over 1 year → well-known ~8,884.88/month.
    const r = estimateLoan(100_000, 12, 1, 'years');
    expect(r.months).toBe(12);
    expect(r.monthlyPayment).toBeCloseTo(8884.88, 1);
    expect(r.totalRepayment).toBeCloseTo(8884.88 * 12, 0);
    expect(r.totalInterest).toBeCloseTo(r.totalRepayment - 100_000, 4);
  });

  it('handles a zero-interest loan as even principal repayment', () => {
    const r = estimateLoan(120_000, 0, 12, 'months');
    expect(r.monthlyPayment).toBeCloseTo(10_000, 6);
    expect(r.totalInterest).toBe(0);
  });

  it('reads years vs months from the unit', () => {
    const a = estimateLoan(50_000, 10, 2, 'years');
    const b = estimateLoan(50_000, 10, 24, 'months');
    expect(a.monthlyPayment).toBeCloseTo(b.monthlyPayment, 6);
  });

  it('guards against empty inputs', () => {
    expect(estimateLoan(0, 10, 5).monthlyPayment).toBe(0);
    expect(estimateLoan(1000, 10, 0).monthlyPayment).toBe(0);
  });
});
