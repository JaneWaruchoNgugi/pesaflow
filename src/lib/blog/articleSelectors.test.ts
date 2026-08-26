import { describe, it, expect } from 'vitest';
import { pickFeatured, searchArticles } from './articleSelectors';
import type { Article } from '../../types';

const make = (over: Partial<Article>): Article => ({
  slug: 's', title: 'T', excerpt: 'E', coverImageUrl: '', categoryId: 'saving',
  authorName: 'A', authorAvatarUrl: '', bodyMarkdown: '', status: 'published',
  featured: false, readMinutes: 3, publishedAt: '2026-01-01T00:00:00.000Z',
  scheduledFor: null, createdAt: '', updatedAt: '',
  seo: { metaTitle: '', metaDescription: '', ogImageUrl: '' },
  counts: { likes: 0, comments: 0, views: 0 }, ...over,
});

describe('pickFeatured', () => {
  it('returns the flagged article', () => {
    const list = [make({ slug: 'a' }), make({ slug: 'b', featured: true })];
    expect(pickFeatured(list)?.slug).toBe('b');
  });
  it('falls back to the newest when none flagged', () => {
    const list = [
      make({ slug: 'old', publishedAt: '2026-01-01T00:00:00.000Z' }),
      make({ slug: 'new', publishedAt: '2026-06-01T00:00:00.000Z' }),
    ];
    expect(pickFeatured(list)?.slug).toBe('new');
  });
  it('returns null for empty list', () => {
    expect(pickFeatured([])).toBeNull();
  });
});

describe('searchArticles', () => {
  const list = [
    make({ slug: 'a', title: 'How to save on M-Pesa', excerpt: 'fees' }),
    make({ slug: 'b', title: 'Best MMF', excerpt: 'money market fund', categoryId: 'mmfs' }),
  ];
  it('returns all for empty query', () => {
    expect(searchArticles(list, '')).toHaveLength(2);
  });
  it('matches title case-insensitively', () => {
    expect(searchArticles(list, 'mpesa').map(a => a.slug)).toEqual([]); // no false match
    expect(searchArticles(list, 'm-pesa').map(a => a.slug)).toEqual(['a']);
  });
  it('matches excerpt', () => {
    expect(searchArticles(list, 'money market').map(a => a.slug)).toEqual(['b']);
  });
});
