import React, { useEffect, useState } from 'react';

interface GuestBannerProps {
  hasRealData: boolean;       // guest has entered non-demo data
  onSignUp: () => void;
  onLogin: () => void;
  onAbout: () => void;
  onClearDemo: () => void;
}

const PROMPT_SHOWN = 'pesaflow_guest_prompt_shown';

export const GuestBanner: React.FC<GuestBannerProps> = ({ hasRealData, onSignUp, onLogin, onAbout, onClearDemo }) => {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('pesaflow_guest_banner_dismissed') === '1');
  const [showPrompt, setShowPrompt] = useState(false);

  // Smart prompt: once the guest has real data worth saving, nudge (only once/session).
  useEffect(() => {
    if (hasRealData && sessionStorage.getItem(PROMPT_SHOWN) !== '1') {
      setShowPrompt(true);
      sessionStorage.setItem(PROMPT_SHOWN, '1');
    }
  }, [hasRealData]);

  // Warn on leave only when there is unsaved real data.
  useEffect(() => {
    if (!hasRealData) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasRealData]);

  const dismiss = () => { setDismissed(true); sessionStorage.setItem('pesaflow_guest_banner_dismissed', '1'); };

  return (
    <>
      {!dismissed && (
        <div style={S.bar}>
          <span style={S.text}>You&apos;re exploring as a guest — sign up to save your data.</span>
          <span style={S.actions}>
            <button style={S.primary} onClick={onSignUp}>Sign up</button>
            <button style={S.link} onClick={onLogin}>Log in</button>
            <button style={S.link} onClick={onAbout}>About</button>
            <button style={S.link} onClick={onClearDemo}>Clear sample data</button>
            <button style={S.close} onClick={dismiss} aria-label="Dismiss">✕</button>
          </span>
        </div>
      )}

      {showPrompt && (
        <div style={S.overlay} role="dialog" aria-modal="true">
          <div style={S.backdrop} onClick={() => setShowPrompt(false)} />
          <div style={S.modal}>
            <div style={S.modalTitle}>Don&apos;t lose your data</div>
            <p style={S.modalBody}>You&apos;ve started tracking real money. Create a free account to save it — it stays yours, we never sell it.</p>
            <button style={{ ...S.primary, width: '100%', marginBottom: 8 }} onClick={onSignUp}>Sign up to save</button>
            <button style={S.link} onClick={() => setShowPrompt(false)}>Keep exploring</button>
          </div>
        </div>
      )}
    </>
  );
};

const S: Record<string, React.CSSProperties> = {
  bar: { position: 'sticky', top: 0, zIndex: 400, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 14px', background: 'var(--gold-dim)', borderBottom: '1px solid var(--border-acc)' },
  text: { fontSize: 13, color: 'var(--text-1)', fontWeight: 600 },
  actions: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  primary: { padding: '6px 12px', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  link: { background: 'transparent', border: 'none', color: 'var(--gold)', fontSize: 12, textDecoration: 'underline', cursor: 'pointer', padding: 0 },
  close: { background: 'transparent', border: 'none', color: 'var(--text-3)', fontSize: 14, cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  backdrop: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' },
  modal: { position: 'relative', background: 'var(--bg-card)', border: '1px solid var(--border-acc)', borderRadius: 16, padding: 24, maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: 'var(--shadow-lg)' },
  modalTitle: { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 },
  modalBody: { fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 16 },
};
