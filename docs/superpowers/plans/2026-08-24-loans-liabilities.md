# Loans as Tracked Liabilities (Piece D) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add a first-class Loan (principal, current balance, optional rate/payment) with a "Record payment" action + paydown progress, whose balances feed Total Liabilities via `deriveNetWorth`.

**Architecture:** Pure helpers (`loanPaydownPct`, `totalLoanBalance`) + a `useLoans` hook (localStorage + Firestore `loans`) + a `<Loans>` management card on the Net Worth view. `deriveNetWorth` gains optional loan descriptors and appends read-only liability lines — same virtual-line mechanism as piece C.

**Tech Stack:** React 19 + TypeScript, Vite, Vitest, Firebase.

**Spec:** `docs/superpowers/specs/2026-08-24-pesaflow-loans-liabilities-design.md`
**Branch:** `feat/networth-connections`

---

## Task 1: `Loan`/`LoanPayment` types + pure helpers + tests

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/hooks/loans.ts`, `src/hooks/loans.test.ts`

- [ ] **Step 1: Add types**

In `src/types/index.ts`, after the Net Worth section (near `NetWorthItem`), add:

```ts
export interface LoanPayment { id: string; amount: number; date: string; } // date = YYYY-MM-DD

export interface Loan {
  id: string;
  name: string;
  category: LiabilityCategory;
  principal: number;
  currentBalance: number;
  interestRate?: number;   // % p.a.
  monthlyPayment?: number;
  payments?: LoanPayment[];
  notes?: string;
  createdAt: string;
  isDemo?: boolean;
}
```

- [ ] **Step 2: Write failing tests**

Create `src/hooks/loans.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { loanPaydownPct, totalLoanBalance } from './loans';
import type { Loan } from '../types';

const loan = (over: Partial<Loan>): Loan => ({
  id: 'l', name: 'L', category: 'personalLoan', principal: 100000, currentBalance: 100000,
  createdAt: '2026-01-01', ...over,
});

describe('loanPaydownPct', () => {
  it('is 0 at full balance, 100 when cleared, rounded in between', () => {
    expect(loanPaydownPct(loan({ principal: 100000, currentBalance: 100000 }))).toBe(0);
    expect(loanPaydownPct(loan({ principal: 100000, currentBalance: 0 }))).toBe(100);
    expect(loanPaydownPct(loan({ principal: 100000, currentBalance: 25000 }))).toBe(75);
  });
  it('clamps to 0..100 and handles principal <= 0', () => {
    expect(loanPaydownPct(loan({ principal: 0, currentBalance: 0 }))).toBe(0);
    expect(loanPaydownPct(loan({ principal: 100000, currentBalance: 150000 }))).toBe(0); // over-balance
  });
});

