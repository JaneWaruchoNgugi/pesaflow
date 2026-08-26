import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useArticle } from '../../hooks/useArticle';
import { useCategories } from '../../hooks/useCategories';
import { parseSegments } from '../../lib/blog/markdown';
import { buildMetaTags } from '../../lib/blog/seo';
import { useSEO } from '../../lib/blog/useSEO';
import { MarkdownRenderer } from './content/MarkdownRenderer';
import { Calculator } from './content/shortcodes/Calculator';
import { Chart } from './content/shortcodes/Chart';
import { YouTube } from './content/shortcodes/YouTube';
import { ReadingProgress } from './parts/ReadingProgress';
import { MoreArticles } from './parts/MoreArticles';
import { ShareBar } from './parts/ShareBar';
import { EngagementBar } from './parts/EngagementBar';
import { AskAiCard } from './parts/AskAiCard';
import { SignUpPrompt } from './parts/SignUpPrompt';
import { EmptyState } from './parts/EmptyState';
import type { ContentSegment } from '../../types';

const renderSegment = (seg: ContentSegment, i: number): React.ReactNode => {
  if (seg.kind === 'markdown') return <MarkdownRenderer key={i} text={seg.text} />;
  switch (seg.name) {
    case 'calculator': return <Calculator key={i} type={seg.attrs.type} />;
    case 'chart': return <Chart key={i} data={seg.attrs.data} />;
    case 'youtube': return <YouTube key={i} id={seg.attrs.id} title={seg.attrs.title} />;
    default: return null; // unknown shortcode degrades gracefully
  }
};

export const ArticlePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { article, loading } = useArticle(slug);
  const { categories } = useCategories();
  const [gate, setGate] = useState<null | { title: string; body: string }>(null);

  const segments = useMemo(() => (article ? parseSegments(article.bodyMarkdown) : []), [article]);
  const category = article ? categories.find(c => c.id === article.categoryId) : undefined;
  const meta = article ? buildMetaTags(article, window.location.origin) : null;

  useSEO({
    title: meta?.title ?? 'Article — PesaFlow',
    description: meta?.description,
    ogImage: meta?.ogImage,
    canonical: meta?.canonical,
    type: 'article',
  });

  if (loading) return <div style={S.loading}>Loading…</div>;
  if (!article) return (
    <EmptyState title="Article not found" body="This article may have been moved or unpublished. Browse the latest guides instead." />
  );

  const openGate = () => setGate({ title: "Join the conversation", body: "Create a free PesaFlow account to like, comment, and save articles — and get advice tailored to your money." });

  return (
    <article style={S.page}>
      <ReadingProgress />
      <Link to="/blog" style={S.back}><ArrowLeft size={16} /> All articles</Link>
      {category && <Link to={`/blog/category/${category.slug}`} style={S.pill}>{category.name}</Link>}
      <h1 style={S.title}>{article.title}</h1>
      <div style={S.byline}>
        <span style={S.avatar} />
        <span>{article.authorName}</span><span>·</span>
        {article.publishedAt && <span>{new Date(article.publishedAt).toLocaleDateString()}</span>}
        <span>·</span><span>{article.readMinutes} min read</span>
      </div>
      {article.coverImageUrl && <img src={article.coverImageUrl} alt="" style={S.cover} />}

      <div style={S.body}>{segments.map(renderSegment)}</div>

      <div style={S.engageRow}>
        <EngagementBar article={article} onGate={openGate} />
        <div style={{ marginLeft: 'auto' }}>
          <ShareBar url={window.location.href} title={article.title} />
        </div>
      </div>

      <AskAiCard
        examplePrompt="I earn KES 1,200 per day. How much should I save?"
        onAsk={() => setGate({ title: 'Ask PesaFlow AI', body: 'Create a free account so PesaFlow AI can answer using your real income and goals.' })}
      />

      <MoreArticles currentSlug={article.slug} />

      {gate && <SignUpPrompt title={gate.title} body={gate.body} onClose={() => setGate(null)} />}
    </article>
  );
};

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 720, margin: '0 auto', padding: '24px 18px 64px' },
  loading: { textAlign: 'center', color: 'var(--text-3)', padding: 48 },
  back: { display: 'flex', width: 'fit-content', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-2)', textDecoration: 'none', marginBottom: 14 },
  pill: { display: 'inline-block', fontSize: 11, fontWeight: 700, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid var(--border-acc)', padding: '4px 11px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '.04em', textDecoration: 'none' },
  title: { fontFamily: 'Cormorant Garamond, serif', fontSize: 34, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.12, margin: '12px 0 10px' },
  byline: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-3)', paddingBottom: 14, borderBottom: '1px solid var(--border)' },
  avatar: { width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #F59E0B, #D97706)' },
  // Show the whole cover (no cropping): scale to the column width at natural aspect ratio.
  cover: { display: 'block', width: '100%', height: 'auto', maxHeight: '75vh', objectFit: 'contain', borderRadius: 14, margin: '16px 0', background: 'var(--bg-surface)' },
  body: { fontSize: 16.5, lineHeight: 1.75, color: 'var(--text-1)' },
  engageRow: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '20px 0', padding: '14px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' },
};
