import React, { useState } from 'react';

// Phase 1 ships a single self-contained variant: emergency-fund. Unknown types render
// nothing (handled by ArticlePage's shortcode switch).
export const Calculator: React.FC<{ type?: string }> = ({ type }) => {
  const [daily, setDaily] = useState(1200);
  const [days, setDays] = useState(90);
  const [rate, setRate] = useState(15); // % of daily income saved
  if (type !== 'emergency-fund') return null;

  const target = daily * days;                 // fund goal
  const perDay = Math.round((daily * rate) / 100);
  const months = perDay > 0 ? Math.ceil(target / perDay / 30) : 0;

  return (
    <div style={S.box}>
      <div style={S.h}>📟 Emergency-fund calculator</div>
      <label style={S.row}>Daily income (KES)
        <input type="number" value={daily} onChange={e => setDaily(+e.target.value)} style={S.input} />
      </label>
      <label style={S.row}>Cover how many days?
        <input type="number" value={days} onChange={e => setDays(+e.target.value)} style={S.input} />
      </label>
      <label style={S.row}>Save what % of each day?
        <input type="number" value={rate} onChange={e => setRate(+e.target.value)} style={S.input} />
      </label>
      <div style={S.result}>
        Goal: <b>KES {target.toLocaleString()}</b> · Save <b>KES {perDay.toLocaleString()}/day</b>
        {months > 0 && <> → funded in ~<b>{months} months</b></>}
      </div>
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  box: { background: 'var(--bg-surface)', border: '1px solid var(--border-acc)', borderRadius: 12, padding: 16, margin: '18px 0' },
  h: { fontSize: 12, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--text-2)', margin: '7px 0' },
  input: { width: 120, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, textAlign: 'right' },
  result: { marginTop: 10, padding: '10px 12px', background: 'var(--green-dim)', border: '1px solid var(--green-b)', borderRadius: 8, fontSize: 13, color: 'var(--text-1)' },
};
