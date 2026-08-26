import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle } from 'lucide-react';
import type { Article, Category } from '../../../types';

export const FeaturedHero: React.FC<{ article: Article; category?: Category }> = ({ article, category }) => (
  <Link to={`/blog/${article.slug}`} style={S.wrap}>
    {article.coverImageUrl && <div style={{ ...S.cover, backgroundImage: `url(${article.coverImageUrl})` }} />}
    <div style={S.inner}>
      <span style={S.badge}>{category ? category.name : 'Featured'}</span>
      <div style={S.title}>{article.title}</div>
      <div style={S.excerpt}>{article.excerpt}</div>
      <div style={S.meta}>
        {article.authorName} · {article.readMinutes} min read
        <span style={S.counts}><Heart size={13} /> {article.counts.likes} <MessageCircle size={13} /> {article.counts.comments}</span>
      </div>
    </div>
  </Link>
);

const S: Record<string, React.CSSProperties> = {
  wrap: { position: 'relative', display: 'block', overflow: 'hidden', borderRadius: 18, minHeight: 260, background: 'linear-gradient(135deg, #0A1628, #1E293B)', textDecoration: 'none', color: '#fff', boxShadow: 'var(--shadow-lg)' },
  cover: { position: 'absolute', inset: 0, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.35 },
  inner: { position: 'relative', zIndex: 1, padding: '28px 26px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: 260 },
  badge: { alignSelf: 'flex-start', fontSize: 11, fontWeight: 700, color: '#FCD34D', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', padding: '4px 11px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '.04em' },
  title: { fontFamily: 'Cormorant Garamond, serif', fontSize: 30, fontWeight: 700, lineHeight: 1.1, margin: '12px 0 6px', maxWidth: 640 },
  excerpt: { fontSize: 14, color: '#CBD5E1', maxWidth: 560, lineHeight: 1.5 },
  meta: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#94A3B8', marginTop: 14 },
  counts: { display: 'inline-flex', alignItems: 'center', gap: 5 },
};
