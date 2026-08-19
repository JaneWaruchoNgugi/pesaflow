import type { GoalCategory, GoalCategoryMeta, Goal } from '../types';
import {
  ShieldAlert, Plane, GraduationCap, Home, Car, Briefcase, Palmtree,
  Gem, TrendingUp, Landmark, Users, Umbrella, Target,
} from 'lucide-react';

export const GOAL_META: Record<GoalCategory, GoalCategoryMeta> = {
  emergency: { label: 'Emergency Fund', icon: ShieldAlert, color: '#F87171', description: 'Build a financial safety net' },
  vacation:  { label: 'Vacation',       icon: Plane, color: '#60A5FA', description: 'Travel and experiences' },
  education: { label: 'Education',      icon: GraduationCap, color: '#FFA55A', description: 'School fees, courses, upskilling' },
  property:  { label: 'Property',       icon: Home, color: '#FB923C', description: 'Home ownership or deposit' },
  car:       { label: 'Vehicle',        icon: Car, color: '#7B82FF', description: 'Car purchase or deposit' },
  business:  { label: 'Business',       icon: Briefcase, color: '#3DD68C', description: 'Start or grow a business' },
  retirement:{ label: 'Retirement',     icon: Palmtree, color: '#34D399', description: 'Long-term retirement fund' },
  wedding:   { label: 'Wedding',        icon: Gem, color: '#F472B6', description: 'Wedding and celebrations' },
  mmf:       { label: 'Money Market Fund', icon: TrendingUp, color: '#22C55E', description: 'MMF savings (e.g. Ziidi, CIC, Cytonn)' },
  sacco:     { label: 'SACCO Savings',  icon: Landmark, color: '#0EA5E9', description: 'SACCO deposits — dividends or shares' },
  chama:     { label: 'Chama Savings',  icon: Users, color: '#F59E0B', description: 'Group / merry-go-round savings' },
  insurance: { label: 'Insurance Cover', icon: Umbrella, color: '#8B5CF6', description: 'Health, life or other cover' },
  other:     { label: 'Other',          icon: Target, color: '#C9A84C', description: 'Custom savings goal' },
};

export interface GoalProjection {
  months: number;
  futureValue: number;   // projected balance at the deadline, including interest
  interestEarned: number; // interest/dividends earned over the period
  contributed: number;    // total money put in (current + contributions), no interest
}

/**
 * Project compound growth of an interest-bearing goal (MMF / SACCO dividends)
 * from now until its deadline, given the annual rate and monthly contributions.
 * Returns null if there's no rate or no future deadline.
 */
export const projectGoalInterest = (goal: Goal): GoalProjection | null => {
  if (!goal.interestRate || goal.interestRate <= 0 || !goal.deadline) return null;
  const now = new Date();
  const deadline = new Date(goal.deadline + '-01');
  const months = (deadline.getFullYear() - now.getFullYear()) * 12 + (deadline.getMonth() - now.getMonth());
  if (months <= 0) return null;

  const monthlyRate = goal.interestRate / 100 / 12;
  const P = goal.savedAmount || 0;
  const C = goal.monthlyContribution || 0;
  const growth = Math.pow(1 + monthlyRate, months);

  const fvPrincipal = P * growth;
  // Future value of a monthly contribution stream (ordinary annuity).
  const fvContributions = monthlyRate > 0 ? C * ((growth - 1) / monthlyRate) : C * months;
  const futureValue = fvPrincipal + fvContributions;
  const contributed = P + C * months;

  return {
    months,
    futureValue: Math.round(futureValue),
    interestEarned: Math.round(futureValue - contributed),
    contributed: Math.round(contributed),
  };
};

export interface ChamaPlan {
  pot: number;              // amount one member receives each round = perMember × members
  members: number;
  perMember: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  position: number | null;  // this member's payout order
  payoutDate: string | null; // estimated date this member receives the pot
}

/**
 * Merry-go-round chama maths: every round each member contributes `chamaContribution`
 * and one member takes the whole pot (contribution × members). A member at position P
 * receives the pot on the Pth round, so we estimate their payout date from today.
 */
export const computeChamaPlan = (goal: Goal): ChamaPlan | null => {
  const members = goal.chamaMembers ?? 0;
  const perMember = goal.chamaContribution ?? 0;
  const frequency = goal.chamaFrequency ?? 'monthly';
  if (members <= 0 || perMember <= 0) return null;

  const pot = perMember * members;
  const position = goal.chamaPosition && goal.chamaPosition > 0 ? Math.min(goal.chamaPosition, members) : null;

  let payoutDate: string | null = null;
  if (position) {
    const d = new Date();
    if (frequency === 'daily') d.setDate(d.getDate() + position);
    else if (frequency === 'weekly') d.setDate(d.getDate() + position * 7);
    else d.setMonth(d.getMonth() + position);
    payoutDate = d.toLocaleDateString('en-KE', frequency === 'monthly'
      ? { month: 'short', year: 'numeric' }
      : { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return { pot, members, perMember, frequency, position, payoutDate };
};

export const getGoalProgress = (goal: Goal): number => {
  if (goal.targetAmount === 0) return 0;
  return Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100));
};

export const getMonthsToGoal = (goal: Goal): number | null => {
  const remaining = goal.targetAmount - goal.savedAmount;
  if (remaining <= 0) return 0;
  if (!goal.monthlyContribution || goal.monthlyContribution <= 0) return null;
  return Math.ceil(remaining / goal.monthlyContribution);
};

export const getGoalDeadlineStatus = (goal: Goal): 'on-track' | 'behind' | 'completed' | 'no-deadline' => {
  if (goal.completed || goal.savedAmount >= goal.targetAmount) return 'completed';
  if (!goal.deadline) return 'no-deadline';

  const now = new Date();
  const deadline = new Date(goal.deadline + '-01');
  const monthsLeft = (deadline.getFullYear() - now.getFullYear()) * 12
    + (deadline.getMonth() - now.getMonth());

  const monthsNeeded = getMonthsToGoal(goal);
  if (monthsNeeded === null) return 'behind';
  return monthsNeeded <= monthsLeft ? 'on-track' : 'behind';
};

export const projectGoalDate = (goal: Goal): string | null => {
  const months = getMonthsToGoal(goal);
  if (months === null) return null;
  if (months === 0) return 'Completed!';
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' });
};
