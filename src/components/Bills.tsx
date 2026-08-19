import React, { useState } from 'react';
import { Clock, Check, AlertTriangle, X, Plus } from 'lucide-react';
import type { Bill, BillCategory, BillFrequency } from '../types';
import { BILL_META, getDaysUntilDue} from '../hooks/bills';
import { formatCurrency } from '../utils/expenses';
import { IconSelect } from './ui/IconSelect';
import { Modal } from './ui/Modal';

interface BillsProps {
  bills: Bill[];
  sortedBills: Bill[];
  monthlyTotal: number;
  upcomingThisWeek: Bill[];
  overdueCount: number;
  paidCount: number;
  onAdd: (data: Omit<Bill, 'id'>) => void;
  onRemove: (id: string) => void;
  onMarkPaid: (id: string) => void;
  onMarkUnpaid: (id: string) => void;
  currency: string;
}

export const Bills: React.FC<BillsProps> = ({
  bills, sortedBills, monthlyTotal, upcomingThisWeek,
  overdueCount, onAdd, onRemove, onMarkPaid, onMarkUnpaid, currency,
}) => {
  const [name, setName]         = useState('');
  const [amount, setAmount]     = useState('');
  const [category, setCategory] = useState<BillCategory>('rent');
  const [dueDay, setDueDay]     = useState('1');
  const [frequency, setFrequency] = useState<BillFrequency>('monthly');
  const [notes, setNotes]       = useState('');
  const [filter, setFilter]     = useState<'all' | 'upcoming' | 'paid' | 'overdue'>('all');
  const [showForm, setShowForm] = useState(false);

  const isDailyBill = frequency === 'daily';

  const handleAdd = () => {
    const amt = parseFloat(amount.replace(/,/g, ''));
    // Daily bills have no fixed day of the month.
    const day = isDailyBill ? 1 : parseInt(dueDay);
    if (!name.trim() || isNaN(amt) || amt <= 0) return;
    if (!isDailyBill && (isNaN(day) || day < 1 || day > 31)) return;
    onAdd({ name: name.trim(), amount: amt, category, dueDay: day, frequency, status: 'upcoming', notes, isRecurring: true });
    setName(''); setAmount(''); setDueDay('1'); setNotes('');
    setShowForm(false);
  };

  const filteredBills = sortedBills.filter((b) => {
    if (filter === 'all') return true;
    if (filter === 'paid') return b.status === 'paid';
    if (filter === 'overdue') return b.status === 'overdue';
    return b.status !== 'paid';
  });

  const paidTotal = bills.filter((b) => b.status === 'paid').reduce((s, b) => s + b.amount, 0);
  const unpaidTotal = monthlyTotal - paidTotal;

  return (
    <div style={S.container} className="animate-in">

      {/* Summary */}
      <div className="stats-grid">
        {[
          { label: 'Monthly Total',  val: formatCurrency(monthlyTotal, currency), color: 'var(--text-1)' },
          { label: 'Paid This Month',val: formatCurrency(paidTotal, currency),    color: 'var(--green)' },
          { label: 'Still to Pay',   val: formatCurrency(unpaidTotal, currency),  color: 'var(--amber)' },
          { label: 'Overdue Bills',  val: overdueCount,                           color: overdueCount > 0 ? 'var(--red)' : 'var(--green)' },
        ].map((s) => (
          <div key={s.label} style={S.statCard}>
            <div style={S.statLabel}>{s.label}</div>
            <div style={{ ...S.statVal, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Upcoming this week alert */}
      {upcomingThisWeek.length > 0 && (
        <div style={S.alertCard}>
          <div style={S.alertTitle}><Clock size={15} strokeWidth={2.2} /> Due This Week ({upcomingThisWeek.length})</div>
          <div style={S.alertBills}>
            {upcomingThisWeek.map((b) => {
              const days = getDaysUntilDue(b.dueDay);
              const AlertIcon = BILL_META[b.category].icon;
              return (
                <div key={b.id} style={S.alertBill}>
                  <span style={S.alertBillName}><AlertIcon size={14} strokeWidth={2.1} style={{ color: BILL_META[b.category].color }} /> {b.name}</span>
                  <span style={{ color: 'var(--amber)' }}>{formatCurrency(b.amount, currency)}</span>
                  <span style={{ color: days === 0 ? 'var(--red)' : 'var(--text-2)' }}>{days === 0 ? 'Due today' : `${days}d left`}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add trigger */}
      <button style={S.triggerBtn} onClick={() => setShowForm(true)}>
        <Plus size={18} strokeWidth={2.6} /> Add Bill
      </button>

      {/* Add form modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Bill">
        <div className="bills-form-grid">
          <div style={S.field}>
            <label style={S.label}>Bill Name</label>
            <input style={S.input} placeholder="e.g. KPLC Electricity" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div style={S.field}>
            <label style={S.label}>Category</label>
            <IconSelect
              value={category}
              onChange={(v) => setCategory(v)}
              options={(Object.entries(BILL_META) as [BillCategory, typeof BILL_META[BillCategory]][])
                .map(([key, m]) => ({ value: key, label: m.label, icon: m.icon, color: m.color }))}
            />
          </div>
          <div style={S.field}>
            <label style={S.label}>Amount (KSh)</label>
            <input style={S.input} type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div style={S.field}>
            <label style={S.label}>Frequency</label>
            <select style={S.select} value={frequency} onChange={(e) => setFrequency(e.target.value as BillFrequency)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </select>
          </div>
          {!isDailyBill && (
            <div style={S.field}>
              <label style={S.label}>Due Day of Month</label>
              <input style={S.input} type="number" min="1" max="31" placeholder="1–31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
            </div>
          )}
          <div style={S.field}>
            <label style={S.label}>Notes</label>
            <input style={S.input} placeholder="Optional note..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <div style={S.formBottom}>
          <button style={{ ...S.addBtn, ...S.addBtnModal, opacity: !name.trim() || !amount ? 0.5 : 1 }} onClick={handleAdd} disabled={!name.trim() || !amount}>
            <Check size={15} strokeWidth={2.6} /> Save Bill
          </button>
        </div>
      </Modal>

      {/* Bills list */}
      <div style={S.listCard}>
        <div style={S.listHeader}>
          <div style={S.cardTitle}>All Bills</div>
          <div style={S.filterRow} className="filter-tabs-scroll">
            {(['all', 'upcoming', 'paid', 'overdue'] as const).map((f) => (
              <button key={f} style={{ ...S.filterBtn, ...(filter === f ? S.filterActive : {}) }} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filteredBills.length === 0 ? (
          <div style={S.emptyMsg}>No bills found. Add your recurring bills above.</div>
        ) : (
          <div style={S.billList}>
            {filteredBills.map((bill) => {
              const meta = BILL_META[bill.category];
              const Icon = meta.icon;
              const isDaily = bill.frequency === 'daily';
              const daysLeft = getDaysUntilDue(bill.dueDay);
              const isOverdue = !isDaily && (bill.status === 'overdue' || (bill.status !== 'paid' && new Date().getDate() > bill.dueDay));
              const isPaid = bill.status === 'paid';
              const statusColor = isPaid ? 'var(--green)' : isDaily ? 'var(--blue)' : isOverdue ? 'var(--red)' : daysLeft <= 3 ? 'var(--amber)' : 'var(--text-2)';

              return (
                <div key={bill.id} style={{ ...S.billItem, opacity: isPaid ? 0.6 : 1 }} className="bill-item-resp">
                  <div style={{ ...S.billIcon, background: `${meta.color}18` }}><Icon size={18} strokeWidth={2.1} style={{ color: meta.color }} /></div>
                  <div style={S.billInfo}>
                    <div style={{ ...S.billName, textDecoration: isPaid ? 'line-through' : 'none' }}>{bill.name}</div>
                    <div style={S.billMeta}>
                      <span style={{ color: meta.color }}>{meta.label}</span>
                      <span style={S.dot}>·</span>
                      {isDaily
                        ? <span style={{ textTransform: 'capitalize' }}>Daily</span>
                        : <>
                            <span>Due {bill.dueDay}th</span>
                            <span style={S.dot}>·</span>
                            <span style={{ textTransform: 'capitalize' }}>{bill.frequency}</span>
                          </>}
                    </div>
                  </div>
                  <div style={S.billRight}>
                    <div style={S.billAmount}>{formatCurrency(bill.amount, currency)}{isDaily && <span style={S.perDayTag}>/day</span>}</div>
                    <div style={{ ...S.billStatus, color: statusColor }}>
                      {isPaid
                        ? <><Check size={12} strokeWidth={3} /> Paid</>
                        : isDaily ? 'Daily'
                        : isOverdue ? <><AlertTriangle size={12} strokeWidth={2.4} /> Overdue</>
                        : `${daysLeft}d left`}
                    </div>
                  </div>
                  <div style={S.billActions}>
                    {isPaid
                      ? <button style={{ ...S.actionBtn, color: 'var(--text-3)' }} onClick={() => onMarkUnpaid(bill.id)}>Undo</button>
                      : <button style={{ ...S.actionBtn, ...S.actionBtnIcon, color: 'var(--green)', borderColor: 'var(--green-b)' }} onClick={() => onMarkPaid(bill.id)}><Check size={13} strokeWidth={2.8} /> Paid</button>
                    }
                    <button style={{ ...S.actionBtn, ...S.actionBtnIcon, color: 'var(--text-3)' }} onClick={() => onRemove(bill.id)} aria-label="Remove"><X size={14} strokeWidth={2.4} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 20 },
  cardTitle: { fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 600, color: 'var(--text-1)' },
  statCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' },
  statLabel: { fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 },
  statVal: { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700 },
  alertCard: { background: 'var(--amber-dim)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12, padding: '18px 20px' },
  alertTitle: { fontSize: 14, fontWeight: 600, color: 'var(--amber)', marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 },
  alertBills: { display: 'flex', flexDirection: 'column', gap: 8 },
  alertBill: { display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-2)', justifyContent: 'space-between' },
  alertBillName: { display: 'inline-flex', alignItems: 'center', gap: 6 },
  formCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 22px' },
  formTitleRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  successTag: { fontSize: 12, color: 'var(--green)', background: 'var(--green-dim)', padding: '3px 10px', borderRadius: 4, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  input: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-1)', fontSize: 14, fontFamily: 'Karla, sans-serif' },
  select: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-1)', fontSize: 14, fontFamily: 'Karla, sans-serif' },
  formBottom: { display: 'flex', justifyContent: 'flex-end', marginTop: 16 },
  addBtn: { padding: '11px 24px', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 14, fontFamily: 'Karla, sans-serif', cursor: 'pointer' },
  addBtnModal: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%' },
  triggerBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'flex-start', padding: '13px 22px', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, fontFamily: 'Karla, sans-serif', cursor: 'pointer', boxShadow: '0 4px 20px var(--gold-glow)' },
  listCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 22px' },
  listHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 },
  filterRow: { display: 'flex', gap: 6 },
  filterBtn: { padding: '6px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-3)', fontSize: 12 },
  filterActive: { background: 'var(--gold-dim)', borderColor: 'var(--border-acc)', color: 'var(--gold)' },
  emptyMsg: { color: 'var(--text-3)', fontSize: 14, textAlign: 'center', padding: '24px 0' },
  billList: { display: 'flex', flexDirection: 'column', gap: 2 },
  billItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px', borderRadius: 10, transition: '0.15s ease' },
  billIcon: { width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 },
  billInfo: { flex: 1, minWidth: 0 },
  billName: { fontSize: 14, color: 'var(--text-1)', fontWeight: 500 },
  billMeta: { display: 'flex', gap: 6, fontSize: 12, color: 'var(--text-3)', marginTop: 2 },
  dot: { color: 'var(--text-3)' },
  billRight: { textAlign: 'right', flexShrink: 0 },
  billAmount: { fontFamily: 'Cormorant Garamond, serif', fontSize: 16, fontWeight: 600, color: 'var(--text-1)' },
  perDayTag: { fontFamily: 'Karla, sans-serif', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginLeft: 2 },
  billStatus: { fontSize: 11, marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  billActions: { display: 'flex', gap: 6, flexShrink: 0 },
  actionBtn: { padding: '6px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontFamily: 'Karla, sans-serif', fontWeight: 600, cursor: 'pointer' },
  actionBtnIcon: { display: 'inline-flex', alignItems: 'center', gap: 4 },
};
