import React, { useMemo, useState } from 'react';
import { Landmark, Info, ChevronDown, X, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../utils/expenses';
import {
  computeLoanDuration, formatDuration, payoffDate,
  FREQUENCY_LABEL, FREQUENCY_ADJECTIVE, FREQUENCY_PER,
  type PaymentFrequency, type InterestMethod, type LoanDurationResult,
} from '../utils/loanDuration';

const FREQS: PaymentFrequency[] = ['weekly', 'biweekly', 'monthly', 'quarterly'];
const RATE_PRESETS = [5, 10, 15, 20, 25];
const num = (s: string) => parseFloat(s.replace(/,/g, ''));
const fmt = (n: number) => formatCurrency(Math.round(n), 'KES');

export const LoanEstimator: React.FC = () => {
  const [loanAmount, setLoanAmount] = useState('500000');
  const [payment, setPayment] = useState('20000');
  const [frequency, setFrequency] = useState<PaymentFrequency>('monthly');
  const [rate, setRate] = useState('');
  const [method, setMethod] = useState<InterestMethod>('reducing');
  const [startDate, setStartDate] = useState('');
  const [advOpen, setAdvOpen] = useState(false);
  const [extra, setExtra] = useState('');
  const [fees, setFees] = useState('');
  const [flatTermYears, setFlatTermYears] = useState('');
  const [flatUnit, setFlatUnit] = useState<'months' | 'years'>('years');
  const [methodInfo, setMethodInfo] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [result, setResult] = useState<LoanDurationResult | null>(null);
  const [assumedRate, setAssumedRate] = useState<number | null>(null); // when user tries an estimated rate

  const build = (rateOverride?: number | null, paymentOverride?: number): LoanDurationResult => {
    const flatPeriods = flatTermYears
      ? (flatUnit === 'years' ? num(flatTermYears) * (frequencyPerYear(frequency)) : num(flatTermYears) * (frequencyPerYear(frequency) / 12))
      : null;
    const effRate = rateOverride !== undefined ? rateOverride : (rate.trim() === '' ? null : num(rate));
    return computeLoanDuration({
      loanAmount: num(loanAmount) || 0,
      payment: paymentOverride ?? (num(payment) || 0),
      extraPayment: extra ? num(extra) : 0,
      fees: fees ? num(fees) : 0,
      frequency,
      annualRatePct: effRate,
      method,
      flatTermPeriods: flatPeriods,
    });
  };

  // Recompute with a different regular payment, keeping the same rate context — used
  // by the "what if I pay more?" comparison.
  const computeFor = (p: number) => build(assumedRate === null ? undefined : assumedRate, p);

  const calculate = () => { setAssumedRate(null); setResult(build()); };
  const tryRate = (r: number) => { setAssumedRate(r); setResult(build(r)); };
  const reset = () => {
    setLoanAmount(''); setPayment(''); setRate(''); setExtra(''); setFees('');
    setFlatTermYears(''); setFrequency('monthly'); setMethod('reducing'); setStartDate('');
    setResult(null); setAssumedRate(null); setAdvOpen(false);
  };

  const startMs = useMemo(() => (startDate ? Date.parse(startDate) : NaN), [startDate]);

  return (
    <div style={S.card}>
      <style>{`.loan-input:focus, .loan-select:focus { border-color: var(--border-focus) !important; outline: none; }`}</style>

      <div style={S.header}>
        <span style={S.iconWrap}><Landmark size={20} strokeWidth={2.1} style={{ color: 'var(--gold)' }} /></span>
        <div>
          <div style={S.title}>Loan Payment Duration Estimator</div>
          <div style={S.subtitle}>Tell us what you can pay — we'll estimate how long it takes</div>
        </div>
      </div>

      {/* ── Inputs ── */}
      <div className="inv-form-grid">
        <div style={S.field}>
          <label style={S.label}>How much did you borrow? (KSh)</label>
          <input className="loan-input" style={S.input} type="number" min="0" inputMode="numeric"
            placeholder="500,000" value={loanAmount} onChange={e => setLoanAmount(e.target.value)} />
        </div>
        <div style={S.field}>
          <label style={S.label}>How much can you pay? (KSh)</label>
          <input className="loan-input" style={S.input} type="number" min="0" inputMode="numeric"
            placeholder="20,000" value={payment} onChange={e => setPayment(e.target.value)} />
        </div>
        <div style={S.field}>
          <label style={S.label}>How often will you pay?</label>
          <select className="loan-select" style={S.input} value={frequency} onChange={e => setFrequency(e.target.value as PaymentFrequency)}>
            {FREQS.map(f => <option key={f} value={f}>{FREQUENCY_LABEL[f]}</option>)}
          </select>
        </div>
        <div style={S.field}>
          <label style={S.label}>Interest rate (% / year) — optional</label>
          <input className="loan-input" style={S.input} type="number" min="0" max="100" step="0.1" inputMode="decimal"
            placeholder="Optional" value={rate} onChange={e => setRate(e.target.value)} />
          <span style={S.help}>Don't know it? Leave it blank.</span>
        </div>
      </div>

      {/* Interest method + start date (method only matters with a rate) */}
      <div className="inv-form-grid" style={{ marginTop: 12 }}>
        <div style={S.field}>
          <label style={{ ...S.label, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Interest calculation
            <button type="button" onClick={() => setMethodInfo(v => !v)} style={S.infoBtn} aria-label="What's this?"><Info size={12} /></button>
          </label>
          <select className="loan-select" style={{ ...S.input, opacity: rate.trim() === '' ? 0.55 : 1 }} value={method}
            onChange={e => setMethod(e.target.value as InterestMethod)} disabled={rate.trim() === ''}>
            <option value="reducing">Reducing Balance</option>
            <option value="flat">Flat Rate</option>
          </select>
          {methodInfo && (
            <div style={S.infoBox}>
              <b>Reducing balance:</b> interest on the remaining balance.<br />
              <b>Flat rate:</b> interest on the original amount (needs the lender's term).
            </div>
          )}
        </div>
        <div style={S.field}>
          <label style={S.label}>Start date (optional)</label>
          <input className="loan-input" style={S.input} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        {rate.trim() !== '' && method === 'flat' && (
          <>
            <div style={S.field}>
              <label style={S.label}>Original loan term</label>
              <input className="loan-input" style={S.input} type="number" min="0" inputMode="numeric"
                placeholder="24" value={flatTermYears} onChange={e => setFlatTermYears(e.target.value)} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Term unit</label>
              <select className="loan-select" style={S.input} value={flatUnit} onChange={e => setFlatUnit(e.target.value as 'months' | 'years')}>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* Advanced options */}
      <button type="button" onClick={() => setAdvOpen(v => !v)} style={S.advToggle}>
        <ChevronDown size={15} style={{ transform: advOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} /> Advanced options
      </button>
      {advOpen && (
        <div className="inv-form-grid" style={{ marginBottom: 4 }}>
          <div style={S.field}>
            <label style={S.label}>Extra payment (optional)</label>
            <input className="loan-input" style={S.input} type="number" min="0" inputMode="numeric"
              placeholder="0" value={extra} onChange={e => setExtra(e.target.value)} />
            <span style={S.help}>Extra you'll add each payment period.</span>
          </div>
          <div style={S.field}>
            <label style={S.label}>Upfront fees (optional)</label>
            <input className="loan-input" style={S.input} type="number" min="0" inputMode="numeric"
              placeholder="0" value={fees} onChange={e => setFees(e.target.value)} />
            <span style={S.help}>Shown separately from the loan.</span>
          </div>
        </div>
      )}

      {/* CTA */}
      <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
        <button style={S.cta} onClick={calculate}>{result ? 'Recalculate' : 'Calculate repayment time'}</button>
        {result && <button style={S.resetBtn} onClick={reset}>Reset</button>}
      </div>

      {result && <Results result={result} startMs={startMs} assumedRate={assumedRate} onTryRate={tryRate}
        onShowSchedule={() => setShowSchedule(true)} payment={num(payment) || 0}
        frequency={frequency} method={method} feesVal={fees ? num(fees) : 0} computeFor={computeFor} />}

      <div style={S.disclaimer}>
        <b>Estimate only:</b> results are for information and may differ from your lender's actual schedule.
        Actual interest, fees, insurance, penalties, dates and methods depend on your loan agreement.
      </div>

      {showSchedule && result && <ScheduleModal result={result} onClose={() => setShowSchedule(false)} />}
    </div>
  );
};

/* ── Results dashboard ── */
const Results: React.FC<{
  result: LoanDurationResult; startMs: number; assumedRate: number | null;
  onTryRate: (r: number) => void; onShowSchedule: () => void;
  payment: number; frequency: PaymentFrequency; method: InterestMethod; feesVal: number;
  computeFor: (payment: number) => LoanDurationResult;
}> = ({ result: r, startMs, assumedRate, onTryRate, onShowSchedule, payment, frequency, method, feesVal, computeFor }) => {
  if (r.status === 'invalid') return <div style={S.warn}>{r.message}</div>;
  if (r.status === 'payment-too-low') return (
    <div style={S.warnCard}><div style={S.warnTitle}>Payment too low</div><div style={S.warnBody}>{r.message}</div></div>
  );
  if (r.status === 'need-flat-term') return (
    <div style={S.warnCard}><div style={S.warnTitle}>Original term needed</div><div style={S.warnBody}>{r.message}</div></div>
  );

  const per = FREQUENCY_PER[frequency];
  const durationText = formatDuration(r.periods, frequency);
  const sentence = r.rateKnown
    ? `At ${fmt(r.paymentPerPeriod)}${per} and ${assumedRate ?? ''}% interest, your loan is estimated to take about ${durationText} to repay.`
    : `At ${fmt(r.paymentPerPeriod)}${per}, you'd need about ${durationText} (${r.periods} ${FREQUENCY_ADJECTIVE[frequency]} payments) to clear ${fmt(r.totalPrincipal)} — before interest and fees.`;

  const secondary = [
    { label: 'Payment amount', value: fmt(r.paymentPerPeriod), sub: per.replace('/', 'per ') },
    { label: 'Number of payments', value: String(r.periods), sub: `${FREQUENCY_ADJECTIVE[frequency]} payments` },
    { label: 'Total principal', value: fmt(r.totalPrincipal), sub: feesVal ? `+ ${fmt(feesVal)} fees` : 'borrowed' },
    { label: 'Estimated interest', value: r.totalInterest === null ? 'Not provided' : fmt(r.totalInterest), sub: r.rateKnown ? `${method === 'flat' ? 'flat' : 'reducing'} rate` : 'no rate entered' },
    { label: 'Total repayment', value: r.totalRepayment === null ? 'Principal only' : fmt(r.totalRepayment), sub: r.rateKnown ? 'principal + interest' : 'excludes interest' },
  ];

  const payoff = !Number.isNaN(startMs) ? payoffDate(startMs, r.periods, frequency) : null;
  const progress = pickProgress(r.schedule);
  const comparison = buildComparison(payment, frequency, computeFor);

  return (
    <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Primary */}
      <div style={S.primary}>
        <div style={S.primaryLabel}>Estimated time to pay off</div>
        <div style={S.primaryValue}>{durationText}</div>
        <div style={S.primarySub}>{r.periods} {FREQUENCY_ADJECTIVE[frequency]} payments of {fmt(r.paymentPerPeriod)}</div>
        {!r.rateKnown && !assumedRate && <div style={S.pill}>Principal-only estimate</div>}
        {assumedRate != null && <div style={S.pillGold}>Estimated using {assumedRate}% annual interest</div>}
      </div>

      <div style={S.sentence}>{sentence}</div>

      {/* Secondary cards */}
      <div style={S.secGrid}>
        {secondary.map(s => (
          <div key={s.label} style={S.secCard}>
            <div style={S.secLabel}>{s.label}</div>
            <div style={S.secValue}>{s.value}</div>
            <div style={S.secSub}>{s.sub}</div>
          </div>
        ))}
        {payoff && (
          <div style={S.secCard}>
            <div style={S.secLabel}>Estimated payoff date</div>
            <div style={{ ...S.secValue, color: 'var(--gold)' }}>{payoff.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <div style={S.secSub}>based on your schedule</div>
          </div>
        )}
      </div>

      {/* Unknown-rate: disclaimer + try-a-rate */}
      {!r.rateKnown && (
        <div style={S.infoCard}>
          <div style={S.warnBody}>
            You didn't provide an interest rate, so this excludes interest, fees and penalties.
            Your actual repayment period may be longer depending on your lender's terms.
          </div>
          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>Want a more realistic estimate?</div>
          <div style={S.presetRow}>
            {RATE_PRESETS.map(p => (
              <button key={p} onClick={() => onTryRate(p)} style={{ ...S.preset, ...(assumedRate === p ? S.presetActive : {}) }}>{p}%</button>
            ))}
          </div>
        </div>
      )}

      {/* Loan summary */}
      <div style={S.summaryCard}>
        <div style={S.summaryTitle}>Your loan</div>
        <SummaryRow k="Loan amount" v={fmt(r.totalPrincipal)} />
        <SummaryRow k="Payment" v={`${fmt(r.paymentPerPeriod)} ${per}`} />
        <SummaryRow k="Interest" v={r.rateKnown ? `${assumedRate ?? ''}% / year` : 'Not provided'} />
        <SummaryRow k="Method" v={r.rateKnown ? (method === 'flat' ? 'Flat rate' : 'Reducing balance') : '—'} />
        <SummaryRow k="Estimated duration" v={durationText} last />
      </div>

      {/* Repayment journey */}
      <div style={S.summaryCard}>
        <div style={S.summaryTitle}>Repayment journey</div>
        {progress.map((row, i) => (
          <div key={i} style={S.journeyRow}>
            <span style={S.journeyLabel}>{row.label}</span>
            <span style={S.journeyBal}>{row.gap ? '⋯' : fmt(row.balance)}</span>
          </div>
        ))}
        <button style={S.linkBtn} onClick={onShowSchedule}>View full repayment schedule →</button>
      </div>

      {/* What if I pay more */}
      {comparison.length > 0 && (
        <div style={S.summaryCard}>
          <div style={{ ...S.summaryTitle, display: 'inline-flex', alignItems: 'center', gap: 6 }}><TrendingDown size={15} style={{ color: 'var(--green)' }} /> What if I pay more?</div>
          {comparison.map((c, i) => (
            <div key={i} style={{ ...S.journeyRow, ...(c.current ? { fontWeight: 700 } : {}) }}>
              <span style={S.journeyLabel}>{fmt(c.payment)} {per}</span>
              <span style={{ ...S.journeyBal, color: c.current ? 'var(--gold)' : 'var(--text-2)' }}>{c.duration}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SummaryRow: React.FC<{ k: string; v: string; last?: boolean }> = ({ k, v, last }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: last ? 'none' : '1px solid var(--border)', fontSize: 13.5 }}>
    <span style={{ color: 'var(--text-3)' }}>{k}</span>
    <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{v}</span>
  </div>
);

/* ── Full schedule modal ── */
const ScheduleModal: React.FC<{ result: LoanDurationResult; onClose: () => void }> = ({ result: r, onClose }) => (
  <div style={S.overlay} role="dialog" aria-modal="true">
    <div style={S.overlayBack} onClick={onClose} />
    <div style={S.modal}>
      <div style={S.modalHead}>
        <div>
          <div style={S.modalTitle}>Repayment schedule</div>
          {!r.rateKnown && <div style={S.pill}>Principal-only estimate</div>}
        </div>
        <button style={S.modalClose} onClick={onClose} aria-label="Close"><X size={16} /></button>
      </div>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>#</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Payment</th>
              {r.rateKnown && <th style={{ ...S.th, textAlign: 'right' }}>Interest</th>}
              {r.rateKnown && <th style={{ ...S.th, textAlign: 'right' }}>Principal</th>}
              <th style={{ ...S.th, textAlign: 'right' }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {r.schedule.map(row => (
              <tr key={row.n}>
                <td style={S.td}>{row.n}</td>
                <td style={{ ...S.td, textAlign: 'right' }}>{fmt(row.payment)}</td>
                {r.rateKnown && <td style={{ ...S.td, textAlign: 'right', color: 'var(--red)' }}>{fmt(row.interest ?? 0)}</td>}
                {r.rateKnown && <td style={{ ...S.td, textAlign: 'right', color: 'var(--green)' }}>{fmt(row.principal ?? 0)}</td>}
                <td style={{ ...S.td, textAlign: 'right', fontWeight: 600 }}>{fmt(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

/* ── helpers ── */
function frequencyPerYear(f: PaymentFrequency) { return { weekly: 52, biweekly: 26, monthly: 12, quarterly: 4 }[f]; }

function pickProgress(schedule: { n: number; balance: number }[]): { label: string; balance: number; gap?: boolean }[] {
  if (schedule.length === 0) return [];
  const rows: { label: string; balance: number; gap?: boolean }[] = [];
  rows.push({ label: 'Payment 1', balance: schedule[0].balance });
  if (schedule.length <= 6) {
    for (let i = 1; i < schedule.length; i++) rows.push({ label: `Payment ${schedule[i].n}`, balance: schedule[i].balance });
  } else {
    rows.push({ label: `Payment ${schedule[1].n}`, balance: schedule[1].balance });
    rows.push({ label: '', balance: 0, gap: true });
    rows.push({ label: `Payment ${schedule[schedule.length - 2].n}`, balance: schedule[schedule.length - 2].balance });
    rows.push({ label: 'Final payment', balance: schedule[schedule.length - 1].balance });
  }
  return rows;
}

// Three payment scenarios (less / current / more), using the same rate context.
function buildComparison(payment: number, frequency: PaymentFrequency, computeFor: (p: number) => LoanDurationResult) {
  if (!(payment > 0)) return [];
  const step = Math.max(1000, Math.round((payment * 0.25) / 1000) * 1000);
  return [payment - step, payment, payment + step]
    .filter(p => p > 0)
    .map(p => {
      const res = computeFor(p);
      return { payment: p, duration: res.status === 'ok' ? formatDuration(res.periods, frequency) : '—', current: p === payment };
    });
}

const S: Record<string, React.CSSProperties> = {
  card:        { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '26px 24px' },
  header:      { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 },
  iconWrap:    { width: 40, height: 40, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gold-dim)', border: '1px solid var(--border-acc)' },
  title:       { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600, color: 'var(--text-1)' },
  subtitle:    { fontSize: 12, color: 'var(--text-3)', marginTop: 1 },
  field:       { display: 'flex', flexDirection: 'column', gap: 6 },
  label:       { fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  input:       { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-1)', fontSize: 14, fontFamily: 'Karla, sans-serif', transition: 'border-color 0.2s ease', width: '100%' },
  help:        { fontSize: 11, color: 'var(--text-3)' },
  infoBtn:     { display: 'inline-flex', width: 16, height: 16, borderRadius: '50%', border: '1px solid var(--border-s)', background: 'transparent', color: 'var(--text-3)', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 },
  infoBox:     { fontSize: 12, color: 'var(--text-2)', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', lineHeight: 1.5 },
  advToggle:   { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: 'var(--gold)', fontSize: 13, fontWeight: 700, cursor: 'pointer', margin: '14px 0 10px', padding: 0 },
  cta:         { padding: '12px 24px', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14.5, cursor: 'pointer', boxShadow: '0 4px 18px var(--gold-glow)' },
  resetBtn:    { padding: '12px 20px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  primary:     { textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-acc)', borderRadius: 14, padding: '22px 18px' },
  primaryLabel:{ fontSize: 11.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' },
  primaryValue:{ fontFamily: 'Cormorant Garamond, serif', fontSize: 38, fontWeight: 700, color: 'var(--gold)', lineHeight: 1.05, margin: '6px 0 4px' },
  primarySub:  { fontSize: 13, color: 'var(--text-2)' },
  pill:        { display: 'inline-block', marginTop: 10, fontSize: 11, fontWeight: 700, color: 'var(--text-2)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 12px' },
  pillGold:    { display: 'inline-block', marginTop: 10, fontSize: 11, fontWeight: 700, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid var(--border-acc)', borderRadius: 999, padding: '4px 12px' },
  sentence:    { fontSize: 14, color: 'var(--text-2)', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', lineHeight: 1.5 },
  secGrid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 },
  secCard:     { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' },
  secLabel:    { fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 },
  secValue:    { fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.1 },
  secSub:      { fontSize: 11.5, color: 'var(--text-3)', marginTop: 4 },
  infoCard:    { background: 'var(--bg-surface)', border: '1px dashed var(--border-s)', borderRadius: 12, padding: '14px 16px' },
  presetRow:   { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  preset:      { padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-2)', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  presetActive:{ borderColor: 'var(--border-acc)', background: 'var(--gold-dim)', color: 'var(--gold)' },
  summaryCard: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' },
  summaryTitle:{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 },
  journeyRow:  { display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 13.5 },
  journeyLabel:{ color: 'var(--text-3)' },
  journeyBal:  { color: 'var(--text-1)', fontWeight: 600 },
  linkBtn:     { background: 'transparent', border: 'none', color: 'var(--gold)', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '8px 0 0' },
  warn:        { marginTop: 16, fontSize: 13, color: 'var(--red)', background: 'var(--red-dim)', border: '1px solid var(--red-b)', borderRadius: 10, padding: '10px 14px' },
  warnCard:    { marginTop: 16, background: 'var(--red-dim)', border: '1px solid var(--red-b)', borderRadius: 12, padding: '16px 18px' },
  warnTitle:   { fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 700, color: 'var(--red)', marginBottom: 6 },
  warnBody:    { fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.55 },
  disclaimer:  { fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.5, marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)' },
  overlay:     { position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  overlayBack: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' },
  modal:       { position: 'relative', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '82vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' },
  modalHead:   { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)' },
  modalTitle:  { fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 700, color: 'var(--text-1)' },
  modalClose:  { width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-2)', cursor: 'pointer', display: 'grid', placeItems: 'center' },
  tableWrap:   { overflow: 'auto', padding: '4px 20px 20px' },
  table:       { width: '100%', borderCollapse: 'collapse', fontSize: 12.5 },
  th:          { position: 'sticky', top: 0, background: 'var(--bg-card)', textAlign: 'left', padding: '10px 8px', color: 'var(--text-3)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' },
  td:          { padding: '8px', color: 'var(--text-1)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' },
};
