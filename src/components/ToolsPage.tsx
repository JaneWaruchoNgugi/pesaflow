import React, { useState } from 'react';
import { Calculator, Landmark } from 'lucide-react';
import { MMFCalculator } from './MMFCalculator';
import { LoanEstimator } from './LoanEstimator';

type Tool = 'mmf' | 'loan';

const TABS: { id: Tool; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
  { id: 'mmf', label: 'MMF Calculator', icon: Calculator },
  { id: 'loan', label: 'Loan Estimator', icon: Landmark },
];

// Free financial tools hub — a tabbed home for the calculators.
export const ToolsPage: React.FC = () => {
  const [tool, setTool] = useState<Tool>('mmf');

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h1 style={S.h1}>Tools</h1>
        <p style={S.sub}>Free calculators to plan your money — no account tier required.</p>
      </div>

      <div style={S.tabRow}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tool === id;
          return (
            <button
              key={id}
              onClick={() => setTool(id)}
              style={{ ...S.tab, ...(active ? S.tabActive : {}) }}
            >
              <Icon size={16} strokeWidth={2.2} /> {label}
            </button>
          );
        })}
      </div>

      {tool === 'mmf' ? <MMFCalculator /> : <LoanEstimator />}
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  h1:  { fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 700, color: 'var(--text-1)', margin: 0 },
  sub: { fontSize: 13.5, color: 'var(--text-3)', marginTop: 4 },
  tabRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  tab: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-2)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' },
  tabActive: { borderColor: 'var(--border-acc)', background: 'var(--gold-dim)', color: 'var(--gold)' },
};
