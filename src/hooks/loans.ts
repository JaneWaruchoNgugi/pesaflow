import type { Loan } from '../types';

/** Percentage of the loan principal paid off, clamped 0..100. Returns 0 if principal <= 0. */
export const loanPaydownPct = (loan: Loan): number => {
  if (loan.principal <= 0) return 0;
  const pct = ((loan.principal - loan.currentBalance) / loan.principal) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
};

/** Sum of remaining balances across loans (the total owed). */
export const totalLoanBalance = (loans: Loan[]): number =>
  loans.reduce((s, l) => s + l.currentBalance, 0);
