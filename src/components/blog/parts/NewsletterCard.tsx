import React, { useState } from 'react';
import { Mail, ArrowRight, Check } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

// Compact newsletter signup for the article sidebar. Writes to the same
// `subscribers` collection the landing page uses (doc id = sanitized email,
// merged so re-subscribing updates rather than duplicates).
export const NewsletterCard: React.FC = () => {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return;
    setDone(true);
    setEmail('');
    try {
      await setDoc(doc(db, 'subscribers', clean.replace(/[^a-z0-9]/g, '_')), {
        email: clean, source: 'blog', subscribedAt: serverTimestamp(), active: true,
      }, { merge: true });
    } catch (err) {
      console.error('subscribe failed:', err);
    }
  };

  return (
    <div style={S.card}>
      <div style={S.head}><Mail size={16} strokeWidth={2.2} style={{ color: 'var(--gold)' }} /><span style={S.title}>Weekly money tips</span></div>
      <div style={S.desc}>Practical Kenyan money guides in your inbox every Friday. No spam.</div>
      <form style={S.form} onSubmit={subscribe}>
        <input
          style={S.input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={done ? "Thanks — you're in!" : 'Enter your email'}
          disabled={done}
          aria-label="Email address"
        />
        <button style={S.btn} type="submit" aria-label="Subscribe" disabled={done}>
          {done ? <Check size={16} strokeWidth={2.6} /> : <ArrowRight size={16} strokeWidth={2.4} />}
        </button>
      </form>
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  card:  { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 },
  head:  { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  title: { fontFamily: 'Cormorant Garamond, serif', fontSize: 17, fontWeight: 700, color: 'var(--text-1)' },
  desc:  { fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 12 },
  form:  { display: 'flex', gap: 8 },
  input: { flex: 1, minWidth: 0, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 9, padding: '9px 12px', color: 'var(--text-1)', fontSize: 13 },
  btn:   { flexShrink: 0, width: 38, background: 'linear-gradient(135deg, var(--gold-l), var(--gold))', color: '#0A1628', border: 'none', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
};
