import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { addDoc, collection, doc, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { UserProfile } from '../types';

interface SupportChatWidgetProps {
  profile: UserProfile;
}

interface SupportMessage {
  id: string;
  sender: 'user' | 'support';
  text: string;
  createdAt: string;
  senderName?: string;
}

const phoneToId = (phone?: string) => (phone || '').replace(/\s+/g, '');

export const SupportChatWidget: React.FC<SupportChatWidgetProps> = ({ profile }) => {
  const userId = useMemo(() => profile?.uid || phoneToId(profile?.phone), [profile?.uid, profile?.phone]);
  const displayName = profile?.name || 'there';
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const threadRef = doc(db, 'supportThreads', userId);
    const unsubThread = onSnapshot(threadRef, snap => {
      const data = snap.data() as { unreadForUser?: number } | undefined;
      setUnread(data?.unreadForUser || 0);
    });
    const unsubMessages = onSnapshot(
      query(collection(db, 'supportThreads', userId, 'messages'), orderBy('createdAt', 'asc')),
      snap => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }) as SupportMessage))
    );
    return () => { unsubThread(); unsubMessages(); };
  }, [userId]);

  useEffect(() => {
    if (!userId || !open || !unread) return;
    updateDoc(doc(db, 'supportThreads', userId), { unreadForUser: 0 }).catch(() => undefined);
  }, [open, unread, userId]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!userId || !text || sending) return;
    setSending(true);
    const now = new Date().toISOString();
    const threadRef = doc(db, 'supportThreads', userId);
    await setDoc(threadRef, {
      userId,
      userName: profile?.name || 'PesaFlow user',
      userPhone: profile?.phone || userId,
      userTier: profile?.tier || 'free',
      status: 'open',
      lastMessage: text,
      lastMessageAt: now,
      lastSender: 'user',
      unreadForSupport: 1,
      updatedAt: now,
      createdAt: now,
    }, { merge: true });
    await addDoc(collection(db, 'supportThreads', userId, 'messages'), {
      sender: 'user',
      senderName: profile?.name || 'PesaFlow user',
      text,
      createdAt: now,
    });
    setInput('');
    setSending(false);
  };

  if (!userId) return null;

  return (
    <div className="fw-support-widget" style={rootStyle}>
      {open && (
        <section style={panelStyle}>
          <header style={headerStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageCircle size={17} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 13 }}>Support</div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>We reply within minutes</div>
              </div>
            </div>
          </header>

          <div style={messagesStyle}>
            {messages.length === 0 && (
              <div style={emptyStyle}>Hi {displayName.split(' ')[0] || 'there'}! How can we help?</div>
            )}
            {messages.map(message => (
              <div key={message.id} style={{ display: 'flex', justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ ...bubbleStyle, ...(message.sender === 'user' ? userBubbleStyle : supportBubbleStyle) }}>
                  <div>{message.text}</div>
                  <div style={timeStyle}>{new Date(message.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={inputWrapStyle}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
              placeholder="Type your message..."
              style={inputStyle}
            />
            <button onClick={sendMessage} disabled={sending || !input.trim()} style={sendBtnStyle} aria-label="Send support message"><Send size={17} /></button>
          </div>
        </section>
      )}
      <button onClick={() => setOpen(v => !v)} style={fabStyle} aria-label={open ? 'Close support chat' : 'Open support chat'}>
        {open ? <X size={24} /> : <MessageCircle size={24} />}
        {!open && unread > 0 && <span style={badgeStyle}>{unread}</span>}
      </button>
    </div>
  );
};

const rootStyle: React.CSSProperties = { position: 'fixed', right: 18, bottom: 'calc(55px + env(safe-area-inset-bottom, 0px))', zIndex: 450 };
const panelStyle: React.CSSProperties = { width: 330, maxWidth: 'calc(100vw - 32px)', height: 430, maxHeight: 'calc(100vh - 100px)', background: 'var(--bg-card)', border: '1px solid var(--border-acc)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', overflow: 'hidden', marginBottom: 12, display: 'flex', flexDirection: 'column' };
const headerStyle: React.CSSProperties = { background: 'var(--btn-gradient)', color: '#fff', padding: '11px 13px' };
const messagesStyle: React.CSSProperties = { flex: 1, padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 };
const emptyStyle: React.CSSProperties = { color: 'var(--text-3)', fontSize: 12, textAlign: 'center', marginTop: 26 };
const bubbleStyle: React.CSSProperties = { maxWidth: '82%', padding: '8px 10px', borderRadius: 12, fontSize: 13, lineHeight: 1.35 };
const userBubbleStyle: React.CSSProperties = { background: 'var(--btn-gradient)', color: '#fff', borderBottomRightRadius: 4 };
const supportBubbleStyle: React.CSSProperties = { background: 'var(--bg-surface)', color: 'var(--text-1)', border: '1px solid var(--border)', borderBottomLeftRadius: 4 };
const timeStyle: React.CSSProperties = { opacity: 0.65, fontSize: 10, marginTop: 4, textAlign: 'right' };
const inputWrapStyle: React.CSSProperties = { display: 'flex', gap: 7, padding: 8, borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' };
const inputStyle: React.CSSProperties = { flex: 1, minWidth: 0, background: 'var(--bg-card)', color: 'var(--text-1)', border: '1px solid var(--border-s)', borderRadius: 7, padding: '10px 9px', fontSize: 13, outline: 'none' };
const sendBtnStyle: React.CSSProperties = { width: 42, border: 'none', borderRadius: 8, background: 'var(--btn-gradient)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' };
const fabStyle: React.CSSProperties = { width: 56, height: 56, borderRadius: '50%', border: 'none', background: 'var(--btn-gradient)', color: '#fff', display: 'grid', placeItems: 'center', marginLeft: 'auto', cursor: 'pointer', boxShadow: '0 12px 32px var(--gold-glow)', position: 'relative' };
const badgeStyle: React.CSSProperties = { position: 'absolute', right: -2, top: -2, minWidth: 18, height: 18, borderRadius: 999, background: 'var(--red)', color: '#fff', fontSize: 10, display: 'grid', placeItems: 'center', border: '2px solid var(--bg-card)' };
