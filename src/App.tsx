import React, { useState } from 'react';
import { BarChart3, Bell, Bot, Crown, Download, Landmark, Lock, ReceiptText, Shield, Sparkles, TrendingUp } from 'lucide-react';
import './styles/globals.css';
import type { AppView, SubscriptionTier } from './types';
import { useExpenses }      from './hooks/useExpenses';
import { useInvestments }   from './hooks/useInvestments';
import { useGoals }         from './hooks/useGoals';
import { useBills }         from './hooks/useBills';
import { useNetWorth }      from './hooks/useNetWorth';
import { useAuth }          from './hooks/useAuth';
import { useHabits }        from './hooks/useHabits';
import { useEmergencyFund } from './hooks/useEmergencyFund';
import { useAlerts }        from './hooks/useAlerts';

import { Header, ThemeProvider } from './components/Header';
import { Dashboard }        from './components/Dashboard';
import { ExpenseForm, ExpenseList } from './components/ExpenseManager';
import { Insights }         from './components/Insights';
import { Advisor }          from './components/Advisor';
import {
  InvestmentForm, InvestmentList,
  InvestmentSummaryBar, PortfolioAllocation,
} from './components/InvestmentManager';
import { AuthGate }         from './components/AuthGate';
import { Goals }            from './components/Goals';
import { Bills }            from './components/Bills';
import { NetWorth }         from './components/NetWorth';
import { AIChat }           from './components/AIChat';
import { EmergencyFund }    from './components/EmergencyFund';
import { AlertsPanel }      from './components/AlertsPanel';
import { LandingPage }      from './components/LandingPage';
import { PLAN_LOCKED_VIEWS } from './lib/planAccess';
import { PaymentGate }      from './components/PaymentGate';
import { UpgradePage }      from './components/UpgradePage';
import { ProfilePage }      from './components/ProfilePage';
import { AdminPanel }       from './components/admin/AdminPanel';
import { SupportChatWidget } from './components/SupportChatWidget';
import { PrivacyPolicy }     from './components/PrivacyPolicy';
import { GuestBanner }       from './components/GuestBanner';
import { clearDemoData }     from './lib/demoData';

import {
  exportExpensesToCSV,
  exportInvestmentsToCSV,
  exportNetWorthToCSV,
} from './hooks/exportUtils';

const INTRO_PRICE_END_MS = Date.parse('2026-06-30T20:59:59.999+03:00');
const currentTierPrice = (tier: SubscriptionTier): number => {
  const introPrices: Record<SubscriptionTier, number> = { free: 0, silver: 10, gold: 20, platinum: 999 };
  const standardPrices: Record<SubscriptionTier, number> = { free: 0, silver: 299, gold: 599, platinum: 999 };
  return Date.now() <= INTRO_PRICE_END_MS ? introPrices[tier] : standardPrices[tier];
};

const TIER_META: Record<SubscriptionTier, { name: string; price: number; color: string }> = {
  free:     { name: 'Free',     price: currentTierPrice('free'),     color: '#9BAAC4' },
  silver:   { name: 'Silver',   price: currentTierPrice('silver'),   color: '#C0C0C0' },
  gold:     { name: 'Gold',     price: currentTierPrice('gold'),     color: '#C9A84C' },
  platinum: { name: 'Platinum', price: currentTierPrice('platinum'), color: '#A78BFA' },
};

type AppStage = 'landing' | 'about' | 'payment' | 'auth' | 'app';

