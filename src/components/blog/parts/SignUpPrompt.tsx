import React from 'react';

// Phase 1 gating: engagement actions open this. Real like/comment persistence is Phase 2;
// wired Ask-AI is Phase 4. "Create account" sends the visitor into the main app at /.
export const SignUpPrompt: React.FC<{ title: string; body: string; onClose: () => void }> = ({ title, body, onClose }) => (
  <div style={S.overlay} role="dialog" aria-modal="true" aria-labelledby="signup-prompt-title">
    <div style={S.backdrop} onClick={onClose} />
    <div style={S.modal}>
      <div id="signup-prompt-title" style={S.title}>{title}</div>
      <p style={S.body}>{body}</p>
      <a href="/?intent=signup" style={S.primary}>Create a free account</a>
      <a href="/?intent=login" style={S.secondary}>Already have an account? Log in</a>
      <button style={S.link} onClick={onClose}>Keep reading</button>
    </div>
  </div>
);

const S: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, zIndex: 1600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  backdrop: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' },
  modal: { position: 'relative', background: 'var(--bg-card)', border: '1px solid var(--border-acc)', borderRadius: 16, padding: 24, maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: 'var(--shadow-lg)' },
  title: { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 },
  body: { fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 16 },
  primary: { display: 'block', padding: '11px 16px', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none', marginBottom: 8 },
  secondary: { display: 'block', padding: '10px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-1)', borderRadius: 10, fontWeight: 600, fontSize: 13.5, textDecoration: 'none', marginBottom: 10 },
  link: { background: 'transparent', border: 'none', color: 'var(--text-3)', fontSize: 13, cursor: 'pointer' },
};
