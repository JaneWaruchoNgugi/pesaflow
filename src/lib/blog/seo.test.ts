import { describe, it, expect } from 'vitest';
import { buildMetaTags } from './seo';
import type { Article } from '../../types';

const article = {
  slug: 'save-money', title: 'How to save money in Kenya', excerpt: 'Practical tips.',
  coverImageUrl: 'https://img/cover.jpg', categoryId: 'saving', authorName: 'Amina',
  authorAvatarUrl: '', bodyMarkdown: '', status: 'published', featured: true, readMinutes: 5,
  publishedAt: '2026-01-01T00:00:00.000Z', scheduledFor: null, createdAt: '', updatedAt: '',
  seo: { metaTitle: '', metaDescription: '', ogImageUrl: '' },
  counts: { likes: 0, comments: 0, views: 0 },
} as Article;

describe('buildMetaTags', () => {
  it('uses seo overrides when present', () => {
    const a = { ...article, seo: { metaTitle: 'Custom T', metaDescription: 'Custom D', ogImageUrl: 'https://img/og.jpg' } };
    const tags = buildMetaTags(a, 'https://pesaflow.app');
    expect(tags.title).toBe('Custom T');
    expect(tags.description).toBe('Custom D');
    expect(tags.ogImage).toBe('https://img/og.jpg');
  });
  it('falls back to title/excerpt/cover', () => {
    const tags = buildMetaTags(article, 'https://pesaflow.app');
    expect(tags.title).toBe('How to save money in Kenya');
    expect(tags.description).toBe('Practical tips.');
    expect(tags.ogImage).toBe('https://img/cover.jpg');
    expect(tags.canonical).toBe('https://pesaflow.app/blog/save-money');
  });
});
