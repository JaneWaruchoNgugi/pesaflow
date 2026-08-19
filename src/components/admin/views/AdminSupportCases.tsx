import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { adminDb as db } from '../../../lib/firebase';
import type { AdminUser } from '../../../types';

type CaseStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved';
type CasePriority = 'low' | 'normal' | 'high' | 'urgent';
type CaseType = 'payment' | 'account' | 'subscription' | 'data' | 'refund' | 'other';

interface SupportCase {
  id: string;
  title: string;
  userPhone: string;
  type: CaseType;
  priority: CasePriority;
  status: CaseStatus;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLOR: Record<CaseStatus, string> = {
  open: 'var(--amber)', in_progress: 'var(--gold)', waiting_customer: '#60A5FA', resolved: 'var(--green)',
};
const PRIORITY_COLOR: Record<CasePriority, string> = {
  low: 'var(--text-3)', normal: '#60A5FA', high: 'var(--amber)', urgent: 'var(--red)',
};

const writeAudit = async (admin: AdminUser, action: string, targetId: string, summary: string) => {
  await addDoc(collection(db, 'auditLogs'), {
    action, actorEmail: admin.email, actorRole: admin.role,
    targetType: 'supportCase', targetId, summary, createdAt: new Date().toISOString(),
  });
};

export const AdminSupportCases: React.FC<{ admin: AdminUser }> = ({ admin }) => {
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ title: '', userPhone: '', type: 'payment' as CaseType, priority: 'normal' as CasePriority, notes: '' });

  const load = () => getDocs(collection(db, 'supportCases')).then(snap => {
    setCases(snap.docs.map(d => ({ id: d.id, ...d.data() }) as SupportCase)
      .sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt)));
    setLoading(false);
  }).catch(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const metrics = useMemo(() => ({
    open: cases.filter(c => c.status !== 'resolved').length,
    urgent: cases.filter(c => c.priority === 'urgent' && c.status !== 'resolved').length,
    resolved: cases.filter(c => c.status === 'resolved').length,
    payment: cases.filter(c => c.type === 'payment').length,
  }), [cases]);

  const filtered = cases.filter(c => {
    const statusOk = statusFilter === 'all' || c.status === statusFilter;
    const needle = search.trim().toLowerCase();
    const searchOk = !needle || [c.title, c.userPhone, c.type, c.priority, c.status, c.notes].some(v => String(v || '').toLowerCase().includes(needle));
    return statusOk && searchOk;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    const payload = { ...form, title: form.title.trim(), userPhone: form.userPhone.trim(), notes: form.notes.trim(), status: 'open' as CaseStatus, createdBy: admin.email, createdAt: now, updatedAt: now };
    const ref = await addDoc(collection(db, 'supportCases'), payload);
    await writeAudit(admin, 'support_case_created', ref.id, payload.title);
    setForm({ title: '', userPhone: '', type: 'payment', priority: 'normal', notes: '' });
    load();
  };

  const changeStatus = async (supportCase: SupportCase, status: CaseStatus) => {
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'supportCases', supportCase.id), { status, updatedAt: now });
    await writeAudit(admin, 'support_case_status_changed', supportCase.id, `${supportCase.title}: ${supportCase.status} -> ${status}`);
    setCases(prev => prev.map(c => c.id === supportCase.id ? { ...c, status, updatedAt: now } : c));
  };

  if (loading) return <div style={{ color: 'var(--text-3)', padding: 32 }}>Loading support cases...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div><h2 style={heading}>Support Cases</h2><div style={subhead}>Customer issues, payment escalations, refunds, and account requests.</div></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        <Metric label="Open Cases" value={metrics.open} color="var(--amber)" />
        <Metric label="Urgent" value={metrics.urgent} color="var(--red)" />
        <Metric label="Resolved" value={metrics.resolved} color="var(--green)" />
        <Metric label="Payment Issues" value={metrics.payment} color="var(--gold)" />
      </div>

      <form onSubmit={handleCreate} style={formStyle}>
        <input required placeholder="Case title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} />
        <input placeholder="User phone" value={form.userPhone} onChange={e => setForm(f => ({ ...f, userPhone: e.target.value }))} style={inputStyle} />
        <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as CaseType }))} style={inputStyle}>
          <option value="payment">Payment</option><option value="account">Account</option><option value="subscription">Subscription</option><option value="data">Data</option><option value="refund">Refund</option><option value="other">Other</option>
        </select>
        <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as CasePriority }))} style={inputStyle}>
          <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
        </select>
        <textarea placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inputStyle, minHeight: 70, gridColumn: '1 / -1', resize: 'vertical' }} />
        <button type="submit" style={btnStyle}>Create Case</button>
      </form>

      <div style={toolbar}>
        <input placeholder="Search cases..." value={search} onChange={e => setSearch(e.target.value)} style={inputStyle} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as CaseStatus | 'all')} style={inputStyle}>
          <option value="all">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="waiting_customer">Waiting customer</option><option value="resolved">Resolved</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(c => (
          <div key={c.id} style={caseCard}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-1)', fontWeight: 700, fontSize: 14 }}>{c.title}</span>
                <span style={{ ...pill, color: STATUS_COLOR[c.status], borderColor: `${STATUS_COLOR[c.status]}55` }}>{c.status.replace('_', ' ')}</span>
                <span style={{ ...pill, color: PRIORITY_COLOR[c.priority], borderColor: `${PRIORITY_COLOR[c.priority]}55` }}>{c.priority}</span>
              </div>
              <div style={mutedText}>{c.userPhone || 'No phone'} - {c.type} - created by {c.createdBy}</div>
              {c.notes && <div style={{ color: 'var(--text-2)', fontSize: 12, marginTop: 8 }}>{c.notes}</div>}
            </div>
            <select value={c.status} onChange={e => changeStatus(c, e.target.value as CaseStatus)} style={{ ...inputStyle, width: 150 }}>
              <option value="open">Open</option><option value="in_progress">In progress</option><option value="waiting_customer">Waiting customer</option><option value="resolved">Resolved</option>
            </select>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 13, padding: 18 }}>No support cases found.</div>}
      </div>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}><div style={{ fontSize: 24, fontWeight: 700, color, fontFamily: 'Cormorant Garamond, serif' }}>{value.toLocaleString()}</div><div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{label}</div></div>;
const heading: React.CSSProperties = { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: 0 };
const subhead: React.CSSProperties = { color: 'var(--text-3)', fontSize: 12, marginTop: 4 };
const inputStyle: React.CSSProperties = { padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-s)', background: 'var(--bg-surface)', color: 'var(--text-1)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' };
const formStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) 150px 130px 130px', gap: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 };
const toolbar: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 180px', gap: 10 };
const btnStyle: React.CSSProperties = { padding: '10px 14px', borderRadius: 8, border: 'none', background: 'var(--btn-gradient)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', gridColumn: '1 / -1' };
const caseCard: React.CSSProperties = { display: 'flex', gap: 14, alignItems: 'flex-start', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' };
const mutedText: React.CSSProperties = { color: 'var(--text-3)', fontSize: 11, marginTop: 4 };
const pill: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' };
