import React from 'react';
import { BarChart3, Bell, Bot, Check, Crown, Sparkles, TrendingUp } from 'lucide-react';
import type { SubscriptionTier } from '../types';

// Everything except the Gold tools is free for everyone right now.
// Gold is a preview of what is launching soon — not yet purchasable.
const CORE_FREE = [
  'Expense tracking & categorisation',
  'Bills & recurring payments',
  'Savings goals with deadlines',
  'Emergency fund tracker',
  'Net Worth calculator',
  'Dashboard & monthly summary',
];

const GOLD_FEATURES = [
  'Investment portfolio tracking',
  'Spending insights & analytics',
  'AI Chat financial advisor',
  'Alerts & SOS emergency system',
  'Priority support',
  'CSV data exports',
];

const COMING_SOON = [
  { icon: TrendingUp, label: 'Investments' },
  { icon: BarChart3, label: 'Insights' },
  { icon: Bot, label: 'AI Chat' },
  { icon: Bell, label: 'Alerts' },
];

const GOLD = '#D97706';

interface UpgradePageProps {
  currentTier: SubscriptionTier;
  onSelectPlan: (tier: SubscriptionTier) => void;
}

export const UpgradePage: React.FC<UpgradePageProps> = () => {
  return (
    <div style={S.page} className="animate-in">
      <style>{`
        .up-hero { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:20px; align-items:center; width:100%; max-width:980px; }
        .up-coming { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; width:100%; max-width:760px; }
        @media(max-width:760px){
          .up-hero { grid-template-columns:1fr; text-align:left; }
        }
        @media(max-width:410px){ .up-coming { grid-template-columns:repeat(2,1fr); } }
      `}</style>

      <section className="up-hero" style={S.hero}>
        <div>
          <div style={S.badge}><Sparkles size={13} /> Everything unlocked — free</div>
          <h1 style={S.title}>You have every core tool, completely free</h1>
          <p style={S.sub}>
            Expense tracking, bills, goals, emergency fund and net worth are all free while we grow.
            <strong style={{ color: 'var(--text-1)' }}> Gold</strong> — advanced insights, AI coaching, investment tracking and alerts — is launching soon.
          </p>
        </div>
        <div style={S.summaryCard}>
          <div style={S.summaryLabel}>Gold access</div>
          <div style={S.summaryValue}>Soon</div>
          <div style={S.summaryText}>premium intelligence</div>
        </div>
      </section>

      <section style={S.freeCard}>
        <div style={S.freeCardTitle}>Free for everyone, right now</div>
        <div style={S.freeGrid}>
          {CORE_FREE.map(feature => (
            <div key={feature} style={S.freeItem}>
              <Check size={14} strokeWidth={2.6} style={{ color: '#16A34A', flexShrink: 0 }} />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="up-coming" aria-label="Gold features coming soon">
        {COMING_SOON.map(feature => {
          const Icon = feature.icon;
          return (
            <div key={feature.label} style={S.comingItem}>
              <Icon size={21} strokeWidth={2.1} style={{ color: GOLD }} />
              <span style={S.comingLabel}>{feature.label}</span>
              <span style={S.comingBadge}>Soon</span>
            </div>
          );
        })}
      </section>

      <article style={S.planCard}>
        <div style={S.popularBadge}>Coming soon</div>
        <div style={{ ...S.planIcon, color: GOLD, background: `${GOLD}16`, borderColor: `${GOLD}35` }}>
          <Crown size={26} strokeWidth={2.1} />
        </div>
        <div style={{ ...S.planName, color: GOLD }}>Gold</div>
        <div style={S.planTagline}>Complete premium access and intelligence</div>
        <div style={S.planPrice}>
          <span style={S.launchPill}>Premium</span>
          <span style={S.planAmt}>Launching soon</span>
        </div>
        <div style={S.featureList}>
          {GOLD_FEATURES.map(feature => (
            <div key={feature} style={S.featureItem}>
              <Check size={14} strokeWidth={2.6} style={{ color: GOLD, flexShrink: 0 }} />
              <span>{feature}</span>
            </div>
          ))}
        </div>
        <button className="up-plan-btn" disabled style={{ ...S.planBtn, opacity: 0.7, cursor: 'default' }}>
          Coming soon
        </button>
      </article>

      <div style={S.note}><Sparkles size={13} /> No payment needed today — the whole app is free while we build Gold.</div>
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26, padding: '6px 0 44px' },
  hero: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 26px', boxShadow: 'var(--shadow-card)' },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 800, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid var(--border-acc)', borderRadius: 999, padding: '6px 12px', textTransform: 'uppercase', letterSpacing: 0 },
  title: { fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(25px, 5vw, 42px)', fontWeight: 700, color: 'var(--text-1)', margin: '12px 0 8px', lineHeight: 1.12 },
  sub: { fontSize: 14, color: 'var(--text-2)', lineHeight: 1.65, maxWidth: 620 },
  summaryCard: { minWidth: 170, background: 'var(--bg-surface)', border: '1px solid var(--border-acc)', borderRadius: 14, padding: 18, textAlign: 'center' },
  summaryLabel: { fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 800 },
  summaryValue: { fontFamily: 'Cormorant Garamond, serif', fontSize: 44, fontWeight: 700, color: 'var(--gold)', lineHeight: 1 },
  summaryText: { fontSize: 12, color: 'var(--text-2)' },
  freeCard: { width: '100%', maxWidth: 760, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 22px', boxShadow: 'var(--shadow-card)' },
  freeCardTitle: { fontSize: 13, fontWeight: 800, color: 'var(--text-1)', marginBottom: 14 },
  freeGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '10px 18px' },
  freeItem: { display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.35 },
  comingItem: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative', minHeight: 78, boxShadow: 'var(--shadow)' },
  comingLabel: { fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textAlign: 'center' },
  comingBadge: { position: 'absolute', top: 7, right: 7, fontSize: 9, fontWeight: 800, color: '#fff', background: 'var(--gold)', borderRadius: 999, padding: '2px 6px', textTransform: 'uppercase' },
  planCard: { width: '100%', maxWidth: 380, background: 'var(--bg-card)', borderRadius: 18, padding: '25px 22px 22px', display: 'flex', flexDirection: 'column', alignItems: 'stretch', textAlign: 'left', position: 'relative', border: `2px solid ${GOLD}`, boxShadow: `0 16px 44px ${GOLD}22` },
  popularBadge: { position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', fontSize: 10, fontWeight: 900, color: '#fff', background: 'var(--btn-gradient)', padding: '5px 13px', borderRadius: 999, textTransform: 'uppercase', whiteSpace: 'nowrap' },
  planIcon: { width: 52, height: 52, borderRadius: 14, border: '1px solid', display: 'grid', placeItems: 'center', marginBottom: 14 },
  planName: { fontFamily: 'Cormorant Garamond, serif', fontSize: 27, fontWeight: 700 },
  planTagline: { fontSize: 12, color: 'var(--text-3)', marginTop: 2 },
  planPrice: { margin: '15px 0 18px', display: 'flex', flexDirection: 'column', gap: 6 },
  launchPill: { alignSelf: 'flex-start', fontSize: 10, fontWeight: 800, color: GOLD, background: `${GOLD}18`, borderRadius: 999, padding: '3px 9px', textTransform: 'uppercase' },
  planAmt: { fontFamily: 'Cormorant Garamond, serif', fontSize: 26, fontWeight: 700, color: 'var(--text-1)' },
  featureList: { display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 22, flex: 1 },
  featureItem: { display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: 'var(--text-2)', padding: '8px 0', borderBottom: '1px solid var(--border)', lineHeight: 1.35 },
  planBtn: { width: '100%', padding: 13, background: 'var(--btn-gradient)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, fontFamily: 'DM Sans, sans-serif' },
  note: { display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '0 16px' },
};