// Static "coming soon" copy for the premium upgrade wall. Module-scoped (never changes).
const wallCopy: Partial<Record<AppView, { icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; tier: SubscriptionTier; title: string; body: string; bullets: string[] }>> = {
  bills: { icon: ReceiptText, tier: 'silver', title: 'Turn expenses into a monthly bill plan', body: 'Silver unlocks recurring bills, due dates, and payment status so users stop guessing what is coming next.', bullets: ['Recurring bills', 'Due date tracking', 'Paid and overdue status'] },
  networth: { icon: Landmark, tier: 'silver', title: 'Show the full financial position', body: 'Silver adds net worth so assets and debts sit beside daily spending.', bullets: ['Assets and liabilities', 'Net worth summary', 'Progress over time'] },
  emergency: { icon: Shield, tier: 'silver', title: 'Build an emergency fund with structure', body: 'Silver gives users a target, current balance, and months-covered view.', bullets: ['Emergency target', 'Deposit tracking', 'Months covered'] },
  investments: { icon: TrendingUp, tier: 'gold', title: 'Investment tracking is coming soon', body: 'Our upcoming Gold plan will track SACCOs, MMFs, stocks, bonds, crypto, and long-term projections in one portfolio view.', bullets: ['Portfolio tracker', 'Allocation view', 'Growth projections'] },
  insights: { icon: BarChart3, tier: 'gold', title: 'Deeper spending insights are coming soon', body: 'Gold will turn your logged expenses into deeper comparisons, lifestyle warnings, and savings opportunities.', bullets: ['Ideal vs actual allocation', 'Lifestyle overspend warnings', 'Savings opportunity estimates'] },
  chat: { icon: Bot, tier: 'gold', title: 'The AI money advisor is coming soon', body: 'Gold will bring an AI advisor with context from your spending, goals, bills, investments, and net worth.', bullets: ['Personal AI guidance', 'Context-aware answers', 'Action plans'] },
  alerts: { icon: Bell, tier: 'gold', title: 'Alerts & SOS support are coming soon', body: 'Gold will add emergency alerts and AI-supported action planning when the numbers need attention.', bullets: ['SOS contacts', 'Emergency summaries', 'AI action plans'] },
};

// Module-scoped (not defined inside the component) so its identity is stable across
// renders — a component defined during render remounts its subtree every time.
const UpgradeWall: React.FC<{ view: AppView; userTier: SubscriptionTier }> = ({ view, userTier }) => {
  const copy = wallCopy[view] ?? { icon: Lock, tier: 'silver' as SubscriptionTier, title: `${view.charAt(0).toUpperCase() + view.slice(1)} is a premium feature`, body: 'Upgrade your plan to unlock this and more tools.', bullets: ['More planning tools', 'Better money visibility', 'Premium support'] };
  const Icon = copy.icon;
  return (
    <div style={upgradeWallStyle} className="animate-in">
      <div style={wallIconStyle}><Icon size={28} strokeWidth={2.1} /></div>
      <div style={wallBadgeStyle}><Sparkles size={13} /> Coming soon</div>
      <div style={wallTitleStyle}>{copy.title}</div>
      <div style={wallBodyStyle}>{copy.body}</div>
      <div style={wallBulletGridStyle}>
        {copy.bullets.map((bullet) => <div key={bullet} style={wallBulletStyle}><Lock size={13} /> {bullet}</div>)}
      </div>
      <div style={wallActionRowStyle}>
        <button style={{ ...wallGoldBtnStyle, opacity: 0.7, cursor: 'default' }} disabled>
          <Crown size={16} /> Premium — Coming soon
        </button>
      </div>
      <div style={wallCurrentStyle}>Everything else is <strong style={{ color: TIER_META[userTier].color }}>free</strong> — enjoy the app while we finish this.</div>
    </div>
  );
};

