import type { FinancialProfile } from '../types';

/** Average number of weeks in a calendar month. */
export const WEEKS_PER_MONTH = 4.33;

/** Working days in a month for a daily earner (e.g. 6 days/week ≈ 26 days). */
export const workingDaysPerMonth = (daysPerWeek = 6): number => daysPerWeek * WEEKS_PER_MONTH;

/** Convert a daily amount to its monthly equivalent for a daily earner. */
export const dailyToMonthly = (daily: number, daysPerWeek = 6): number =>
  Math.round(daily * workingDaysPerMonth(daysPerWeek));

/**
 * How many times a "daily" item recurs in a month.
 * Daily earners use their actual working days so income and spending stay on the
 * same basis; everyone else falls back to ~30 calendar days.
 */
export const getDailyMultiplier = (
  profile?: Pick<FinancialProfile, 'incomeMode' | 'daysPerWeek'> | null,
): number =>
  profile?.incomeMode === 'daily' ? workingDaysPerMonth(profile.daysPerWeek ?? 6) : 30;

/** Read the persisted profile from localStorage to derive the daily multiplier (for hooks without profile access). */
export const readProfileDailyMultiplier = (): number => {
  try {
    const p = JSON.parse(localStorage.getItem('finwise_profile') || 'null');
    return getDailyMultiplier(p);
  } catch {
    return 30;
  }
};
