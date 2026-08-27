import { describe, it, expect } from 'vitest';
import { estimateMMF } from './mmf';

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

  it('guards against negative inputs', () => {
    const r = estimateMMF(-5000, 11, -3);
    expect(r.principal).toBe(0);
    expect(r.grossValue).toBe(0);
  });
});
