import type { SubscriptionTier } from '../types';
export const TIER_PRICE: Record<SubscriptionTier, number> = { free: 0, silver: 299, gold: 599, platinum: 999 };
export const TIER_COLOR: Record<SubscriptionTier, string> = { free: '#9BAAC4', silver: '#C0C0C0', gold: '#C9A84C', platinum: '#A78BFA' };
export const TIER_LABEL: Record<SubscriptionTier, string> = { free: 'Free', silver: 'Silver', gold: 'Gold', platinum: 'Platinum' };
// Current product tiers (gold is not yet purchasable).
export const ACTIVE_TIERS: SubscriptionTier[] = ['free', 'gold'];
export const LEGACY_TIERS: SubscriptionTier[] = ['silver', 'platinum'];
export const GOLD_COMING_SOON = true;
