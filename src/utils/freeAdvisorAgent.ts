import type {
  Bill,
  Goal,
  Habit,
  InvestmentSummary,
  MonthlyBreakdown,
  FinancialProfile,
} from '../types';
import { getInvestmentAdvice } from './calculations';
import { CATEGORY_META, formatCurrency } from './expenses';

interface FreeAdvisorContext {
  profile: FinancialProfile;
  breakdown: MonthlyBreakdown;
  investmentSummary: InvestmentSummary;
  bills?: Bill[];
  billsMonthlyTotal?: number;
  goals?: Goal[];
  netWorthSummary?: { totalAssets: number; totalLiabilities: number; netWorth: number };
  habits?: Habit[];
  efCurrent?: number;
  efTarget?: number;
}

const pct = (part: number, total: number) => total > 0 ? Math.round((part / total) * 100) : 0;

const normalise = (value: string) => value.toLowerCase().trim();

const FINANCE_TERMS = [
  'money', 'finance', 'financial', 'budget', 'spend', 'spending', 'expense', 'cost',
  'save', 'saving', 'savings', 'income', 'salary', 'payday', 'cash', 'mpesa', 'm-pesa',
  'bill', 'rent', 'loan', 'debt', 'fuliza', 'credit', 'helb', 'tax', 'kra', 'nssf',
  'nhif', 'sha', 'goal', 'emergency', 'invest', 'investment', 'mmf', 'sacco', 'tbill',
  't-bill', 'bond', 'nse', 'stock', 'net worth', 'asset', 'liability', 'wealth',
  'plan', 'monthly', 'afford', 'retire', 'retirement', 'insurance', 'bank',
];

const CASUAL_FINANCE_STARTERS = [
  'help', 'advise', 'advice', 'what should i do', 'how am i doing', 'what next',
  'recommend', 'analyse', 'analyze', 'summary', 'overview',
];

const isFinancialQuestion = (q: string) =>
  FINANCE_TERMS.some(term => q.includes(term))
  || CASUAL_FINANCE_STARTERS.includes(q);

const nonFinancialReply = () =>
  [
    'I can only help with PesaFlow financial questions: budgeting, spending, bills, goals, debt, savings, emergency fund, investments, net worth, and Kenyan money decisions.',
    'Ask something like "How can I reduce my spending?", "Which bill should I pay first?", "Can I afford to invest?", or "How fast can I build my emergency fund?"',
    '**Action today: ask me one question about your money plan or current PesaFlow data.**',
  ].join('\n\n');


const topSpendingCategories = (breakdown: MonthlyBreakdown, currency: string) =>
  Object.entries(breakdown.byCategory)
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, amount]) => {
      const meta = CATEGORY_META[category as keyof typeof CATEGORY_META];
      return `${meta?.label || category}: ${formatCurrency(amount, currency)}`;
    });

const buildSnapshot = (ctx: FreeAdvisorContext) => {
  const { profile, breakdown, investmentSummary } = ctx;
  const income = profile.monthlyIncome || 0;
  const spendRatio = pct(breakdown.totalExpenses, income);
  const wants = pct(breakdown.unnecessaryTotal, income);
  const billsDue = (ctx.bills || []).filter(b => b.status !== 'paid');
  const overdueBills = billsDue.filter(b => b.status === 'overdue');
  const activeGoals = (ctx.goals || []).filter(g => !g.completed);
  const efPct = pct(ctx.efCurrent || 0, ctx.efTarget || 0);
  const habitsDone = (ctx.habits || []).filter(h => h.done).length;
  const habitsTotal = (ctx.habits || []).length;

  return {
    income,
    spendRatio,
    wants,
    billsDue,
    overdueBills,
    activeGoals,
    efPct,
    habitsDone,
    habitsTotal,
    investmentSummary,
    topCategories: topSpendingCategories(breakdown, profile.currency),
  };
};

const fallbackAdvice = (ctx: FreeAdvisorContext) => {
  const s = buildSnapshot(ctx);
  const { profile, breakdown } = ctx;
  const advice = getInvestmentAdvice(s.income);
  const lines = [
    `Here is your current PesaFlow readout: you have ${formatCurrency(s.income, profile.currency)} monthly income and have spent ${formatCurrency(breakdown.totalExpenses, profile.currency)} so far, which is ${s.spendRatio}% of income.`,
  ];

  if (s.spendRatio >= 90) {
    lines.push('Your spending is in the danger zone. Prioritise rent, food, transport, utilities, medical needs, and any overdue bills before savings or investing.');
  } else if (s.spendRatio >= 70) {
    lines.push('You still have room to recover this month, but discretionary spending needs a cap so your savings do not disappear.');
  } else {
    lines.push('Your spending level is workable. The next step is to protect the surplus with automatic savings or an MMF transfer on payday.');
  }

  lines.push(`Recommended monthly targets: emergency fund ${formatCurrency(advice.emergencyFund, profile.currency)}, savings ${formatCurrency(advice.savings, profile.currency)}, investments ${formatCurrency(advice.investment, profile.currency)}.`);
  lines.push(`**Action today: move ${formatCurrency(Math.max(500, Math.round(advice.savings * 0.25)), profile.currency)} to savings or an MMF before making any non-essential purchase.**`);
  return lines.join('\n\n');
};

