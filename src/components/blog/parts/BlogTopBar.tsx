import React from 'react';
import { Link } from 'react-router-dom';

export const BlogTopBar: React.FC = () => (
  <header style={S.bar}>
    <Link to="/blog" style={S.brand}>PesaFlow <span style={{ color: 'var(--gold)' }}>Learn</span></Link>
    <a href="/" style={S.cta}>Open PesaFlow →</a>
  </header>
);

const S: Record<string, React.CSSProperties> = {
  bar: { position: 'sticky', top: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: 'var(--topbar-bg)', borderBottom: '1px solid var(--topbar-b)', backdropFilter: 'blur(10px)' },
  brand: { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', textDecoration: 'none' },
  cta: { fontSize: 13, fontWeight: 700, color: '#0A1628', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', padding: '8px 14px', borderRadius: 9, textDecoration: 'none' },
};
