import { useEffect, useState } from 'react';
import { getEngagementCounts } from '../lib/blog/commentsRepo';

type Counts = { likes: number; comments: number };

// Fetches real like/comment totals for a list of article slugs so feed cards and the
// featured hero (which read article.counts) show the true numbers instead of the stale
// denormalised field. Non-live — refetches when the set of slugs changes.
export const useArticleCounts = (slugs: string[]): Record<string, Counts> => {
  const [counts, setCounts] = useState<Record<string, Counts>>({});
  const key = slugs.join(',');

  useEffect(() => {
    let alive = true;
    if (!slugs.length) { setCounts({}); return; }
    Promise.all(slugs.map(async (s) => [s, await getEngagementCounts(s)] as const))
      .then((entries) => { if (alive) setCounts(Object.fromEntries(entries)); })
      .catch(() => { /* counts are best-effort; fall back to stored counts */ });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return counts;
};
