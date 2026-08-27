import {
  collection, addDoc, deleteDoc, doc, setDoc, updateDoc, onSnapshot, orderBy, query,
  serverTimestamp, arrayUnion, arrayRemove, increment, getCountFromServer,
  type DocumentData, type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { ArticleComment } from '../../types';

// Blog engagement storage:
//   articles/{slug}/comments/{id}  — comments & replies (parentId), with likedBy[] for comment likes
//   articles/{slug}/likes/{uid}    — one doc per user who liked the article (count = collection size)
// Rules: public read; signed-in create-own; comment likes toggle own uid only; delete-own/admin.

const asIso = (v: unknown): string | null => {
  if (v == null) return null;
  const ts = v as { toDate?: () => Date };
  return typeof ts.toDate === 'function' ? ts.toDate().toISOString() : null;
};

const toComment = (snap: QueryDocumentSnapshot<DocumentData>): ArticleComment => {
  const d = snap.data();
  return {
    id: snap.id,
    authorUid: d.authorUid ?? '',
    authorName: d.authorName ?? 'PesaFlow member',
    text: d.text ?? '',
    createdAt: asIso(d.createdAt),
    parentId: d.parentId ?? null,
    likedBy: Array.isArray(d.likedBy) ? d.likedBy : [],
  };
};

/* ── Comments ─────────────────────────────────────────── */

/** Live-subscribe to an article's comments, oldest first (tree is built client-side). */
export const subscribeComments = (
  slug: string,
  onChange: (comments: ArticleComment[]) => void,
  onError?: (e: Error) => void,
): (() => void) => {
  const q = query(collection(db, 'articles', slug, 'comments'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => onChange(snap.docs.map(toComment)), (err) => onError?.(err));
};

/** Post a comment or reply. `parentId` null = top-level. */
export const addComment = async (
  slug: string,
  input: { authorUid: string; authorName: string; text: string; parentId?: string | null },
): Promise<void> => {
  const text = input.text.trim();
  if (!text) return;
  await addDoc(collection(db, 'articles', slug, 'comments'), {
    authorUid: input.authorUid,
    authorName: input.authorName,
    text: text.slice(0, 2000),
    parentId: input.parentId ?? null,
    likedBy: [],
    createdAt: serverTimestamp(),
  });
};

/** Toggle the current user's like on a comment (stored in the comment's likedBy array). */
export const toggleCommentLike = (
  slug: string,
  commentId: string,
  uid: string,
  liked: boolean,
): Promise<void> =>
  updateDoc(doc(db, 'articles', slug, 'comments', commentId), {
    likedBy: liked ? arrayRemove(uid) : arrayUnion(uid),
  });

/** Delete one of your own comments (rules also allow admins). */
export const deleteComment = (slug: string, commentId: string): Promise<void> =>
  deleteDoc(doc(db, 'articles', slug, 'comments', commentId));

/* ── Article likes ────────────────────────────────────── */

/** Live-subscribe to the article's likers. Returns the list of uids that liked it. */
export const subscribeArticleLikes = (
  slug: string,
  onChange: (uids: string[]) => void,
  onError?: (e: Error) => void,
): (() => void) =>
  onSnapshot(
    collection(db, 'articles', slug, 'likes'),
    (snap) => onChange(snap.docs.map((d) => d.id)),
    (err) => onError?.(err),
  );

/** Toggle the current user's like on the article. */
export const toggleArticleLike = (slug: string, uid: string, liked: boolean): Promise<void> =>
  liked
    ? deleteDoc(doc(db, 'articles', slug, 'likes', uid))
    : setDoc(doc(db, 'articles', slug, 'likes', uid), { createdAt: serverTimestamp() });

/* ── Views ────────────────────────────────────────────── */

/** Atomically bump the article's view counter (rules allow +1 to counts.views only). */
export const recordView = (slug: string): Promise<void> =>
  updateDoc(doc(db, 'articles', slug), { 'counts.views': increment(1) });

/** Real like & comment totals for a public article — used to sync the feed cards/hero
 *  (which read article.counts) with the actual subcollections. */
export const getEngagementCounts = async (slug: string): Promise<{ likes: number; comments: number }> => {
  const [likes, comments] = await Promise.all([
    getCountFromServer(collection(db, 'articles', slug, 'likes')),
    getCountFromServer(collection(db, 'articles', slug, 'comments')),
  ]);
  return { likes: likes.data().count, comments: comments.data().count };
};
