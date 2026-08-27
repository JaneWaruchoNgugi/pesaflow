import React, { useMemo, useState } from 'react';
import { Calculator, TrendingUp } from 'lucide-react';
import { estimateMMF } from '../utils/mmf';
import { formatCurrency } from '../utils/expenses';
import { INVESTMENT_META } from '../utils/investments';

// Money Market Fund return estimator — lives in the Investments view.
// User enters how much they'll invest, the fund's annual rate, and a duration;
// we project the maturity value using daily-compounded / monthly-credited growth,
// with a toggle for Kenya's 15% withholding tax on interest.

const WHT_PCT = 15;
type Unit = 'months' | 'years';

export const MMFCalculator: React.FC = () => {
  const [amount, setAmount] = useState('50000');
  const [rate, setRate] = useState(String(INVESTMENT_META.mmf.avgReturn)); // default ~11%
  const [duration, setDuration] = useState('12');
  const [unit, setUnit] = useState<Unit>('months');
  const [afterTax, setAfterTax] = useState(true);

  const est = useMemo(() => {
    const p = parseFloat(amount.replace(/,/g, '')) || 0;
    const r = parseFloat(rate) || 0;
    const d = parseFloat(duration) || 0;
    const months = unit === 'years' ? d * 12 : d;
    return estimateMMF(p, r, months, afterTax ? WHT_PCT : 0);
  }, [amount, rate, duration, unit, afterTax]);

  const interest = afterTax ? est.netInterest : est.grossInterest;
  const maturity = afterTax ? est.netValue : est.grossValue;
  const growthPct = est.principal > 0 ? (interest / est.principal) * 100 : 0;

  const results = [
    { label: 'You invest',    value: formatCurrency(Math.round(est.principal), 'KES'), color: 'var(--text-1)', sub: 'Principal' },
    { label: afterTax ? 'Interest (after tax)' : 'Interest earned', value: formatCurrency(Math.round(interest), 'KES'), color: 'var(--green)', sub: `+${growthPct.toFixed(1)}% growth` },
    { label: 'Maturity value', value: formatCurrency(Math.round(maturity), 'KES'), color: 'var(--gold)', sub: afterTax ? 'What you take home' : 'Before 15% tax' },
  ];

  return (
    <div style={S.card}>
      <style>{`
        .mmf-input:focus { border-color: var(--border-focus) !important; outline: none; }
        .mmf-seg-btn { transition: color .15s, background .15s, border-color .15s; }
      `}</style>

      <div style={S.header}>
        <span style={S.iconWrap}><Calculator size={20} strokeWidth={2.1} style={{ color: 'var(--blue)' }} /></span>
        <div>
          <div style={S.title}>MMF Return Estimator</div>
          <div style={S.subtitle}>Project what a money market fund could grow to</div>
        </div>
      </div>

      <div className="inv-form-grid">
        <div style={S.field}>
          <label style={S.label}>Amount to invest (KSh)</label>
          <input
            className="mmf-input" style={S.input}
            type="number" min="0" inputMode="numeric"
            placeholder="0" value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div style={S.field}>
          <label style={S.label}>Interest rate (% / yr)</label>
          <input
            className="mmf-input" style={S.input}
            type="number" min="0" max="100" step="0.1" inputMode="decimal"
            placeholder={String(INVESTMENT_META.mmf.avgReturn)} value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>

        <div style={S.field}>
          <label style={S.label}>Duration</label>
          <input
            className="mmf-input" style={S.input}
            type="number" min="0" inputMode="numeric"
            placeholder="12" value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>

        <div style={S.field}>
          <label style={S.label}>Period</label>
          <div style={S.segment}>
            {(['months', 'years'] as Unit[]).map((u) => (
              <button
                key={u}
                className="mmf-seg-btn"
                style={{ ...S.segBtn, ...(unit === u ? S.segBtnActive : {}) }}
                onClick={() => setUnit(u)}
              >
                {u === 'months' ? 'Months' : 'Years'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tax toggle */}
      <label style={S.taxToggle}>
        <input
          type="checkbox"
          checked={afterTax}
          onChange={(e) => setAfterTax(e.target.checked)}
          style={{ accentColor: 'var(--gold)' }}
        />
        <span>Show returns after 15% withholding tax (KRA)</span>
      </label>

      {/* Results */}
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
          Estimated with daily compounding credited monthly — the way most Kenyan MMFs actually pay.
          Rates are variable and not guaranteed; this is a projection, not financial advice.
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
  segment:     { display: 'flex', gap: 4, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 3 },
  segBtn:      { flex: 1, padding: '7px 0', background: 'transparent', border: '1px solid transparent', borderRadius: 6, color: 'var(--text-3)', fontSize: 13, fontFamily: 'Karla, sans-serif', cursor: 'pointer' },
  segBtnActive:{ background: 'var(--gold-dim)', borderColor: 'var(--border-acc)', color: 'var(--gold)', fontWeight: 600 },
  taxToggle:   { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', fontSize: 13, cursor: 'pointer', margin: '16px 0 4px' },
  resultGrid:  { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 14 },
  resultCard:  { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' },
  resultLabel: { fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 },
  resultValue: { fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 700, lineHeight: 1.05 },
  resultSub:   { fontSize: 12, color: 'var(--text-3)', marginTop: 6 },
  footNote:    { display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 16, fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 },
};
