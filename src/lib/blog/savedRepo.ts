import {
  collection, doc, setDoc, deleteDoc, onSnapshot, orderBy, query, serverTimestamp,
  type DocumentData, type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Article } from '../../types';

// Saved (bookmarked) articles live under the user: users/{uid}/savedArticles/{slug}.
// We store a small snapshot of the article so the /blog/saved list renders without
// re-fetching each article. Covered by the existing owner-only users subcollection rule.

export interface SavedArticle {
  slug: string;
  title: string;
  excerpt: string;
  categoryId: string;
  coverImageUrl: string;
  savedAt: string | null;
}

const toSaved = (snap: QueryDocumentSnapshot<DocumentData>): SavedArticle => {
  const d = snap.data();
  const ts = d.savedAt as { toDate?: () => Date } | undefined;
  return {
    slug: snap.id,
    title: d.title ?? '',
    excerpt: d.excerpt ?? '',
    categoryId: d.categoryId ?? '',
    coverImageUrl: d.coverImageUrl ?? '',
    savedAt: ts?.toDate ? ts.toDate().toISOString() : null,
  };
};

export const subscribeSaved = (
  uid: string,
  onChange: (items: SavedArticle[]) => void,
  onError?: (e: Error) => void,
): (() => void) => {
  const q = query(collection(db, 'users', uid, 'savedArticles'), orderBy('savedAt', 'desc'));
  return onSnapshot(q, (snap) => onChange(snap.docs.map(toSaved)), (err) => onError?.(err));
};

export const saveArticle = (uid: string, a: Article): Promise<void> =>
  setDoc(doc(db, 'users', uid, 'savedArticles', a.slug), {
    title: a.title,
    excerpt: a.excerpt,
    categoryId: a.categoryId,
    coverImageUrl: a.coverImageUrl,
    savedAt: serverTimestamp(),
  });

export const unsaveArticle = (uid: string, slug: string): Promise<void> =>
  deleteDoc(doc(db, 'users', uid, 'savedArticles', slug));
