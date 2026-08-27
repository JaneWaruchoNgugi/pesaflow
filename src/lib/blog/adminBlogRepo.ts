import { collection, getDocs, getCountFromServer, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { adminDb as db } from '../firebase';
import type { Article, Category } from '../../types';

// All blog writes/reads here go through adminDb, whose session carries the `admin`
// custom claim — satisfying the admin-only Firestore rules on /articles and /categories.
// Admins can read EVERYTHING (drafts, scheduled), unlike the public repo (articlesRepo).

/** Real like & comment totals for an article — they live in subcollections now, not on
 *  the article doc, so the admin list counts them directly (views stay on counts.views). */
export const adminGetArticleCounts = async (slug: string): Promise<{ likes: number; comments: number }> => {
  const [likes, comments] = await Promise.all([
    getCountFromServer(collection(db, 'articles', slug, 'likes')),
    getCountFromServer(collection(db, 'articles', slug, 'comments')),
  ]);
  return { likes: likes.data().count, comments: comments.data().count };
};

// ── Articles ───────────────────────────────────────────────
const toArticle = (d: { id: string; data: () => unknown }): Article =>
  ({ ...(d.data() as Article), slug: d.id });

/** Every article (all statuses), newest-updated first. Small dataset — sorted client-side. */
export const adminListArticles = async (): Promise<Article[]> => {
  const snap = await getDocs(collection(db, 'articles'));
  return snap.docs
    .map(toArticle)
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
};

/** Create or overwrite an article. The slug IS the document id. */
export const adminSaveArticle = (a: Article): Promise<void> =>
  setDoc(doc(db, 'articles', a.slug), a);

export const adminDeleteArticle = (slug: string): Promise<void> =>
  deleteDoc(doc(db, 'articles', slug));

// ── Categories ─────────────────────────────────────────────
export const adminListCategories = async (): Promise<Category[]> => {
  const snap = await getDocs(collection(db, 'categories'));
  return snap.docs
    .map(d => ({ ...(d.data() as Category), id: d.id }))
    .sort((a, b) => a.order - b.order);
};

export const adminSaveCategory = (c: Category): Promise<void> =>
  setDoc(doc(db, 'categories', c.id), c);

export const adminDeleteCategory = (id: string): Promise<void> =>
  deleteDoc(doc(db, 'categories', id));