export const generateFreeAdvisorReply = (message: string, ctx: FreeAdvisorContext): string => {
  const q = normalise(message);
  const s = buildSnapshot(ctx);
  const { profile, breakdown, billsMonthlyTotal = 0, netWorthSummary } = ctx;
  const advice = getInvestmentAdvice(s.income);

  if (!isFinancialQuestion(q)) {
    return nonFinancialReply();
  }

  if (!s.income) {
    return 'I need your monthly income before I can give useful advice.\n\nSet your income in the Advisor tab, then I can calculate spending health, savings targets, emergency fund targets, and investment room.\n\n**Action today: enter your monthly take-home income in PesaFlow.**';
  }

  if (q.includes('spending') || q.includes('expense') || q.includes('healthy') || q.includes('cut') || q.includes('cost') || q.includes('budget')) {
    const categoryLines = s.topCategories.length ? s.topCategories.join('\n- ') : 'No expense categories recorded yet.';
    const verdict = s.wants > 25
      ? `Non-essential spending is high at ${s.wants}% of income.`
      : `Non-essential spending is controlled at ${s.wants}% of income.`;

    return `Your spending health is based on actual logged expenses: ${formatCurrency(breakdown.totalExpenses, profile.currency)} spent, equal to ${s.spendRatio}% of income.\n\n${verdict}\n\nTop spending areas:\n- ${categoryLines}\n\n**Action today: choose the largest non-essential category and set a hard weekly cap before spending again.**`;
  }

  if (q.includes('goal')) {
    if (!s.activeGoals.length) {
      return `You do not have active goals yet. Based on your income, a good first monthly savings target is ${formatCurrency(advice.savings, profile.currency)}.\n\nStart with one goal only: emergency fund, school fees, rent deposit, business capital, or debt clearance.\n\n**Action today: create one goal and fund it with at least ${formatCurrency(Math.max(500, Math.round(advice.savings * 0.1)), profile.currency)}.**`;
    }

    const goalLines = s.activeGoals.slice(0, 4).map(g => {
      const progress = pct(g.savedAmount || 0, g.targetAmount || 0);
      return `${g.name}: ${progress}% funded (${formatCurrency(g.savedAmount || 0, profile.currency)} of ${formatCurrency(g.targetAmount || 0, profile.currency)})`;
    }).join('\n- ');

    return `You have ${s.activeGoals.length} active goal${s.activeGoals.length === 1 ? '' : 's'}.\n\n- ${goalLines}\n\nYour recommended savings allocation is ${formatCurrency(advice.savings, profile.currency)} per month. Fund the most urgent goal first instead of spreading small amounts everywhere.\n\n**Action today: add this week's contribution to the goal with the closest deadline.**`;
  }

  if (q.includes('emergency')) {
    const current = ctx.efCurrent || 0;
    const target = ctx.efTarget || 0;
    const shortfall = Math.max(0, target - current);
    const monthly = advice.emergencyFund || Math.max(500, Math.round(s.income * 0.05));
    const months = monthly > 0 ? Math.ceil(shortfall / monthly) : 0;

    return `Your emergency fund is ${s.efPct}% funded: ${formatCurrency(current, profile.currency)} saved against a target of ${formatCurrency(target, profile.currency)}.\n\nAt ${formatCurrency(monthly, profile.currency)} per month, the remaining ${formatCurrency(shortfall, profile.currency)} would take about ${months} month${months === 1 ? '' : 's'}.\n\n**Action today: transfer ${formatCurrency(Math.max(500, Math.round(monthly * 0.25)), profile.currency)} into your emergency fund.**`;
  }

  if (q.includes('bill') || q.includes('pay first') || q.includes('overdue')) {
    if (!s.billsDue.length) {
      return `You have no unpaid bills recorded. Your monthly bills total is ${formatCurrency(billsMonthlyTotal, profile.currency)}, which is ${pct(billsMonthlyTotal, s.income)}% of income.\n\nKeep bills below 30-35% of income so savings and investments still have room.\n\n**Action today: review recurring bills and remove one subscription you no longer use.**`;
    }

    const billLines = s.billsDue
      .slice()
      .sort((a, b) => (a.status === 'overdue' ? -1 : 1) - (b.status === 'overdue' ? -1 : 1) || b.amount - a.amount)
      .slice(0, 5)
      .map(b => `${b.name}: ${formatCurrency(b.amount, profile.currency)} (${b.status})`)
      .join('\n- ');

    return `Pay bills in this order: overdue essentials first, then housing/utilities/loan obligations, then lower-risk subscriptions.\n\nCurrent unpaid bills:\n- ${billLines}\n\nBills are ${pct(billsMonthlyTotal, s.income)}% of income this month.\n\n**Action today: clear the highest-risk overdue bill before any discretionary spending.**`;
  }


  if (q.includes('afford')) {
    const surplus = Math.max(0, s.income - breakdown.totalExpenses - billsMonthlyTotal);
    const safeAmount = Math.max(0, Math.round(surplus * 0.5));

    return `Based on your PesaFlow data, your income is ${formatCurrency(s.income, profile.currency)}, spending is ${formatCurrency(breakdown.totalExpenses, profile.currency)}, and recorded monthly bills are ${formatCurrency(billsMonthlyTotal, profile.currency)}.

A safer affordability limit is about ${formatCurrency(safeAmount, profile.currency)} right now, because you should keep room for emergency savings and unpaid bills. If the purchase is non-essential, delay it when spending is above 70% of income.

**Action today: compare the purchase amount against ${formatCurrency(safeAmount, profile.currency)} before committing.**`;
  }

  if (q.includes('invest') || q.includes('debt')) {
    const debt = Math.max(0, netWorthSummary?.totalLiabilities || 0);
    const invested = s.investmentSummary.totalInvested || 0;
    const shouldClearDebt = debt > 0 && debt > invested * 0.5;

    if (shouldClearDebt) {
      return `Clear expensive debt before increasing investments. Your liabilities are ${formatCurrency(debt, profile.currency)}, while active investments are ${formatCurrency(invested, profile.currency)}.\n\nKeep only minimum low-risk investing until high-interest debt is controlled. Use MMFs or SACCO savings for money you may need soon.\n\n**Action today: make an extra payment toward the highest-interest debt.**`;
    }

    return `You have room to invest if bills are current and your emergency fund is moving. A suitable monthly investment target is ${formatCurrency(advice.investment, profile.currency)}.\n\nFor the Kenyan context, start with lower-volatility options like MMFs, SACCO deposits, T-Bills, or pension top-ups before taking more stock or crypto risk.\n\n**Action today: schedule ${formatCurrency(Math.max(500, Math.round(advice.investment * 0.25)), profile.currency)} toward your chosen investment.**`;
  }

  if (q.includes('net worth') || q.includes('worth')) {
    const assets = netWorthSummary?.totalAssets || 0;
    const liabilities = netWorthSummary?.totalLiabilities || 0;
    const net = netWorthSummary?.netWorth || 0;
    const debtRatio = pct(liabilities, assets);

    return `Your net worth is ${formatCurrency(net, profile.currency)}: ${formatCurrency(assets, profile.currency)} in assets minus ${formatCurrency(liabilities, profile.currency)} in liabilities.\n\nYour liability-to-asset ratio is ${debtRatio}%. A strong next move is to grow liquid assets while reducing the most expensive liabilities.\n\n**Action today: add or update one asset or liability so this number stays accurate.**`;
  }


  if (q.includes('tax') || q.includes('kra') || q.includes('nssf') || q.includes('nhif') || q.includes('sha') || q.includes('insurance')) {
    return `For statutory and protection planning, start from your cash flow: income ${formatCurrency(s.income, profile.currency)}, spending ${formatCurrency(breakdown.totalExpenses, profile.currency)}, and savings left ${formatCurrency(breakdown.savingsLeft, profile.currency)}.

Keep KRA, NSSF, SHA/NHIF-style health cover, loan obligations, and insurance ahead of discretionary spending. I can help you budget for these, but for exact tax filing or legal compliance, confirm with KRA or a qualified advisor.

**Action today: add your recurring statutory or insurance payments as bills so PesaFlow can budget for them.**`;
  }

  if (q.includes('saving') || q.includes('plan') || q.includes('monthly')) {
    return `Here is a simple monthly plan for your income of ${formatCurrency(s.income, profile.currency)}:\n\n- Living expenses: ${formatCurrency(advice.living, profile.currency)}\n- Emergency fund: ${formatCurrency(advice.emergencyFund, profile.currency)}\n- Savings goals: ${formatCurrency(advice.savings, profile.currency)}\n- Investments: ${formatCurrency(advice.investment, profile.currency)}\n\nYour actual spending is currently ${s.spendRatio}% of income, so adjust the plan if bills or essentials are already above target.\n\n**Action today: automate the emergency fund and savings transfers for payday.**`;
  }

  if (q.includes('habit')) {
    return `You have completed ${s.habitsDone}/${s.habitsTotal} money habit${s.habitsTotal === 1 ? '' : 's'} today.\n\nThe highest-impact habits are logging every expense, paying yourself first, and waiting 48 hours before unplanned purchases above KSh 1,000.\n\n**Action today: mark one habit done after recording today's expenses.**`;
  }

  return fallbackAdvice(ctx);
};