describe('totalLoanBalance', () => {
  it('sums current balances', () => {
    expect(totalLoanBalance([loan({ currentBalance: 2380 }), loan({ currentBalance: 40000 })])).toBe(42380);
  });
  it('is 0 for an empty list', () => {
    expect(totalLoanBalance([])).toBe(0);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run src/hooks/loans.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 4: Implement `src/hooks/loans.ts`**

```ts
import type { Loan } from '../types';

/** Percentage of the loan principal paid off, clamped 0..100. Returns 0 if principal <= 0. */
export const loanPaydownPct = (loan: Loan): number => {
  if (loan.principal <= 0) return 0;
  const pct = ((loan.principal - loan.currentBalance) / loan.principal) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
};

/** Sum of remaining balances across loans (the total owed). */
export const totalLoanBalance = (loans: Loan[]): number =>
  loans.reduce((s, l) => s + l.currentBalance, 0);
```

- [ ] **Step 5: Run to verify pass + build**

Run: `npx vitest run src/hooks/loans.test.ts` (PASS) and `npm run build` (no TS errors).

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/hooks/loans.ts src/hooks/loans.test.ts
git commit -m "feat: Loan type + loanPaydownPct/totalLoanBalance helpers"
```

---

## Task 2: Extend `deriveNetWorth` with loan liability lines

**Files:**
- Modify: `src/hooks/netWorth.ts`
- Modify: `src/hooks/netWorth.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/hooks/netWorth.test.ts` (inside the existing `describe('deriveNetWorth', ...)` or a new one):

```ts
  it('adds an auto liability line per loan with balance > 0', () => {
    const r = deriveNetWorth([], {
      investments: 0, goalSavings: 0, emergencyFund: 0,
      loans: [
        { id: 'x', name: 'Mkopa phone', currentBalance: 2380, category: 'personalLoan' },
        { id: 'y', name: 'Cleared',      currentBalance: 0,    category: 'carLoan' },
      ],
    });
    expect(r.totalLiabilities).toBe(2380);
    expect(r.liabilityLines).toHaveLength(1);
    expect(r.liabilityLines[0].id).toBe('loan:x');
    expect(r.liabilityLines[0].auto).toBe(true);
    expect(r.netWorth).toBe(-2380);
  });

  it('combines manual liabilities with loan liability lines', () => {
    const items = [{ id: 'm', name: 'Credit card', amount: 5000, category: 'creditCard' as const, type: 'liability' as const, notes: '' }];
    const r = deriveNetWorth(items, {
      investments: 10000, goalSavings: 0, emergencyFund: 0,
      loans: [{ id: 'x', name: 'Loan', currentBalance: 3000, category: 'personalLoan' }],
    });
    expect(r.totalAssets).toBe(10000);
    expect(r.totalLiabilities).toBe(8000); // 5000 manual + 3000 loan
    expect(r.netWorth).toBe(2000);
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/hooks/netWorth.test.ts` — Expected: FAIL (loans not handled / type error).

- [ ] **Step 3: Extend `deriveNetWorth` in `src/hooks/netWorth.ts`**

Change the `sources` parameter type to add optional `loans`, and append loan liability lines after the manual-item loop (before computing totals). The function becomes:

```ts
export const deriveNetWorth = (
  manualItems: NetWorthItem[],
  sources: {
    investments: number; goalSavings: number; emergencyFund: number;
    loans?: { id: string; name: string; currentBalance: number; category: LiabilityCategory }[];
  },
): DerivedNetWorth => {
  const assetLines: NetWorthLine[] = [];
  const liabilityLines: NetWorthLine[] = [];
  for (const it of manualItems) {
    const line: NetWorthLine = { id: it.id, name: it.name, amount: it.amount, category: it.category, type: it.type, auto: false, notes: it.notes };
    (it.type === 'asset' ? assetLines : liabilityLines).push(line);
  }
  const virtual: NetWorthLine[] = [
    { id: 'auto:investments', name: 'Investments',   amount: sources.investments,   category: 'investments', type: 'asset', auto: true },
    { id: 'auto:goals',       name: 'Goal savings',  amount: sources.goalSavings,   category: 'cash',        type: 'asset', auto: true },
    { id: 'auto:emergency',   name: 'Emergency fund', amount: sources.emergencyFund, category: 'cash',       type: 'asset', auto: true },
  ];
  for (const v of virtual) if (v.amount > 0) assetLines.push(v);
  for (const loan of sources.loans ?? []) {
    if (loan.currentBalance > 0) {
      liabilityLines.push({ id: `loan:${loan.id}`, name: loan.name, amount: loan.currentBalance, category: loan.category, type: 'liability', auto: true });
    }
  }
  const totalAssets = assetLines.reduce((s, l) => s + l.amount, 0);
  const totalLiabilities = liabilityLines.reduce((s, l) => s + l.amount, 0);
  return { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities, assetLines, liabilityLines };
};
```

- [ ] **Step 4: Run to verify pass + build**

Run: `npx vitest run src/hooks/netWorth.test.ts` (all pass, incl. piece C tests) and `npm run build`.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/netWorth.ts src/hooks/netWorth.test.ts
git commit -m "feat: deriveNetWorth appends loan balances as liability lines"
```

---

## Task 3: `useLoans` hook

**Files:**
- Create: `src/hooks/useLoans.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/useLoans.ts`:

```ts
import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Loan } from '../types';
import { generateId } from '../utils/expenses';
import { totalLoanBalance } from './loans';
import { syncCollection, deleteFromCollection, fetchCollection } from '../lib/sync';

const STORAGE_KEY = 'finwise_loans';
const load = (): Loan[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
};

export const useLoans = () => {
  const [loans, setLoans] = useState<Loan[]>(load);

  useEffect(() => {
    let alive = true;
    fetchCollection<Loan>('loans').then(remote => {
      if (alive && remote) { setLoans(remote); localStorage.setItem(STORAGE_KEY, JSON.stringify(remote)); }
    });
    return () => { alive = false; };
  }, []);

  const persist = (updated: Loan[]) => {
    setLoans(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    syncCollection('loans', updated);
  };

  const addLoan = useCallback((data: Omit<Loan, 'id' | 'createdAt'>) =>
    persist([...loans, { ...data, id: generateId(), createdAt: new Date().toISOString() }]), [loans]);

  const removeLoan = useCallback((id: string) => {
    const updated = loans.filter((l) => l.id !== id);
    setLoans(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    deleteFromCollection('loans', id);
  }, [loans]);

  const updateLoan = useCallback((id: string, patch: Partial<Omit<Loan, 'id'>>) =>
    persist(loans.map((l) => l.id === id ? { ...l, ...patch } : l)), [loans]);

  const recordPayment = useCallback((id: string, amount: number) => {
    const today = new Date().toISOString().slice(0, 10);
    persist(loans.map((l) => l.id === id ? {
      ...l,
      currentBalance: Math.max(0, l.currentBalance - amount),
      payments: [...(l.payments ?? []), { id: generateId(), amount, date: today }],
    } : l));
  }, [loans]);

  const totalOwed = useMemo(() => totalLoanBalance(loans), [loans]);

  return { loans, totalOwed, addLoan, removeLoan, updateLoan, recordPayment };
};
```

- [ ] **Step 2: Verify build + tests**

Run: `npm run build && npx vitest run` — Expected: build clean; all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useLoans.ts
git commit -m "feat: useLoans hook (CRUD + recordPayment)"
```

---

## Task 4: `<Loans>` management component

**Files:**
- Create: `src/components/Loans.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/Loans.tsx`:

```tsx
import React, { useState } from 'react';
import { Check, X, Plus, Landmark } from 'lucide-react';
import type { Loan, LiabilityCategory } from '../types';
import { LIABILITY_META } from '../hooks/netWorth';
import { loanPaydownPct } from '../hooks/loans';
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
      notes, payments: [],
    });
    setName(''); setPrincipal(''); setBalance(''); setRate(''); setPayment(''); setNotes('');
    setShowForm(false);
  };

  const handlePay = (id: string) => {
    const amt = num(payAmt);
    if (!isNaN(amt) && amt > 0) onRecordPayment(id, amt);
    setPayId(null); setPayAmt('');
  };

  const totalOwed = loans.reduce((s, l) => s + l.currentBalance, 0);

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
            <input style={S.input} type="number" placeholder="0" value={principal} onChange={(e) => setPrincipal(e.target.value)} /></div>
          <div style={S.field}><label style={S.label}>Current Balance (KSh)</label>
            <input style={S.input} type="number" placeholder="0" value={balance} onChange={(e) => setBalance(e.target.value)} /></div>
          <div style={S.field}><label style={S.label}>Interest Rate % p.a. (optional)</label>
            <input style={S.input} type="number" placeholder="0" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
          <div style={S.field}><label style={S.label}>Monthly Payment (optional)</label>
            <input style={S.input} type="number" placeholder="0" value={payment} onChange={(e) => setPayment(e.target.value)} /></div>
          <div style={S.field}><label style={S.label}>Notes</label>
            <input style={S.input} placeholder="Optional..." value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <div style={S.formBottom}>
          <button style={{ ...S.saveBtn, opacity: !name.trim() || !principal || !balance ? 0.5 : 1 }} onClick={handleAdd} disabled={!name.trim() || !principal || !balance}><Check size={15} strokeWidth={2.6} /> Save Loan</button>
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
                <input style={{ ...S.input, flex: 1, padding: '6px 10px', fontSize: 13 }} type="number" placeholder="Payment amount" value={payAmt}
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
  confirmBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 10px', background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid var(--green-b)', borderRadius: 6 },
  cancelBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 9px', background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--border)', borderRadius: 6 },
  removeBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 9px', background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' },
};
```

- [ ] **Step 2: Verify build**

Run: `npm run build` — Expected: no TS errors. (Component not yet rendered; a standalone module doesn't trigger unused-var errors.)

- [ ] **Step 3: Commit**

```bash
git add src/components/Loans.tsx
git commit -m "feat: Loans management card with paydown progress + record payment"
```

---

## Task 5: Wire `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Imports + hook**

