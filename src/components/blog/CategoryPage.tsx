import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useCategories } from '../../hooks/useCategories';
import { useArticles } from '../../hooks/useArticles';
import { useArticleCounts } from '../../hooks/useArticleCounts';
import { useSEO } from '../../lib/blog/useSEO';
import { ArticleCard } from './parts/ArticleCard';
import { EmptyState } from './parts/EmptyState';

export const CategoryPage: React.FC = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const { categories } = useCategories();
  const category = useMemo(() => categories.find(c => c.slug === categorySlug), [categories, categorySlug]);
  const { articles, loadMore, hasMore, loading } = useArticles(category?.id);
  const catById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const countMap = useArticleCounts(useMemo(() => articles.map(a => a.slug), [articles]));
  const withCounts = <T extends { slug: string; counts: { likes: number; comments: number; views: number } }>(a: T): T =>
    countMap[a.slug] ? { ...a, counts: { ...a.counts, ...countMap[a.slug] } } : a;

  useSEO({
    title: `${category?.name ?? 'Category'} — PesaFlow Learn`,
    description: category?.description,
    canonical: `${window.location.origin}/blog/category/${categorySlug}`,
  });

  return (
    <div style={S.page}>
      <h1 style={S.h1}>{category?.name ?? 'Category'}</h1>
      {category?.description && <p style={S.desc}>{category.description}</p>}

      {!loading && articles.length === 0 && (
        <EmptyState title="Nothing here yet" body="No articles in this category yet. Explore other topics from the home page." />
      )}
      <div style={S.grid}>
        {articles.map(a => <ArticleCard key={a.slug} article={withCounts(a)} category={catById.get(a.categoryId)} />)}
      </div>
      {loading && <div style={S.loading}>Loading…</div>}
      {hasMore && !loading && <div style={S.moreWrap}><button style={S.more} onClick={loadMore}>Load more</button></div>}
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '24px 16px 60px' },
  h1: { fontFamily: 'Cormorant Garamond, serif', fontSize: 32, fontWeight: 700, color: 'var(--text-1)' },
  desc: { fontSize: 15, color: 'var(--text-2)', margin: '6px 0 22px', maxWidth: 560 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 },
  loading: { textAlign: 'center', color: 'var(--text-3)', padding: 24 },
  moreWrap: { textAlign: 'center', marginTop: 24 },
  more: { padding: '11px 20px', background: 'var(--bg-card)', border: '1px solid var(--border-acc)', borderRadius: 10, fontWeight: 700, fontSize: 14, color: 'var(--gold)', cursor: 'pointer' },
};
