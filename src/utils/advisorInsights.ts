// Turns a user's real numbers into cashflow, ratios and a prioritised action plan —
// shown in the Advisor once they've entered their data (replacing the generic guide).

export interface AdvisorData {
  income: number;
  expenses: number;        // monthly expenses (excl. bills)
  bills: number;           // monthly bills
  monthlyDebt: number;     // total monthly loan repayments
  debtTotal: number;       // total outstanding debt
  investments: number;     // current portfolio value
  netWorth: number;
  goalsSaved: number;
  goalsTarget: number;
  emergencyCurrent: number;
  emergencyTarget: number;
}

export type TipKind = 'warn' | 'good' | 'tip';
export interface Tip { kind: TipKind; text: string; }

export interface AdvisorInsights {
  outflow: number;
  surplus: number;
  savingsRatePct: number;
  debtToIncomePct: number;
  emergencyMonths: number;   // months of expenses+bills covered
  tips: Tip[];
}

const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);

export const computeAdvisorInsights = (d: AdvisorData): AdvisorInsights => {
  const essentials = d.expenses + d.bills;
  const outflow = essentials + d.monthlyDebt;
  const surplus = d.income - outflow;
  const savingsRatePct = d.income > 0 ? Math.max(0, (surplus / d.income) * 100) : 0;
  const debtToIncomePct = pct(d.monthlyDebt, d.income);
  const emergencyMonths = essentials > 0 ? d.emergencyCurrent / essentials : 0;

  const tips: Tip[] = [];

  if (d.income > 0 && surplus < 0) {
    tips.push({ kind: 'warn', text: `You're spending about ${fmt(-surplus)} more than you earn each month. Trim expenses or add income to avoid going into debt.` });
  }

  if (d.income > 0) {
    if (savingsRatePct < 10) tips.push({ kind: 'tip', text: `You're saving ${savingsRatePct.toFixed(0)}% of income. Aim for at least 15–20% — automate a transfer on payday.` });
    else if (savingsRatePct >= 20) tips.push({ kind: 'good', text: `Strong — you're saving ${savingsRatePct.toFixed(0)}% of your income. Keep it up and put it to work in an MMF or SACCO.` });
  }

  if (debtToIncomePct > 36) {
    tips.push({ kind: 'warn', text: `Loan repayments are ${debtToIncomePct.toFixed(0)}% of your income — that's high. Prioritise clearing your highest-interest loan first.` });
  } else if (d.debtTotal > 0 && debtToIncomePct <= 20) {
    tips.push({ kind: 'good', text: `Your debt load is manageable (${debtToIncomePct.toFixed(0)}% of income). Consider small extra payments to clear it sooner.` });
  }

  if (essentials > 0 && emergencyMonths < 3) {
    tips.push({ kind: 'tip', text: `Your emergency fund covers about ${emergencyMonths.toFixed(1)} month${emergencyMonths === 1 ? '' : 's'}. Build it toward 3–6 months of essentials (${fmt(essentials * 3)}+).` });
  }

  if (d.income > 0 && pct(d.bills, d.income) > 50) {
    tips.push({ kind: 'tip', text: `Bills take up ${pct(d.bills, d.income).toFixed(0)}% of your income. Review subscriptions and recurring costs for savings.` });
  }

  if (d.income > 0 && surplus > 0 && d.investments < d.income) {
    tips.push({ kind: 'tip', text: `You have a monthly surplus — consider investing part of it for growth (MMFs return ~10%/yr in Kenya).` });
  }

  return { outflow, surplus, savingsRatePct, debtToIncomePct, emergencyMonths, tips: tips.slice(0, 5) };
};

// Local KES formatter (avoids importing the currency helper into this pure module).
function fmt(n: number): string {
  return 'KSh ' + Math.round(n).toLocaleString('en-KE');
}
