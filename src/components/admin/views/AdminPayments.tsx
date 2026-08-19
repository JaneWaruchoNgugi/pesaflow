import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { adminDb as db } from '../../../lib/firebase';
import type { SubscriptionTier } from '../../../types';

type PaymentStatus = 'all' | 'success' | 'paid' | 'pending' | 'failed';

interface PaymentRow {
  id: string;
  userId?: string;
  phone?: string;
  tier?: SubscriptionTier;
  amount?: number;
  status?: string;
  provider?: string;
  checkoutId?: string | null;
  checkoutRequestId?: string | null;
  trans_id?: string;
  resultDesc?: string;
  errorMessage?: string;
  createdAt?: unknown;
  manualConfirmation?: boolean;
}

const STATUS_COLOR: Record<string, string> = {
  success: 'var(--green)',
  paid: 'var(--green)',
  pending: 'var(--amber)',
  failed: 'var(--red)',
};

const TIER_COLOR: Record<SubscriptionTier, string> = {
  free: '#9BAAC4', silver: '#C0C0C0', gold: '#C9A84C', platinum: '#A78BFA',
};

const toMillis = (value: unknown): number => {
  if (!value) return 0;
  if (typeof value === 'string') return Date.parse(value) || 0;
  if (typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') return value.toMillis();
  return 0;
};

const formatDate = (value: unknown): string => {
  const ms = toMillis(value);
  if (!ms) return '-';
  return new Date(ms).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
};

const isPaid = (status?: string) => status === 'success' || status === 'paid';

export const AdminPayments: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<PaymentStatus>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    getDocs(collection(db, 'payments')).then(snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }) as PaymentRow)
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      setPayments(rows);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const metrics = useMemo(() => {
    const successful = payments.filter(p => isPaid(p.status));
    return {
      total: payments.length,
      successful: successful.length,
      pending: payments.filter(p => p.status === 'pending').length,
      failed: payments.filter(p => p.status === 'failed').length,
      revenue: successful.reduce((sum, p) => sum + Number(p.amount || 0), 0),
    };
  }, [payments]);

  const filtered = payments.filter(p => {
    const statusMatch = status === 'all' || p.status === status;
    const needle = search.trim().toLowerCase();
    const searchMatch = !needle || [p.id, p.userId, p.phone, p.tier, p.status, p.trans_id, p.checkoutId, p.checkoutRequestId]
      .some(value => String(value || '').toLowerCase().includes(needle));
    return statusMatch && searchMatch;
  });

  if (loading) return <div style={{ color: 'var(--text-3)', padding: 32 }}>Loading payments...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h2 style={heading}>Payments</h2>
        <div style={subhead}>M-Pesa/STK subscription payment ledger from Firestore.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
        <Metric label="Revenue Collected" value={`KES ${metrics.revenue.toLocaleString()}`} color="var(--gold)" />
        <Metric label="Successful" value={metrics.successful.toLocaleString()} color="var(--green)" />
        <Metric label="Pending" value={metrics.pending.toLocaleString()} color="var(--amber)" />
        <Metric label="Failed" value={metrics.failed.toLocaleString()} color="var(--red)" />
        <Metric label="All Records" value={metrics.total.toLocaleString()} />
      </div>

      <div style={toolbar}>
        <input placeholder="Search phone, user, checkout, transaction..." value={search} onChange={e => setSearch(e.target.value)} style={inputStyle} />
        <select value={status} onChange={e => setStatus(e.target.value as PaymentStatus)} style={selectStyle}>
          <option value="all">All statuses</option>
          <option value="success">Success</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div style={tableWrap}>
        <div style={tableHeader}>
          <span>Payment</span><span>User</span><span>Plan</span><span>Amount</span><span>Status</span><span>Created</span>
        </div>
        {filtered.map(payment => (
          <div key={payment.id} style={rowStyle}>
            <div style={{ minWidth: 0 }}>
              <div style={primaryText}>{payment.trans_id || payment.checkoutRequestId || payment.checkoutId || payment.id}</div>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={primaryText}>{payment.phone || payment.userId || '-'}</div>
              <div style={mutedText}>{payment.userId || payment.id}</div>
            </div>
            <div>
              <span style={{ ...pill, color: payment.tier ? TIER_COLOR[payment.tier] : 'var(--text-3)', borderColor: payment.tier ? `${TIER_COLOR[payment.tier]}55` : 'var(--border)' }}>{payment.tier || '-'}</span>
            </div>
            <div style={primaryText}>KES {Number(payment.amount || 0).toLocaleString()}</div>
            <div>
              <span style={{ ...pill, color: STATUS_COLOR[payment.status || ''] || 'var(--text-3)', borderColor: `${STATUS_COLOR[payment.status || ''] || 'var(--border)'}55` }}>
                {payment.status || 'unknown'}{payment.manualConfirmation ? ' manual' : ''}
              </span>
              {(payment.errorMessage || payment.resultDesc) && <div style={mutedText}>{payment.errorMessage || payment.resultDesc}</div>}
            </div>
            <div style={mutedText}>{formatDate(payment.createdAt)}</div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 13, padding: 18 }}>No payments match this filter.</div>}
      </div>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div style={metricCard}>
    <div style={{ fontSize: 24, fontWeight: 700, color: color ?? 'var(--text-1)', fontFamily: 'Cormorant Garamond, serif' }}>{value}</div>
    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{label}</div>
  </div>
);

const heading: React.CSSProperties = { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: 0 };
const subhead: React.CSSProperties = { color: 'var(--text-3)', fontSize: 12, marginTop: 4 };
const metricCard: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '15px 16px' };
const toolbar: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 170px', gap: 10 };
const inputStyle: React.CSSProperties = { padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-s)', background: 'var(--bg-surface)', color: 'var(--text-1)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', width: '100%', boxSizing: 'border-box' };
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };
const tableWrap: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' };
const tableHeader: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 0.7fr 0.7fr 1fr 0.9fr', gap: 12, padding: '10px 14px', color: 'var(--text-3)', fontSize: 11, fontWeight: 700, borderBottom: '1px solid var(--border)', textTransform: 'uppercase' };
const rowStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 0.7fr 0.7fr 1fr 0.9fr', gap: 12, alignItems: 'center', padding: '13px 14px', borderBottom: '1px solid var(--border)', fontSize: 12 };
const primaryText: React.CSSProperties = { color: 'var(--text-1)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const mutedText: React.CSSProperties = { color: 'var(--text-3)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 };
const pill: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' };
