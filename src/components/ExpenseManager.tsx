import React, { useState } from 'react';
import { Check, AlertTriangle, Repeat, X, Pencil, Plus } from 'lucide-react';
import type { Expense, ExpenseCategory, ExpenseFrequency, Bill } from '../types';
import { expensesWithBills } from '../utils/history';
import { CATEGORY_META, formatCurrency } from '../utils/expenses';
import { BILL_META } from '../hooks/bills';
import { readProfileDailyMultiplier } from '../utils/frequency';
import { IconSelect } from './ui/IconSelect';
import { Modal } from './ui/Modal';

interface ExpenseFormProps {
  onAdd: (expense: Omit<Expense, 'id'>) => void;
}

interface ExpenseListProps {
  expenses: Expense[];
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Omit<Expense, 'id'>>) => void;
  currency: string;
}

const FREQ_OPTIONS: { key: ExpenseFrequency; label: string }[] = [
  { key: 'oneoff', label: 'One-off' },
  { key: 'daily', label: 'Daily' },
  { key: 'monthly', label: 'Monthly' },
];

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ onAdd }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [frequency, setFrequency] = useState<ExpenseFrequency>('oneoff');
  const [showForm, setShowForm] = useState(false);

  const amtNum = parseFloat(amount.replace(/,/g, '')) || 0;
  const dailyMonthly = frequency === 'daily' && amtNum > 0 ? Math.round(amtNum * readProfileDailyMultiplier()) : 0;

  const handleSubmit = () => {
    const amt = parseFloat(amount.replace(/,/g, ''));
    if (!name.trim() || isNaN(amt) || amt <= 0) return;
    onAdd({
      name: name.trim(), amount: amt, category,
      type: CATEGORY_META[category].type,
      date: new Date().toISOString().slice(0, 10),
      isRecurring: frequency !== 'oneoff',
      frequency,
    });
    setName(''); setAmount(''); setCategory('food'); setFrequency('oneoff');
    setShowForm(false);
  };

  return (
    <>
    <button style={S.triggerBtn} onClick={() => setShowForm(true)}>
      <Plus size={18} strokeWidth={2.6} /> Add Expense
    </button>

    <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Expense">
      <div className="form-grid">
        <div style={S.field}>
          <label style={S.label}>Expense Name</label>
          <input style={S.input} placeholder="e.g. Uber, Lunch, Netflix…"
            value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
        </div>

        <div style={S.field}>
          <label style={S.label}>Amount (KSh)</label>
          <input style={S.input} placeholder="0" value={amount} type="number" min="0"
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
        </div>

        <div style={S.field}>
          <label style={S.label}>Category</label>
          <IconSelect
            value={category}
            onChange={(v) => setCategory(v)}
            options={(Object.entries(CATEGORY_META) as [ExpenseCategory, typeof CATEGORY_META[ExpenseCategory]][])
              .map(([key, m]) => ({ value: key, label: m.label, icon: m.icon, color: m.color, group: m.type === 'necessary' ? 'Necessary' : 'Unnecessary' }))}
          />
        </div>

        <div style={S.field}>
          <label style={S.label}>Type</label>
          <div style={S.typeTag}>
            <span style={{
              ...S.typeChip,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: CATEGORY_META[category].type === 'necessary' ? 'var(--green-dim)' : 'var(--amber-dim)',
              color: CATEGORY_META[category].type === 'necessary' ? 'var(--green)' : 'var(--amber)',
            }}>
              {CATEGORY_META[category].type === 'necessary'
                ? <><Check size={14} strokeWidth={2.6} /> Necessary</>
                : <><AlertTriangle size={14} strokeWidth={2.4} /> Unnecessary</>}
            </span>
          </div>
        </div>
      </div>

      <div className="form-bottom" style={S.modalBottom}>
        <div style={S.freqWrap}>
          <label style={S.freqLabel}>How often?</label>
          <div style={S.freqRow}>
            {([
              { key: 'oneoff', label: 'One-off' },
              { key: 'daily', label: 'Daily' },
              { key: 'monthly', label: 'Monthly' },
            ] as { key: ExpenseFrequency; label: string }[]).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setFrequency(opt.key)}
                style={{ ...S.freqBtn, ...(frequency === opt.key ? S.freqBtnActive : {}) }}
              >{opt.label}</button>
            ))}
          </div>
          {dailyMonthly > 0 && (
            <span style={S.freqHint}>≈ {formatCurrency(dailyMonthly, 'KES')}/month</span>
          )}
        </div>
        <button
          style={{ ...S.addBtn, ...S.addBtnModal, opacity: !name.trim() || !amount ? 0.5 : 1 }}
          onClick={handleSubmit} disabled={!name.trim() || !amount}>
          <Check size={15} strokeWidth={2.6} /> Save Expense
        </button>
      </div>
    </Modal>
    </>
  );
};

