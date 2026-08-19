import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { adminDb as db } from '../../../lib/firebase';
import type { UserProfile } from '../../../types';

interface SupportThread {
  id: string;
  status?: 'open' | 'resolved';
  unreadForSupport?: number;
  lastMessageAt?: string;
  userName?: string;
  userPhone?: string;
  lastMessage?: string;
}

interface SupportCase {
  id: string;
  status?: string;
  priority?: string;
  type?: string;
  title?: string;
  userPhone?: string;
  updatedAt?: string;
}

export const AdminSupportOverview: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'supportThreads')),
      getDocs(collection(db, 'supportCases')),
    ]).then(([userSnap, threadSnap, caseSnap]) => {
      setUsers(userSnap.docs.map(d => d.data() as UserProfile));
      setThreads(threadSnap.docs.map(d => ({ id: d.id, ...d.data() }) as SupportThread));
      setCases(caseSnap.docs.map(d => ({ id: d.id, ...d.data() }) as SupportCase));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const stats = useMemo(() => ({
    users: users.length,
    openChats: threads.filter(t => t.status !== 'resolved').length,
    unreadMessages: threads.reduce((sum, t) => sum + Number(t.unreadForSupport || 0), 0),
    resolvedChats: threads.filter(t => t.status === 'resolved').length,
    openCases: cases.filter(c => c.status !== 'resolved').length,
    urgentCases: cases.filter(c => c.priority === 'urgent' && c.status !== 'resolved').length,
    blacklisted: users.filter(u => u.blacklisted).length,
  }), [users, threads, cases]);

  const recentThreads = [...threads]
    .sort((a, b) => Date.parse(b.lastMessageAt || '') - Date.parse(a.lastMessageAt || ''))
    .slice(0, 6);
  const activeCases = cases
    .filter(c => c.status !== 'resolved')
    .sort((a, b) => Date.parse(b.updatedAt || '') - Date.parse(a.updatedAt || ''))
    .slice(0, 6);

  if (loading) return <div style={{ color: 'var(--text-3)', padding: 32 }}>Loading support overview...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <h2 style={heading}>Support Overview</h2>
        <div style={subhead}>Users, chats, unread messages, and active support work.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14 }}>
        <StatCard label="Total Users" value={stats.users.toLocaleString()} />
        <StatCard label="Open Chats" value={stats.openChats.toLocaleString()} color="var(--gold)" />
        <StatCard label="Unread Messages" value={stats.unreadMessages.toLocaleString()} color="var(--red)" />
        <StatCard label="Open Cases" value={stats.openCases.toLocaleString()} color="var(--amber)" />
        <StatCard label="Urgent Cases" value={stats.urgentCases.toLocaleString()} color="var(--red)" />
        <StatCard label="Blacklisted Users" value={stats.blacklisted.toLocaleString()} color="var(--red)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <section style={panelStyle}>
          <div style={panelTitle}>Recent Support Chats</div>
          {recentThreads.map(thread => (
            <div key={thread.id} style={rowStyle}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={primaryText}>{thread.userName || thread.userPhone || thread.id}</div>
                <div style={mutedText}>{thread.lastMessage || 'No message preview'}</div>
              </div>
              <span style={{ ...pillStyle, color: thread.status === 'resolved' ? 'var(--green)' : 'var(--gold)', borderColor: thread.status === 'resolved' ? 'var(--green-b)' : 'var(--border-acc)' }}>
                {thread.status === 'resolved' ? 'Resolved' : 'Open'}
              </span>
            </div>
          ))}
          {recentThreads.length === 0 && <div style={emptyStyle}>No support chats yet.</div>}
        </section>

        <section style={panelStyle}>
          <div style={panelTitle}>Active Cases</div>
          {activeCases.map(item => (
            <div key={item.id} style={rowStyle}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={primaryText}>{item.title || item.type || 'Support case'}</div>
                <div style={mutedText}>{item.userPhone || 'No phone'} - {item.type || 'general'}</div>
              </div>
              <span style={{ ...pillStyle, color: item.priority === 'urgent' ? 'var(--red)' : 'var(--amber)', borderColor: item.priority === 'urgent' ? 'var(--red-b)' : 'var(--border-acc)' }}>
                {item.priority || 'normal'}
              </span>
            </div>
          ))}
          {activeCases.length === 0 && <div style={emptyStyle}>No active cases.</div>}
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

const heading: React.CSSProperties = { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: 0 };
const subhead: React.CSSProperties = { color: 'var(--text-3)', fontSize: 12, marginTop: 4 };
const panelStyle: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 18 };
const panelTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 14 };
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid var(--border)', padding: '10px 0' };
const primaryText: React.CSSProperties = { color: 'var(--text-1)', fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const mutedText: React.CSSProperties = { color: 'var(--text-3)', fontSize: 11, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const pillStyle: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' };
const emptyStyle: React.CSSProperties = { color: 'var(--text-3)', fontSize: 13, padding: '8px 0' };
