import type { BillCategory, BillCategoryMeta, Bill, BillStatus } from '../types';
import { readProfileDailyMultiplier } from '../utils/frequency';
import {
  Home, Lightbulb, Droplets, Wifi, Smartphone, ShieldCheck,
  Repeat, Landmark, Tv, ClipboardList,
} from 'lucide-react';

export const BILL_META: Record<BillCategory, BillCategoryMeta> = {
  rent:         { label: 'Rent / Mortgage',  icon: Home, color: '#60A5FA' },
  electricity:  { label: 'Electricity',      icon: Lightbulb, color: '#FBBF24' },
  water:        { label: 'Water',            icon: Droplets, color: '#54C5D0' },
  internet:     { label: 'Internet / WiFi',  icon: Wifi, color: '#A78BFA' },
  phone:        { label: 'Phone / Airtime',  icon: Smartphone, color: '#F472B6' },
  insurance:    { label: 'Insurance',        icon: ShieldCheck, color: '#3DD68C' },
  subscription: { label: 'Subscription',     icon: Repeat, color: '#E879F9' },
  loan:         { label: 'Loan Payment',     icon: Landmark, color: '#F87171' },
  tv:           { label: 'TV / Cable',       icon: Tv, color: '#FB923C' },
  other:        { label: 'Other',            icon: ClipboardList, color: '#94A3B8' },
};

export const getBillStatus = (bill: Bill): BillStatus => {
  const today = new Date();
  const todayDay = today.getDate();

  if (bill.status === 'paid') {
    // Reset to upcoming if it's a new month
    if (bill.lastPaidDate) {
      const lastPaid = new Date(bill.lastPaidDate);
      if (lastPaid.getMonth() === today.getMonth() && lastPaid.getFullYear() === today.getFullYear()) {
        return 'paid';
      }
    }
    return 'upcoming';
  }

  if (todayDay > bill.dueDay) return 'overdue';
  if (todayDay >= bill.dueDay - 3) return 'upcoming'; // due within 3 days
  return 'upcoming';
};

export const getDaysUntilDue = (dueDay: number): number => {
  const today = new Date();
  const todayDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  if (dueDay >= todayDay) return dueDay - todayDay;
  return daysInMonth - todayDay + dueDay;
};

export const sortBillsByDueDate = (bills: Bill[]): Bill[] =>
  [...bills].sort((a, b) => {
    const daysA = getDaysUntilDue(a.dueDay);
    const daysB = getDaysUntilDue(b.dueDay);
    return daysA - daysB;
  });

export const billMonthlyAmount = (bill: Bill, dailyMultiplier: number): number => {
  if (bill.frequency === 'daily')     return bill.amount * dailyMultiplier;
  if (bill.frequency === 'weekly')    return bill.amount * 4;
  if (bill.frequency === 'quarterly') return bill.amount / 3;
  if (bill.frequency === 'annually')  return bill.amount / 12;
  return bill.amount; // monthly
};

export const getMonthlyTotal = (bills: Bill[]): number => {
  const dailyMultiplier = readProfileDailyMultiplier();
  return bills.reduce((sum, bill) => sum + billMonthlyAmount(bill, dailyMultiplier), 0);
};

export const getUpcomingBills = (bills: Bill[], days = 7): Bill[] =>
  // Daily bills have no single due date, so they don't belong in the "due this week" alert.
  bills.filter((b) => b.status !== 'paid' && b.frequency !== 'daily' && getDaysUntilDue(b.dueDay) <= days);
