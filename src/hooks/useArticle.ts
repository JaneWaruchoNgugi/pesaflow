import { useEffect, useState } from 'react';
import type { Article } from '../types';
import { fetchArticle } from '../lib/blog/articlesRepo';

export const useArticle = (slug: string | undefined) => {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    fetchArticle(slug)
      .then(a => { if (alive) setArticle(a); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [slug]);
  return { article, loading };
};
