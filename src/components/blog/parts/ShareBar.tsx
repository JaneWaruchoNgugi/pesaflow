import React, { useState } from 'react';
import { Link2, Check } from 'lucide-react';

interface Props { url: string; title: string; }

export const ShareBar: React.FC<Props> = ({ url, title }) => {
  const [copied, setCopied] = useState(false);
  const e = encodeURIComponent;
  const targets: { label: string; href: string; bg: string }[] = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${e(title + ' ' + url)}`, bg: '#25D366' },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`, bg: '#1877F2' },
    { label: 'X', href: `https://twitter.com/intent/tweet?url=${e(url)}&text=${e(title)}`, bg: '#0A0A0A' },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}`, bg: '#0A66C2' },
    { label: 'Telegram', href: `https://t.me/share/url?url=${e(url)}&text=${e(title)}`, bg: '#0088cc' },
  ];
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* clipboard blocked */ }
  };
  return (
    <div style={S.wrap}>
      {targets.map(t => (
        <a key={t.label} href={t.href} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${t.label}`} style={{ ...S.btn, background: t.bg, color: '#fff' }}>
          {t.label[0]}
        </a>
      ))}
      <button onClick={copy} aria-label="Copy link" style={{ ...S.btn, background: 'var(--bg-surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
        {copied ? <Check size={15} /> : <Link2 size={15} />}
      </button>
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  btn: { width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14, textDecoration: 'none', cursor: 'pointer' },
};
