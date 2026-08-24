import React, {type Dispatch, type SetStateAction, useState} from 'react';
import { AlertTriangle, ArrowDown, ArrowRight, ArrowUp, ChevronRight, Crown, Landmark, Lock, Pencil, ReceiptText, Shield, Sparkles, Target, Trophy, TrendingUp, Wallet } from 'lucide-react';
import type {MonthlyBreakdown, SpendingInsight, Expense, FinancialProfile, Bill, Goal, Habit, AppView, SubscriptionTier} from '../types';
import { formatCurrency, CATEGORY_META } from '../utils/expenses';
import { MonthSelector } from './MonthSelector';
import type { MonthPoint } from '../utils/history';
import { availableMonths } from '../utils/history';
import { HabitsTracker } from './HabitsTracker';

interface DashboardProps {
  breakdown: MonthlyBreakdown;
  insight: SpendingInsight;
  profile: FinancialProfile;
  warnings: string[];
  onUpdateIncome: (income: number) => void;
  // Extended props
  bills?: Bill[];
  billsMonthlyTotal?: number;
  goals?: Goal[];
  netWorthSummary?: { totalAssets: number; totalLiabilities: number; netWorth: number };
  habits?: Habit[];
  habitsCompletedCount?: number;
  habitsCompletionPct?: number;
  efCurrent?: number;
  efTarget?: number;
  efProgressPct?: number;
  onToggleHabit?: (id: string) => void;
  onAddHabit?: (text: string) => void;
  onRemoveHabit?: (id: string) => void;
  onNavigate?: Dispatch<SetStateAction<AppView>>;
  userTier?: SubscriptionTier;
  expenseCount?: number;
  onUpgrade?: (tier: SubscriptionTier) => void;
  expenses?: Expense[];
  history?: MonthPoint[];
  selectedMonth?: string;
  onSelectMonth?: (month: string) => void;
  goalsThisMonth?: number;
}

const LEVEL_COLORS: Record<string, string> = {
  excellent: 'var(--score-excellent)', good: 'var(--score-good)', fair: 'var(--score-fair)', poor: 'var(--score-poor)', critical: 'var(--score-critical)',
};
const LEVEL_BG: Record<string, string> = {
  excellent: 'var(--green-dim)', good: 'var(--blue-dim)',
  fair: 'var(--amber-dim)', poor: 'rgba(251,146,60,0.12)', critical: 'var(--red-dim)',
};

