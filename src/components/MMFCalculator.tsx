import React, { useMemo, useState } from 'react';
import { Calculator, TrendingUp } from 'lucide-react';
import { projectMMF, COMPOUNDING_LABEL, type Compounding } from '../utils/mmf';
import { formatCurrency } from '../utils/expenses';
import { INVESTMENT_META } from '../utils/investments';

// Money Market Fund projector — models an initial amount plus a recurring monthly
// top-up, compounding at a chosen frequency over a number of years. Shows the projected
// total value and total contributions, with an optional 15% KRA withholding-tax view.

const WHT_PCT = 15;
const COMPOUNDINGS: Compounding[] = ['daily', 'weekly', 'monthly', 'quarterly', 'annually'];

export const MMFCalculator: React.FC = () => {
  const [initial, setInitial] = useState('10000');
  const [topUp, setTopUp] = useState('2000');
  const [rate, setRate] = useState(String(INVESTMENT_META.mmf.avgReturn)); // ~11%
  const [compounding, setCompounding] = useState<Compounding>('daily');
  const [years, setYears] = useState('1');
  const [afterTax, setAfterTax] = useState(false);

  const est = useMemo(() => {
    const p0 = parseFloat(initial.replace(/,/g, '')) || 0;
    const top = parseFloat(topUp.replace(/,/g, '')) || 0;
    const r = parseFloat(rate) || 0;
    const y = parseFloat(years) || 0;
    return projectMMF(p0, top, r, compounding, y, afterTax ? WHT_PCT : 0);
  }, [initial, topUp, rate, compounding, years, afterTax]);

  const value = afterTax ? est.netValue : est.futureValue;
  const interest = afterTax ? est.netInterest : est.grossInterest;
  const yearsNum = parseFloat(years) || 0;
  const yearLabel = `${yearsNum} ${yearsNum === 1 ? 'year' : 'years'}`;

  const results = [
    { label: 'Total contributions', value: formatCurrency(Math.round(est.totalContributions), 'KES'), color: 'var(--text-1)', sub: 'What you put in' },
    { label: afterTax ? 'Interest (after tax)' : 'Interest earned', value: formatCurrency(Math.round(interest), 'KES'), color: 'var(--green)', sub: `${compounding} compounding` },
    { label: 'Projected value', value: formatCurrency(Math.round(value), 'KES'), color: 'var(--gold)', sub: afterTax ? 'After 15% tax' : 'Before tax' },
  ];

  return (
    <div style={S.card}>
      <style>{`
        .mmf-input:focus, .mmf-select:focus { border-color: var(--border-focus) !important; outline: none; }
      `}</style>

      <div style={S.header}>
        <span style={S.iconWrap}><Calculator size={20} strokeWidth={2.1} style={{ color: 'var(--blue)' }} /></span>
        <div>
          <div style={S.title}>MMF Return Estimator</div>
          <div style={S.subtitle}>Project an initial amount plus monthly top-ups</div>
        </div>
      </div>

      <div className="inv-form-grid">
        <div style={S.field}>
          <label style={S.label}>Initial amount (KSh)</label>
          <input className="mmf-input" style={S.input} type="number" min="0" inputMode="numeric"
            placeholder="0" value={initial} onChange={(e) => setInitial(e.target.value)} />
        </div>

        <div style={S.field}>
          <label style={S.label}>Monthly top-up (KSh)</label>
          <input className="mmf-input" style={S.input} type="number" min="0" inputMode="numeric"
            placeholder="0" value={topUp} onChange={(e) => setTopUp(e.target.value)} />
        </div>

        <div style={S.field}>
          <label style={S.label}>Interest rate (% / yr)</label>
          <input className="mmf-input" style={S.input} type="number" min="0" max="100" step="0.1" inputMode="decimal"
            placeholder={String(INVESTMENT_META.mmf.avgReturn)} value={rate} onChange={(e) => setRate(e.target.value)} />
        </div>

        <div style={S.field}>
          <label style={S.label}>Compounding frequency</label>
          <select className="mmf-select" style={S.input} value={compounding} onChange={(e) => setCompounding(e.target.value as Compounding)}>
            {COMPOUNDINGS.map((c) => <option key={c} value={c}>{COMPOUNDING_LABEL[c]}</option>)}
          </select>
        </div>

        <div style={S.field}>
          <label style={S.label}>Duration (years)</label>
          <input className="mmf-input" style={S.input} type="number" min="0" step="0.5" inputMode="decimal"
            placeholder="1" value={years} onChange={(e) => setYears(e.target.value)} />
        </div>
      </div>

      {/* Tax toggle */}
      <label style={S.taxToggle}>
        <input type="checkbox" checked={afterTax} onChange={(e) => setAfterTax(e.target.checked)} style={{ accentColor: 'var(--gold)' }} />
        <span>Show returns after 15% withholding tax (KRA)</span>
      </label>

      {/* Headline summary — like a classic investment calculator */}
      <div style={S.summary}>
        After <strong>{yearLabel}</strong>, your investment could be worth{' '}
        <strong style={{ color: 'var(--gold)' }}>{formatCurrency(Math.round(value), 'KES')}</strong>.{' '}
        Total contributions <strong>{formatCurrency(Math.round(est.totalContributions), 'KES')}</strong>.
      </div>

      {/* Result cards */}
      <div style={S.resultGrid}>
        {results.map((r) => (
          <div key={r.label} style={S.resultCard}>
            <div style={S.resultLabel}>{r.label}</div>
            <div style={{ ...S.resultValue, color: r.color }}>{r.value}</div>
            <div style={S.resultSub}>{r.sub}</div>
          </div>
        ))}
      </div>

      <div style={S.footNote}>
        <TrendingUp size={13} strokeWidth={2.2} style={{ color: 'var(--text-3)', flexShrink: 0, marginTop: 1 }} />
        <span>
          Top-ups are added monthly and compound at your chosen frequency. Rates vary daily with
          market conditions — this is a projection, not financial advice.
        </span>
      </div>
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  card:        { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '26px 24px' },
  header:      { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 },
  iconWrap:    { width: 40, height: 40, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)' },
  title:       { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600, color: 'var(--text-1)' },
  subtitle:    { fontSize: 12, color: 'var(--text-3)', marginTop: 1 },
  field:       { display: 'flex', flexDirection: 'column', gap: 6 },
  label:       { fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  input:       { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-1)', fontSize: 14, fontFamily: 'Karla, sans-serif', transition: 'border-color 0.2s ease', width: '100%' },
  taxToggle:   { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', fontSize: 13, cursor: 'pointer', margin: '16px 0 4px' },
  summary:     { fontSize: 14, color: 'var(--text-2)', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', margin: '14px 0 12px', lineHeight: 1.5 },
  resultGrid:  { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  resultCard:  { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' },
  resultLabel: { fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 },
  resultValue: { fontFamily: 'Cormorant Garamond, serif', fontSize: 23, fontWeight: 700, lineHeight: 1.05 },
  resultSub:   { fontSize: 12, color: 'var(--text-3)', marginTop: 6, textTransform: 'capitalize' },
  footNote:    { display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 16, fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 },
};
