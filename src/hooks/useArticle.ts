import { useEffect, useReducer } from 'react';
import type { Article } from '../types';
import { fetchArticle } from '../lib/blog/articlesRepo';

type State = { article: Article | null; loading: boolean };
type Action =
  | { type: 'fetch' }
  | { type: 'done'; article: Article | null };

function reducer(_: State, action: Action): State {
  if (action.type === 'fetch') return { article: null, loading: true };
  return { article: action.article, loading: false };
}

export const useArticle = (slug: string | undefined) => {
  const [state, dispatch] = useReducer(reducer, {
    article: null,
    loading: slug !== undefined,
  });

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    dispatch({ type: 'fetch' });
    fetchArticle(slug)
      .then(a => { if (alive) dispatch({ type: 'done', article: a }); })
      .catch(() => { if (alive) dispatch({ type: 'done', article: null }); });
    return () => { alive = false; };
  }, [slug]);

  return { article: state.article, loading: state.loading };
};
