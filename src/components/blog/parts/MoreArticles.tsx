import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useArticles } from '../../../hooks/useArticles';
import { useCategories } from '../../../hooks/useCategories';
import { timeAgo } from '../../../lib/blog/timeAgo';

// "Top stories"-style list of other published articles, shown at the end of an article.
export const MoreArticles: React.FC<{ currentSlug: string }> = ({ currentSlug }) => {
  const { articles, loading } = useArticles();
  const { categories } = useCategories();
  const catById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const items = useMemo(
    () => articles.filter(a => a.slug !== currentSlug).slice(0, 6),
    [articles, currentSlug],
  );

  if (loading || items.length === 0) return null;

  return (
    <section style={S.wrap}>
      <div style={S.header}>More from the Hub</div>
      <div>
        {items.map(a => (
          <Link key={a.slug} to={`/blog/${a.slug}`} style={S.item}>
            <div style={S.title}>{a.title}</div>
            <div style={S.meta}>
              {catById.get(a.categoryId) && <span style={S.tag}>{catById.get(a.categoryId)!.name}</span>}
              {a.publishedAt && <span style={S.time}><Clock size={12} /> {timeAgo(a.publishedAt)}</span>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

const S: Record<string, React.CSSProperties> = {
  wrap: { marginTop: 34 },
  header: { background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', fontWeight: 800, fontSize: 13, letterSpacing: '.06em', textTransform: 'uppercase', padding: '10px 14px', borderRadius: 8 },
  item: { display: 'block', padding: '15px 2px', borderBottom: '1px solid var(--border)', textDecoration: 'none', color: 'inherit' },
  title: { fontFamily: 'Cormorant Garamond, serif', fontSize: 19, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.25 },
  meta: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, fontSize: 12, color: 'var(--text-3)' },
  tag: { fontSize: 10.5, fontWeight: 700, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid var(--border-acc)', padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '.03em' },
  time: { display: 'inline-flex', alignItems: 'center', gap: 4 },
};
