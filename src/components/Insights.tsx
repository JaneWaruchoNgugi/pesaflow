import React from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import type { MonthlyBreakdown, FinancialProfile } from '../types';
import { CATEGORY_META, formatCurrency } from '../utils/expenses';

interface InsightsProps {
  breakdown: MonthlyBreakdown;
  profile: FinancialProfile;
}

export const Insights: React.FC<InsightsProps> = ({ breakdown, profile }) => {
  const income = profile.monthlyIncome;
  const total = breakdown.totalExpenses;

  const necessaryPct = income > 0 ? Math.round((breakdown.necessaryTotal / income) * 100) : 0;
  const unnecessaryPct = income > 0 ? Math.round((breakdown.unnecessaryTotal / income) * 100) : 0;
  const savingsPct = income > 0 ? Math.max(0, Math.round((breakdown.savingsLeft / income) * 100)) : 0;

  const allCategories = (Object.entries(breakdown.byCategory) as [string, number][])
    .filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a);

  const unnecessaryItems = allCategories.filter(([cat]) => CATEGORY_META[cat as keyof typeof CATEGORY_META]?.type === 'unnecessary');
  const necessaryItems   = allCategories.filter(([cat]) => CATEGORY_META[cat as keyof typeof CATEGORY_META]?.type === 'necessary');
  const idealUnnecessaryPct = income <= 20000 ? 10 : income <= 50000 ? 15 : 20;

  return (
    <div style={S.container} className="animate-in">

      {/* Donut + Comparison */}
      <div className="insights-top-row">
        <div style={S.donutCard}>
          <div style={S.cardTitle}>Spending Breakdown</div>
          <div style={S.donutWrap}>
            <svg width="190" height="190" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="75" fill="none" stroke="var(--border-s)" strokeWidth="28" />
              {necessaryPct > 0 && (
                <circle cx="100" cy="100" r="75" fill="none" stroke="var(--blue)" strokeWidth="28"
                  strokeDasharray={`${(necessaryPct / 100) * 471} 471`}
                  strokeLinecap="butt" transform="rotate(-90 100 100)" />
              )}
              {unnecessaryPct > 0 && (
                <circle cx="100" cy="100" r="75" fill="none" stroke="var(--amber)" strokeWidth="28"
                  strokeDasharray={`${(unnecessaryPct / 100) * 471} 471`}
                  strokeLinecap="butt" transform={`rotate(${-90 + (necessaryPct / 100) * 360} 100 100)`} />
              )}
              {savingsPct > 0 && (
                <circle cx="100" cy="100" r="75" fill="none" stroke="var(--green)" strokeWidth="28"
                  strokeDasharray={`${(savingsPct / 100) * 471} 471`}
                  strokeLinecap="butt" transform={`rotate(${-90 + ((necessaryPct + unnecessaryPct) / 100) * 360} 100 100)`} />
              )}
              <text x="100" y="96" textAnchor="middle" fill="var(--text-1)" fontSize="13" fontFamily="Karla">Total Spent</text>
              <text x="100" y="115" textAnchor="middle" fill="var(--gold)" fontSize="13" fontFamily="Cormorant Garamond" fontWeight="700">
                {income > 0 ? `${Math.min(100, necessaryPct + unnecessaryPct)}%` : '—'}
              </text>
            </svg>
          </div>
          <div style={S.legend}>
            {[
              { color: 'var(--blue)', label: 'Necessary', pct: necessaryPct, amount: breakdown.necessaryTotal },
              { color: 'var(--amber)', label: 'Unnecessary', pct: unnecessaryPct, amount: breakdown.unnecessaryTotal },
              { color: 'var(--green)', label: 'Remaining', pct: savingsPct, amount: breakdown.savingsLeft },
            ].map((item) => (
              <div key={item.label} style={S.legendItem}>
                <div style={{ ...S.legendDot, background: item.color }} />
                <div style={S.legendInfo}>
                  <span style={S.legendLabel}>{item.label}</span>
                  <span style={{ ...S.legendPct, color: item.color }}>{item.pct}%</span>
                </div>
                <span style={S.legendAmt}>{formatCurrency(item.amount, 'KES')}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={S.comparisonCard}>
          <div style={S.cardTitle}>Ideal vs Actual Allocation</div>
          <div style={S.compRows}>
            {[
              { label: 'Necessary Expenses', ideal: income <= 20000 ? 70 : income <= 50000 ? 60 : 50, actual: necessaryPct, color: 'var(--blue)', warn: false },
              { label: 'Unnecessary / Lifestyle', ideal: idealUnnecessaryPct, actual: unnecessaryPct, color: 'var(--amber)', warn: unnecessaryPct > idealUnnecessaryPct },
              { label: 'Savings & Investment', ideal: income <= 20000 ? 20 : income <= 50000 ? 25 : 30, actual: savingsPct, color: 'var(--green)', warn: false },
            ].map((row) => (
              <div key={row.label} style={S.compRow}>
                <div className="comp-label">
                  <span>{row.label}</span>
                  {row.warn && <span style={S.warnTag}>Over budget</span>}
                </div>
                <div style={S.compBars}>
                  {[
                    { lbl: `Ideal ${row.ideal}%`, w: row.ideal, bg: `${row.color}60` },
                    { lbl: `Actual ${row.actual}%`, w: Math.min(row.actual, 100), bg: row.warn ? 'var(--red)' : row.color },
                  ].map((b) => (
                    <div key={b.lbl} style={S.compBarWrap}>
                      <span style={S.compBarLabel}>{b.lbl}</span>
                      <div style={S.compBarTrack}>
                        <div style={{ ...S.compBarFill, width: `${b.w}%`, background: b.bg }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {unnecessaryPct > idealUnnecessaryPct && (
            <div style={S.alertBox}>
              <strong>You're spending {unnecessaryPct - idealUnnecessaryPct}% more than ideal on lifestyle.</strong>
              <span> That's {formatCurrency(Math.round(((unnecessaryPct - idealUnnecessaryPct) / 100) * income), 'KES')} that could be invested monthly.</span>
            </div>
          )}
        </div>
      </div>

      {/* Category tables */}
      <div className="two-col-grid">
        {[
          { items: necessaryItems, label: 'Necessary Expenses', icon: Check, iconColor: 'var(--blue)', total: breakdown.necessaryTotal, totalColor: 'var(--blue)', emptyMsg: 'None logged yet' },
          { items: unnecessaryItems, label: 'Unnecessary Expenses', icon: AlertTriangle, iconColor: 'var(--amber)', total: breakdown.unnecessaryTotal, totalColor: 'var(--amber)', emptyMsg: 'None logged — great job!' },
        ].map(({ items, label, icon: TitleIcon, iconColor, total: tot, totalColor, emptyMsg }) => (
          <div key={label} style={S.tableCard}>
            <div style={S.tableTitle}>
              <TitleIcon size={18} strokeWidth={2.2} style={{ color: iconColor }} /> {label}
            </div>
            {items.length === 0 ? (
              <div style={S.emptyTable}>{emptyMsg}</div>
            ) : items.map(([cat, amount]) => {
              const meta = CATEGORY_META[cat as keyof typeof CATEGORY_META];
              const RowIcon = meta?.icon;
              return (
                <div key={cat} style={S.tableRow}>
                  {RowIcon ? <span style={S.tableIcon}><RowIcon size={18} strokeWidth={2.1} style={{ color: meta?.color }} /></span> : null}
                  <span style={S.tableCat}>{meta?.label}</span>
                  <span style={S.tableAmt}>{formatCurrency(amount, 'KES')}</span>
                  <span style={{ ...S.tablePct, color: iconColor }}>
                    {total > 0 ? Math.round((amount / total) * 100) : 0}%
                  </span>
                </div>
              );
            })}
            <div style={{ ...S.tableTotal }}>
              <span style={{ color: 'var(--text-2)' }}>Total</span>
              <span style={{ color: totalColor }}>{formatCurrency(tot, 'KES')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 20 },
  cardTitle: { fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 600, color: 'var(--text-1)', marginBottom: 16 },
  donutCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px' },
  donutWrap: { display: 'flex', justifyContent: 'center', margin: '8px 0 16px' },
  legend: { display: 'flex', flexDirection: 'column', gap: 10 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 10 },
  legendDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  legendInfo: { flex: 1, display: 'flex', justifyContent: 'space-between' },
  legendLabel: { fontSize: 13, color: 'var(--text-2)' },
  legendPct: { fontSize: 13, fontWeight: 600 },
  legendAmt: { fontFamily: 'Cormorant Garamond, serif', fontSize: 15, fontWeight: 600, color: 'var(--text-1)' },
  comparisonCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 28px' },
  compRows: { display: 'flex', flexDirection: 'column', gap: 22 },
  compRow: { display: 'flex', flexDirection: 'column', gap: 8 },
  warnTag: { fontSize: 11, color: 'var(--red)', background: 'var(--red-dim)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 },
  compBars: { display: 'flex', flexDirection: 'column', gap: 4 },
  compBarWrap: { display: 'flex', alignItems: 'center', gap: 10 },
  compBarLabel: { fontSize: 11, color: 'var(--text-3)', width: 78, flexShrink: 0 },
  compBarTrack: { flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' },
  compBarFill: { height: '100%', borderRadius: 3, transition: 'width 0.6s ease' },
  alertBox: { marginTop: 20, padding: '14px 18px', background: 'var(--red-dim)', border: '1px solid var(--red-b)', borderRadius: 10, fontSize: 13, color: 'var(--red)', lineHeight: 1.6 },
  tableCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 24px' },
  tableTitle: { fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 600, color: 'var(--text-1)', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' },
  emptyTable: { color: 'var(--text-3)', fontSize: 13, padding: '8px 0' },
  tableRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' },
  tableIcon: { fontSize: 18, flexShrink: 0 },
  tableCat: { flex: 1, fontSize: 13, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  tableAmt: { fontFamily: 'Cormorant Garamond, serif', fontSize: 15, fontWeight: 600, color: 'var(--text-1)', flexShrink: 0 },
  tablePct: { fontSize: 12, color: 'var(--text-3)', width: 36, textAlign: 'right', flexShrink: 0 },
  tableTotal: { display: 'flex', justifyContent: 'space-between', paddingTop: 12, fontFamily: 'Cormorant Garamond, serif', fontSize: 16, fontWeight: 700 },
};
