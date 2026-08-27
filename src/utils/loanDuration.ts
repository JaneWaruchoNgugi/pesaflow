// Loan Payment Duration Estimator.
//
// Answers: "I borrowed X and can pay Y each period — how long until it's cleared?"
// Handles: reducing-balance amortisation, flat rate (needs the lender's term),
// principal-only estimates when the rate is unknown, 0% loans, and payment-too-low.
// Calculations are kept intermediate-precision; the UI rounds only for display.

export type PaymentFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
export type InterestMethod = 'reducing' | 'flat';

export const PERIODS_PER_YEAR: Record<PaymentFrequency, number> = {
  weekly: 52, biweekly: 26, monthly: 12, quarterly: 4,
};
export const FREQUENCY_LABEL: Record<PaymentFrequency, string> = {
  weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly', quarterly: 'Quarterly',
};
// Singular period noun, e.g. "25 monthly payments".
export const FREQUENCY_ADJECTIVE: Record<PaymentFrequency, string> = {
  weekly: 'weekly', biweekly: 'bi-weekly', monthly: 'monthly', quarterly: 'quarterly',
};
export const FREQUENCY_PER: Record<PaymentFrequency, string> = {
  weekly: '/week', biweekly: '/2 weeks', monthly: '/month', quarterly: '/quarter',
};
const DAYS_PER_PERIOD: Record<PaymentFrequency, number> = {
  weekly: 7, biweekly: 14, monthly: 365 / 12, quarterly: 365 / 4,
};

// Safety cap so a payment barely above the interest can't loop forever (100 years).
const MAX_PERIODS: Record<PaymentFrequency, number> = {
  weekly: 52 * 100, biweekly: 26 * 100, monthly: 12 * 100, quarterly: 4 * 100,
};

export interface ScheduleRow {
  n: number;
  payment: number;
  interest: number | null;   // null when the rate is unknown (principal-only)
  principal: number | null;
  balance: number;
}

export type LoanStatus = 'ok' | 'payment-too-low' | 'need-flat-term' | 'invalid';

export interface LoanDurationResult {
  status: LoanStatus;
  message?: string;
  rateKnown: boolean;          // false → principal-only estimate
  periods: number;             // number of payments
  frequency: PaymentFrequency;
  periodsPerYear: number;
  paymentPerPeriod: number;    // regular + extra
  totalPrincipal: number;      // loan amount (fees are separate)
  fees: number;
  totalInterest: number | null;
  totalRepayment: number | null;
  schedule: ScheduleRow[];
}

