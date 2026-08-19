import type{ InvestmentCategory, InvestmentCategoryMeta, Investment, InvestmentSummary } from '../types';
import {
  PiggyBank, LineChart, TrendingUp, Landmark, Building2, Bitcoin,
  Palmtree, Wallet, Lock, Shapes,
} from 'lucide-react';

export const INVESTMENT_META: Record<InvestmentCategory, InvestmentCategoryMeta> = {
  sacco: {
    label: 'SACCO',
    color: '#3DD68C',
    icon: PiggyBank,
    avgReturn: 12,
    riskLevel: 'low',
    description: 'Savings & Credit Co-operative — dividends + loan access',
  },
  mmf: {
    label: 'Money Market Fund',
    color: '#60A5FA',
    icon: LineChart,
    avgReturn: 11,
    riskLevel: 'low',
    description: 'CIC, Cytonn, Zimele — liquid, stable daily interest',
  },
  stocks: {
    label: 'NSE Stocks',
    color: '#A78BFA',
    icon: TrendingUp,
    avgReturn: 15,
    riskLevel: 'high',
    description: 'Nairobi Securities Exchange listed equities',
  },
  bonds: {
    label: 'T-Bills / Bonds',
    color: '#C9A84C',
    icon: Landmark,
    avgReturn: 14,
    riskLevel: 'low',
    description: 'Government-backed treasury bills and bonds',
  },
  realEstate: {
    label: 'Real Estate / REITs',
    color: '#FB923C',
    icon: Building2,
    avgReturn: 13,
    riskLevel: 'medium',
    description: 'Property or REIT units (ILAM, Acorn)',
  },
  crypto: {
    label: 'Crypto',
    color: '#F59E0B',
    icon: Bitcoin,
    avgReturn: 20,
    riskLevel: 'high',
    description: 'Bitcoin, ETH — high reward, very high risk',
  },
  pension: {
    label: 'Pension / NSSF',
    color: '#34D399',
    icon: Palmtree,
    avgReturn: 10,
    riskLevel: 'low',
    description: 'Retirement savings — NSSF voluntary top-ups',
  },
  savingsAccount: {
    label: 'Savings Account',
    color: '#54C5D0',
    icon: Wallet,
    avgReturn: 6,
    riskLevel: 'low',
    description: 'Bank savings account — low return, fully liquid',
  },
  fixedDeposit: {
    label: 'Fixed Deposit',
    color: '#7B82FF',
    icon: Lock,
    avgReturn: 9,
    riskLevel: 'low',
    description: 'Locked bank deposits for fixed terms',
  },
  other: {
    label: 'Other',
    color: '#94A3B8',
    icon: Shapes,
    avgReturn: 8,
    riskLevel: 'medium',
    description: 'Other investment vehicles',
  },
};

export const RISK_COLORS = {
  low:    { text: '#3DD68C', bg: 'rgba(61,214,140,0.12)'  },
  medium: { text: '#FBBF24', bg: 'rgba(251,191,36,0.12)'  },
  high:   { text: '#F87171', bg: 'rgba(248,113,113,0.12)' },
};

export const calculateInvestmentSummary = (
  investments: Investment[],
  month: string
): InvestmentSummary => {
  const active = investments.filter((i) => i.status !== 'withdrawn');
  const monthly = investments.filter((i) => i.date.startsWith(month));

  const byCategory = {} as Record<InvestmentCategory, number>;
  let totalInvested = 0;
  let weightedReturn = 0;

  for (const inv of active) {
    byCategory[inv.category] = (byCategory[inv.category] || 0) + inv.amount;
    totalInvested += inv.amount;
    weightedReturn += inv.amount * (inv.expectedReturnPct / 100);
  }

  const projectedAnnualReturn = totalInvested > 0 ? weightedReturn : 0;
  const totalMonthly = monthly.reduce((s, i) => s + i.amount, 0);

  return {
    totalInvested,
    totalMonthly,
    projectedAnnualReturn,
    byCategory,
    activeCount: active.length,
  };
};

export const projectGrowth = (
  principal: number,
  annualReturnPct: number,
  years: number
): number => {
  return principal * Math.pow(1 + annualReturnPct / 100, years);
};

export const filterInvestmentsByMonth = (investments: Investment[], month: string) =>
  investments.filter((i) => i.date.startsWith(month));