Add imports (near the other hook/component imports):
```ts
import { useLoans } from './hooks/useLoans';
import { Loans } from './components/Loans';
```
Add the hook next to the others (near `const netWorth = useNetWorth();`):
```ts
  const loans = useLoans();
```

- [ ] **Step 2: Feed loans into `nwSummary`**

Replace the existing `nwSummary` memo with:
```ts
  const nwSummary = useMemo(() => deriveNetWorth(netWorth.items, {
    investments: investmentSummary.totalInvested,
    goalSavings: goals.totalSaved,
    emergencyFund: emergencyFund.data.currentAmount,
    loans: loans.loans.map((l) => ({ id: l.id, name: l.name, currentBalance: l.currentBalance, category: l.category })),
  }), [netWorth.items, investmentSummary.totalInvested, goals.totalSaved, emergencyFund.data.currentAmount, loans.loans]);
```

- [ ] **Step 3: Render `<Loans>` in the Net Worth view**

In the `activeView === 'networth'` block, immediately AFTER the `<NetWorth ... />` element (and its closing `/>`), add:
```tsx
              <Loans
                loans={loans.loans}
                currency={profile.currency}
                hasLoanBill={bills.bills.some((b) => b.category === 'loan')}
                onAdd={loans.addLoan}
                onRemove={loans.removeLoan}
                onRecordPayment={loans.recordPayment}
              />
```

