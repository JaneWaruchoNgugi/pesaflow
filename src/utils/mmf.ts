// Money Market Fund return estimator.
//
// Kenyan MMFs (CIC, Cytonn, Sanlam, Zimele…) quote an *annual* yield but accrue
// interest daily and credit it monthly, reinvesting as they go. We model that:
// the annual rate becomes a daily rate, compounded over each ~30.4-day month, then
// compounded across the chosen number of months. Interest is taxed at KRA's 15%
// withholding rate (WHT) — on the interest only, never the principal.

export interface MMFEstimate {
  principal: number;       // what the user put in (clamped to >= 0)
  months: number;          // duration in whole/partial months
  grossValue: number;      // maturity value before tax
  grossInterest: number;   // interest earned before tax
  taxPaid: number;         // withholding tax deducted from interest
  netInterest: number;     // interest kept after tax
  netValue: number;        // maturity value after tax
}

const DAYS_PER_YEAR = 365;
const DAYS_PER_MONTH = DAYS_PER_YEAR / 12; // ≈ 30.4167

export const estimateMMF = (
  principal: number,
  annualRatePct: number,
  months: number,
  withholdingTaxPct = 15,
): MMFEstimate => {
  const p = Math.max(0, principal || 0);
  const m = Math.max(0, months || 0);
  const dailyRate = (annualRatePct || 0) / 100 / DAYS_PER_YEAR;

  // Daily compounding, credited monthly: grow one month at a time.
  const monthlyGrowth = Math.pow(1 + dailyRate, DAYS_PER_MONTH);
  const grossValue = p * Math.pow(monthlyGrowth, m);

  const grossInterest = grossValue - p;
  const taxPaid = grossInterest * ((withholdingTaxPct || 0) / 100);
  const netInterest = grossInterest - taxPaid;
  const netValue = p + netInterest;

  return { principal: p, months: m, grossValue, grossInterest, taxPaid, netInterest, netValue };
};