export interface LoanDurationInput {
  loanAmount: number;
  payment: number;
  extraPayment?: number;
  fees?: number;
  frequency: PaymentFrequency;
  annualRatePct?: number | null;   // null/undefined = rate unknown (≠ 0%)
  method?: InterestMethod;
  flatTermPeriods?: number | null; // required for flat rate (lender's agreed term, in periods)
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// Principal-only: ignore interest, just divide the balance by the payment.
const principalOnly = (loanAmount: number, payment: number, frequency: PaymentFrequency): LoanDurationResult => {
  const periods = Math.ceil(loanAmount / payment);
  const schedule: ScheduleRow[] = [];
  let balance = loanAmount;
  for (let n = 1; n <= periods; n++) {
    const pay = Math.min(payment, balance);
    balance = round2(balance - pay);
    schedule.push({ n, payment: pay, interest: null, principal: null, balance: Math.max(0, balance) });
  }
  return {
    status: 'ok', rateKnown: false, periods, frequency,
    periodsPerYear: PERIODS_PER_YEAR[frequency], paymentPerPeriod: payment,
    totalPrincipal: loanAmount, fees: 0, totalInterest: null, totalRepayment: null, schedule,
  };
};

export const computeLoanDuration = (input: LoanDurationInput): LoanDurationResult => {
  const loanAmount = input.loanAmount;
  const payment = (input.payment || 0) + (input.extraPayment || 0);
  const frequency = input.frequency;
  const periodsPerYear = PERIODS_PER_YEAR[frequency];
  const fees = Math.max(0, input.fees || 0);

  const invalid = (message: string): LoanDurationResult => ({
    status: 'invalid', message, rateKnown: false, periods: 0, frequency, periodsPerYear,
    paymentPerPeriod: payment, totalPrincipal: Math.max(0, loanAmount), fees,
    totalInterest: null, totalRepayment: null, schedule: [],
  });

  if (!(loanAmount > 0)) return invalid('Enter how much you borrowed.');
  if (!(payment > 0)) return invalid('Enter how much you can pay each period.');

  const rateKnown = input.annualRatePct !== null && input.annualRatePct !== undefined && !Number.isNaN(input.annualRatePct as number);

  // ── Rate unknown → principal-only estimate ──
  if (!rateKnown) {
    return { ...principalOnly(loanAmount, payment, frequency), fees };
  }

  const annualRate = Math.max(0, input.annualRatePct as number) / 100;
  const method: InterestMethod = input.method ?? 'reducing';

  // ── 0% entered → a real zero-interest loan ──
  if (annualRate === 0) {
    const base = principalOnly(loanAmount, payment, frequency);
    return {
      ...base, rateKnown: true, fees,
      totalInterest: 0, totalRepayment: loanAmount,
      schedule: base.schedule.map(r => ({ ...r, interest: 0, principal: r.payment })),
    };
  }

  // ── Flat rate → needs the lender's agreed term to compute interest ──
  if (method === 'flat') {
    const term = input.flatTermPeriods;
    if (!term || !(term > 0)) {
      return {
        status: 'need-flat-term',
        message: "Flat-rate loans need the lender's agreed loan term to work out the interest. Enter the original loan term.",
        rateKnown: true, periods: 0, frequency, periodsPerYear, paymentPerPeriod: payment,
        totalPrincipal: loanAmount, fees, totalInterest: null, totalRepayment: null, schedule: [],
      };
    }
    const totalInterest = loanAmount * annualRate * (term / periodsPerYear);
    const totalOwed = loanAmount + totalInterest;
    const periods = Math.ceil(totalOwed / payment);
    const interestShare = totalInterest / totalOwed;
    const schedule: ScheduleRow[] = [];
    let balance = totalOwed;
    for (let n = 1; n <= periods; n++) {
      const pay = Math.min(payment, balance);
      const interest = pay * interestShare;
      const principal = pay - interest;
      balance = round2(balance - pay);
      schedule.push({ n, payment: pay, interest, principal, balance: Math.max(0, balance) });
    }
    return {
      status: 'ok', rateKnown: true, periods, frequency, periodsPerYear, paymentPerPeriod: payment,
      totalPrincipal: loanAmount, fees, totalInterest, totalRepayment: totalOwed, schedule,
    };
  }

  // ── Reducing balance (default) ──
  const periodicRate = annualRate / periodsPerYear;
  // If the payment can't cover the first period's interest, it never amortises.
  if (payment <= loanAmount * periodicRate) {
    return {
      status: 'payment-too-low',
      message: 'This payment does not cover the interest building up each period, so the balance would never reduce. Try increasing your payment.',
      rateKnown: true, periods: 0, frequency, periodsPerYear, paymentPerPeriod: payment,
      totalPrincipal: loanAmount, fees, totalInterest: null, totalRepayment: null, schedule: [],
    };
  }

  const schedule: ScheduleRow[] = [];
  let balance = loanAmount;
  let totalInterest = 0;
  let periods = 0;
  const cap = MAX_PERIODS[frequency];
  while (balance > 0.005 && periods < cap) {
    const interest = balance * periodicRate;
    let pay = payment;
    if (pay > balance + interest) pay = balance + interest; // final, smaller payment
    const principal = pay - interest;
    balance = balance - principal;
    totalInterest += interest;
    periods++;
    schedule.push({ n: periods, payment: pay, interest, principal, balance: Math.max(0, round2(balance)) });
  }

  if (periods >= cap && balance > 0.005) {
    return {
      status: 'payment-too-low',
      message: 'At this payment the loan would take an unrealistically long time to clear. Try increasing your payment.',
      rateKnown: true, periods: 0, frequency, periodsPerYear, paymentPerPeriod: payment,
      totalPrincipal: loanAmount, fees, totalInterest: null, totalRepayment: null, schedule: [],
    };
  }

  return {
    status: 'ok', rateKnown: true, periods, frequency, periodsPerYear, paymentPerPeriod: payment,
    totalPrincipal: loanAmount, fees, totalInterest, totalRepayment: loanAmount + totalInterest, schedule,
  };
};

// ── Formatting helpers ──

// Convert a number of payment periods to an approximate calendar duration.
export const periodsToDuration = (periods: number, frequency: PaymentFrequency): { years: number; months: number } => {
  const totalMonths = Math.round((periods * DAYS_PER_PERIOD[frequency]) / (365 / 12));
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12 };
};

export const formatDuration = (periods: number, frequency: PaymentFrequency): string => {
  if (periods <= 0) return '—';
  const { years, months } = periodsToDuration(periods, frequency);
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years === 1 ? '' : 's'}`);
  if (months > 0) parts.push(`${months} month${months === 1 ? '' : 's'}`);
  if (parts.length === 0) parts.push('less than a month');
  return parts.join(' ');
};

// Payoff date given a start date (ms) and number of periods.
export const payoffDate = (startMs: number, periods: number, frequency: PaymentFrequency): Date =>
  new Date(startMs + periods * DAYS_PER_PERIOD[frequency] * 24 * 60 * 60 * 1000);
