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
        <div style={S.dropWrap} role="region" aria-label="Guest session notice">
          <div style={S.card}>
            <div style={S.badge} aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div style={S.copy}>
              <div style={S.title}>You&apos;re exploring as a guest</div>
              <div style={S.sub}>Sign up to securely save your data — it stays private and yours.</div>
            </div>
            <div style={S.actions}>
              <button style={S.primary} onClick={onSignUp}>Sign up</button>
              <button style={S.ghost} onClick={onLogin}>Log in</button>
              <button style={S.link} onClick={onAbout}>About</button>
              <button style={S.link} onClick={onClearDemo}>Clear sample data</button>
            </div>
            <button style={S.close} onClick={dismiss} aria-label="Dismiss notice">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
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
  // Floating dropdown that slides down from the top and overlays content (does not push layout).
  dropWrap: { position: 'fixed', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 1400, width: 'min(760px, calc(100vw - 24px))', animation: 'dropDown .45s cubic-bezier(.16,1,.3,1) both', pointerEvents: 'none' },
  card: { pointerEvents: 'auto', display: 'flex', alignItems: 'center', flexWrap: 'wrap', rowGap: 10, gap: 14, padding: '12px 14px 12px 16px', background: 'var(--bg-card)', border: '1px solid var(--border-acc)', borderRadius: 14, boxShadow: 'var(--shadow-lg)', backdropFilter: 'blur(8px)' },
  badge: { flexShrink: 0, width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 10, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid var(--border-acc)' },
  copy: { flex: 1, minWidth: 180 },
  title: { fontSize: 14, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3 },
  sub: { fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.4, marginTop: 2 },
  actions: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' },
  primary: { padding: '8px 16px', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 12px var(--gold-glow)' },
  ghost: { padding: '8px 14px', background: 'transparent', color: 'var(--gold)', border: '1px solid var(--border-acc)', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' },
  link: { background: 'transparent', border: 'none', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer', padding: '4px 2px', whiteSpace: 'nowrap' },
  close: { flexShrink: 0, width: 30, height: 30, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', borderRadius: 8, color: 'var(--text-3)', cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  backdrop: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' },
  modal: { position: 'relative', background: 'var(--bg-card)', border: '1px solid var(--border-acc)', borderRadius: 16, padding: 24, maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: 'var(--shadow-lg)', animation: 'popIn .3s ease both' },
  modalTitle: { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 },
  modalBody: { fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 16 },
};
