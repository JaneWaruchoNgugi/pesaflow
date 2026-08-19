import React from 'react';
import { ShieldAlert, BarChart3, ClipboardList, PartyPopper, CircleCheck, CircleDashed, CircleAlert } from 'lucide-react';
import type { EmergencyFundData } from '../types';
import { formatCurrency } from '../utils/expenses';

interface EmergencyFundProps {
  data: EmergencyFundData;
  targetAmount: number;
  progressPct: number;
  monthsCovered: number;
  monthlyExpenses: number;
  monthlyIncome: number;
  currency: string;
  onDeposit: (amount: number, note?: string) => void;
  onWithdraw: (amount: number, note?: string) => void;
  onSetTargetMonths: (months: number) => void;
  onSetCurrentAmount: (amount: number) => void;
}

export const EmergencyFund: React.FC<EmergencyFundProps> = ({
  data, targetAmount, progressPct, monthsCovered,
  monthlyExpenses, monthlyIncome, currency,
  onSetTargetMonths,
}) => {
  const amountLeft  = Math.max(0, targetAmount - data.currentAmount);
  const monthlyRec  = Math.ceil(amountLeft / 6);
  const weeklyRec   = Math.ceil(amountLeft / 26);
  const incomeAlloc = monthlyIncome > 0 ? Math.ceil((monthlyRec / monthlyIncome) * 100) : 0;

  const statusColor = progressPct >= 80 ? 'var(--green)' : progressPct >= 40 ? 'var(--amber)' : 'var(--red)';
  const StatusIcon = progressPct >= 100 ? PartyPopper : progressPct >= 80 ? CircleCheck : progressPct >= 40 ? CircleDashed : CircleAlert;
  const statusText = progressPct >= 100 ? 'Complete!' : progressPct >= 80 ? 'Almost there' : progressPct >= 40 ? 'In progress' : 'Just started';

  return (
    <div style={S.container} className="animate-in">
      {/* Page header */}
      <div style={S.pageHeader} className="page-header-row">
        <div>
          <h1 style={S.pageTitle}><ShieldAlert size={26} strokeWidth={2.2} /> Emergency Fund</h1>
          <p style={S.pageSub}>Your financial safety net — aim for {data.targetMonths} months of living expenses</p>
        </div>
        <div style={S.targetToggle} className="toggle-group">
          {[3, 6, 9].map((m) => (
            <button key={m}
              style={{ ...S.toggleBtn, ...(data.targetMonths === m ? S.toggleActive : {}) }}
              onClick={() => onSetTargetMonths(m)}
            >
              {m}mo
            </button>
          ))}
        </div>
      </div>

      {/* Main progress card */}
      <div style={{ ...S.progressCard, borderColor: `${statusColor}30`, background: 'var(--bg-elevated)' }}>
        <div style={S.progressTop}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Current Fund</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 700, color: statusColor }}>
              {formatCurrency(data.currentAmount, currency)}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              of {formatCurrency(targetAmount, currency)} target · <StatusIcon size={14} strokeWidth={2.2} style={{ color: statusColor }} /> {statusText}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(36px, 6vw, 52px)', fontWeight: 700, color: statusColor, lineHeight: 1 }}>{progressPct}%</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>complete</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={S.bigBar}>
          <div style={{ ...S.bigBarFill, width: `${progressPct}%`, background: statusColor, boxShadow: `0 0 12px ${statusColor}60` }} />
        </div>

        {/* KPI row */}
        <div className="ef-kpi-row">
          {[
            { label: 'Months Covered', value: `${monthsCovered} mo`, color: statusColor },
            { label: 'Still Needed', value: formatCurrency(amountLeft, currency), color: amountLeft > 0 ? 'var(--red)' : 'var(--green)' },
            { label: 'Monthly Target', value: formatCurrency(monthlyExpenses, currency), color: 'var(--text-2)' },
            { label: 'Last Updated', value: data.lastUpdated || '—', color: 'var(--text-3)' },
          ].map((k) => (
            <div key={k.label} style={S.kpi}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 700, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div style={S.card}>
        <div style={S.cardTitle}><BarChart3 size={20} strokeWidth={2.2} /> Recommendations</div>
        <div style={S.recList}>
          {[
            { label: 'Monthly contribution', value: formatCurrency(monthlyRec, currency), sub: 'to reach target in 6 months' },
            { label: 'Weekly savings target', value: formatCurrency(weeklyRec, currency), sub: `≈ ${incomeAlloc}% of monthly income` },
            { label: 'Best place to store it', value: 'Cytonn / NCBA MMF', sub: '~11% p.a. — liquid & insured' },
            { label: '3-Month target', value: formatCurrency(monthlyExpenses * 3, currency), sub: 'minimum safety net' },
            { label: '6-Month target', value: formatCurrency(monthlyExpenses * 6, currency), sub: 'recommended buffer' },
          ].map((r) => (
            <div key={r.label} style={S.recRow}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>{r.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{r.sub}</div>
              </div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17, fontWeight: 700, color: 'var(--gold)', textAlign: 'right' }}>{r.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Contribution history */}
      {data.contributions.length > 0 && (
        <div style={S.card}>
          <div style={S.cardTitle}><ClipboardList size={20} strokeWidth={2.2} /> Contribution History</div>
          <div>
            {data.contributions.slice(0, 15).map((c, i) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.amount > 0 ? 'var(--green)' : 'var(--red)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-1)' }}>{c.note || (c.amount > 0 ? 'Deposit' : 'Withdrawal')}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.date}</div>
                </div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 16, fontWeight: 700, color: c.amount > 0 ? 'var(--green)' : 'var(--red)' }}>
                  {c.amount > 0 ? '+' : ''}{formatCurrency(c.amount, currency)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 20 },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 },
  pageTitle: { fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 700, color: 'var(--gold-l)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 },
  pageSub: { fontSize: 13, color: 'var(--text-2)', marginTop: 4 },
  targetToggle: { display: 'flex', gap: 6 },
  toggleBtn: { padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', fontFamily: 'Karla, sans-serif', fontSize: 13, cursor: 'pointer' },
  toggleActive: { borderColor: 'var(--gold)', background: 'var(--gold-dim)', color: 'var(--gold)', fontWeight: 700 },
  progressCard: { borderRadius: 16, padding: 'clamp(16px, 4vw, 32px)', border: '1px solid' },
  progressTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  bigBar: { height: 14, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', marginBottom: 24 },
  bigBarFill: { height: '100%', borderRadius: 99, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' },
  kpi: { background: 'var(--bg-surface)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border)' },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 26px' },
  cardTitle: { fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 600, color: 'var(--text-1)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 },
  recList: { display: 'flex', flexDirection: 'column', gap: 0 },
  recRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' },
};
