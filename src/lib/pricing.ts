import type { BillingCycle, SubscriptionTier } from '../types';

// Single "Pro" plan, sold on three M-Pesa-friendly billing cycles.
// Monthly is the anchor / best value; daily lowers the entry barrier.
export const PRO_PRICES: Record<BillingCycle, number> = {
  daily: 20,
  weekly: 99,
  monthly: 299,
};

// How long each cycle grants access, in days.
export const CYCLE_DAYS: Record<BillingCycle, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
};

export const CYCLE_LABEL: Record<BillingCycle, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

// Per-day effective cost, used to show "best value" savings vs the daily rate.
export const cyclePerDay = (cycle: BillingCycle): number => PRO_PRICES[cycle] / CYCLE_DAYS[cycle];

// Any non-free tier counts as Pro. Legacy silver/gold/platinum subscribers are
// grandfathered into full access so nobody loses features in the switch to Pro.
export const isPro = (tier: SubscriptionTier | undefined): boolean => !!tier && tier !== 'free';

// Free-tier caps — Pro removes them. Kept modest so the free app is still useful.
export const FREE_GOAL_LIMIT = 3;
export const FREE_BILL_LIMIT = 5;

// Test accounts that always get full Pro access (no payment required).
export const TEST_PRO_EMAILS = ['waruchojanen@gmail.com', 'techspothubke@gmail.com'];
export const isTestProEmail = (email: string | undefined | null): boolean =>
  !!email && TEST_PRO_EMAILS.includes(email.trim().toLowerCase());
