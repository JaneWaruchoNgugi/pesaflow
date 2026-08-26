import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle } from 'lucide-react';
import type { Article, Category } from '../../../types';

export const ArticleCard: React.FC<{ article: Article; category?: Category }> = ({ article, category }) => (
  <Link to={`/blog/${article.slug}`} style={S.card}>
    <div style={{ ...S.cover, backgroundImage: article.coverImageUrl ? `url(${article.coverImageUrl})` : undefined }} />
    <div style={S.body}>
      {category && <span style={S.pill}>{category.name}</span>}
      <div style={S.title}>{article.title}</div>
      <div style={S.excerpt}>{article.excerpt}</div>
      <div style={S.meta}>
        <span>{article.authorName}</span><span>·</span><span>{article.readMinutes} min</span>
        <span style={S.counts}><Heart size={12} /> {article.counts.likes} <MessageCircle size={12} /> {article.counts.comments}</span>
      </div>
    </div>
  </Link>
);

const S: Record<string, React.CSSProperties> = {
  card: { display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', textDecoration: 'none', color: 'inherit', boxShadow: 'var(--shadow-card)' },
  cover: { height: 150, background: 'linear-gradient(135deg, #FDBA74, #D97706 60%, #0A1628)', backgroundSize: 'cover', backgroundPosition: 'center' },
  body: { padding: 14 },
  pill: { display: 'inline-block', fontSize: 10, fontWeight: 700, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid var(--border-acc)', padding: '3px 9px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '.04em' },
  title: { fontFamily: 'Cormorant Garamond, serif', fontSize: 19, fontWeight: 700, color: 'var(--text-1)', margin: '8px 0 4px', lineHeight: 1.2 },
  excerpt: { fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 },
  meta: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-3)', marginTop: 10 },
  counts: { display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 'auto' },
};
