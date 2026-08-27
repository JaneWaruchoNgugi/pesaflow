// Standard amortising-loan estimator: fixed monthly repayments over the term.

export type LoanTermUnit = 'months' | 'years';

export interface LoanEstimate {
  principal: number;
  months: number;
  monthlyPayment: number;
  totalRepayment: number;
  totalInterest: number;
}

// Monthly payment for an amortising loan:
//   M = P · r(1+r)^n / ((1+r)^n − 1)
// where r = monthly rate, n = number of months. Zero-rate loans repay principal evenly.
export const estimateLoan = (
  principal: number,
  annualRatePct: number,
  term: number,
  unit: LoanTermUnit = 'years',
): LoanEstimate => {
  const p = Math.max(0, principal || 0);
  const months = Math.max(0, Math.round((unit === 'years' ? (term || 0) * 12 : (term || 0))));
  const r = (annualRatePct || 0) / 100 / 12;

  let monthlyPayment: number;
  if (months === 0 || p === 0) {
    monthlyPayment = 0;
  } else if (r === 0) {
    monthlyPayment = p / months;
  } else {
    const f = Math.pow(1 + r, months);
    monthlyPayment = (p * r * f) / (f - 1);
  }

  const totalRepayment = monthlyPayment * months;
  const totalInterest = totalRepayment - p;
  return { principal: p, months, monthlyPayment, totalRepayment, totalInterest };
};
