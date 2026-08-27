import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { useArticles } from '../../hooks/useArticles';
import { useCategories } from '../../hooks/useCategories';
import { useArticleCounts } from '../../hooks/useArticleCounts';
import { pickFeatured, searchArticles } from '../../lib/blog/articleSelectors';
import { useSEO } from '../../lib/blog/useSEO';
import { FeaturedHero } from './parts/FeaturedHero';
import { ArticleCard } from './parts/ArticleCard';
import { CategoryPills } from './parts/CategoryPills';
import { SearchBar } from './parts/SearchBar';
import { EmptyState } from './parts/EmptyState';

export const BlogHome: React.FC = () => {
  useSEO({
    title: 'Financial Learning Hub — PesaFlow',
    description: 'Practical money tips, investing guides, budgeting advice, and wealth-building strategies designed for everyday Kenyans.',
    canonical: `${window.location.origin}/blog`,
  });

  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const { categories } = useCategories();
  const { articles, loadMore, hasMore, loading } = useArticles(activeCat ?? undefined);

  const catById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const featured = useMemo(() => pickFeatured(articles), [articles]);
  const visible = useMemo(
    () => searchArticles(articles, q).filter(a => a.slug !== featured?.slug),
    [articles, q, featured],
  );

  // Sync the stored counts on each card/hero with the real like & comment subcollections.
  const countMap = useArticleCounts(useMemo(() => articles.map(a => a.slug), [articles]));
  const withCounts = <T extends { slug: string; counts: { likes: number; comments: number; views: number } }>(a: T): T =>
    countMap[a.slug] ? { ...a, counts: { ...a.counts, ...countMap[a.slug] } } : a;

  return (
    <div style={S.page}>
      <div style={S.topbar}>
        <Link to="/blog/saved" style={S.savedLink}><Bookmark size={15} strokeWidth={2.2} /> Saved</Link>
      </div>
      <section style={S.hero}>
        <div style={S.kicker}>Financial Learning Hub</div>
        <h1 style={S.h1}>Practical money skills for everyday Kenyans</h1>
        <p style={S.sub}>Budgeting, investing, MMFs, SACCOs & wealth-building — explained simply.</p>
      </section>

      {featured && !loading && (
        <div style={S.block}><FeaturedHero article={withCounts(featured)} category={catById.get(featured.categoryId)} /></div>
      )}

      <div style={{ ...S.block, ...S.searchWrap }}><SearchBar value={q} onChange={setQ} /></div>
      <div style={S.block}><CategoryPills categories={categories} activeId={activeCat} onSelect={setActiveCat} /></div>

      {!loading && articles.length === 0 && (
        <EmptyState title="No articles yet" body="Fresh money guides are on the way. Check back soon — or open PesaFlow to start tracking your finances today." />
      )}

      {visible.length > 0 && (
        <div style={S.grid}>
          {visible.map(a => <ArticleCard key={a.slug} article={withCounts(a)} category={catById.get(a.categoryId)} />)}
        </div>
      )}

      {loading && <div style={S.loading}>Loading…</div>}

      {hasMore && !loading && !q && (
        <div style={S.moreWrap}><button style={S.more} onClick={loadMore}>Load more articles</button></div>
      )}
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '20px 16px 60px' },
  topbar: { display: 'flex', justifyContent: 'flex-end' },
  savedLink: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid var(--border-acc)', padding: '7px 14px', borderRadius: 999, textDecoration: 'none' },
  hero: { textAlign: 'center', padding: '18px 0 24px' },
  kicker: { display: 'inline-block', fontSize: 11, fontWeight: 700, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid var(--border-acc)', padding: '4px 12px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '.05em' },
  h1: { fontFamily: 'Cormorant Garamond, serif', fontSize: 38, fontWeight: 700, color: 'var(--text-1)', margin: '12px 0 8px', lineHeight: 1.08 },
  sub: { fontSize: 15, color: 'var(--text-2)', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 },
  block: { marginBottom: 18 },
  searchWrap: { maxWidth: 620, marginLeft: 'auto', marginRight: 'auto', width: '100%' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 },
  loading: { textAlign: 'center', color: 'var(--text-3)', padding: 24 },
  moreWrap: { textAlign: 'center', marginTop: 24 },
  more: { padding: '11px 20px', background: 'var(--bg-card)', border: '1px solid var(--border-acc)', borderRadius: 10, fontWeight: 700, fontSize: 14, color: 'var(--gold)', cursor: 'pointer' },
};
