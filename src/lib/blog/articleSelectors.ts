import type { Article } from '../../types';

const time = (iso: string | null) => (iso ? Date.parse(iso) : 0);

/** The featured article: the flagged one, else the most recently published. */
export const pickFeatured = (articles: Article[]): Article | null => {
  if (articles.length === 0) return null;
  const flagged = articles.find(a => a.featured);
  if (flagged) return flagged;
  return [...articles].sort((a, b) => time(b.publishedAt) - time(a.publishedAt))[0];
};

/** Case-insensitive substring match over title + excerpt. */
export const searchArticles = (articles: Article[], query: string): Article[] => {
  const q = query.trim().toLowerCase();
  if (!q) return articles;
  return articles.filter(a =>
    a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q),
  );
};
