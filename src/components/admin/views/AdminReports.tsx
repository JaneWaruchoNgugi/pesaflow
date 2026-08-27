import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { adminDb as db } from '../../../lib/firebase';
import type { SubscriptionTier, UserProfile } from '../../../types';

const LEGACY_TIERS: SubscriptionTier[] = ['silver', 'gold', 'platinum'];
const TIER_COLOR: Record<SubscriptionTier, string> = { free: '#9BAAC4', silver: '#C0C0C0', gold: '#C9A84C', platinum: '#A78BFA', pro: '#D97706' };
const TIER_LABEL: Record<SubscriptionTier, string> = { free: 'Free', silver: 'Silver', gold: 'Gold', platinum: 'Platinum', pro: 'Pro' };

interface PaymentRow { amount?: number; status?: string; tier?: SubscriptionTier; createdAt?: unknown; }
interface SupportCaseRow { status?: string; priority?: string; type?: string; }

const toMillis = (value: unknown): number => {
  if (!value) return 0;
  if (typeof value === 'string') return Date.parse(value) || 0;
  if (typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') return value.toMillis();
  return 0;
};
const isPaid = (status?: string) => status === 'success' || status === 'paid';

export const AdminReports: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [cases, setCases] = useState<SupportCaseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDocs(collection(db, 'users')), getDocs(collection(db, 'payments')), getDocs(collection(db, 'supportCases'))]).then(([u, p, c]) => {
      setUsers(u.docs.map(d => d.data() as UserProfile));
      setPayments(p.docs.map(d => d.data() as PaymentRow));
      setCases(c.docs.map(d => d.data() as SupportCaseRow));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const paidPayments = payments.filter(p => isPaid(p.status));
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const revenue = paidPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return {
      revenue,
      last30: paidPayments.filter(p => toMillis(p.createdAt) >= thirtyDaysAgo).reduce((sum, p) => sum + Number(p.amount || 0), 0),
      averagePayment: paidPayments.length ? Math.round(revenue / paidPayments.length) : 0,
      conversion: users.length ? Math.round((users.filter(u => u.tier !== 'free').length / users.length) * 100) : 0,
      paidPayments,
      openCases: cases.filter(c => c.status !== 'resolved').length,
      urgentCases: cases.filter(c => c.priority === 'urgent' && c.status !== 'resolved').length,
    };
  }, [users, payments, cases]);

  const paymentStatus = ['success', 'pending', 'failed'].map(status => ({ label: status, count: payments.filter(p => status === 'success' ? isPaid(p.status) : p.status === status).length }));

  if (loading) return <div style={{ color: 'var(--text-3)', padding: 32 }}>Loading reports...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div><h2 style={heading}>Reports</h2><div style={subhead}>Revenue, subscription, payment, and support summaries.</div></div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        <Metric label="Total Revenue" value={`KES ${stats.revenue.toLocaleString()}`} color="var(--gold)" />
        <Metric label="Last 30 Days" value={`KES ${stats.last30.toLocaleString()}`} color="var(--green)" />
        <Metric label="Avg Payment" value={`KES ${stats.averagePayment.toLocaleString()}`} color="#60A5FA" />
        <Metric label="Conversion" value={`${stats.conversion}%`} color="var(--gold)" />
        <Metric label="Open Cases" value={stats.openCases.toLocaleString()} color="var(--amber)" />
        <Metric label="Urgent Cases" value={stats.urgentCases.toLocaleString()} color="var(--red)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <Panel title="Revenue By Tier">
          {/* Pro is the only sold plan; a legacy tier only appears if it still has revenue. */}
          {(['pro', ...LEGACY_TIERS.filter(t => stats.paidPayments.some(p => p.tier === t))] as SubscriptionTier[]).map(tier => {
            const revenue = stats.paidPayments.filter(p => p.tier === tier).reduce((sum, p) => sum + Number(p.amount || 0), 0);
            const max = Math.max(1, stats.revenue);
            return <Bar key={tier} label={TIER_LABEL[tier]} value={`KES ${revenue.toLocaleString()}`} pct={(revenue / max) * 100} color={TIER_COLOR[tier]} />;
          })}
        </Panel>

        <Panel title="Users By Tier">
          {(['free', 'pro', ...LEGACY_TIERS.filter(t => users.some(u => u.tier === t))] as SubscriptionTier[]).map(tier => {
            const count = users.filter(u => u.tier === tier).length;
            return <Bar key={tier} label={TIER_LABEL[tier]} value={count.toLocaleString()} pct={users.length ? (count / users.length) * 100 : 0} color={TIER_COLOR[tier]} />;
          })}
        </Panel>

        <Panel title="Payment Status">
          {paymentStatus.map(item => <Bar key={item.label} label={item.label} value={item.count.toLocaleString()} pct={payments.length ? (item.count / payments.length) * 100 : 0} color={item.label === 'success' ? 'var(--green)' : item.label === 'pending' ? 'var(--amber)' : 'var(--red)'} />)}
        </Panel>

        <Panel title="Support Case Types">
          {['payment', 'account', 'subscription', 'data', 'refund', 'other'].map(type => {
            const count = cases.filter(c => c.type === type).length;
            return <Bar key={type} label={type} value={count.toLocaleString()} pct={cases.length ? (count / cases.length) * 100 : 0} color="var(--gold)" />;
          })}
        </Panel>
      </div>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => <div style={metricCard}><div style={{ fontSize: 24, fontWeight: 700, color, fontFamily: 'Cormorant Garamond, serif' }}>{value}</div><div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{label}</div></div>;
const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => <section style={panelStyle}><div style={panelTitle}>{title}</div>{children}</section>;
const Bar: React.FC<{ label: string; value: string; pct: number; color: string }> = ({ label, value, pct, color }) => <div style={{ marginBottom: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}><span style={{ color, fontWeight: 700, textTransform: 'capitalize' }}>{label.replace('_', ' ')}</span><span style={{ color: 'var(--text-2)' }}>{value}</span></div><div style={{ height: 7, background: 'var(--bg-surface)', borderRadius: 4 }}><div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: color, borderRadius: 4 }} /></div></div>;
const heading: React.CSSProperties = { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: 0 };
const subhead: React.CSSProperties = { color: 'var(--text-3)', fontSize: 12, marginTop: 4 };
const metricCard: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '15px 16px' };
const panelStyle: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 18 };
const panelTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 14 };