export const Dashboard: React.FC<DashboardProps> = ({
  breakdown, insight, profile, warnings, onUpdateIncome,
  bills = [], goals = [],
  netWorthSummary = { totalAssets: 0, totalLiabilities: 0, netWorth: 0 },
  habits = [], habitsCompletedCount = 0, habitsCompletionPct = 0,
  efCurrent = 0, efTarget = 0, efProgressPct = 0,
  onToggleHabit, onAddHabit, onRemoveHabit, onNavigate,
  userTier = 'free', expenseCount = 0, onUpgrade,
  expenses = [], history = [], selectedMonth = '', onSelectMonth,
  goalsThisMonth = 0,
}) => {
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeInput, setIncomeInput] = useState(String(profile.monthlyIncome));
  const scoreColor = LEVEL_COLORS[insight.level];
  const scoreBg = LEVEL_BG[insight.level];

  const saveIncome = () => {
    const val = parseFloat(incomeInput.replace(/,/g, ''));
    if (!isNaN(val) && val > 0) onUpdateIncome(val);
    setEditingIncome(false);
  };

  const spendingPct = profile.monthlyIncome > 0
    ? Math.min(100, Math.round((breakdown.totalExpenses / profile.monthlyIncome) * 100)) : 0;
  const unnecessaryPct = profile.monthlyIncome > 0
    ? Math.min(100, Math.round((breakdown.unnecessaryTotal / profile.monthlyIncome) * 100)) : 0;

  const topCategories = Object.entries(breakdown.byCategory)
    .filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a).slice(0, 5);

  const billsDue = bills.filter((b) => b.status !== 'paid');
  const billsOverdue = bills.filter((b) => b.status === 'overdue');
  const activeGoals = goals.filter((g) => !g.completed).slice(0, 3);
  const efColor = efProgressPct >= 80 ? 'var(--green)' : efProgressPct >= 40 ? 'var(--amber)' : 'var(--red)';
  const shouldShowFreeHook = userTier === 'free' && expenseCount >= 5;
  const projectedSavings = Math.max(0, Math.round(breakdown.unnecessaryTotal * 0.35));

  return (
    <div style={S.container} className="animate-in">
      <style>{`
        .dash-action-card:hover { transform: translateY(-2px); border-color: var(--border-acc) !important; box-shadow: 0 14px 34px rgba(10,22,40,0.12) !important; }
        .dash-action-card:hover .dash-open-chip { color: var(--gold); background: var(--gold-dim); border-color: var(--border-acc); }
        .dash-action-card:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; }
      `}</style>

      {onSelectMonth && selectedMonth && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <MonthSelector months={availableMonths(expenses, selectedMonth)} value={selectedMonth} onChange={onSelectMonth} />
        </div>
      )}

      {/* Setup banner */}
      {profile.monthlyIncome === 0 && (
        <div className="setup-banner">
          <Wallet size={20} strokeWidth={2.1} style={{ color: 'var(--gold)', flexShrink: 0 }} />
          <span className="setup-text" style={S.setupText}>Set your monthly income to unlock personalized insights</span>
          <button style={S.setupBtn} onClick={() => setEditingIncome(true)}>Set Income</button>
        </div>
      )}

      {/* Stats row */}
      <div className="stats-grid">
        {/* Income */}
        <div style={S.statCard}>
          <div style={S.statLabel}>Monthly Income</div>
          {editingIncome ? (
            <div style={S.incomeEdit}>
              <input style={S.incomeInput} value={incomeInput}
                onChange={(e) => setIncomeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveIncome()}
                autoFocus placeholder="e.g. 45000" />
              <button style={S.saveBtn} onClick={saveIncome}>Save</button>
            </div>
          ) : (
            <div style={S.statValueRow}>
              <div style={S.statValue}>
                {profile.monthlyIncome > 0 ? formatCurrency(profile.monthlyIncome, profile.currency) : '—'}
              </div>
              <button style={S.editBtn} onClick={() => { setIncomeInput(String(profile.monthlyIncome)); setEditingIncome(true); }} aria-label="Edit income"><Pencil size={14} strokeWidth={2.1} /></button>
            </div>
          )}
          <div style={S.statSub}>per month</div>
        </div>

        {/* Total spent */}
        <div style={S.statCard}>
          <div style={S.statLabel}>Total Spent</div>
          <div style={S.statValue}>{formatCurrency(breakdown.totalExpenses, profile.currency)}</div>
          <div style={S.progressBar}>
            <div style={{ ...S.progressFill, width: `${spendingPct}%`, background: spendingPct > 80 ? 'var(--red)' : 'var(--blue)' }} />
          </div>
          <div style={S.statSub}>{spendingPct}% of income · expenses + bills + goals</div>
        </div>

        {/* Unnecessary */}
        <div style={S.statCard}>
          <div style={S.statLabel}>Unnecessary Spending</div>
          <div style={{ ...S.statValue, color: breakdown.unnecessaryTotal > 0 ? 'var(--amber)' : 'var(--green)' }}>
            {formatCurrency(breakdown.unnecessaryTotal, profile.currency)}
          </div>
          <div style={S.progressBar}>
            <div style={{ ...S.progressFill, width: `${unnecessaryPct}%`, background: 'var(--amber)' }} />
          </div>
          <div style={S.statSub}>{unnecessaryPct}% of income</div>
        </div>

        {/* Savings */}
        <div style={S.statCard}>
          <div style={S.statLabel}>Available to Save</div>
          <div style={{ ...S.statValue, color: breakdown.savingsLeft > 0 ? 'var(--green)' : 'var(--red)' }}>
            {formatCurrency(breakdown.savingsLeft, profile.currency)}
          </div>
          <div style={S.statSub}>
            {profile.monthlyIncome > 0 && breakdown.savingsLeft > 0
              ? `${Math.round((breakdown.savingsLeft / profile.monthlyIncome) * 100)}% remaining`
              : profile.monthlyIncome > 0 ? 'Overspent!' : '—'}
          </div>
          {goalsThisMonth > 0 && (
            <div style={{ ...S.statSub, color: 'var(--green)' }}>
              +{formatCurrency(goalsThisMonth, profile.currency)} saved to goals this month
            </div>
          )}
        </div>
      </div>

      {shouldShowFreeHook && (
        <div style={S.freeHookCard}>
          <div style={S.freeHookIcon}><Sparkles size={22} strokeWidth={2.2} /></div>
          <div style={S.freeHookBody}>
            <div style={S.freeHookKicker}>Your spending pattern is ready</div>
            <div style={S.freeHookTitle}>PesaFlow found enough data to turn tracking into a plan.</div>
            <div style={S.freeHookText}>
              Everything you&apos;re using is free. Investment tracking, deeper AI insights, an AI money advisor, and emergency alerts are coming soon with Gold.
              {projectedSavings > 0 && ` You may be able to redirect about ${formatCurrency(projectedSavings, profile.currency)} from lifestyle spending this month.`}
            </div>
            <div style={S.freeHookActions}>
              <button style={S.goldBtn} onClick={() => onUpgrade?.('gold')}><Crown size={15} /> See Gold features — coming soon</button>
            </div>
          </div>
          <div style={S.lockedPreviewRail}>
            {[
              { icon: TrendingUp, label: 'Investments' },
              { icon: Lock, label: 'AI insights' },
              { icon: Shield, label: 'Alerts' },
            ].map(item => {
              const Icon = item.icon;
              return <div key={item.label} style={S.lockedPreview}><Icon size={15} /> {item.label}</div>;
            })}
          </div>
        </div>
      )}

      {history.length > 0 && (() => {
        const maxVal = Math.max(1, ...history.map((h) => Math.max(h.spent, h.saved)));
        return (
          <div style={S.categoriesCard}>
            <div style={S.cardTitle}>Spending over time</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 140, padding: '8px 4px 0' }}>
              {history.map((h) => (
                <div key={h.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100, width: '100%', justifyContent: 'center' }}>
                    <div title={`Spent ${formatCurrency(h.spent, profile.currency)}`}
                      style={{ width: 12, height: `${(h.spent / maxVal) * 100}%`, background: 'var(--blue)', borderRadius: '3px 3px 0 0' }} />
                    <div title={`Remaining ${formatCurrency(h.saved, profile.currency)}`}
                      style={{ width: 12, height: `${(h.saved / maxVal) * 100}%`, background: 'var(--green)', borderRadius: '3px 3px 0 0' }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{h.month.slice(5)}/{h.month.slice(2, 4)}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: 'var(--text-3)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--blue)' }} /> Spent</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--green)' }} /> Remaining</span>
              <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>Bills use current projection</span>
            </div>
          </div>
        );
      })()}

      {/* Score + categories */}
      <div className="mid-row">
        <div style={{ ...S.scorePanel, background: scoreBg, border: `1px solid ${scoreColor}30` }} className="score-panel-equal">
          <div style={S.scoreHeader}>
            <span style={S.scorePanelLabel}>Financial Health</span>
            <span style={{ ...S.levelBadge, color: scoreColor, background: `${scoreColor}20` }}>
              {insight.level.toUpperCase()}
            </span>
          </div>
          <svg width="120" height="120" viewBox="0 0 120 120" style={{ margin: '6px 0' }}>
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
            <circle cx="60" cy="60" r="50" fill="none" stroke={scoreColor} strokeWidth="10"
              strokeDasharray={`${(insight.score / 100) * 314} 314`}
              strokeLinecap="round" transform="rotate(-90 60 60)"
              style={{ filter: `drop-shadow(0 0 6px ${scoreColor})` }}
            />
            <text x="60" y="55" textAnchor="middle" fill={scoreColor} fontSize="28" fontFamily="Cormorant Garamond" fontWeight="700">{insight.score}</text>
            <text x="60" y="72" textAnchor="middle" fill="#9BAAC4" fontSize="10" fontFamily="Karla">out of 100</text>
          </svg>
          <p style={S.scoreMessage}>{insight.message}</p>
        </div>

        <div style={S.categoriesCard}>
          <div style={S.cardTitle}>Top Spending Categories</div>
          {topCategories.length === 0 ? (
            <div style={S.emptyState}>No expenses yet this month</div>
          ) : (
            <div style={S.categoryList}>
              {topCategories.map(([cat, amount]) => {
                const meta = CATEGORY_META[cat as keyof typeof CATEGORY_META];
                const pct = breakdown.totalExpenses > 0 ? Math.round((amount / breakdown.totalExpenses) * 100) : 0;
                return (
                  <div key={cat} style={S.categoryItem}>
                    <div style={S.catLeft}>
                      {(() => { const Icon = meta?.icon; return Icon ? <span style={S.catIcon}><Icon size={20} strokeWidth={2.1} style={{ color: meta?.color }} /></span> : null; })()}
                      <div>
                        <div style={S.catName}>{meta?.label}</div>
                        <div style={{ ...S.catType, color: meta?.type === 'unnecessary' ? 'var(--amber)' : 'var(--green)' }}>{meta?.type}</div>
                      </div>
                    </div>
                    <div style={S.catRight}>
                      <div style={S.catAmount}>{formatCurrency(amount, 'KES')}</div>
                      <div style={S.catBar}><div style={{ ...S.catBarFill, width: `${pct}%`, background: meta?.color }} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Planning shortcuts */}
      <div className="stats-grid">
        <button type="button" className="dash-action-card" style={S.actionCard} onClick={() => onNavigate?.('networth')}>
          <div style={S.actionTop}>
            <div style={S.actionIcon}><Landmark size={18} strokeWidth={2.1} /></div>
            <span className="dash-open-chip" style={S.openChip}>Open <ArrowRight size={12} /></span>
          </div>
          <div style={S.statLabel}>Net Worth</div>
          <div style={{ ...S.statValue, color: netWorthSummary.netWorth >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 22 }}>
            {formatCurrency(netWorthSummary.netWorth, profile.currency)}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 11, color: 'var(--text-3)' }}>
            <span style={{ color: 'var(--green)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><ArrowUp size={12} strokeWidth={2.4} /> {formatCurrency(netWorthSummary.totalAssets, profile.currency)}</span>
            <span>·</span>
            <span style={{ color: 'var(--red)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><ArrowDown size={12} strokeWidth={2.4} /> {formatCurrency(netWorthSummary.totalLiabilities, profile.currency)}</span>
          </div>
        </button>

        <button type="button" className="dash-action-card" style={S.actionCard} onClick={() => onNavigate?.('bills')}>
          <div style={S.actionTop}>
            <div style={S.actionIcon}><ReceiptText size={18} strokeWidth={2.1} /></div>
            <span className="dash-open-chip" style={S.openChip}>Open <ArrowRight size={12} /></span>
          </div>
          <div style={S.statLabel}>Bills Due</div>
          <div style={{ ...S.statValue, color: billsOverdue.length > 0 ? 'var(--red)' : 'var(--amber)', fontSize: 22 }}>
            {formatCurrency(billsDue.reduce((s, b) => s + b.amount, 0), profile.currency)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
            {billsOverdue.length > 0
              ? <span style={{ color: 'var(--red)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12} strokeWidth={2.4} /> {billsOverdue.length} overdue!</span>
              : `${billsDue.length} unpaid this month`}
          </div>
        </button>

        <button type="button" className="dash-action-card" style={S.actionCard} onClick={() => onNavigate?.('emergency')}>
          <div style={S.actionTop}>
            <div style={S.actionIcon}><Shield size={18} strokeWidth={2.1} /></div>
            <span className="dash-open-chip" style={S.openChip}>Open <ArrowRight size={12} /></span>
          </div>
          <div style={S.statLabel}>Emergency Fund</div>
          <div style={{ ...S.statValue, color: efColor, fontSize: 22 }}>{efProgressPct}%</div>
          <div style={S.progressBar}>
            <div style={{ ...S.progressFill, width: `${efProgressPct}%`, background: efColor }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            {formatCurrency(efCurrent, profile.currency)} of {formatCurrency(efTarget, profile.currency)}
          </div>
        </button>

        <button type="button" className="dash-action-card" style={S.actionCard} onClick={() => onNavigate?.('goals')}>
          <div style={S.actionTop}>
            <div style={S.actionIcon}><Target size={18} strokeWidth={2.1} /></div>
            <span className="dash-open-chip" style={S.openChip}>Open <ArrowRight size={12} /></span>
          </div>
          <div style={S.statLabel}>Active Goals</div>
          <div style={{ ...S.statValue, color: 'var(--gold)', fontSize: 22 }}>{goals.filter((g) => !g.completed).length}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
            {goals.filter((g) => g.completed).length} completed · {goals.length} total
          </div>
        </button>
      </div>

      {/* Goals progress preview */}
      {activeGoals.length > 0 && (
        <div style={S.previewCard}>
          <div style={{ ...S.cardTitle, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Trophy size={18} strokeWidth={2.1} style={{ color: 'var(--gold)' }} /> Goals Progress</span>
            {onNavigate && <button style={{ ...S.viewAllBtn, display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => onNavigate('goals')}>View all <ArrowRight size={12} /></button>}
          </div>
          {activeGoals.map((g) => {
            const gPct = g.targetAmount > 0 ? Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100)) : 0;
            const gColor = g.category === 'emergency' ? 'var(--red)' : g.category === 'retirement' ? 'var(--green)' : 'var(--gold)';
            return (
              <div key={g.id} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-1)' }}>{g.name}</span>
                  <span style={{ fontSize: 12, color: gColor, fontWeight: 600 }}>{gPct}%</span>
                </div>
                <div style={S.progressBar}>
                  <div style={{ ...S.progressFill, width: `${gPct}%`, background: gColor }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{formatCurrency(g.savedAmount, profile.currency)} saved</span>
                  <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{formatCurrency(g.targetAmount, profile.currency)} target</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={S.warningsCard}>
          <div style={{ ...S.cardTitle, display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={18} strokeWidth={2.1} style={{ color: 'var(--amber)' }} /> Spending Alerts</div>
          <div style={S.warningsList}>
            {warnings.map((w, i) => (
              <div key={i} style={S.warningItem}>
                <span style={{ ...S.warningBullet, display: 'inline-flex', alignItems: 'center' }}><ChevronRight size={14} strokeWidth={2.6} /></span>
                <span>{w}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Habits tracker */}
      {onToggleHabit && onAddHabit && onRemoveHabit && (
        <HabitsTracker
          habits={habits}
          completedCount={habitsCompletedCount}
          completionPct={habitsCompletionPct}
          onToggle={onToggleHabit}
          onAdd={onAddHabit}
          onRemove={onRemoveHabit}
        />
      )}
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 20 },
  setupText: { flex: 1, fontSize: 14, color: 'var(--gold-l)' },
  setupBtn: { padding: '8px 18px', background: 'var(--gold)', color: '#0A1628', borderRadius: 8, fontWeight: 700, fontSize: 13, fontFamily: 'Karla, sans-serif', whiteSpace: 'nowrap' },
  statCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', boxShadow: 'var(--shadow-md)', transition: '0.15s' },
  actionCard: { width: '100%', minHeight: 110, textAlign: 'left', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px 18px', boxShadow: 'var(--shadow-md)', transition: 'transform .15s ease, border-color .15s ease, box-shadow .15s ease', cursor: 'pointer', fontFamily: 'Karla, sans-serif', color: 'inherit' },
  actionTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  actionIcon: { width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid var(--border-acc)' },
  openChip: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 8px', borderRadius: 999, border: '1px solid var(--border)', color: 'var(--text-3)', background: 'var(--bg-surface)', fontSize: 11, fontWeight: 800, transition: 'background .15s, color .15s, border-color .15s' },
  statLabel: { fontSize: 12, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 },
  statValueRow: { display: 'flex', alignItems: 'center', gap: 8 },
  statValue: { fontFamily: 'Cormorant Garamond, serif', fontSize: 26, fontWeight: 700, color: 'var(--text-1)' },
  statSub: { fontSize: 12, color: 'var(--text-3)', marginTop: 6 },
  freeHookCard: { display: 'flex', gap: 16, alignItems: 'stretch', background: 'linear-gradient(135deg, rgba(201,168,76,0.16), rgba(10,22,40,0.96))', border: '1px solid var(--border-acc)', borderRadius: 16, padding: '18px 20px', boxShadow: 'var(--shadow-md)', flexWrap: 'wrap' },
  freeHookIcon: { width: 48, height: 48, borderRadius: 14, display: 'grid', placeItems: 'center', color: 'var(--gold)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 },
  freeHookBody: { flex: 1, minWidth: 260 },
  freeHookKicker: { fontSize: 11, color: 'var(--gold-l)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 900, marginBottom: 4 },
  freeHookTitle: { fontFamily: 'Cormorant Garamond, serif', fontSize: 23, fontWeight: 700, color: '#fff', marginBottom: 5 },
  freeHookText: { fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.55, maxWidth: 680 },
  freeHookActions: { display: 'flex', gap: 9, flexWrap: 'wrap', marginTop: 14 },
  goldBtn: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 13px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', fontSize: 13, fontWeight: 900, cursor: 'pointer' },
  lockedPreviewRail: { display: 'flex', flexDirection: 'column', gap: 8, minWidth: 150, justifyContent: 'center' },
  lockedPreview: { display: 'inline-flex', alignItems: 'center', gap: 7, color: 'rgba(255,255,255,0.78)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '7px 10px', fontSize: 12, fontWeight: 700 },
  incomeEdit: { display: 'flex', gap: 8, alignItems: 'center' },
  incomeInput: { flex: 1, minWidth: 0, background: 'var(--bg-surface)', border: '1px solid var(--border-acc)', borderRadius: 6, padding: '6px 10px', color: 'var(--text-1)', fontSize: 15, fontFamily: 'Karla, sans-serif' },
  saveBtn: { padding: '6px 12px', background: 'var(--gold)', color: '#0A1628', borderRadius: 6, fontWeight: 700, fontSize: 12, fontFamily: 'Karla, sans-serif', flexShrink: 0, border: 'none' },
  editBtn: { background: 'transparent', color: 'var(--text-3)', fontSize: 16, padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' },
  progressBar: { height: 4, background: 'var(--border)', borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, transition: 'width 0.6s ease' },
  scorePanel: { borderRadius: 14, padding: '22px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  scoreHeader: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  scorePanelLabel: { fontSize: 12, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  levelBadge: { fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, letterSpacing: '0.08em' },
  scoreMessage: { fontSize: 13, color: 'var(--text-2)', textAlign: 'center', lineHeight: 1.5 },
  categoriesCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 24px' },
  cardTitle: { fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 600, color: 'var(--text-1)', marginBottom: 16 },
  emptyState: { color: 'var(--text-3)', fontSize: 14, paddingTop: 8 },
  categoryList: { display: 'flex', flexDirection: 'column', gap: 14 },
  categoryItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  catLeft: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 },
  catIcon: { fontSize: 22, flexShrink: 0 },
  catName: { fontSize: 14, color: 'var(--text-1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  catType: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' },
  catRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  catAmount: { fontFamily: 'Cormorant Garamond, serif', fontSize: 16, fontWeight: 600 },
  catBar: { width: 70, height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 2, transition: 'width 0.6s ease' },
  previewCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 24px' },
  viewAllBtn: { fontSize: 12, color: 'var(--gold)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Karla, sans-serif' },
  warningsCard: { background: 'var(--amber-dim)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 14, padding: '20px 24px' },
  warningsList: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 },
  warningItem: { display: 'flex', gap: 10, fontSize: 14, color: 'var(--gold-l)', lineHeight: 1.5 },
  warningBullet: { color: 'var(--amber)', fontWeight: 700, flexShrink: 0 },
};
