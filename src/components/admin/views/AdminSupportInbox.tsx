import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { addDoc, collection, doc, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';
import { adminDb as db } from '../../../lib/firebase';
import type { AdminUser } from '../../../types';

interface SupportThread {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  userTier?: string;
  status?: 'open' | 'resolved';
  lastMessage?: string;
  lastMessageAt?: string;
  lastSender?: 'user' | 'support';
  unreadForSupport?: number;
}

interface SupportMessage {
  id: string;
  sender: 'user' | 'support';
  text: string;
  createdAt: string;
  senderName?: string;
}

const initial = (name?: string) => (name || '?').trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || '?';

export const AdminSupportInbox: React.FC<{ admin: AdminUser }> = ({ admin }) => {
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [search, setSearch] = useState('');

  useEffect(() => {
    return onSnapshot(collection(db, 'supportThreads'), snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }) as SupportThread)
        .sort((a, b) => Date.parse(b.lastMessageAt || '') - Date.parse(a.lastMessageAt || ''));
      setThreads(rows);
      setSelectedId(current => current || rows[0]?.id || '');
    });
  }, []);

  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    updateDoc(doc(db, 'supportThreads', selectedId), { unreadForSupport: 0 }).catch(() => undefined);
    return onSnapshot(query(collection(db, 'supportThreads', selectedId, 'messages'), orderBy('createdAt', 'asc')), snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }) as SupportMessage));
    });
  }, [selectedId]);

  const visibleThreads = useMemo(() => threads.filter(thread => {
    const statusOk = filter === 'all' || (filter === 'open' ? thread.status !== 'resolved' : thread.status === 'resolved');
    const needle = search.trim().toLowerCase();
    const searchOk = !needle || [thread.userName, thread.userPhone, thread.userId, thread.lastMessage].some(value => String(value || '').toLowerCase().includes(needle));
    return statusOk && searchOk;
  }), [threads, filter, search]);
  const selected = visibleThreads.find(t => t.id === selectedId) || visibleThreads[0];

  useEffect(() => {
    if (!visibleThreads.length) { setSelectedId(''); return; }
    if (!visibleThreads.some(thread => thread.id === selectedId)) setSelectedId(visibleThreads[0].id);
  }, [visibleThreads, selectedId]);

  const sendReply = async () => {
    const text = input.trim();
    if (!text || !selected) return;
    const now = new Date().toISOString();
    await setDoc(doc(db, 'supportThreads', selected.id), {
      status: 'open',
      lastMessage: text,
      lastMessageAt: now,
      lastSender: 'support',
      unreadForUser: (selected.lastSender === 'support' ? 0 : 0) + 1,
      updatedAt: now,
    }, { merge: true });
    await addDoc(collection(db, 'supportThreads', selected.id, 'messages'), {
      sender: 'support', senderName: admin.email, text, createdAt: now,
    });
    await addDoc(collection(db, 'auditLogs'), {
      action: 'support_chat_reply', actorEmail: admin.email, actorRole: admin.role,
      targetType: 'supportThread', targetId: selected.id, summary: `Replied to ${selected.userName || selected.userPhone || selected.id}`, createdAt: now,
    });
    setInput('');
  };

  const setResolved = async (resolved: boolean) => {
    if (!selected) return;
    await updateDoc(doc(db, 'supportThreads', selected.id), { status: resolved ? 'resolved' : 'open', updatedAt: new Date().toISOString() });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 620 }}>
      <div><h2 style={heading}>Support Chats</h2><div style={subhead}>Reply to user support messages in real time.</div></div>
      <div style={shellStyle}>
        <aside style={listStyle}>
          <div style={listHeaderStyle}>
            <div style={{ fontWeight: 800, color: '#fff' }}>Support Chats</div>
            <input placeholder="Search name or phone..." value={search} onChange={e => setSearch(e.target.value)} style={searchStyle} />
          </div>
          <div style={tabsStyle}>
            {(['open', 'resolved', 'all'] as const).map(tab => <button key={tab} onClick={() => setFilter(tab)} style={{ ...tabStyle, color: filter === tab ? 'var(--gold)' : 'var(--text-3)', borderBottomColor: filter === tab ? 'var(--gold)' : 'transparent' }}>{tab}</button>)}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {visibleThreads.map(thread => (
              <button key={thread.id} onClick={() => setSelectedId(thread.id)} style={{ ...threadStyle, background: selectedId === thread.id ? 'var(--sidebar-active)' : 'var(--bg-card)' }}>
                <div style={avatarStyle}>{initial(thread.userName || thread.userPhone)}</div>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ color: 'var(--text-1)', fontWeight: 800, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{thread.userName || thread.userPhone || thread.id}</div>
                  <div style={{ color: thread.status === 'resolved' ? 'var(--green)' : 'var(--gold)' , fontSize: 11 }}>{thread.status === 'resolved' ? 'Resolved' : 'Open'}{thread.unreadForSupport ? ` - ${thread.unreadForSupport} new` : ''}</div>
                </div>
                <div style={{ color: 'var(--text-3)', fontSize: 10 }}>{thread.lastMessageAt ? new Date(thread.lastMessageAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : ''}</div>
              </button>
            ))}
            {visibleThreads.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 13, padding: 18 }}>No chats found.</div>}
          </div>
        </aside>

        <section style={chatStyle}>
          {selected ? (
            <>
              <header style={chatHeaderStyle}>
                <div style={avatarStyle}>{initial(selected.userName || selected.userPhone)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--text-1)', fontWeight: 800 }}>{selected.userName || selected.userPhone || selected.id}</div>
                  <div style={{ color: 'var(--text-3)', fontSize: 12 }}>{selected.userPhone || selected.userId} - {selected.userTier || 'free'}</div>
                </div>
                <button onClick={() => setResolved(selected.status !== 'resolved')} style={resolveBtnStyle}>{selected.status === 'resolved' ? 'Reopen' : 'Resolve'}</button>
              </header>
              <div style={messagesStyle}>
                {messages.map(message => (
                  <div key={message.id} style={{ display: 'flex', justifyContent: message.sender === 'support' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ ...bubbleStyle, ...(message.sender === 'support' ? supportBubbleStyle : userBubbleStyle) }}>
                      <div>{message.text}</div>
                      <div style={timeStyle}>{new Date(message.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={replyStyle}>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendReply(); }} placeholder="Type a reply..." style={replyInputStyle} />
                <button onClick={sendReply} style={sendBtnStyle}><Send size={16} /></button>
              </div>
            </>
          ) : <div style={emptyStyle}><MessageCircle size={32} /> Select a chat to reply.</div>}
        </section>
      </div>
    </div>
  );
};

const heading: React.CSSProperties = { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: 0 };
const subhead: React.CSSProperties = { color: 'var(--text-3)', fontSize: 12, marginTop: 4 };
const shellStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', minHeight: 560, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' };
const listStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', minHeight: 0, background: 'var(--bg-card)' };
const listHeaderStyle: React.CSSProperties = { background: 'var(--btn-gradient)', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 };
const searchStyle: React.CSSProperties = { border: '1px solid var(--border-s)', borderRadius: 999, padding: '8px 12px', outline: 'none', fontSize: 12, background: 'var(--bg-card)', color: 'var(--text-1)' };
const tabsStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' };
const tabStyle: React.CSSProperties = { border: 'none', borderBottom: '2px solid transparent', background: 'transparent', padding: '9px 6px', fontWeight: 800, fontSize: 11, textTransform: 'capitalize', cursor: 'pointer' };
const threadStyle: React.CSSProperties = { width: '100%', border: 'none', borderBottom: '1px solid var(--border)', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' };
const avatarStyle: React.CSSProperties = { width: 34, height: 34, borderRadius: '50%', background: 'var(--btn-gradient)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 };
const chatStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', minWidth: 0 };
const chatHeaderStyle: React.CSSProperties = { padding: 12, background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 };
const resolveBtnStyle: React.CSSProperties = { border: '1px solid var(--border-acc)', borderRadius: 8, background: 'var(--bg-card)', color: 'var(--gold)', padding: '7px 10px', fontWeight: 800, cursor: 'pointer' };
const messagesStyle: React.CSSProperties = { flex: 1, padding: 18, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 };
const bubbleStyle: React.CSSProperties = { maxWidth: '70%', padding: '8px 11px', borderRadius: 12, fontSize: 13, lineHeight: 1.35 };
const userBubbleStyle: React.CSSProperties = { background: 'var(--bg-card)', color: 'var(--text-1)', border: '1px solid var(--border)', borderBottomLeftRadius: 4 };
const supportBubbleStyle: React.CSSProperties = { background: 'var(--btn-gradient)', color: '#fff', borderBottomRightRadius: 4 };
const timeStyle: React.CSSProperties = { opacity: 0.65, fontSize: 10, marginTop: 4, textAlign: 'right' };
const replyStyle: React.CSSProperties = { display: 'flex', gap: 8, padding: 12, background: 'var(--bg-card)', borderTop: '1px solid var(--border)' };
const replyInputStyle: React.CSSProperties = { flex: 1, border: '1px solid var(--border-s)', borderRadius: 999, padding: '10px 12px', outline: 'none', background: 'var(--bg-surface)', color: 'var(--text-1)' };
const sendBtnStyle: React.CSSProperties = { width: 42, border: 'none', borderRadius: '50%', background: 'var(--btn-gradient)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' };
const emptyStyle: React.CSSProperties = { height: '100%', display: 'grid', placeItems: 'center', color: 'var(--text-3)', gap: 10 };
