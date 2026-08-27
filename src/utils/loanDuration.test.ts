import { describe, it, expect } from 'vitest';
import { computeLoanDuration, formatDuration } from './loanDuration';

describe('computeLoanDuration', () => {
  it('principal-only when the rate is unknown (500k / 20k monthly → 25)', () => {
    const r = computeLoanDuration({ loanAmount: 500_000, payment: 20_000, frequency: 'monthly' });
    expect(r.status).toBe('ok');
    expect(r.rateKnown).toBe(false);
    expect(r.periods).toBe(25);
    expect(r.totalInterest).toBeNull();
    expect(r.totalRepayment).toBeNull();
  });

  it('treats a blank rate differently from 0% but both give 25 periods here', () => {
    const blank = computeLoanDuration({ loanAmount: 500_000, payment: 20_000, frequency: 'monthly' });
    const zero = computeLoanDuration({ loanAmount: 500_000, payment: 20_000, frequency: 'monthly', annualRatePct: 0 });
    expect(blank.rateKnown).toBe(false);
    expect(zero.rateKnown).toBe(true);
    expect(zero.totalInterest).toBe(0);
    expect(zero.periods).toBe(25);
  });

  it('reducing balance amortises with interest (500k @ 13% / 20k monthly)', () => {
    const r = computeLoanDuration({ loanAmount: 500_000, payment: 20_000, frequency: 'monthly', annualRatePct: 13, method: 'reducing' });
    expect(r.status).toBe('ok');
    expect(r.rateKnown).toBe(true);
    // With interest it takes longer than the 25 principal-only periods.
    expect(r.periods).toBeGreaterThan(25);
    expect(r.periods).toBeLessThan(32);
    expect(r.totalInterest!).toBeGreaterThan(0);
    expect(r.totalRepayment!).toBeCloseTo(500_000 + r.totalInterest!, 0);
    expect(r.schedule[r.schedule.length - 1].balance).toBe(0);
  });

  it('detects payment too low to cover interest', () => {
    const r = computeLoanDuration({ loanAmount: 500_000, payment: 2_000, frequency: 'monthly', annualRatePct: 20, method: 'reducing' });
    expect(r.status).toBe('payment-too-low');
    expect(r.periods).toBe(0);
  });

  it('flat rate requires the lender term', () => {
    const noTerm = computeLoanDuration({ loanAmount: 500_000, payment: 20_000, frequency: 'monthly', annualRatePct: 13, method: 'flat' });
    expect(noTerm.status).toBe('need-flat-term');
    const withTerm = computeLoanDuration({ loanAmount: 500_000, payment: 20_000, frequency: 'monthly', annualRatePct: 13, method: 'flat', flatTermPeriods: 24 });
    expect(withTerm.status).toBe('ok');
    expect(withTerm.totalInterest!).toBeCloseTo(500_000 * 0.13 * (24 / 12), 0); // 130,000
  });

  it('supports weekly frequency (100k / 5k weekly, no rate → 20)', () => {
    const r = computeLoanDuration({ loanAmount: 100_000, payment: 5_000, frequency: 'weekly' });
    expect(r.periods).toBe(20);
    expect(r.periodsPerYear).toBe(52);
  });

  it('adds extra payment to the regular payment', () => {
    const r = computeLoanDuration({ loanAmount: 500_000, payment: 20_000, extraPayment: 5_000, frequency: 'monthly' });
    expect(r.paymentPerPeriod).toBe(25_000);
    expect(r.periods).toBe(20); // 500k / 25k
  });

  it('validates inputs', () => {
    expect(computeLoanDuration({ loanAmount: 0, payment: 20_000, frequency: 'monthly' }).status).toBe('invalid');
    expect(computeLoanDuration({ loanAmount: 500_000, payment: 0, frequency: 'monthly' }).status).toBe('invalid');
  });

  it('formats durations as years + months', () => {
    expect(formatDuration(25, 'monthly')).toBe('2 years 1 month');
    expect(formatDuration(8, 'monthly')).toBe('8 months');
    expect(formatDuration(12, 'monthly')).toBe('1 year');
  });
});
