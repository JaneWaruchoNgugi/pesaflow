import React, { useState } from 'react';
import { Check, X, Plus, Landmark } from 'lucide-react';
import type { Loan, LiabilityCategory } from '../types';
import { LIABILITY_META } from '../hooks/netWorth';
import { loanPaydownPct, totalLoanBalance } from '../hooks/loans';
import { formatCurrency } from '../utils/expenses';
import { IconSelect } from './ui/IconSelect';
import { Modal } from './ui/Modal';

interface LoansProps {
  loans: Loan[];
  currency: string;
  hasLoanBill?: boolean;
  onAdd: (data: Omit<Loan, 'id' | 'createdAt'>) => void;
  onRemove: (id: string) => void;
  onRecordPayment: (id: string, amount: number) => void;
}

const num = (s: string) => parseFloat(s.replace(/,/g, ''));

export const Loans: React.FC<LoansProps> = ({ loans, currency, hasLoanBill, onAdd, onRemove, onRecordPayment }) => {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<LiabilityCategory>('personalLoan');
  const [principal, setPrincipal] = useState('');
  const [balance, setBalance] = useState('');
  const [rate, setRate] = useState('');
  const [payment, setPayment] = useState('');
  const [notes, setNotes] = useState('');
  const [payId, setPayId] = useState<string | null>(null);
  const [payAmt, setPayAmt] = useState('');

  const handleAdd = () => {
    const p = num(principal), b = num(balance);
    if (!name.trim() || isNaN(p) || p < 0 || isNaN(b) || b < 0) return;
    onAdd({
      name: name.trim(), category, principal: p, currentBalance: b,
      interestRate: rate ? num(rate) : undefined,
      monthlyPayment: payment ? num(payment) : undefined,
      notes: notes || undefined, payments: [],
    });
    setName(''); setPrincipal(''); setBalance(''); setRate(''); setPayment(''); setNotes('');
    setShowForm(false);
  };

  const handlePay = (id: string) => {
    const amt = num(payAmt);
    if (!isNaN(amt) && amt > 0) onRecordPayment(id, amt);
    setPayId(null); setPayAmt('');
  };

  const canAdd = name.trim() !== '' && num(principal) > 0 && !isNaN(num(balance)) && num(balance) >= 0;
  const totalOwed = totalLoanBalance(loans);

  return (
    <div style={S.card}>
      <div style={S.header}>
        <div style={S.title}><Landmark size={18} strokeWidth={2.2} /> Loans</div>
        <div style={S.owed}>{formatCurrency(totalOwed, currency)} owed</div>
      </div>

      {hasLoanBill && loans.length === 0 && (
        <div style={S.hint}>You have a loan bill — add it here to track its remaining balance.</div>
      )}

      <button style={S.addTrigger} onClick={() => setShowForm(true)}><Plus size={16} strokeWidth={2.6} /> Add Loan</button>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Loan">
        <div className="form-grid" style={{ marginTop: 4 }}>
          <div style={S.field}><label style={S.label}>Name</label>
            <input style={S.input} placeholder="e.g. Mkopa phone" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div style={S.field}><label style={S.label}>Category</label>
            <IconSelect value={category} onChange={(v) => setCategory(v)}
              options={(Object.entries(LIABILITY_META) as [LiabilityCategory, typeof LIABILITY_META[LiabilityCategory]][]).map(([k, m]) => ({ value: k, label: m.label, icon: m.icon, color: m.color }))} /></div>
          <div style={S.field}><label style={S.label}>Original Principal (KSh)</label>
            <input style={S.input} type="number" min="0" placeholder="0" value={principal} onChange={(e) => setPrincipal(e.target.value)} /></div>
          <div style={S.field}><label style={S.label}>Current Balance (KSh)</label>
            <input style={S.input} type="number" min="0" placeholder="0" value={balance} onChange={(e) => setBalance(e.target.value)} /></div>
          <div style={S.field}><label style={S.label}>Interest Rate % p.a. (optional)</label>
            <input style={S.input} type="number" min="0" placeholder="0" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
          <div style={S.field}><label style={S.label}>Monthly Payment (optional)</label>
            <input style={S.input} type="number" min="0" placeholder="0" value={payment} onChange={(e) => setPayment(e.target.value)} /></div>
          <div style={S.field}><label style={S.label}>Notes</label>
            <input style={S.input} placeholder="Optional..." value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <div style={S.formBottom}>
          <button style={{ ...S.saveBtn, opacity: canAdd ? 1 : 0.5 }} onClick={handleAdd} disabled={!canAdd}><Check size={15} strokeWidth={2.6} /> Save Loan</button>
        </div>
      </Modal>

      {loans.length === 0 ? (
        <div style={S.empty}>No loans tracked yet.</div>
      ) : loans.map((loan) => {
        const meta = LIABILITY_META[loan.category];
        const Icon = meta.icon;
        const pct = loanPaydownPct(loan);
        return (
          <div key={loan.id} style={S.loanRow}>
            <div style={S.loanTop}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ ...S.icon, background: `${meta.color}18` }}><Icon size={18} strokeWidth={2.1} style={{ color: meta.color }} /></div>
                <div style={{ minWidth: 0 }}>
                  <div style={S.loanName}>{loan.name}</div>
                  <div style={{ ...S.loanCat, color: meta.color }}>{meta.label}{loan.interestRate ? ` · ${loan.interestRate}% p.a.` : ''}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={S.balance}>{formatCurrency(loan.currentBalance, currency)}</div>
                <div style={S.balanceSub}>of {formatCurrency(loan.principal, currency)}</div>
              </div>
            </div>
            <div style={S.progressBar}><div style={{ ...S.progressFill, width: `${pct}%` }} /></div>
            <div style={S.progressLabel}>{pct}% paid off{loan.monthlyPayment ? ` · ${formatCurrency(loan.monthlyPayment, currency)}/mo` : ''}</div>
            {payId === loan.id ? (
              <div style={S.payRow}>
                <input style={{ ...S.input, flex: 1, padding: '6px 10px', fontSize: 13 }} type="number" min="0" placeholder="Payment amount" value={payAmt}
                  onChange={(e) => setPayAmt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePay(loan.id)} autoFocus />
                <button style={S.confirmBtn} onClick={() => handlePay(loan.id)} aria-label="Confirm payment"><Check size={14} strokeWidth={2.6} /></button>
                <button style={S.cancelBtn} onClick={() => setPayId(null)} aria-label="Cancel"><X size={14} strokeWidth={2.4} /></button>
              </div>
            ) : (
              <div style={S.actions}>
                <button style={S.payBtn} onClick={() => { setPayId(loan.id); setPayAmt(''); }}>Record payment</button>
                <button style={S.removeBtn} onClick={() => onRemove(loan.id)} aria-label="Remove loan"><X size={13} strokeWidth={2.4} /></button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 600, color: 'var(--text-1)', display: 'inline-flex', alignItems: 'center', gap: 8 },
  owed: { fontFamily: 'Cormorant Garamond, serif', fontSize: 16, fontWeight: 700, color: 'var(--red)' },
  hint: { fontSize: 12, color: 'var(--text-3)', background: 'var(--bg-surface)', border: '1px dashed var(--border)', borderRadius: 8, padding: '8px 12px' },
  addTrigger: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'flex-start', padding: '10px 18px', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', border: 'none', borderRadius: 9, fontWeight: 800, fontSize: 13, fontFamily: 'Karla, sans-serif', cursor: 'pointer' },
  empty: { color: 'var(--text-3)', fontSize: 13, padding: '4px 0' },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  input: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-1)', fontSize: 14, fontFamily: 'Karla, sans-serif' },
  formBottom: { display: 'flex', justifyContent: 'flex-end', marginTop: 18 },
  saveBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: '11px 24px', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 14, fontFamily: 'Karla, sans-serif', cursor: 'pointer' },
  loanRow: { display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 0', borderTop: '1px solid var(--border)' },
  loanTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  icon: { width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  loanName: { fontSize: 14, color: 'var(--text-1)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  loanCat: { fontSize: 11, marginTop: 1 },
  balance: { fontFamily: 'Cormorant Garamond, serif', fontSize: 17, fontWeight: 700, color: 'var(--red)' },
  balanceSub: { fontSize: 11, color: 'var(--text-3)' },
  progressBar: { height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, background: 'var(--green)', transition: 'width 0.5s ease' },
  progressLabel: { fontSize: 11, color: 'var(--text-3)' },
  actions: { display: 'flex', gap: 8, alignItems: 'center' },
  payBtn: { flex: 1, padding: '9px 0', background: 'var(--gold-dim)', border: '1px solid var(--border-acc)', color: 'var(--gold)', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Karla, sans-serif' },
  payRow: { display: 'flex', gap: 6, alignItems: 'center' },
  confirmBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 10px', background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid var(--green-b)', borderRadius: 6, cursor: 'pointer' },
  cancelBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 9px', background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' },
  removeBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 9px', background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' },
};
