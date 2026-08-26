import React from 'react';
import type { Category } from '../../../types';

interface Props { categories: Category[]; activeId: string | null; onSelect: (id: string | null) => void; }

export const CategoryPills: React.FC<Props> = ({ categories, activeId, onSelect }) => (
  <div style={S.wrap}>
    <button style={pill(activeId === null)} onClick={() => onSelect(null)}>All</button>
    {categories.map(c => (
      <button key={c.id} style={pill(activeId === c.id)} onClick={() => onSelect(c.id)}>{c.name}</button>
    ))}
  </div>
);

const pill = (on: boolean): React.CSSProperties => ({
  flex: '0 0 auto', fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 999, cursor: 'pointer',
  color: on ? '#fff' : 'var(--text-2)', background: on ? 'var(--gold)' : 'var(--bg-card)',
  border: `1px solid ${on ? 'var(--gold)' : 'var(--border)'}`,
});

const S: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 2px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' },
};
