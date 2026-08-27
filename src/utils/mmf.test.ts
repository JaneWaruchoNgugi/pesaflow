import { describe, it, expect } from 'vitest';
import { estimateMMF, projectMMF } from './mmf';

describe('projectMMF (initial + monthly top-ups + compounding frequency)', () => {
  it('sums total contributions as initial + monthly top-up × months', () => {
    const r = projectMMF(100, 2000, 11, 'daily', 1);
    expect(r.months).toBe(12);
    expect(r.totalContributions).toBe(100 + 2000 * 12); // 24,100
  });

  it('projects a growing balance above contributions (daily, 1 year)', () => {
    const r = projectMMF(100, 2000, 11, 'daily', 1);
    // ~KES 25.3k–25.5k depending on timing convention; must exceed contributions.
    expect(r.futureValue).toBeGreaterThan(25_300);
    expect(r.futureValue).toBeLessThan(25_600);
    expect(r.grossInterest).toBeCloseTo(r.futureValue - r.totalContributions, 6);
  });

  it('higher compounding frequency yields slightly more', () => {
    const annually = projectMMF(100, 2000, 11, 'annually', 1).futureValue;
    const daily = projectMMF(100, 2000, 11, 'daily', 1).futureValue;
    expect(daily).toBeGreaterThan(annually);
  });

  it('applies 15% WHT to interest only', () => {
    const r = projectMMF(100, 2000, 11, 'daily', 1, 15);
    expect(r.taxPaid).toBeCloseTo(r.grossInterest * 0.15, 6);
    expect(r.netValue).toBeCloseTo(r.futureValue - r.taxPaid, 6);
  });
});

describe('estimateMMF', () => {
  it('returns the principal untouched when duration is zero', () => {
    const r = estimateMMF(100_000, 11, 0);
    expect(r.grossValue).toBe(100_000);
    expect(r.grossInterest).toBe(0);
    expect(r.netValue).toBe(100_000);
    expect(r.taxPaid).toBe(0);
  });

  it('compounds daily (credited monthly) so 12 months slightly beats simple interest', () => {
    const r = estimateMMF(100_000, 11, 12);
    // Simple interest would be exactly 11,000. Daily compounding earns a bit more.
    expect(r.grossInterest).toBeGreaterThan(11_000);
    expect(r.grossInterest).toBeLessThan(11_700); // but not wildly more
  });

  it('applies 15% withholding tax to the interest only, never the principal', () => {
    const r = estimateMMF(100_000, 11, 12); // default WHT = 15%
    expect(r.taxPaid).toBeCloseTo(r.grossInterest * 0.15, 6);
    expect(r.netInterest).toBeCloseTo(r.grossInterest * 0.85, 6);
    expect(r.netValue).toBeCloseTo(100_000 + r.netInterest, 6);
  });

  it('lets the withholding tax rate be overridden (e.g. 0% = gross)', () => {
    const r = estimateMMF(50_000, 10, 24, 0);
    expect(r.taxPaid).toBe(0);
    expect(r.netValue).toBe(r.grossValue);
  });

  it('applies the FULL duration — 12 months is ~12x a single month, not one month', () => {
    const one = estimateMMF(50_000, 11, 1, 0);
    const twelve = estimateMMF(50_000, 11, 12, 0);
    expect(Math.round(one.grossInterest)).toBe(460);
    expect(Math.round(twelve.grossInterest)).toBe(5813);
    // Compounded, so slightly MORE than exactly 12x the first month.
    expect(twelve.grossInterest).toBeGreaterThan(one.grossInterest * 12);
  });

  it('reads years as 12x months at the call site convention (2 years = 24 months)', () => {
    const twoYears = estimateMMF(50_000, 11, 24, 0);
    expect(Math.round(twoYears.grossInterest)).toBe(12302);
  });

  it('guards against negative inputs', () => {
    const r = estimateMMF(-5000, 11, -3);
    expect(r.principal).toBe(0);
    expect(r.grossValue).toBe(0);
  });
});
