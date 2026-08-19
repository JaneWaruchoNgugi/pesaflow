import type { AssetCategory, LiabilityCategory, AssetCategoryMeta, LiabilityCategoryMeta, NetWorthItem } from '../types';
import {
  Banknote, TrendingUp, Building2, Car, Bitcoin, Palmtree, Briefcase, Shapes,
  Landmark, CreditCard, GraduationCap, FileText,
} from 'lucide-react';

export const ASSET_META: Record<AssetCategory, AssetCategoryMeta> = {
  cash:        { label: 'Cash & Savings',    icon: Banknote, color: '#3DD68C' },
  investments: { label: 'Investments',       icon: TrendingUp, color: '#60A5FA' },
  property:    { label: 'Property',          icon: Building2, color: '#FB923C' },
  vehicle:     { label: 'Vehicle',           icon: Car, color: '#7B82FF' },
  crypto:      { label: 'Crypto',            icon: Bitcoin, color: '#F59E0B' },
  pension:     { label: 'Pension / NSSF',    icon: Palmtree, color: '#34D399' },
  business:    { label: 'Business Value',    icon: Briefcase, color: '#C9A84C' },
  other:       { label: 'Other Assets',      icon: Shapes, color: '#94A3B8' },
};

export const LIABILITY_META: Record<LiabilityCategory, LiabilityCategoryMeta> = {
  mortgage:     { label: 'Mortgage',       icon: Landmark, color: '#F87171' },
  carLoan:      { label: 'Car Loan',       icon: Car, color: '#FB923C' },
  personalLoan: { label: 'Personal Loan',  icon: CreditCard, color: '#FBBF24' },
  creditCard:   { label: 'Credit Card',    icon: CreditCard, color: '#E879F9' },
  studentLoan:  { label: 'Student Loan',   icon: GraduationCap, color: '#A78BFA' },
  other:        { label: 'Other Debts',    icon: FileText, color: '#94A3B8' },
};

export const calculateNetWorth = (items: NetWorthItem[]) => {
  const assets = items.filter((i) => i.type === 'asset');
  const liabilities = items.filter((i) => i.type === 'liability');
  const totalAssets = assets.reduce((s, i) => s + i.amount, 0);
  const totalLiabilities = liabilities.reduce((s, i) => s + i.amount, 0);
  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    assetsByCategory: groupByCategory(assets),
    liabilitiesByCategory: groupByCategory(liabilities),
  };
};

const groupByCategory = (items: NetWorthItem[]): Record<string, number> => {
  const result: Record<string, number> = {};
  for (const item of items) {
    result[item.category] = (result[item.category] || 0) + item.amount;
  }
  return result;
};
