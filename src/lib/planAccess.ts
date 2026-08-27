import type { AppView, SubscriptionTier } from '../types';

// The "intelligence & automation" views that require Pro. Everything else
// (core money tracking + the learning hub) stays free.
export const PRO_VIEWS: AppView[] = ['investments', 'insights', 'chat', 'alerts'];

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
