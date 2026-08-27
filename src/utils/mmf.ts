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

/* ── Full projection: initial + monthly top-ups + selectable compounding ─────────── */

export type Compounding = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';

// Compounding periods per year for each frequency.
export const COMPOUNDING_N: Record<Compounding, number> = {
  daily: 365, weekly: 52, monthly: 12, quarterly: 4, annually: 1,
};

export const COMPOUNDING_LABEL: Record<Compounding, string> = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', annually: 'Annually',
};

export interface MMFProjection {
  totalContributions: number; // initial + every monthly top-up
  futureValue: number;        // projected value at the end (before tax)
  grossInterest: number;      // futureValue − totalContributions
  taxPaid: number;            // 15% WHT on interest (0 if disabled)
  netInterest: number;
  netValue: number;           // futureValue after tax
  months: number;
}

// Projects an initial lump sum plus a recurring monthly top-up, compounding at the
// chosen frequency, over `years`. Top-ups are added at the end of each month
// (ordinary annuity). Interest can optionally be taxed at KRA's 15% WHT.
export const projectMMF = (
  initial: number,
  monthlyTopUp: number,
  annualRatePct: number,
  compounding: Compounding,
  years: number,
  withholdingTaxPct = 0,
): MMFProjection => {
  const p0 = Math.max(0, initial || 0);
  const topUp = Math.max(0, monthlyTopUp || 0);
  const yrs = Math.max(0, years || 0);
  const n = COMPOUNDING_N[compounding];
  const months = Math.round(yrs * 12);

  // Growth applied to the balance over one month, derived from the chosen frequency.
  const monthlyGrowth = Math.pow(1 + (annualRatePct || 0) / 100 / n, n / 12);

  let balance = p0;
  for (let m = 0; m < months; m++) {
    balance = balance * monthlyGrowth + topUp; // grow, then this month's top-up
  }

  const futureValue = balance;
  const totalContributions = p0 + topUp * months;
  const grossInterest = futureValue - totalContributions;
  const taxPaid = Math.max(0, grossInterest) * ((withholdingTaxPct || 0) / 100);
  const netInterest = grossInterest - taxPaid;
  const netValue = futureValue - taxPaid;

  return { totalContributions, futureValue, grossInterest, taxPaid, netInterest, netValue, months };
};

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