const MainApp: React.FC = () => {
  const [activeView, setActiveView] = useState<AppView>('advisor');
  const [stage, setStage] = useState<AppStage>('landing');
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('free');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [showPolicy, setShowPolicy] = useState(false);
  // Captured once at mount so render stays pure (no Date.now() during render). The
  // subscription notice below only needs day-level accuracy, refreshed on next app load.
  const [nowMs] = useState(() => Date.now());

  const auth = useAuth();

  const goals   = useGoals();
  const bills   = useBills();
  const netWorth = useNetWorth();
  const habits  = useHabits();

  const {
    expenses, monthlyExpenses, profile, breakdown, insight, warnings, history, goalsThisMonth,
    selectedMonth, setSelectedMonth, addExpense, removeExpense, updateExpense, updateProfile,
  } = useExpenses(bills.monthlyTotal, goals.goals);

  const {
    investments, summary: investmentSummary,
    addInvestment, removeInvestment, updateStatus,
  } = useInvestments();

  const emergencyFund = useEmergencyFund(breakdown.totalExpenses || profile.monthlyIncome * 0.6);
  const alerts = useAlerts();

  const isGuest = auth.status === 'signed-out';
  const hasRealData =
    monthlyExpenses.some(e => !e.isDemo) ||
    goals.goals.some(g => !g.isDemo) ||
    bills.bills.some(b => !b.isDemo);

  const goToAuth = (mode: 'login' | 'signup') => { setAuthMode(mode); setStage('auth'); };
  const handleClearDemo = () => { clearDemoData(); window.location.reload(); };

  const handleUpdateIncome = (
    income: number,
    streams?: import('./types').IncomeStream[],
    meta?: Partial<Pick<import('./types').FinancialProfile, 'incomeMode' | 'dailyAmount' | 'daysPerWeek'>>,
  ) => updateProfile(income, profile.currency, streams, meta);

  const openPaidPlan = (tier: SubscriptionTier) => {
    if (isGuest) { goToAuth('signup'); return; } // guests must sign up before paying
    setSelectedTier(tier);
    setStage('payment');
  };

  // ── Stage: Loading ──────────────────────────────────────
  // While Firebase restores the persisted session, show a neutral splash instead of
  // flashing the landing/login screen at an already-signed-in user.
  if (auth.status === 'loading') {
    return (
      <ThemeProvider>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
          <style>{`@keyframes appSplashSpin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ width: 30, height: 30, borderRadius: '50%', border: '3px solid rgba(255,127,0,0.25)', borderTopColor: 'var(--gold)', animation: 'appSplashSpin 0.8s linear infinite' }} />
        </div>
      </ThemeProvider>
    );
  }

  // ── Stage: Landing ──────────────────────────────────────
  // Only genuinely signed-out visitors see the marketing page. A signed-in user who
  // still needs to finish onboarding (e.g. 'needs-phone' after Google sign-in) must
  // NOT be sent here — on mobile, signInWithRedirect reloads the page and resets
  // `stage` back to 'landing', which previously bounced them to the landing page
  // instead of the add-phone step / dashboard.
  // About page (the former landing page) — reachable from the guest banner.
  if (stage === 'about') {
    return (
      <ThemeProvider>
        <LandingPage
          onSelectTier={(tier) => { if (tier !== 'free') return; setSelectedTier('free'); goToAuth('signup'); }}
          onLogin={() => goToAuth('login')}
          onExplore={() => setStage('app')}
        />
      </ThemeProvider>
    );
  }

  // ── Stage: Auth / Verify / Add-phone ────────────────────
  // 'loading' already returned above, so status here is signed-out | unverified | needs-phone.
  if (auth.status !== 'ready' && stage === 'auth') {
    return (
      <ThemeProvider>
        <AuthGate
          status={auth.status}
          onSignUp={auth.signUpWithEmail}
          onSignIn={auth.signInWithEmail}
          onGoogle={auth.signInWithGoogle}
          onSavePhone={auth.savePhone}
          onResendVerification={auth.resendVerification}
          onRefreshVerification={auth.refreshVerification}
          onSendPinReset={auth.sendPinReset}
          loading={auth.loading}
          error={auth.error}
          defaultMode={authMode}
        />
      </ThemeProvider>
    );
  }

  // ── Stage: App ──────────────────────────────────────────
  const userTier: SubscriptionTier = auth.profile?.tier ?? 'free';
  const subscriptionNotice = (() => {
    const profile = auth.profile;
    if (!profile) return null;
    if (profile.subscriptionStatus === 'expired') {
      return 'Your subscription expired. Renew to unlock premium features again.';
    }
    if (profile.tier !== 'free') {
      const expiry = profile.subscriptionExpiresAt ? Date.parse(profile.subscriptionExpiresAt) : 0;
      const start = profile.subscriptionStart ? Date.parse(profile.subscriptionStart) : 0;
      const daysLeft = expiry
        ? Math.ceil((expiry - nowMs) / (24 * 60 * 60 * 1000))
        : start
          ? 30 - Math.floor((nowMs - start) / (24 * 60 * 60 * 1000))
          : null;
      if (daysLeft !== null) {
        if (daysLeft <= 0) return 'Your subscription has ended. Renew to continue premium access.';
        if (daysLeft <= 5) return `Your ${profile.tier} plan ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Renew soon.`;
      }
    }
    return null;
  })();
  const lockedViews = PLAN_LOCKED_VIEWS[userTier] ?? [];
  const isLocked = (view: AppView) => userTier === 'free' && view === 'goals' ? false : lockedViews.includes(view);

  return (
    <ThemeProvider>
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {isGuest && (
        <GuestBanner
          hasRealData={hasRealData}
          onSignUp={() => goToAuth('signup')}
          onLogin={() => goToAuth('login')}
          onAbout={() => setStage('about')}
          onClearDemo={handleClearDemo}
        />
      )}

      {/* Payment overlay when upgrading from within the app */}
      {stage === 'payment' && auth.status === 'ready' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500 }}>
          <PaymentGate
            key={selectedTier + '-' + (auth.profile?.phone ?? '')}
            tierName={TIER_META[selectedTier].name}
            tierPrice={TIER_META[selectedTier].price}
            tierColor={TIER_META[selectedTier].color}
            userId={auth.profile?.uid ?? ''}
            userPhone={auth.profile?.phone ?? ''}
            tier={selectedTier}
            onPaymentComplete={async () => {
              const refreshed = await auth.refreshProfile();
              if (refreshed?.tier !== selectedTier) return;
              setStage('app');
              setActiveView('dashboard');
            }}
            onBack={() => setStage('app')}
          />
        </div>
      )}
      <Header
        activeView={activeView}
        onNavigate={setActiveView}
        score={insight.score}
        scoreLevel={insight.level}
        userName={auth.profile?.name}
        onLock={auth.logout}
        onLogout={auth.deleteAccount}
        onExportExpenses={() => exportExpensesToCSV(monthlyExpenses)}
        onExportInvestments={() => exportInvestmentsToCSV(investments)}
        onExportNetWorth={() => exportNetWorthToCSV(netWorth.items)}
        userTier={userTier}
        subscriptionNotice={subscriptionNotice}
        onOpenUpgrade={() => setActiveView('upgrade')}
      />

      <main className="main-content">
        <div style={{  margin: '0 auto' }}>

          {/* ── Advisor ─────────────────────────────────────────── */}
          {activeView === 'advisor' && (
            <Advisor
              profile={profile}
              onUpdateIncome={handleUpdateIncome}
              billsTotal={bills.monthlyTotal}
              goalsTotal={goals.totalSaved}
              breakdown={breakdown}
            />
          )}

          {/* ── Dashboard ───────────────────────────────────────── */}
          {activeView === 'dashboard' && (
            <Dashboard
              breakdown={breakdown}
              insight={insight}
              profile={profile}
              warnings={warnings}
              onUpdateIncome={handleUpdateIncome}
              bills={bills.bills}
              billsMonthlyTotal={bills.monthlyTotal}
              goals={goals.goals}
              netWorthSummary={netWorth.summary}
              habits={habits.habits}
              habitsCompletedCount={habits.completedCount}
              habitsCompletionPct={habits.completionPct}
              efCurrent={emergencyFund.data.currentAmount}
              efTarget={emergencyFund.targetAmount}
              efProgressPct={emergencyFund.progressPct}
              onToggleHabit={habits.toggleHabit}
              onAddHabit={habits.addHabit}
              onRemoveHabit={habits.removeHabit}
              onNavigate={setActiveView}
              userTier={userTier}
              expenseCount={monthlyExpenses.length}
              onUpgrade={() => setActiveView('upgrade')}
              expenses={expenses}
              history={history}
              selectedMonth={selectedMonth}
              onSelectMonth={setSelectedMonth}
              goalsThisMonth={goalsThisMonth}
            />
          )}

          {/* ── Expenses ────────────────────────────────────────── */}
          {activeView === 'expenses' && (
            <div className="animate-in">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button style={exportBtnStyle} onClick={() => exportExpensesToCSV(monthlyExpenses)}>
                  <Download size={14} strokeWidth={2.2} /> Export CSV
                </button>
              </div>
              <ExpenseForm onAdd={addExpense} />
              <ExpenseList expenses={monthlyExpenses} onRemove={removeExpense} onUpdate={updateExpense} currency={profile.currency} />
            </div>
          )}

          {/* ── Investments ─────────────────────────────────────── */}
          {activeView === 'investments' && (isLocked('investments') ? <UpgradeWall view="investments" userTier={userTier} /> :
            <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button style={exportBtnStyle} onClick={() => exportInvestmentsToCSV(investments)}>
                  <Download size={14} strokeWidth={2.2} /> Export CSV
                </button>
              </div>
              <InvestmentSummaryBar summary={investmentSummary} monthlyIncome={profile.monthlyIncome} />
              {investmentSummary.activeCount > 0 && <PortfolioAllocation summary={investmentSummary} />}
              <InvestmentForm onAdd={addInvestment} />
              <InvestmentList
                investments={investments}
                onRemove={removeInvestment}
                onUpdateStatus={updateStatus}
                currency={profile.currency}
              />
            </div>
          )}

          {/* ── Goals ───────────────────────────────────────────── */}
          {activeView === 'goals' && (isLocked('goals') ? <UpgradeWall view="goals" userTier={userTier} /> :
            <Goals
              goals={goals.goals}
              activeGoals={goals.activeGoals}
              completedGoals={goals.completedGoals}
              totalTargeted={goals.totalTargeted}
              totalSaved={goals.totalSaved}
              onAdd={goals.addGoal}
              onRemove={goals.removeGoal}
              onContribute={goals.contribute}
              onUpdateSaved={goals.updateSaved}
              currency={profile.currency}
              maxGoals={undefined}
              onUpgrade={() => setActiveView('upgrade')}
            />
          )}

          {/* ── Bills ───────────────────────────────────────────── */}
          {activeView === 'bills' && (isLocked('bills') ? <UpgradeWall view="bills" userTier={userTier} /> :
            <Bills
              bills={bills.bills}
              sortedBills={bills.sortedBills}
              monthlyTotal={bills.monthlyTotal}
              upcomingThisWeek={bills.upcomingThisWeek}
              overdueCount={bills.overdueCount}
              paidCount={bills.paidCount}
              onAdd={bills.addBill}
              onRemove={bills.removeBill}
              onMarkPaid={bills.markPaid}
              onMarkUnpaid={bills.markUnpaid}
              currency={profile.currency}
            />
          )}

          {/* ── Net Worth ───────────────────────────────────────── */}
          {activeView === 'networth' && (isLocked('networth') ? <UpgradeWall view="networth" userTier={userTier} /> :
            <div className="animate-in">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button style={exportBtnStyle} onClick={() => exportNetWorthToCSV(netWorth.items)}>
                  <Download size={14} strokeWidth={2.2} /> Export CSV
                </button>
              </div>
              <NetWorth
                items={netWorth.items}
                summary={netWorth.summary}
                onAdd={netWorth.addItem}
                onRemove={netWorth.removeItem}
                onUpdateAmount={netWorth.updateAmount}
                currency={profile.currency}
              />
            </div>
          )}

          {/* ── Emergency Fund ──────────────────────────────────── */}
          {activeView === 'emergency' && (isLocked('emergency') ? <UpgradeWall view="emergency" userTier={userTier} /> :
            <EmergencyFund
              data={emergencyFund.data}
              targetAmount={emergencyFund.targetAmount}
              progressPct={emergencyFund.progressPct}
              monthsCovered={emergencyFund.monthsCovered}
              monthlyExpenses={breakdown.totalExpenses || profile.monthlyIncome * 0.6}
              monthlyIncome={profile.monthlyIncome}
              currency={profile.currency}
              onDeposit={emergencyFund.deposit}
              onWithdraw={emergencyFund.withdraw}
              onSetTargetMonths={emergencyFund.setTargetMonths}
              onSetCurrentAmount={emergencyFund.setCurrentAmount}
            />
          )}

          {/* ── Insights ────────────────────────────────────────── */}
          {activeView === 'insights' && (isLocked('insights') ? <UpgradeWall view="insights" userTier={userTier} /> :
            <Insights breakdown={breakdown} profile={profile} />
          )}

          {/* ── AI Chat ─────────────────────────────────────────── */}
          {activeView === 'chat' && (isLocked('chat') ? <UpgradeWall view="chat" userTier={userTier} /> :
            <AIChat
              userId={auth.profile?.uid ?? ''}
              profile={profile}
              breakdown={breakdown}
              investmentSummary={investmentSummary}
              userName={auth.profile?.name}
              bills={bills.bills}
              billsMonthlyTotal={bills.monthlyTotal}
              goals={goals.goals}
              netWorthSummary={netWorth.summary}
              habits={habits.habits}
              efCurrent={emergencyFund.data.currentAmount}
              efTarget={emergencyFund.targetAmount}
              onNavigateToAlerts={() => setActiveView('alerts')}
            />
          )}

          {/* ── Alerts & SOS ────────────────────────────────────── */}
          {activeView === 'alerts' && (isLocked('alerts') ? <UpgradeWall view="alerts" userTier={userTier} /> :
            <AlertsPanel
              userId={auth.profile?.uid ?? ''}
              userTier={userTier}
              contact={alerts.contact}
              log={alerts.log}
              hasContact={alerts.hasContact}
              profile={profile}
              breakdown={breakdown}
              investmentSummary={investmentSummary}
              bills={bills.bills}
              billsMonthlyTotal={bills.monthlyTotal}
              goals={goals.goals}
              netWorthSummary={netWorth.summary}
              efCurrent={emergencyFund.data.currentAmount}
              efTarget={emergencyFund.targetAmount}
              userName={auth.profile?.name}
              onSaveContact={alerts.saveContact}
              onRecordAlert={alerts.recordAlert}
              onClearLog={alerts.clearLog}
              onNavigateToAdvisor={() => setActiveView('chat')}
            />
          )}

          {/* ── Upgrade ─────────────────────────────────────────── */}
          {activeView === 'upgrade' && (
            <UpgradePage
              currentTier={userTier}
              onSelectPlan={openPaidPlan}
            />
          )}

          {/* ── Profile ─────────────────────────────────────────── */}
          {activeView === 'profile' && auth.profile && (
            <ProfilePage
              profile={auth.profile}
              uid={auth.profile.uid}
              onNavigate={setActiveView}
            />
          )}

        </div>
      </main>

      {auth.profile && <SupportChatWidget profile={auth.profile} />}

      <footer className="app-footer">
        <span>PesaFlow © {new Date().getFullYear()}</span>
        <span className="footer-dot">·</span>
        <span>Smart money management for every Kenyan</span>
        <span className="footer-dot">·</span>
        <button
          onClick={() => setShowPolicy(true)}
          style={{ background: 'transparent', border: 'none', color: 'inherit', font: 'inherit', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
        >
          Privacy Policy
        </button>
      </footer>

      {showPolicy && <PrivacyPolicy onClose={() => setShowPolicy(false)} />}
    </div>
    </ThemeProvider>
  );
};

// Thin router with NO hooks of its own. The hidden admin panel renders here without
// mounting MainApp's data hooks (useExpenses, useAuth, …). Because this wrapper has no
// hooks, MainApp is free to call all of its hooks unconditionally at the top — the
// admin check used to sit before those hooks, making every one of them conditional and
// violating the rules of hooks.
const App: React.FC = () => {
  if (window.location.search.includes('__admin') || window.location.pathname === '/admin') {
    return <ThemeProvider><AdminPanel /></ThemeProvider>;
  }
  return <MainApp />;
};

const exportBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: 'rgba(201,168,76,0.1)',
  border: '1px solid rgba(201,168,76,0.25)',
  borderRadius: 8,
  color: '#C9A84C',
  fontSize: 13,
  fontFamily: 'Karla, sans-serif',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};


const upgradeWallStyle: React.CSSProperties = {
  minHeight: 360,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 14,
  padding: 32,
  background: 'linear-gradient(135deg, var(--bg-card), var(--bg-surface))',
  border: '1px solid var(--border-acc)',
  borderRadius: 18,
  boxShadow: 'var(--shadow-md)',
  textAlign: 'center',
};

const wallIconStyle: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 18,
  display: 'grid',
  placeItems: 'center',
  color: 'var(--gold)',
  background: 'var(--gold-dim)',
  border: '1px solid var(--border-acc)',
};

const wallBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  color: 'var(--gold)',
  background: 'var(--gold-dim)',
  border: '1px solid var(--border-acc)',
  borderRadius: 999,
  padding: '6px 11px',
  fontSize: 11,
  fontWeight: 900,
  textTransform: 'uppercase',
};

const wallTitleStyle: React.CSSProperties = {
  fontFamily: 'Cormorant Garamond, serif',
  fontSize: 28,
  color: 'var(--text-1)',
  fontWeight: 700,
  maxWidth: 620,
};

const wallBodyStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--text-2)',
  lineHeight: 1.65,
  maxWidth: 560,
};

const wallBulletGridStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: 9,
  flexWrap: 'wrap',
  maxWidth: 620,
};

const wallBulletStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  padding: '8px 11px',
  borderRadius: 999,
  color: 'var(--text-2)',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  fontSize: 12,
  fontWeight: 700,
};

const wallActionRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: 10,
  flexWrap: 'wrap',
  marginTop: 4,
};

const wallGoldBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 16px',
  background: 'linear-gradient(135deg, var(--gold), var(--gold-l))',
  color: '#0A1628',
  border: 'none',
  borderRadius: 10,
  fontWeight: 900,
  fontSize: 13,
  cursor: 'pointer',
};

const wallCurrentStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-3)',
};

export default App;
