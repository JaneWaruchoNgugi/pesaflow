import type { LucideIcon } from 'lucide-react';

export type ExpenseCategory =
    | 'housing' | 'food' | 'transport' | 'utilities' | 'medical'
    | 'education' | 'entertainment' | 'diningOut' | 'shopping'
    | 'subscriptions' | 'impulse' | 'other';

export type ExpenseType = 'necessary' | 'unnecessary';

/** How often an expense recurs. 'daily' rolls up into the monthly total by working days. */
export type ExpenseFrequency = 'oneoff' | 'daily' | 'monthly';

export interface Expense {
  id: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  type: ExpenseType;
  date: string;
  isRecurring: boolean;
  /** Defaults to 'oneoff' when absent (backward compatible with older entries). */
  frequency?: ExpenseFrequency;
}

export interface IncomeStream {
  id: string;
  label: string;
  amount: number;
}

export type IncomeMode = 'single' | 'streams' | 'daily';

export interface FinancialProfile {
  monthlyIncome: number;
  currency: string;
  incomeStreams?: IncomeStream[];
  /** Which income entry method the user last used (drives the Advisor tab on reload). */
  incomeMode?: IncomeMode;
  /** Raw daily take-home entered by daily earners (before monthly conversion). */
  dailyAmount?: number;
  /** Days worked per week for daily earners (1–7); monthly ≈ dailyAmount × daysPerWeek × 4.33. */
  daysPerWeek?: number;
}

export interface CategoryMeta {
  label: string;
  type: ExpenseType;
  color: string;
  icon: LucideIcon;
}

export interface SpendingInsight {
  score: number;
  level: 'critical' | 'poor' | 'fair' | 'good' | 'excellent';
  message: string;
}

export interface InvestmentAdvice {
  emergencyFund: number;
  savings: number;
  investment: number;
  living: number;
  tips: string[];
}

export interface MonthlyBreakdown {
  totalExpenses: number;
  necessaryTotal: number;
  unnecessaryTotal: number;
  byCategory: Record<ExpenseCategory, number>;
  savingsLeft: number;
}

export type AppView =
    | 'dashboard' | 'expenses' | 'insights' | 'advisor'
    | 'investments' | 'goals' | 'bills' | 'networth' | 'chat'
    | 'emergency' | 'alerts' | 'upgrade' | 'profile';

// ─── Investment types ──────────────────────────────────────

export type InvestmentCategory =
    | 'sacco' | 'mmf' | 'stocks' | 'bonds' | 'realEstate'
    | 'crypto' | 'pension' | 'savingsAccount' | 'fixedDeposit' | 'other';

export type InvestmentStatus = 'active' | 'matured' | 'withdrawn';

export interface Investment {
  id: string;
  name: string;
  amount: number;
  category: InvestmentCategory;
  date: string;
  expectedReturnPct: number;
  notes: string;
  status: InvestmentStatus;
  isRecurring: boolean;
}

export interface InvestmentCategoryMeta {
  label: string;
  color: string;
  icon: LucideIcon;
  avgReturn: number;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
}

export interface InvestmentSummary {
  totalInvested: number;
  totalMonthly: number;
  projectedAnnualReturn: number;
  byCategory: Record<InvestmentCategory, number>;
  activeCount: number;
}

// ─── Goals ────────────────────────────────────────────────

export type GoalCategory =
    | 'emergency' | 'vacation' | 'education' | 'property'
    | 'car' | 'business' | 'retirement' | 'wedding'
    | 'mmf' | 'sacco' | 'chama' | 'insurance' | 'other';

/** For SACCO savings: whether the balance is held as dividend-earning deposits or share capital. */
export type SaccoHolding = 'dividends' | 'shares';

