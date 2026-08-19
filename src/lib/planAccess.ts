import type { AppView, SubscriptionTier } from '../types';

// The advanced tools that remain behind the (not-yet-launched) Gold plan.
// Everything else is free for everyone while we grow the user base.
export const GOLD_VIEWS: AppView[] = ['investments', 'insights', 'chat', 'alerts'];

// Explicit map so every tier resolves safely. Free/Silver members can use
// everything except the Gold tools; Gold/Platinum keep full access (admin/testing).
export const PLAN_LOCKED_VIEWS: Record<SubscriptionTier, AppView[]> = {
  free: GOLD_VIEWS,
  silver: GOLD_VIEWS,
  gold: [],
  platinum: [],
};
