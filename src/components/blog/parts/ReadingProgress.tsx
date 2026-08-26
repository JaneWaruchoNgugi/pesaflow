import React, { useEffect, useState } from 'react';

export const ReadingProgress: React.FC = () => {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setPct(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div style={S.track}><div style={{ ...S.bar, width: `${pct}%` }} /></div>
  );
};

const S: Record<string, React.CSSProperties> = {
  track: { position: 'fixed', top: 0, left: 0, right: 0, height: 3, background: 'transparent', zIndex: 350 },
  bar: { height: '100%', background: 'linear-gradient(90deg, var(--gold-l), var(--gold))', transition: 'width .1s linear' },
};
