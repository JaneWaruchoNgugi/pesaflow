import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { adminDb as db } from '../../../lib/firebase';

interface ChatErrorRow {
  id: string;
  userId?: string;
  stage?: string;
  message?: string;
  code?: string;
  prompt?: string;
  resolved?: boolean;
  createdAt?: unknown;
}

const toMillis = (value: unknown): number => {
  if (!value) return 0;
  if (typeof value === 'string') return Date.parse(value) || 0;
  if (typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') return value.toMillis();
  return 0;
};

const formatDate = (value: unknown): string => {
  const ms = toMillis(value);
  return ms ? new Date(ms).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
};

export const AdminChatHealth: React.FC = () => {
  const [errors, setErrors] = useState<ChatErrorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [search, setSearch] = useState('');

  const load = () => getDocs(collection(db, 'chatErrors')).then(snap => {
    setErrors(snap.docs.map(d => ({ id: d.id, ...d.data() }) as ChatErrorRow).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)));
    setLoading(false);
  }).catch(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const metrics = useMemo(() => ({
    total: errors.length,
    open: errors.filter(e => !e.resolved).length,
    resolved: errors.filter(e => e.resolved).length,
    today: errors.filter(e => toMillis(e.createdAt) >= Date.now() - 24 * 60 * 60 * 1000).length,
  }), [errors]);

  const filtered = errors.filter(error => {
    const filterOk = filter === 'all' || (filter === 'open' ? !error.resolved : !!error.resolved);
    const needle = search.trim().toLowerCase();
    const searchOk = !needle || [error.userId, error.stage, error.message, error.code, error.prompt].some(value => String(value || '').toLowerCase().includes(needle));
    return filterOk && searchOk;
  });

  const markResolved = async (error: ChatErrorRow) => {
    await updateDoc(doc(db, 'chatErrors', error.id), { resolved: true, resolvedAt: new Date().toISOString() });
    setErrors(prev => prev.map(item => item.id === error.id ? { ...item, resolved: true } : item));
  };

  if (loading) return <div style={{ color: 'var(--text-3)', padding: 32 }}>Loading chat health...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div><h2 style={heading}>Chat Health</h2><div style={subhead}>Claude/API failures, history loading problems, and fallback usage.</div></div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        <Metric label="Open Errors" value={metrics.open} color="var(--red)" />
        <Metric label="Last 24 Hours" value={metrics.today} color="var(--amber)" />
        <Metric label="Resolved" value={metrics.resolved} color="var(--green)" />
        <Metric label="All Logs" value={metrics.total} color="var(--gold)" />
      </div>

      <div style={toolbar}>
        <input placeholder="Search user, stage, code, message..." value={search} onChange={e => setSearch(e.target.value)} style={inputStyle} />
        <select value={filter} onChange={e => setFilter(e.target.value as 'open' | 'resolved' | 'all')} style={inputStyle}>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="all">All</option>
        </select>
      </div>

      <div style={tableWrap}>
        <div style={tableHeader}><span>User</span><span>Stage</span><span>Error</span><span>Prompt</span><span>Date</span><span></span></div>
        {filtered.map(error => (
          <div key={error.id} style={rowStyle}>
            <div style={primaryText}>{error.userId || '-'}</div>
            <div><span style={{ ...pill, color: error.resolved ? 'var(--green)' : 'var(--red)', borderColor: error.resolved ? 'var(--green-b)' : 'var(--red-b)' }}>{error.stage || 'unknown'}</span></div>
            <div style={{ minWidth: 0 }}><div style={primaryText}>{error.message || '-'}</div><div style={mutedText}>{error.code || '-'}</div></div>
            <div style={mutedText}>{error.prompt || '-'}</div>
            <div style={mutedText}>{formatDate(error.createdAt)}</div>
            <div>{!error.resolved && <button onClick={() => markResolved(error)} style={btnStyle}>Resolve</button>}</div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 13, padding: 18 }}>No chat errors found.</div>}
      </div>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}><div style={{ fontSize: 24, fontWeight: 700, color, fontFamily: 'Cormorant Garamond, serif' }}>{value.toLocaleString()}</div><div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{label}</div></div>;
const heading: React.CSSProperties = { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: 0 };
const subhead: React.CSSProperties = { color: 'var(--text-3)', fontSize: 12, marginTop: 4 };
const toolbar: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 150px', gap: 10 };
const inputStyle: React.CSSProperties = { padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-s)', background: 'var(--bg-surface)', color: 'var(--text-1)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' };
const tableWrap: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' };
const tableHeader: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 0.8fr 1.5fr 1.2fr 0.9fr 90px', gap: 12, padding: '10px 14px', color: 'var(--text-3)', fontSize: 11, fontWeight: 700, borderBottom: '1px solid var(--border)', textTransform: 'uppercase' };
const rowStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 0.8fr 1.5fr 1.2fr 0.9fr 90px', gap: 12, alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 12 };
const primaryText: React.CSSProperties = { color: 'var(--text-1)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const mutedText: React.CSSProperties = { color: 'var(--text-3)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 };
const pill: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' };
const btnStyle: React.CSSProperties = { padding: '6px 10px', borderRadius: 7, border: '1px solid var(--green-b)', background: 'var(--green-dim)', color: 'var(--green)', fontWeight: 700, fontSize: 12, cursor: 'pointer' };
