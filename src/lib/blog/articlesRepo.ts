import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit, startAfter,
  type QueryConstraint, type DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Article, BlogFeedPage } from '../../types';

const PAGE = 9;

// Date fields are ISO strings in Phase 1 seed data, but the Phase 3 CMS may write
// Firestore Timestamps. Coerce either shape to the ISO string the Article type promises,
// so `new Date(...)` / `Date.parse(...)` downstream never see a Timestamp object.
const asIso = (v: unknown): string | null => {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  const ts = v as { toDate?: () => Date };
  return typeof ts.toDate === 'function' ? ts.toDate().toISOString() : null;
};

const toArticle = (snap: DocumentSnapshot): Article => {
  const data = snap.data() as Article;
  return {
    ...data,
    slug: snap.id,
    publishedAt: asIso(data.publishedAt),
    scheduledFor: asIso(data.scheduledFor),
    createdAt: asIso(data.createdAt) ?? '',
    updatedAt: asIso(data.updatedAt) ?? '',
  };
};

/** One page of published articles, newest first. Pass a cursor slug to page forward. */
export const fetchFeed = async (cursorSlug: string | null, categoryId?: string): Promise<BlogFeedPage> => {
  const constraints: QueryConstraint[] = [where('status', '==', 'published')];
  if (categoryId) constraints.push(where('categoryId', '==', categoryId));
  constraints.push(orderBy('publishedAt', 'desc'));
  if (cursorSlug) {
    const cursorDoc = await getDoc(doc(db, 'articles', cursorSlug));
    if (cursorDoc.exists()) constraints.push(startAfter(cursorDoc));
  }
  constraints.push(limit(PAGE + 1)); // fetch one extra to detect "has more"

  const snap = await getDocs(query(collection(db, 'articles'), ...constraints));
  const docs = snap.docs;
  const hasMore = docs.length > PAGE;
  const pageDocs = hasMore ? docs.slice(0, PAGE) : docs;
  return {
    articles: pageDocs.map(toArticle),
    cursor: hasMore ? pageDocs[pageDocs.length - 1].id : null,
  };
};

/** A single published article by slug, or null (also null for drafts — rules deny them). */
export const fetchArticle = async (slug: string): Promise<Article | null> => {
  try {
    const snap = await getDoc(doc(db, 'articles', slug));
    return snap.exists() && (snap.data() as Article).status === 'published' ? toArticle(snap) : null;
  } catch {
    return null; // rules deny reading a non-published doc
  }
};
