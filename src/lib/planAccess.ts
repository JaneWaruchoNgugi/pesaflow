import type { AppView, SubscriptionTier } from '../types';

// Only the AI Chat requires Pro. All other views (investments, insights,
// alerts, exports, goals) are free.
export const PRO_VIEWS: AppView[] = ['chat'];

// Views locked per tier. Only Free is gated; any paid tier — Pro, plus the
// grandfathered legacy silver/gold/platinum — keeps full access.
export const PLAN_LOCKED_VIEWS: Record<SubscriptionTier, AppView[]> = {
  free: PRO_VIEWS,
  silver: [],
  gold: [],
  platinum: [],
  pro: [],
};

// Backwards-compatible alias (older imports referenced GOLD_VIEWS).
export const GOLD_VIEWS = PRO_VIEWS;
