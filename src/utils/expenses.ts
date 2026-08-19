import type{ CategoryMeta, ExpenseCategory } from '../types';
import {
  Home, ShoppingCart, Bus, Lightbulb, HeartPulse, BookOpen, Clapperboard,
  UtensilsCrossed, ShoppingBag, Smartphone, Zap, Package,
} from 'lucide-react';

export const CATEGORY_META: Record<ExpenseCategory, CategoryMeta> = {
  housing: { label: 'Housing / Rent', type: 'necessary', color: '#4E9AF1', icon: Home },
  food: { label: 'Groceries / Food', type: 'necessary', color: '#56C596', icon: ShoppingCart },
  transport: { label: 'Transport', type: 'necessary', color: '#7B82FF', icon: Bus },
  utilities: { label: 'Utilities', type: 'necessary', color: '#54C5D0', icon: Lightbulb },
  medical: { label: 'Medical / Health', type: 'necessary', color: '#F87C7C', icon: HeartPulse },
  education: { label: 'Education', type: 'necessary', color: '#FFA55A', icon: BookOpen },
  entertainment: { label: 'Entertainment', type: 'unnecessary', color: '#E879F9', icon: Clapperboard },
  diningOut: { label: 'Dining Out', type: 'unnecessary', color: '#FB923C', icon: UtensilsCrossed },
  shopping: { label: 'Shopping', type: 'unnecessary', color: '#F472B6', icon: ShoppingBag },
  subscriptions: { label: 'Subscriptions', type: 'unnecessary', color: '#A78BFA', icon: Smartphone },
  impulse: { label: 'Impulse Buys', type: 'unnecessary', color: '#F43F5E', icon: Zap },
  other: { label: 'Other', type: 'necessary', color: '#94A3B8', icon: Package },
};

export const formatCurrency = (amount: number, currency = 'KES'): string => {
  if (currency === 'KES') {
    return `KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

export const generateId = (): string =>
  Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

export const getCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const filterByMonth = (expenses: import('../types').Expense[], month: string) =>
  expenses.filter((e) => e.date.startsWith(month));
