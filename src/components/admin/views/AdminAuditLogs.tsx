import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { adminDb as db } from '../../../lib/firebase';

interface AuditLogRow {
  id: string;
  action?: string;
  actorEmail?: string;
  actorRole?: string;
  targetType?: string;
  targetId?: string;
  summary?: string;
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

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getDocs(collection(db, 'auditLogs')).then(snap => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }) as AuditLogRow).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = logs.filter(log => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return [log.action, log.actorEmail, log.actorRole, log.targetType, log.targetId, log.summary]
      .some(value => String(value || '').toLowerCase().includes(needle));
  });

  if (loading) return <div style={{ color: 'var(--text-3)', padding: 32 }}>Loading audit logs...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={heading}>Audit Logs</h2>
        <div style={subhead}>Admin actions, support updates, and settings changes.</div>
      </div>

      <input placeholder="Search action, admin, target, summary..." value={search} onChange={e => setSearch(e.target.value)} style={inputStyle} />

      <div style={tableWrap}>
        <div style={tableHeader}><span>Action</span><span>Actor</span><span>Target</span><span>Summary</span><span>Date</span></div>
        {filtered.map(log => (
          <div key={log.id} style={rowStyle}>
            <div style={primaryText}>{log.action || '-'}</div>
            <div>
              <div style={primaryText}>{log.actorEmail || '-'}</div>
              <div style={mutedText}>{log.actorRole || '-'}</div>
            </div>
            <div>
              <div style={primaryText}>{log.targetType || '-'}</div>
              <div style={mutedText}>{log.targetId || '-'}</div>
            </div>
            <div style={mutedText}>{log.summary || '-'}</div>
            <div style={mutedText}>{formatDate(log.createdAt)}</div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 13, padding: 18 }}>No audit logs found.</div>}
      </div>
    </div>
  );
};

const heading: React.CSSProperties = { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: 0 };
const subhead: React.CSSProperties = { color: 'var(--text-3)', fontSize: 12, marginTop: 4 };
const inputStyle: React.CSSProperties = { padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-s)', background: 'var(--bg-surface)', color: 'var(--text-1)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', width: '100%', boxSizing: 'border-box' };
const tableWrap: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' };
const tableHeader: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr 1.6fr 0.9fr', gap: 12, padding: '10px 14px', color: 'var(--text-3)', fontSize: 11, fontWeight: 700, borderBottom: '1px solid var(--border)', textTransform: 'uppercase' };
const rowStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr 1.6fr 0.9fr', gap: 12, alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 12 };
const primaryText: React.CSSProperties = { color: 'var(--text-1)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const mutedText: React.CSSProperties = { color: 'var(--text-3)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 };
