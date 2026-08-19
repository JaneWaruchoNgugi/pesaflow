import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { adminDb as db } from '../../../lib/firebase';
import type { UserProfile, SubscriptionTier } from '../../../types';
import { TIER_COLOR, TIER_LABEL, ACTIVE_TIERS, LEGACY_TIERS, GOLD_COMING_SOON } from '../../../lib/tiers';

interface PaymentRow {
  amount?: number;
  status?: string;
  tier?: SubscriptionTier;
  createdAt?: unknown;
}

const toMillis = (value: unknown): number => {
  if (!value) return 0;
  if (typeof value === 'string') return Date.parse(value) || 0;
  if (typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') return value.toMillis();
  return 0;
};

const isPaid = (status?: string) => status === 'success' || status === 'paid';

export const AdminOverview: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDocs(collection(db, 'users')), getDocs(collection(db, 'payments'))]).then(([userSnap, paymentSnap]) => {
      setUsers(userSnap.docs.map(d => d.data() as UserProfile));
      setPayments(paymentSnap.docs.map(d => d.data() as PaymentRow));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const paidPayments = payments.filter(p => isPaid(p.status));
    const paidUsers = users.filter(u => u.tier !== 'free').length;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return {
      tierCounts: [
        ...ACTIVE_TIERS,
        // Legacy tiers only appear when they still have users on them.
        ...LEGACY_TIERS.filter(t => users.some(u => u.tier === t)),
      ].map(t => ({ tier: t, count: users.filter(u => u.tier === t).length, legacy: LEGACY_TIERS.includes(t) })),
      revenue: paidPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
      payments: payments.length,
      pendingPayments: payments.filter(p => p.status === 'pending').length,
      failedPayments: payments.filter(p => p.status === 'failed').length,
      recentRevenue: paidPayments.filter(p => toMillis(p.createdAt) >= thirtyDaysAgo).reduce((sum, p) => sum + Number(p.amount || 0), 0),
      paidUsers,
      conversion: users.length ? Math.round((paidUsers / users.length) * 100) : 0,
      blacklisted: users.filter(u => u.blacklisted).length,
    };
  }, [users, payments]);

  if (loading) return <div style={{ color: 'var(--text-3)', padding: 32 }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h2 style={heading}>Overview</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14 }}>
        <StatCard label="Total Users" value={users.length.toLocaleString()} />
        <StatCard label="Paid Users" value={stats.paidUsers.toLocaleString()} color="var(--green)" />
        <StatCard label="Conversion" value={`${stats.conversion}%`} color="var(--gold)" />
        <StatCard label="Revenue Collected" value={`KES ${stats.revenue.toLocaleString()}`} color="var(--gold)" />
        <StatCard label="Last 30 Days" value={`KES ${stats.recentRevenue.toLocaleString()}`} color="var(--green)" />
        <StatCard label="Pending Payments" value={stats.pendingPayments.toLocaleString()} color="var(--amber)" />
        <StatCard label="Failed Payments" value={stats.failedPayments.toLocaleString()} color="var(--red)" />
        <StatCard label="Blacklisted" value={stats.blacklisted.toLocaleString()} color="var(--red)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(260px, 1fr)', gap: 16 }}>
        <section style={panelStyle}>
          <div style={panelTitle}>Tier Distribution</div>
          {stats.tierCounts.map(({ tier, count, legacy }) => (
            <div key={tier} style={{ marginBottom: 10, opacity: legacy ? 0.6 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: TIER_COLOR[tier], fontWeight: 600 }}>{TIER_LABEL[tier]}</span>
                  {tier === 'gold' && GOLD_COMING_SOON && <span style={comingSoonTag}>coming soon</span>}
                  {legacy && <span style={legacyTag}>legacy</span>}
                </span>
                <span style={{ color: 'var(--text-2)' }}>{users.length ? Math.round((count / users.length) * 100) : 0}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-surface)', borderRadius: 4 }}>
                <div style={{ height: '100%', width: `${users.length ? (count / users.length) * 100 : 0}%`, background: TIER_COLOR[tier], borderRadius: 4, transition: 'width 0.4s' }} />
              </div>
            </div>
          ))}
        </section>

        <section style={panelStyle}>
          <div style={panelTitle}>Payment Health</div>
          <StatusLine label="Successful" count={payments.filter(p => isPaid(p.status)).length} total={payments.length} color="var(--green)" />
          <StatusLine label="Pending" count={stats.pendingPayments} total={payments.length} color="var(--amber)" />
          <StatusLine label="Failed" count={stats.failedPayments} total={payments.length} color="var(--red)" />
        </section>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
    <div style={{ fontSize: 25, fontWeight: 700, color: color ?? 'var(--gold)', fontFamily: 'Cormorant Garamond, serif' }}>{value}</div>
    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{label}</div>
  </div>
);

const StatusLine: React.FC<{ label: string; count: number; total: number; color: string }> = ({ label, count, total, color }) => {
  const pct = total ? (count / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
        <span style={{ color, fontWeight: 700 }}>{label}</span>
        <span style={{ color: 'var(--text-2)' }}>{count.toLocaleString()}</span>
      </div>
      <div style={{ height: 7, background: 'var(--bg-surface)', borderRadius: 4 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
    </div>
  );
};

const heading: React.CSSProperties = { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: 0 };
const panelStyle: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 18 };
const panelTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 14 };
const comingSoonTag: React.CSSProperties = { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--gold)', border: '1px solid var(--border-acc)', borderRadius: 4, padding: '1px 5px' };
const legacyTag: React.CSSProperties = { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--text-3)', border: '1px solid var(--border-s)', borderRadius: 4, padding: '1px 5px' };
