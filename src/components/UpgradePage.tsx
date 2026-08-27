import React, { useState } from 'react';
import { BarChart3, Bell, Bot, Check, Crown, Download, Sparkles, Target, TrendingUp } from 'lucide-react';
import type { BillingCycle, SubscriptionTier } from '../types';
import { PRO_PRICES, CYCLE_DAYS, cyclePerDay, isPro } from '../lib/pricing';

const CORE_FREE = [
  'Expense tracking & categorisation',
  'Bills & recurring payments',
  'Savings goals (up to 3)',
  'Emergency fund basics',
  'Net Worth calculator',
  'Dashboard, Advisor & the Learning Hub',
];

const PRO_FEATURES: { icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>; label: string }[] = [
  { icon: Bot, label: 'AI financial advisor (chat)' },
  { icon: BarChart3, label: 'Spending insights & analytics' },
  { icon: TrendingUp, label: 'Investment portfolio tracker' },
  { icon: Bell, label: 'Alerts & SOS system' },
  { icon: Download, label: 'CSV data exports' },
  { icon: Target, label: 'Unlimited goals & bills' },
];

const GOLD = '#D97706';
const CYCLES: BillingCycle[] = ['daily', 'weekly', 'monthly'];

interface UpgradePageProps {
  currentTier: SubscriptionTier;
  onSelectPlan: (tier: SubscriptionTier, cycle: BillingCycle) => void;
}

export const UpgradePage: React.FC<UpgradePageProps> = ({ currentTier, onSelectPlan }) => {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const alreadyPro = isPro(currentTier);
  const dailyRate = PRO_PRICES.daily;

  return (
    <div style={S.page} className="animate-in">
      <style>{`
        .up-cycles { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; width:100%; max-width:640px; }
        .up-features { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; width:100%; }
        @media(max-width:560px){ .up-cycles{ grid-template-columns:1fr; } .up-features{ grid-template-columns:1fr; } }
      `}</style>

      <section style={S.hero}>
        <div style={S.badge}><Crown size={13} /> PesaFlow Pro</div>
        <h1 style={S.title}>Unlock the smart money tools</h1>
        <p style={S.sub}>
          Core tracking stays free forever. <strong style={{ color: 'var(--text-1)' }}>Pro</strong> adds AI coaching,
          insights, investment tracking, alerts, exports and unlimited goals — pay daily, weekly or monthly.
        </p>
      </section>

      {alreadyPro ? (
        <div style={S.activeCard}>
          <Check size={18} strokeWidth={2.6} style={{ color: '#16A34A' }} />
          <span>You're on <strong>Pro</strong> — every tool is unlocked. Thank you!</span>
        </div>
      ) : (
        <>
          {/* Cycle picker */}
          <div className="up-cycles">
            {CYCLES.map(c => {
              const active = cycle === c;
              const perDay = cyclePerDay(c);
              const save = Math.round((1 - perDay / dailyRate) * 100);
              return (
                <button
                  key={c}
                  onClick={() => setCycle(c)}
                  style={{ ...S.cycleCard, ...(active ? S.cycleCardActive : {}) }}
                >
                  {c === 'monthly' && <span style={S.bestBadge}>BEST VALUE</span>}
                  <div style={S.cycleName}>{c[0].toUpperCase() + c.slice(1)}</div>
                  <div style={{ ...S.cyclePrice, color: active ? GOLD : 'var(--text-1)' }}>
                    KES {PRO_PRICES[c]}
                  </div>
                  <div style={S.cycleUnit}>per {c === 'daily' ? 'day' : c === 'weekly' ? 'week' : 'month'}</div>
                  {c !== 'daily' && save > 0 && <div style={S.cycleSave}>Save {save}% vs daily</div>}
                  {c !== 'daily' && <div style={S.cyclePerDay}>≈ KES {perDay.toFixed(0)}/day · {CYCLE_DAYS[c]} days</div>}
                </button>
              );
            })}
          </div>

          <button style={S.cta} onClick={() => onSelectPlan('pro', cycle)}>
            Go Pro — KES {PRO_PRICES[cycle]} {cycle === 'daily' ? '/day' : cycle === 'weekly' ? '/week' : '/month'} →
          </button>
          <div style={S.mpesaNote}>Pay securely with M-Pesa · cancel anytime</div>
        </>
      )}

      {/* What Pro unlocks */}
      <section style={S.proCard}>
        <div style={S.cardTitle}><Sparkles size={15} style={{ color: GOLD }} /> What Pro unlocks</div>
        <div className="up-features">
          {PRO_FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} style={S.proItem}>
              <Icon size={15} strokeWidth={2.2} style={{ color: GOLD }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Free forever */}
      <section style={S.freeCard}>
        <div style={S.cardTitle}><Check size={15} strokeWidth={2.6} style={{ color: '#16A34A' }} /> Free forever</div>
        <div className="up-features">
          {CORE_FREE.map(feature => (
            <div key={feature} style={S.proItem}>
              <Check size={14} strokeWidth={2.6} style={{ color: '#16A34A', flexShrink: 0 }} />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, maxWidth: 720, margin: '0 auto', padding: '8px 0 48px' },
  hero: { textAlign: 'center', maxWidth: 560 },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: GOLD, background: 'var(--gold-dim)', border: '1px solid var(--border-acc)', padding: '5px 12px', borderRadius: 999, marginBottom: 12 },
  title: { fontFamily: 'Cormorant Garamond, serif', fontSize: 32, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.15, marginBottom: 8 },
  sub: { fontSize: 14.5, color: 'var(--text-2)', lineHeight: 1.6 },
  activeCard: { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--green-dim)', border: '1px solid var(--green-b)', borderRadius: 12, padding: '14px 18px', color: 'var(--text-1)', fontSize: 14.5 },
  cycleCard: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 14px 16px', cursor: 'pointer', textAlign: 'center' },
  cycleCardActive: { borderColor: GOLD, boxShadow: `0 0 0 2px ${GOLD}33`, background: 'var(--bg-surface)' },
  bestBadge: { position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)', fontSize: 9, fontWeight: 800, letterSpacing: '.06em', color: '#0A1628', background: 'linear-gradient(135deg, var(--gold-l), var(--gold))', padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' },
  cycleName: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-3)' },
  cyclePrice: { fontFamily: 'Cormorant Garamond, serif', fontSize: 26, fontWeight: 700, lineHeight: 1 },
  cycleUnit: { fontSize: 11.5, color: 'var(--text-3)' },
  cycleSave: { fontSize: 11, fontWeight: 700, color: '#16A34A', marginTop: 4 },
  cyclePerDay: { fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 },
  cta: { padding: '13px 26px', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 6px 24px var(--gold-glow)' },
  mpesaNote: { fontSize: 12, color: 'var(--text-3)', marginTop: -8 },
  proCard: { width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-acc)', borderRadius: 16, padding: '20px 22px' },
  freeCard: { width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 22px' },
  cardTitle: { display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Cormorant Garamond, serif', fontSize: 19, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 },
  proItem: { display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: 'var(--text-2)' },
};
