import React from 'react';

// Named datasets keep article bodies declarative: ::chart{data=mmf-growth}
const DATASETS: Record<string, { label: string; bars: { name: string; value: number }[] }> = {
  'mmf-growth': {
    label: 'KES 10,000 in an MMF at ~10% p.a.',
    bars: [
      { name: 'Yr 1', value: 11000 }, { name: 'Yr 2', value: 12100 },
      { name: 'Yr 3', value: 13310 }, { name: 'Yr 4', value: 14641 },
      { name: 'Yr 5', value: 16105 },
    ],
  },
};

export const Chart: React.FC<{ data?: string }> = ({ data }) => {
  const set = data ? DATASETS[data] : undefined;
  if (!set) return null;
  const max = Math.max(...set.bars.map(b => b.value));

  return (
    <figure style={S.box}>
      <div style={S.cap}>{set.label}</div>
      <div style={S.bars}>
        {set.bars.map(b => (
          <div key={b.name} style={S.col}>
            <div style={{ ...S.bar, height: `${(b.value / max) * 100}%` }} title={`KES ${b.value.toLocaleString()}`} />
            <div style={S.name}>{b.name}</div>
          </div>
        ))}
      </div>
    </figure>
  );
};

const S: Record<string, React.CSSProperties> = {
  box: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, margin: '18px 0' },
  cap: { fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 12 },
  bars: { display: 'flex', alignItems: 'flex-end', gap: 10, height: 140 },
  col: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  bar: { width: '70%', background: 'linear-gradient(180deg, var(--gold-l), var(--gold))', borderRadius: '4px 4px 0 0', minHeight: 4 },
  name: { fontSize: 11, color: 'var(--text-3)', marginTop: 6 },
};
