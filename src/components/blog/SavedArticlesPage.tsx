import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bookmark, X } from 'lucide-react';
import { useBlogUser } from '../../hooks/useBlogUser';
import { useSavedArticles } from '../../hooks/useSavedArticles';
import { useCategories } from '../../hooks/useCategories';
import { useSEO } from '../../lib/blog/useSEO';

export const SavedArticlesPage: React.FC = () => {
  const { user, signedIn, ready: userReady } = useBlogUser();
  const { list, remove, ready } = useSavedArticles(user?.uid);
  const { categories } = useCategories();
  const catById = React.useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  useSEO({ title: 'Saved articles — PesaFlow', description: 'Your bookmarked money guides.' });

  return (
    <div style={S.page}>
      <Link to="/blog" style={S.back}><ArrowLeft size={16} /> All articles</Link>
      <div style={S.head}>
        <Bookmark size={22} strokeWidth={2.1} style={{ color: 'var(--gold)' }} />
        <h1 style={S.title}>Saved articles</h1>
      </div>

      {userReady && !signedIn ? (
        <div style={S.empty}>
          <p style={S.emptyText}>Log in to see the articles you've saved.</p>
          <a href="/?intent=login" style={S.cta}>Log in</a>
        </div>
      ) : !ready ? (
        <div style={S.loading}>Loading…</div>
      ) : list.length === 0 ? (
        <div style={S.empty}>
          <p style={S.emptyText}>You haven't saved any articles yet. Tap <Bookmark size={13} style={{ verticalAlign: 'middle' }} /> Save on any article to bookmark it here.</p>
          <Link to="/blog" style={S.cta}>Browse the hub</Link>
        </div>
      ) : (
        <div style={S.grid}>
          {list.map(a => {
            const cat = catById.get(a.categoryId);
            return (
              <div key={a.slug} style={S.card}>
                <Link to={`/blog/${a.slug}`} style={S.cardLink}>
                  {a.coverImageUrl
                    ? <img src={a.coverImageUrl} alt="" style={S.cover} />
                    : <div style={{ ...S.cover, ...S.coverPlaceholder }}><Bookmark size={22} style={{ color: 'var(--text-3)' }} /></div>}
                  <div style={S.body}>
                    {cat && <span style={S.pill}>{cat.name}</span>}
                    <div style={S.cardTitle}>{a.title}</div>
                    {a.excerpt && <div style={S.excerpt}>{a.excerpt}</div>}
                  </div>
                </Link>
                <button style={S.remove} onClick={() => remove(a.slug)} aria-label="Remove from saved" title="Remove from saved"><X size={15} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1000, margin: '0 auto', padding: '24px 18px 64px' },
  back: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-2)', textDecoration: 'none', marginBottom: 14 },
  head: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 },
  title: { fontFamily: 'Cormorant Garamond, serif', fontSize: 30, fontWeight: 700, color: 'var(--text-1)', margin: 0 },
  loading: { textAlign: 'center', color: 'var(--text-3)', padding: 40 },
  empty: { textAlign: 'center', padding: '40px 20px', background: 'var(--bg-card)', border: '1px dashed var(--border-s)', borderRadius: 14 },
  emptyText: { fontSize: 14.5, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 14 },
  cta: { display: 'inline-block', padding: '10px 18px', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 },
  card: { position: 'relative', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' },
  cardLink: { display: 'block', textDecoration: 'none', color: 'inherit' },
  cover: { display: 'block', width: '100%', height: 150, objectFit: 'cover', background: 'var(--bg-surface)' },
  coverPlaceholder: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16 },
  pill: { display: 'inline-block', fontSize: 10.5, fontWeight: 700, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid var(--border-acc)', padding: '3px 9px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 },
  cardTitle: { fontFamily: 'Cormorant Garamond, serif', fontSize: 19, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.2, marginBottom: 6 },
  excerpt: { fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  remove: { position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: '50%', background: 'rgba(10,15,31,0.55)', color: '#fff', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' },
};