export const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, onRemove, onUpdate, currency }) => {
  const [filter, setFilter] = useState<'all' | 'necessary' | 'unnecessary'>('all');

  const [editId, setEditId] = useState<string | null>(null);
  const [eName, setEName] = useState('');
  const [eAmount, setEAmount] = useState('');
  const [eCategory, setECategory] = useState<ExpenseCategory>('food');
  const [eFrequency, setEFrequency] = useState<ExpenseFrequency>('oneoff');

  const startEdit = (exp: Expense) => {
    setEditId(exp.id);
    setEName(exp.name);
    setEAmount(String(exp.amount));
    setECategory(exp.category);
    setEFrequency(exp.frequency ?? (exp.isRecurring ? 'monthly' : 'oneoff'));
  };

  const cancelEdit = () => setEditId(null);

  const saveEdit = (id: string) => {
    const amt = parseFloat(eAmount.replace(/,/g, ''));
    if (!eName.trim() || isNaN(amt) || amt <= 0) return;
    onUpdate(id, {
      name: eName.trim(),
      amount: amt,
      category: eCategory,
      type: CATEGORY_META[eCategory].type,
      frequency: eFrequency,
      isRecurring: eFrequency !== 'oneoff',
    });
    setEditId(null);
  };

  const filtered = expenses.filter((e) =>
    filter === 'all' ? true : CATEGORY_META[e.category].type === filter
  );
  const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div style={S.listCard}>
      <div className="list-header">
        <div style={S.listTitle}>This Month's Expenses</div>
        <div style={S.filterRow}>
          {(['all', 'necessary', 'unnecessary'] as const).map((f) => (
            <button key={f}
              style={{ ...S.filterBtn, ...(filter === f ? S.filterBtnActive : {}) }}
              onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div style={S.emptyList}>No expenses found. Start adding your expenses above.</div>
      ) : (
        <div style={S.list}>
          {sorted.map((exp) => {
            const meta = CATEGORY_META[exp.category];
            const Icon = meta.icon;

            if (editId === exp.id) {
              return (
                <div key={exp.id} style={S.editRow}>
                  <div style={S.editHead}>
                    <Pencil size={13} strokeWidth={2.2} style={{ color: 'var(--gold)' }} />
                    <span>Edit expense</span>
                  </div>
                  <div style={S.editFieldGroup}>
                    <label style={S.editLabel}>Name</label>
                    <input style={S.editInput} placeholder="Expense name" value={eName}
                      onChange={(e) => setEName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(exp.id)} autoFocus />
                  </div>
                  <div style={S.editTwoCol}>
                    <div style={S.editFieldGroup}>
                      <label style={S.editLabel}>Amount (KSh)</label>
                      <input style={S.editInput} type="number" min="0" placeholder="0" value={eAmount}
                        onChange={(e) => setEAmount(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(exp.id)} />
                    </div>
                    <div style={S.editFieldGroup}>
                      <label style={S.editLabel}>Category</label>
                      <IconSelect
                        value={eCategory}
                        onChange={(v) => setECategory(v)}
                        options={(Object.entries(CATEGORY_META) as [ExpenseCategory, typeof CATEGORY_META[ExpenseCategory]][])
                          .map(([key, m]) => ({ value: key, label: m.label, icon: m.icon, color: m.color, group: m.type === 'necessary' ? 'Necessary' : 'Unnecessary' }))}
                      />
                    </div>
                  </div>
                  <div style={S.editFieldGroup}>
                    <label style={S.editLabel}>Frequency</label>
                    <div style={S.editFreqRow}>
                      {FREQ_OPTIONS.map((opt) => (
                        <button key={opt.key} type="button" onClick={() => setEFrequency(opt.key)}
                          style={{ ...S.freqBtn, ...(eFrequency === opt.key ? S.freqBtnActive : {}) }}>{opt.label}</button>
                      ))}
                    </div>
                  </div>
                  <div style={S.editActions}>
                    <button style={S.cancelBtn} onClick={cancelEdit}><X size={14} strokeWidth={2.4} /> Cancel</button>
                    <button style={S.saveBtn} onClick={() => saveEdit(exp.id)}><Check size={15} strokeWidth={2.8} /> Save changes</button>
                  </div>
                </div>
              );
            }

            return (
              <div key={exp.id} className="exp-item">
                <div style={{ ...S.expIcon, background: `${meta.color}20` }}><Icon size={18} strokeWidth={2.1} style={{ color: meta.color }} /></div>
                <div style={S.expInfo}>
                  <div style={S.expName}>{exp.name}</div>
                  <div style={S.expMeta}>
                    <span style={{ color: meta.color }}>{meta.label}</span>
                    <span style={S.expDot}>·</span>
                    <span>{exp.date}</span>
                    {exp.frequency === 'daily' && (
                      <><span style={S.expDot}>·</span><span style={S.recurringTag}><Repeat size={11} strokeWidth={2.4} /> Daily</span></>
                    )}
                    {exp.frequency === 'monthly' && (
                      <><span style={S.expDot}>·</span><span style={S.recurringTag}><Repeat size={11} strokeWidth={2.4} /> Monthly</span></>
                    )}
                    {!exp.frequency && exp.isRecurring && (
                      <><span style={S.expDot}>·</span><span style={S.recurringTag}><Repeat size={11} strokeWidth={2.4} /> Recurring</span></>
                    )}
                  </div>
                </div>
                <div style={S.expRight}>
                  <div style={S.expAmount}>{formatCurrency(exp.amount, currency)}</div>
                  <div style={{ ...S.expType, color: meta.type === 'necessary' ? 'var(--green)' : 'var(--amber)' }}>
                    {meta.type}
                  </div>
                </div>
                <button style={S.editBtn} onClick={() => startEdit(exp)} aria-label="Edit"><Pencil size={13} strokeWidth={2.2} /></button>
                <button style={S.removeBtn} onClick={() => onRemove(exp.id)} aria-label="Remove"><X size={14} strokeWidth={2.4} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  formCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 22px' },
  formTitle: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  formTitleText: { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600, color: 'var(--text-1)' },
  successTag: { fontSize: 12, color: 'var(--green)', background: 'var(--green-dim)', padding: '3px 10px', borderRadius: 4, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  input: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-1)', fontSize: 14, fontFamily: 'Karla, sans-serif' },
  select: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-1)', fontSize: 14, fontFamily: 'Karla, sans-serif' },
  typeTag: { display: 'flex', alignItems: 'center', paddingTop: 4 },
  typeChip: { padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600 },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', fontSize: 14, cursor: 'pointer' },
  freqWrap: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  freqLabel: { fontSize: 13, color: 'var(--text-3)' },
  freqRow: { display: 'flex', gap: 6 },
  freqBtn: { padding: '9px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-3)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Karla, sans-serif', textAlign: 'center', whiteSpace: 'nowrap' },
  freqBtnActive: { background: 'var(--gold-dim)', color: 'var(--gold)', borderColor: 'var(--border-acc)' },
  freqHint: { fontSize: 12, color: 'var(--gold)', fontWeight: 600 },
  addBtn: { padding: '11px 24px', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 14, fontFamily: 'Karla, sans-serif', boxShadow: '0 4px 20px var(--gold-glow)', cursor: 'pointer' },
  addBtnModal: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%' },
  triggerBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'flex-start', padding: '13px 22px', marginBottom: 16, background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, fontFamily: 'Karla, sans-serif', cursor: 'pointer', boxShadow: '0 4px 20px var(--gold-glow)' },
  modalBottom: { display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 14, marginTop: 16 },
  listCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 22px', marginTop: 16 },
  listTitle: { fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 600, color: 'var(--text-1)' },
  filterRow: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  filterBtn: { padding: '6px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-3)', fontSize: 12, fontFamily: 'Karla, sans-serif' },
  filterBtnActive: { background: 'var(--gold-dim)', border: '1px solid var(--border-acc)', color: 'var(--gold)' },
  emptyList: { color: 'var(--text-3)', fontSize: 14, padding: '20px 0', textAlign: 'center' },
  list: { display: 'flex', flexDirection: 'column', gap: 2 },
  expIcon: { width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 },
  expInfo: { flex: 1, minWidth: 0 },
  expName: { fontSize: 14, color: 'var(--text-1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  expMeta: { display: 'flex', gap: 6, fontSize: 12, color: 'var(--text-3)', marginTop: 2, flexWrap: 'wrap' },
  expDot: { color: 'var(--text-3)' },
  recurringTag: { color: 'var(--blue)', display: 'inline-flex', alignItems: 'center', gap: 3 },
  expRight: { textAlign: 'right', flexShrink: 0 },
  expAmount: { fontFamily: 'Cormorant Garamond, serif', fontSize: 16, fontWeight: 600 },
  expType: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' },
  removeBtn: { background: 'transparent', color: 'var(--text-3)', fontSize: 14, padding: '4px 8px', borderRadius: 6, border: '1px solid transparent', flexShrink: 0, display: 'inline-flex', alignItems: 'center' },
  editBtn: { background: 'transparent', color: 'var(--text-3)', padding: '4px 8px', borderRadius: 6, border: '1px solid transparent', flexShrink: 0, display: 'inline-flex', alignItems: 'center', cursor: 'pointer' },
  editRow: { display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-acc)', margin: '4px 0' },
  editHead: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  editFieldGroup: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  editLabel: { fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  editInput: { width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-1)', fontSize: 14, fontFamily: 'Karla, sans-serif', boxSizing: 'border-box' },
  editTwoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  editFreqRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 },
  editActions: { display: 'flex', gap: 8, marginTop: 2 },
  saveBtn: { flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 16px', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 14, fontFamily: 'Karla, sans-serif', cursor: 'pointer' },
  cancelBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 16px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: 9, fontSize: 14, fontWeight: 600, fontFamily: 'Karla, sans-serif', cursor: 'pointer' },
};

const monthLabel = (m: string): string => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
};

interface ExpenseSummaryProps {
  expenses: Expense[];
  bills: Bill[];
  dailyMultiplier: number;
  goalsThisMonth: number;
  count: number;
  currency: string;
  month?: string;
}

export const ExpenseSummary: React.FC<ExpenseSummaryProps> = ({ expenses, bills, dailyMultiplier, goalsThisMonth, count, currency, month }) => {
  const { total, necessary, unnecessary, categoryRows, billRows, billsSubtotal } = expensesWithBills(expenses, bills, dailyMultiplier);
  const necPct = total > 0 ? Math.round((necessary / total) * 100) : 0;
  const row = (icon: React.ReactNode, label: string, amount: number, color?: string) => {
    const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
    return (
      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 18, flexShrink: 0, display: 'inline-flex' }}>{icon}</span>
        <span style={{ fontSize: 13, color: 'var(--text-1)', minWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color || 'var(--text-3)' }} />
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-2)', minWidth: 80, textAlign: 'right' }}>{formatCurrency(amount, currency)}</span>
      </div>
    );
  };
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{month ? monthLabel(month) : 'This month'} · {count} {count === 1 ? 'entry' : 'entries'}</span>
        <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 700, color: 'var(--text-1)' }}>{formatCurrency(total, currency)}</span>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
        <div style={{ width: `${necPct}%`, background: 'var(--green)' }} />
        <div style={{ width: `${100 - necPct}%`, background: 'var(--amber)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6, color: 'var(--text-3)' }}>
        <span style={{ color: 'var(--green)' }}>Necessary {formatCurrency(necessary, currency)}</span>
        <span style={{ color: 'var(--amber)' }}>Unnecessary {formatCurrency(unnecessary, currency)}</span>
      </div>

      {categoryRows.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 18, marginBottom: 8 }}>Expenses</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {categoryRows.map(({ category, amount }) => {
              const meta = CATEGORY_META[category];
              const Icon = meta?.icon;
              return row(Icon ? <Icon size={18} strokeWidth={2.1} style={{ color: meta.color }} /> : null, meta?.label ?? category, amount, meta?.color);
            })}
          </div>
        </>
      )}

      {billRows.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 18, marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bills (monthly)</span>
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Subtotal {formatCurrency(billsSubtotal, currency)}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {billRows.map((b) => {
              const meta = BILL_META[b.category];
              const Icon = meta?.icon;
              return row(Icon ? <Icon size={18} strokeWidth={2.1} style={{ color: meta.color }} /> : null, b.name, b.amount, meta?.color);
            })}
          </div>
        </>
      )}

      {goalsThisMonth > 0 && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px dashed var(--border)', fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>
          ＋{formatCurrency(goalsThisMonth, currency)} set aside to goals this month (saved separately)
        </div>
      )}
    </div>
  );
};
