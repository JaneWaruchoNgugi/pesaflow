import React, { useMemo, useState } from 'react';
import { MessageCircle, Heart, Reply, Trash2 } from 'lucide-react';
import type { ArticleComment } from '../../../types';
import type { BlogUser } from '../../../hooks/useBlogUser';

interface Props {
  slug: string;
  user: BlogUser | null;
  comments: ArticleComment[];
  error: string;
  onGate: () => void;
  onPost: (text: string, parentId: string | null) => Promise<void>;
  onLike: (commentId: string, currentlyLiked: boolean) => void;
  onDelete: (commentId: string) => void;
}

const timeAgo = (iso: string | null): string => {
  if (!iso) return 'just now';
  const s = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

// A reusable composer for the top-level box and inline replies.
const Composer: React.FC<{
  user: BlogUser;
  placeholder: string;
  autoFocus?: boolean;
  submitLabel: string;
  onSubmit: (text: string) => Promise<void>;
  onCancel?: () => void;
}> = ({ user, placeholder, autoFocus, submitLabel, onSubmit, onCancel }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    try { await onSubmit(body); setText(''); onCancel?.(); }
    finally { setBusy(false); }
  };

  return (
    <div style={S.composer}>
      <div style={{ ...S.avatar, background: 'linear-gradient(135deg, var(--gold-l), var(--gold))' }}>
        {user.name.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <textarea
          style={S.textarea}
          placeholder={placeholder}
          value={text}
          autoFocus={autoFocus}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={2000}
        />
        <div style={S.composerBottom}>
          <span style={S.counter}>{text.length}/2000</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {onCancel && <button style={S.cancelBtn} onClick={onCancel}>Cancel</button>}
            <button style={{ ...S.postBtn, opacity: text.trim() && !busy ? 1 : 0.5 }} onClick={send} disabled={!text.trim() || busy}>
              {busy ? 'Posting…' : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CommentNode: React.FC<{
  node: ArticleComment;
  childrenOf: Map<string, ArticleComment[]>;
  depth: number;
  user: BlogUser | null;
  onGate: () => void;
  onPost: (text: string, parentId: string | null) => Promise<void>;
  onLike: (commentId: string, currentlyLiked: boolean) => void;
  onDelete: (commentId: string) => void;
}> = ({ node, childrenOf, depth, user, onGate, onPost, onLike, onDelete }) => {
  const [replying, setReplying] = useState(false);
  const liked = !!user && node.likedBy.includes(user.uid);
  const replies = childrenOf.get(node.id) ?? [];

  const reply = () => { if (!user) return onGate(); setReplying(v => !v); };
  const like = () => { if (!user) return onGate(); onLike(node.id, liked); };

  return (
    <div style={S.item}>
      <div style={S.avatar}>{node.authorName.charAt(0).toUpperCase()}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={S.itemHead}>
          <span style={S.author}>{node.authorName}</span>
          <span style={S.time}>· {timeAgo(node.createdAt)}</span>
        </div>
        <div style={S.text}>{node.text}</div>

        <div style={S.actions}>
          <button style={{ ...S.actionBtn, ...(liked ? S.actionActive : {}) }} onClick={like} aria-pressed={liked}>
            <Heart size={13} fill={liked ? 'currentColor' : 'none'} /> {node.likedBy.length > 0 ? node.likedBy.length : ''} Like
          </button>
          <button style={S.actionBtn} onClick={reply}><Reply size={13} /> Reply</button>
          {user?.uid === node.authorUid && (
            <button style={S.actionBtn} onClick={() => onDelete(node.id)}><Trash2 size={13} /> Delete</button>
          )}
        </div>

        {replying && user && (
          <div style={{ marginTop: 10 }}>
            <Composer
              user={user}
              placeholder={`Reply to ${node.authorName}…`}
              autoFocus
              submitLabel="Reply"
              onSubmit={(t) => onPost(t, node.id)}
              onCancel={() => setReplying(false)}
            />
          </div>
        )}

        {replies.length > 0 && (
          <div style={{ ...S.replyWrap, marginLeft: depth < 4 ? 4 : 0 }}>
            {replies.map((c) => (
              <CommentNode
                key={c.id}
                node={c}
                childrenOf={childrenOf}
                depth={depth + 1}
                user={user}
                onGate={onGate}
                onPost={onPost}
                onLike={onLike}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const CommentsSection: React.FC<Props> = ({ user, comments, error, onGate, onPost, onLike, onDelete }) => {
  // Build the reply tree. Orphaned replies (parent deleted) fall back to top-level.
  const { roots, childrenOf } = useMemo(() => {
    const ids = new Set(comments.map(c => c.id));
    const childrenOf = new Map<string, ArticleComment[]>();
    const roots: ArticleComment[] = [];
    for (const c of comments) {
      if (c.parentId && ids.has(c.parentId)) {
        const arr = childrenOf.get(c.parentId) ?? [];
        arr.push(c);
        childrenOf.set(c.parentId, arr);
      } else {
        roots.push(c);
      }
    }
    return { roots, childrenOf };
  }, [comments]);

  return (
    <section id="comments" style={S.wrap}>
      <div style={S.header}>
        <MessageCircle size={18} strokeWidth={2.2} style={{ color: 'var(--gold)' }} />
        <h2 style={S.title}>Comments{comments.length > 0 ? ` (${comments.length})` : ''}</h2>
      </div>

      {user ? (
        <Composer user={user} placeholder="Share your thoughts…" submitLabel="Post comment" onSubmit={(t) => onPost(t, null)} />
      ) : (
        <button style={S.signInPrompt} onClick={onGate}>
          Log in or create a free account to join the discussion
        </button>
      )}

      {error && <div style={S.error}>{error}</div>}

      {roots.length === 0 ? (
        <div style={S.empty}>Be the first to comment.</div>
      ) : (
        <div style={S.list}>
          {roots.map((c) => (
            <CommentNode
              key={c.id}
              node={c}
              childrenOf={childrenOf}
              depth={0}
              user={user}
              onGate={onGate}
              onPost={onPost}
              onLike={onLike}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
};

const S: Record<string, React.CSSProperties> = {
  wrap: { margin: '28px 0 8px', paddingTop: 24, borderTop: '1px solid var(--border)' },
  header: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 },
  title: { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: 0 },
  composer: { display: 'flex', gap: 12, marginBottom: 20 },
  avatar: { width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#0A1628', background: 'var(--bg-surface)', fontFamily: 'Cormorant Garamond, serif' },
  textarea: { width: '100%', resize: 'vertical', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 13px', color: 'var(--text-1)', fontSize: 14, fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5 },
  composerBottom: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  counter: { fontSize: 11.5, color: 'var(--text-3)' },
  postBtn: { padding: '9px 18px', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' },
  cancelBtn: { padding: '9px 14px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: 9, fontWeight: 600, fontSize: 13.5, cursor: 'pointer' },
  signInPrompt: { display: 'block', width: '100%', textAlign: 'left', background: 'var(--bg-surface)', border: '1px dashed var(--border-s)', borderRadius: 10, padding: '14px 16px', color: 'var(--text-2)', fontSize: 13.5, cursor: 'pointer', marginBottom: 20 },
  error: { fontSize: 13, color: 'var(--red)', background: 'var(--red-dim)', border: '1px solid var(--red-b)', borderRadius: 8, padding: '8px 12px', marginBottom: 14 },
  empty: { fontSize: 13.5, color: 'var(--text-3)', padding: '8px 0 4px' },
  list: { display: 'flex', flexDirection: 'column', gap: 18 },
  item: { display: 'flex', gap: 12 },
  itemHead: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 },
  author: { fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)' },
  time: { fontSize: 12, color: 'var(--text-3)' },
  text: { fontSize: 14.5, color: 'var(--text-1)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  actions: { display: 'flex', gap: 14, marginTop: 6 },
  actionBtn: { display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', color: 'var(--text-3)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0 },
  actionActive: { color: 'var(--red)' },
  replyWrap: { marginTop: 16, paddingLeft: 14, borderLeft: '2px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16 },
};
