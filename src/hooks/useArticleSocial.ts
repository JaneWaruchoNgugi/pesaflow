import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ArticleComment } from '../types';
import type { BlogUser } from './useBlogUser';
import {
  subscribeComments, addComment, deleteComment, toggleCommentLike,
  subscribeArticleLikes, toggleArticleLike,
} from '../lib/blog/commentsRepo';

// Centralises an article's live engagement (comments + likes) so the count shown on the
// engagement bar and the thread below always agree, and every action is optimistic-safe.
export const useArticleSocial = (slug: string | undefined, user: BlogUser | null) => {
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [likeUids, setLikeUids] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    const unsubC = subscribeComments(slug, setComments, () => setError('Could not load comments.'));
    const unsubL = subscribeArticleLikes(slug, setLikeUids, () => { /* likes are non-critical */ });
    return () => { unsubC(); unsubL(); };
  }, [slug]);

  const uid = user?.uid;
  const liked = !!uid && likeUids.includes(uid);
  const likeCount = likeUids.length;
  const commentCount = comments.length;

  const toggleLike = useCallback(() => {
    if (!slug || !uid) return;
    toggleArticleLike(slug, uid, liked).catch((e) => {
      console.error('toggleArticleLike failed:', e?.code, e);
      setError('Could not update your like.');
    });
  }, [slug, uid, liked]);

  const post = useCallback(async (text: string, parentId: string | null = null) => {
    if (!slug || !user) return;
    setError('');
    await addComment(slug, { authorUid: user.uid, authorName: user.name, text, parentId });
  }, [slug, user]);

  const likeComment = useCallback((commentId: string, currentlyLiked: boolean) => {
    if (!slug || !uid) return;
    toggleCommentLike(slug, commentId, uid, currentlyLiked).catch(() => setError('Could not update your like.'));
  }, [slug, uid]);

  const remove = useCallback((commentId: string) => {
    if (!slug) return;
    deleteComment(slug, commentId).catch(() => setError('Could not delete that comment.'));
  }, [slug]);

  return useMemo(() => ({
    comments, commentCount, likeCount, liked,
    toggleLike, post, likeComment, remove,
    error, setError,
  }), [comments, commentCount, likeCount, liked, toggleLike, post, likeComment, remove, error]);
};
