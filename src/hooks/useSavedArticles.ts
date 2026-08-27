import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Article } from '../types';
import { subscribeSaved, saveArticle, unsaveArticle, type SavedArticle } from '../lib/blog/savedRepo';

// Live view of a user's saved (bookmarked) articles. Used by the article page (Save
// button state + toggle) and the /blog/saved list.
export const useSavedArticles = (uid: string | undefined) => {
  const [list, setList] = useState<SavedArticle[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!uid) { setList([]); setReady(true); return; }
    setReady(false);
    const unsub = subscribeSaved(uid, (items) => { setList(items); setReady(true); }, () => setReady(true));
    return unsub;
  }, [uid]);

  const savedSet = useMemo(() => new Set(list.map(s => s.slug)), [list]);
  const isSaved = useCallback((slug: string) => savedSet.has(slug), [savedSet]);

  const toggle = useCallback((article: Article) => {
    if (!uid) return;
    (savedSet.has(article.slug) ? unsaveArticle(uid, article.slug) : saveArticle(uid, article))
      .catch(() => { /* best-effort */ });
  }, [uid, savedSet]);

  const remove = useCallback((slug: string) => {
    if (!uid) return;
    unsaveArticle(uid, slug).catch(() => { /* best-effort */ });
  }, [uid]);

  return { list, isSaved, toggle, remove, ready };
};
