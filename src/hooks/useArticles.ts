import { useCallback, useEffect, useState } from 'react';
import type { Article } from '../types';
import { fetchFeed } from '../lib/blog/articlesRepo';

/** Paginated published-article feed, optionally scoped to a category. */
export const useArticles = (categoryId?: string) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (reset: boolean) => {
    setLoading(true);
    try {
      const page = await fetchFeed(reset ? null : cursor, categoryId);
      setArticles(prev => (reset ? page.articles : [...prev, ...page.articles]));
      setCursor(page.cursor);
      setHasMore(page.cursor !== null);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [cursor, categoryId]);

  // Reset when the category changes. `load` is intentionally excluded from the deps
  // below to avoid a reset loop (it changes identity whenever the cursor advances).
  useEffect(() => {
    setArticles([]);
    setCursor(null);
    setHasMore(true);
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const loadMore = useCallback(() => { if (hasMore && !loading) load(false); }, [hasMore, loading, load]);

  return { articles, loadMore, hasMore, loading };
};