- [ ] **Step 4: Verify build + tests**

Run: `npm run build && npx vitest run`
Expected: build clean (no TS/unused errors — `loans.updateLoan` unused externally is fine as a hook return); all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire loans into net worth liabilities + Loans card on Net Worth view"
```

---

## Task 6: Manual verification

- [ ] **Step 1:** `npm run dev`.
- [ ] **Step 2:** On the Net Worth view, add a loan (e.g. Mkopa phone, principal 30,000, balance 2,380). Confirm: Total Liabilities and Net Worth update; the loan shows as a read-only "From loan" line in the Liabilities card; the Loans card shows a paydown bar; "Record payment" reduces the balance and the bar advances; the Dashboard "Net Worth" card reflects the liability.

---

## Self-Review Notes

- **Spec coverage:** §3.1 → Task 1; §3.2 → Task 1; §3.3 → Task 3; §3.4 → Task 2; §3.5 → Task 4; §3.6 → Task 5; §5 tests → Tasks 1-2.
- **Type consistency:** `Loan`, `LoanPayment`, `loanPaydownPct`, `totalLoanBalance`, `useLoans`, `<Loans>` props (`loans, currency, hasLoanBill, onAdd, onRemove, onRecordPayment`) match across tasks. `deriveNetWorth` loan descriptor `{id,name,currentBalance,category}` matches the App map in Task 5.
- **No edit UI in D** (YAGNI): `updateLoan` exists in the hook but is not wired to `<Loans>`; correction is via remove + re-add. Fine as a hook return (not a lint error).
