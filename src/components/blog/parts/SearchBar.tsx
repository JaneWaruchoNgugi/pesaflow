import React from 'react';
import { Search } from 'lucide-react';

export const SearchBar: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <div style={S.wrap}>
    <Search size={16} color="var(--text-3)" />
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Search money tips, guides, calculators…"
      style={S.input}
      aria-label="Search articles"
    />
  </div>
);

const S: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-card)', border: '1px solid var(--border-acc)', borderRadius: 12, padding: '11px 14px', boxShadow: 'var(--shadow)' },
  input: { flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--text-1)' },
};
