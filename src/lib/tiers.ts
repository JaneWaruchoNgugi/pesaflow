import type { SubscriptionTier } from '../types';
import { PRO_PRICES } from './pricing';
export const TIER_PRICE: Record<SubscriptionTier, number> = { free: 0, silver: 299, gold: 599, platinum: 999, pro: PRO_PRICES.monthly };
export const TIER_COLOR: Record<SubscriptionTier, string> = { free: '#9BAAC4', silver: '#C0C0C0', gold: '#C9A84C', platinum: '#A78BFA', pro: '#D97706' };
export const TIER_LABEL: Record<SubscriptionTier, string> = { free: 'Free', silver: 'Silver', gold: 'Gold', platinum: 'Platinum', pro: 'Pro' };
// Current product tiers.
export const ACTIVE_TIERS: SubscriptionTier[] = ['free', 'pro'];
export const LEGACY_TIERS: SubscriptionTier[] = ['silver', 'gold', 'platinum'];
export const GOLD_COMING_SOON = false;
