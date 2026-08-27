import React from 'react';
import { Heart, MessageCircle, Bookmark } from 'lucide-react';

interface Props {
  likeCount: number;
  liked: boolean;
  commentCount: number;
  saved: boolean;
  onLike: () => void;
  onComment: () => void;
  onSave: () => void;
  onGate: () => void;
  signedIn: boolean;
}

// Persisted article likes + live comment count + persisted saves. Signed-out visitors
// are funneled to the sign-up prompt; signed-in users toggle their real like/save
// (stored in articles/{slug}/likes and users/{uid}/savedArticles).
export const EngagementBar: React.FC<Props> = ({ likeCount, liked, commentCount, saved, onLike, onComment, onSave, onGate, signedIn }) => {
  const handleLike = () => (signedIn ? onLike() : onGate());
  const handleComment = () => (signedIn ? onComment() : onGate());
  const handleSave = () => (signedIn ? onSave() : onGate());

  return (
    <div style={S.wrap}>
      <button
        style={{ ...S.btn, ...(liked ? S.btnLiked : {}) }}
        onClick={handleLike}
        aria-label="Like"
        aria-pressed={liked}
      >
        <Heart size={15} fill={liked ? 'currentColor' : 'none'} /> {likeCount}
      </button>
      <button style={S.btn} onClick={handleComment} aria-label="Comment">
        <MessageCircle size={15} /> {commentCount}
      </button>
      <button
        style={{ ...S.btn, ...(saved ? S.btnSaved : {}) }}
        onClick={handleSave}
        aria-label="Save"
        aria-pressed={saved}
      >
        <Bookmark size={15} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}
      </button>
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', alignItems: 'center', gap: 8 },
  btn: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-2)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 999, padding: '7px 13px', cursor: 'pointer' },
  btnLiked: { color: 'var(--red)', borderColor: 'var(--red-b)', background: 'var(--red-dim)' },
  btnSaved: { color: 'var(--gold)', borderColor: 'var(--border-acc)', background: 'var(--gold-dim)' },
};
