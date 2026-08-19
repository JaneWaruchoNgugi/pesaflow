import type {
  Expense,
  // FinancialProfile,
  InvestmentAdvice,
  MonthlyBreakdown,
  SpendingInsight,
} from '../types';
import { CATEGORY_META } from './expenses';

export const calculateMonthlyBreakdown = (
  expenses: Expense[],
  income: number,
  billsTotal = 0,
  goalsTotal = 0,
  dailyMultiplier = 30,
): MonthlyBreakdown => {
  const byCategory = {} as Record<string, number>;
  let necessaryTotal = 0;
  let unnecessaryTotal = 0;

  for (const exp of expenses) {
    // A 'daily' expense is entered once but recurs each day, so scale it to a monthly figure.
    const monthlyAmount = exp.frequency === 'daily' ? exp.amount * dailyMultiplier : exp.amount;
    byCategory[exp.category] = (byCategory[exp.category] || 0) + monthlyAmount;
    if (CATEGORY_META[exp.category].type === 'necessary') {
      necessaryTotal += monthlyAmount;
    } else {
      unnecessaryTotal += monthlyAmount;
    }
  }

  // Bills and goal contributions count as necessary spending
  necessaryTotal += billsTotal + goalsTotal;

  const totalExpenses = necessaryTotal + unnecessaryTotal;
  return {
    totalExpenses,
    necessaryTotal,
    unnecessaryTotal,
    byCategory: byCategory as MonthlyBreakdown['byCategory'],
    savingsLeft: Math.max(0, income - totalExpenses),
  };
};

export const getSpendingInsight = (
  breakdown: MonthlyBreakdown,
  income: number
): SpendingInsight => {
  if (income === 0) return { score: 0, level: 'critical', message: 'Please set your income.' };

  const spendingRatio = breakdown.totalExpenses / income;
  const unnecessaryRatio = breakdown.unnecessaryTotal / income;

  let score = 100;
  score -= spendingRatio * 50;
  score -= unnecessaryRatio * 50;
  score = Math.max(0, Math.min(100, Math.round(score)));

  if (score >= 80) return { score, level: 'excellent', message: "Outstanding financial discipline! You're on the path to financial freedom." };
  if (score >= 65) return { score, level: 'good', message: 'Good habits! Small tweaks to unnecessary spending will accelerate your goals.' };
  if (score >= 45) return { score, level: 'fair', message: 'Room for improvement. You\'re spending more than you should on non-essentials.' };
  if (score >= 25) return { score, level: 'poor', message: 'Warning: High discretionary spending is limiting your financial growth.' };
  return { score, level: 'critical', message: 'Critical: Your expenses exceed healthy limits. Immediate action required.' };
};

export const getInvestmentAdvice = (income: number): InvestmentAdvice => {
  // Tiered advice system based on income level (KES)
  let emergencyPct: number;
  let savingsPct: number;
  let investPct: number;
  let tips: string[];

  if (income <= 20000) {
    emergencyPct = 0.05;
    savingsPct = 0.10;
    investPct = 0.05;
    tips = [
      'Start a SACCO account — they offer dividends and emergency loans.',
      'Even KSh 500/month in M-Shwari compounds over time.',
      'Cut one unnecessary expense (e.g., daily takeout) to unlock savings.',
      'Target building a KSh 50,000 emergency cushion first.',
      'Consider side hustles to increase income before aggressive investing.',
    ];
  } else if (income <= 50000) {
    emergencyPct = 0.08;
    savingsPct = 0.15;
    investPct = 0.10;
    tips = [
      'Open a Money Market Fund (e.g., Cytonn, CIC) for better returns than banks.',
      'Aim to cover 3 months of expenses in your emergency fund.',
      'Consider T-Bills and T-Bonds for low-risk government-backed returns.',
      'Track every shilling using this app — awareness changes behavior.',
      'Automate savings on payday before you can spend it.',
    ];
  } else if (income <= 100000) {
    emergencyPct = 0.10;
    savingsPct = 0.15;
    investPct = 0.15;
    tips = [
      'Diversify: split investments between MMFs, REITs, and NSE stocks.',
      'Your emergency fund target: 6 months of living expenses.',
      'Consider NHIF voluntary contributions for better health coverage.',
      'Review your subscriptions — cut ones you use less than 3x/week.',
      'Explore unit trusts for passive wealth-building.',
    ];
  } else {
    emergencyPct = 0.10;
    savingsPct = 0.20;
    investPct = 0.20;
    tips = [
      'At this income, diversification is critical: stocks, bonds, real estate.',
      'Max out your pension/NSSF voluntary contributions (tax efficient).',
      'Consider hiring a certified financial planner for personalized strategy.',
      'Real estate investment trusts (REITs) offer exposure to property.',
      'Keep lifestyle inflation in check — income growth ≠ spend growth.',
    ];
  }

  const emergency = Math.round(income * emergencyPct);
  const savings = Math.round(income * savingsPct);
  const investment = Math.round(income * investPct);
  const living = income - emergency - savings - investment;

  return { emergencyFund: emergency, savings, investment, living, tips };
};

export const getUnnecessaryWarnings = (
  expenses: Expense[],
  income: number
): string[] => {
  const warnings: string[] = [];
  const byCategory: Record<string, number> = {};

  for (const exp of expenses) {
    if (CATEGORY_META[exp.category].type === 'unnecessary') {
      byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;
    }
  }

  const totalUnnecessary = Object.values(byCategory).reduce((a, b) => a + b, 0);

  if (totalUnnecessary > income * 0.3) {
    warnings.push(`You're spending ${Math.round((totalUnnecessary / income) * 100)}% of income on non-essentials. Aim for under 20%.`);
  }

  if ((byCategory['diningOut'] || 0) > income * 0.1) {
    warnings.push('Dining out alone exceeds 10% of your income. Cooking at home could save thousands.');
  }

  if ((byCategory['entertainment'] || 0) > income * 0.08) {
    warnings.push('Entertainment spending is high. Set a monthly cap to stay disciplined.');
  }

  if ((byCategory['impulse'] || 0) > 0) {
    warnings.push('Impulse buys detected! Apply the 48-hour rule before any unplanned purchase.');
  }

  if ((byCategory['subscriptions'] || 0) > income * 0.05) {
    warnings.push('Check your subscriptions — dormant ones are silent money leaks.');
  }

  return warnings;
};
