import React from 'react';
import { BookOpen } from 'lucide-react';

export const EmptyState: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div style={S.wrap}>
    <div style={S.icon}><BookOpen size={26} color="var(--gold)" /></div>
    <div style={S.title}>{title}</div>
    <div style={S.body}>{body}</div>
  </div>
);

const S: Record<string, React.CSSProperties> = {
  wrap: { textAlign: 'center', padding: '56px 20px', maxWidth: 420, margin: '0 auto' },
  icon: { width: 56, height: 56, borderRadius: 16, display: 'grid', placeItems: 'center', background: 'var(--gold-dim)', border: '1px solid var(--border-acc)', margin: '0 auto 14px' },
  title: { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 },
  body: { fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 },
};