/** How often chama members contribute (and the pot rotates). */
export type ChamaFrequency = 'daily' | 'weekly' | 'monthly';

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  category: GoalCategory;
  deadline: string; // YYYY-MM
  monthlyContribution: number;
  notes: string;
  createdAt: string;
  completed: boolean;
  /** Provider/institution for savings vehicles — SACCO name, chama name, MMF provider, or insurer. */
  institution?: string;
  /** For SACCO goals: dividends (deposits) vs shares (share capital). */
  saccoHolding?: SaccoHolding;
  /** Annual interest / dividend rate (% p.a.) for MMF / SACCO savings — used to project growth. */
  interestRate?: number;
  /** Whether the savings are locked in (fixed term) rather than freely withdrawable. */
  lockedIn?: boolean;
  /** Chama: total members in the group. */
  chamaMembers?: number;
  /** Chama: this member's payout position in the rotation (1 = receives first). */
  chamaPosition?: number;
  /** Chama: how often each member contributes / the pot rotates. */
  chamaFrequency?: ChamaFrequency;
  /** Chama: amount each member contributes per period. Pot = chamaContribution × chamaMembers. */
  chamaContribution?: number;
}

export interface GoalCategoryMeta {
  label: string;
  icon: LucideIcon;
  color: string;
  description: string;
}

// ─── Bills ────────────────────────────────────────────────

export type BillCategory =
    | 'rent' | 'electricity' | 'water' | 'internet' | 'phone'
    | 'insurance' | 'subscription' | 'loan' | 'tv' | 'other';

export type BillFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
export type BillStatus = 'upcoming' | 'paid' | 'overdue';

export interface Bill {
  id: string;
  name: string;
  amount: number;
  category: BillCategory;
  dueDay: number;
  frequency: BillFrequency;
  status: BillStatus;
  lastPaidDate?: string;
  notes: string;
  isRecurring: boolean;
}

export interface BillCategoryMeta {
  label: string;
  icon: LucideIcon;
  color: string;
}

// ─── Net Worth ────────────────────────────────────────────

export type AssetCategory =
    | 'cash' | 'investments' | 'property' | 'vehicle'
    | 'crypto' | 'pension' | 'business' | 'other';

export type LiabilityCategory =
    | 'mortgage' | 'carLoan' | 'personalLoan'
    | 'creditCard' | 'studentLoan' | 'other';

export interface NetWorthItem {
  id: string;
  name: string;
  amount: number;
  category: AssetCategory | LiabilityCategory;
  type: 'asset' | 'liability';
  notes: string;
}

export interface AssetCategoryMeta {
  label: string;
  icon: LucideIcon;
  color: string;
}

export interface LiabilityCategoryMeta {
  label: string;
  icon: LucideIcon;
  color: string;
}

// ─── Auth ─────────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'silver' | 'gold' | 'platinum';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  authProvider: 'password' | 'google';
  createdAt: string;
  tier: SubscriptionTier;
  blacklisted?: boolean;
  subscriptionStatus?: 'active' | 'pending_payment' | 'expired';
  pendingTier?: SubscriptionTier | null;
  previousTier?: SubscriptionTier;
  subscriptionExpiredAt?: string;
  subscriptionExpiresAt?: string;
  subscriptionStart?: string; // ISO date when paid tier began
}

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  price: number; // KES/month, 0 = free
  color: string;
  icon: string;
  features: string[];
  lockedViews: AppView[];
}

// ─── Chat ─────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// ─── Habits ───────────────────────────────────────────────

export interface Habit {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
  /** ISO date string of last completion reset */
  lastResetDate?: string;
}

// ─── Emergency Fund ───────────────────────────────────────

export interface EmergencyFundData {
  currentAmount: number;
  targetMonths: number;
  lastUpdated: string;
  contributions: { id: string; amount: number; date: string; note: string }[];
}

// ─── Admin ────────────────────────────────────────────────

export type AdminRole = 'super_admin' | 'support' | 'finance';

export interface AdminUser {
  id: string;
  email: string;
  passwordHash: string;
  role: AdminRole;
  createdAt: string;
}

// ─── Alerts & SOS ─────────────────────────────────────────

export interface AlertContact {
  name: string;
  email: string;
  whatsapp: string;
  phone: string;
}

export interface AlertLog {
  id: string;
  channel: 'email' | 'whatsapp' | 'phone';
  timestamp: string;
  snapshot: string; // serialized financial summary at time of alert
}
