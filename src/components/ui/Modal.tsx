import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

/**
 * Centered modal rendered through a portal on document.body.
 * The portal is essential: the app views animate with CSS transforms, and a
 * `position: fixed` element inside a transformed ancestor is trapped by it —
 * which mis-places and clips the dialog. Portaling to <body> anchors it to the viewport.
 */
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div style={S.overlay} onClick={onClose}>
      <div className="fw-modal" style={S.card} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div style={S.header}>
          <div style={S.title}>{title}</div>
          <button style={S.close} onClick={onClose} aria-label="Close"><X size={18} strokeWidth={2.4} /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
};

const S: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(6,12,24,0.55)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 14px' },
  card: { position: 'relative', width: '100%', maxWidth: 560, maxHeight: 'calc(100dvh - 40px)', overflowY: 'auto', boxSizing: 'border-box', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, boxShadow: '0 24px 70px rgba(0,0,0,0.4)' },
  header: { position: 'sticky', top: -22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '-22px -22px 16px', padding: '18px 22px 14px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', borderRadius: '16px 16px 0 0', zIndex: 1 },
  title: { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600, color: 'var(--text-1)' },
  close: { display: 'grid', placeItems: 'center', width: 34, height: 34, background: 'transparent', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text-2)', cursor: 'pointer', flexShrink: 0 },
};
