import React from 'react';
import { Heart, MessageCircle, Bookmark } from 'lucide-react';
import type { Article } from '../../../types';

interface Props { article: Article; onGate: () => void; }

// Phase 1: buttons are visible and show counts, but any interaction opens the sign-up
// prompt. Real persistence arrives in Phase 2.
export const EngagementBar: React.FC<Props> = ({ article, onGate }) => (
  <div style={S.wrap}>
    <button style={S.btn} onClick={onGate}><Heart size={15} /> {article.counts.likes}</button>
    <button style={S.btn} onClick={onGate}><MessageCircle size={15} /> {article.counts.comments}</button>
    <button style={S.btn} onClick={onGate}><Bookmark size={15} /> Save</button>
  </div>
);

const S: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', gap: 8 },
  btn: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-2)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 999, padding: '7px 13px', cursor: 'pointer' },
};
