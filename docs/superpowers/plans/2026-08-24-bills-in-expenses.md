# Bills in Expenses Summary — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Itemize bills inside the Expenses summary so "Total spending" (expenses + bills) visibly adds up; show goal contributions as a separate muted "saved" note.

**Architecture:** A pure `billMonthlyAmount(bill, dailyMultiplier)` (extracted from `getMonthlyTotal`) and a pure `expensesWithBills(expenses, bills, dailyMultiplier)` view-model helper produce the numbers; `ExpenseSummary` just renders them. Reuses the existing `calculateMonthlyBreakdown` (with 0 bills/goals for expense-only categories) and `categoryBreakdown`.

**Tech Stack:** React 19 + TypeScript, Vite, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-24-pesaflow-bills-in-expenses-design.md`
**Branch:** `fix/monthly-spent-saved-history` (bundled with A+B).

---

## Task 1: `billMonthlyAmount` helper + refactor `getMonthlyTotal`

**Files:**
- Modify: `src/hooks/bills.ts` (`getMonthlyTotal`, lines 57-66)
- Test: `src/hooks/bills.test.ts` (new)

- [ ] **Step 1: Write failing tests**

Create `src/hooks/bills.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { billMonthlyAmount, getMonthlyTotal } from './bills';
import type { Bill } from '../types';

const bill = (over: Partial<Bill>): Bill => ({
  id: 'b', name: 'B', amount: 0, category: 'other', dueDay: 1, frequency: 'monthly',
  status: 'upcoming', notes: '', isRecurring: true, ...over,
});

describe('billMonthlyAmount', () => {
  it('scales each frequency to a monthly figure', () => {
    expect(billMonthlyAmount(bill({ amount: 100, frequency: 'daily' }), 30)).toBe(3000);
    expect(billMonthlyAmount(bill({ amount: 100, frequency: 'weekly' }), 30)).toBe(400);
    expect(billMonthlyAmount(bill({ amount: 300, frequency: 'quarterly' }), 30)).toBe(100);
    expect(billMonthlyAmount(bill({ amount: 1200, frequency: 'annually' }), 30)).toBe(100);
    expect(billMonthlyAmount(bill({ amount: 500, frequency: 'monthly' }), 30)).toBe(500);
  });
});

describe('getMonthlyTotal', () => {
  it('sums monthly-equivalents across a mixed list (non-daily = multiplier-independent)', () => {
    const bills = [
      bill({ amount: 5000, frequency: 'monthly' }),
      bill({ amount: 300, frequency: 'quarterly' }),   // 100
      bill({ amount: 1200, frequency: 'annually' }),    // 100
      bill({ amount: 100, frequency: 'weekly' }),       // 400
    ];
    expect(getMonthlyTotal(bills)).toBe(5600);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/hooks/bills.test.ts`
Expected: FAIL — `billMonthlyAmount` not exported.

- [ ] **Step 3: Refactor `bills.ts`**

In `src/hooks/bills.ts`, replace `getMonthlyTotal` (lines 57-66) with:

```ts
export const billMonthlyAmount = (bill: Bill, dailyMultiplier: number): number => {
  if (bill.frequency === 'daily')     return bill.amount * dailyMultiplier;
  if (bill.frequency === 'weekly')    return bill.amount * 4;
  if (bill.frequency === 'quarterly') return bill.amount / 3;
  if (bill.frequency === 'annually')  return bill.amount / 12;
  return bill.amount; // monthly
};

export const getMonthlyTotal = (bills: Bill[]): number => {
  const dailyMultiplier = readProfileDailyMultiplier();
  return bills.reduce((sum, bill) => sum + billMonthlyAmount(bill, dailyMultiplier), 0);
};
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/hooks/bills.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/bills.ts src/hooks/bills.test.ts
git commit -m "feat: extract billMonthlyAmount; getMonthlyTotal reuses it (DRY)"
```

---

## Task 2: `expensesWithBills` view-model helper

**Files:**
- Modify: `src/utils/history.ts`
- Modify: `src/utils/history.test.ts`

- [ ] **Step 1: Write failing tests**

First, keep imports at the top of the file (do NOT add mid-file imports): add `expensesWithBills` to the existing top-of-file `from './history'` import, and add `Bill` to the existing top-of-file `import type { ... } from '../types'`. Then append the test block below (the `exp` factory already exists from an earlier task; reuse it):

```ts
const bill2 = (over: Partial<Bill>): Bill => ({
  id: 'b', name: 'B', amount: 0, category: 'other', dueDay: 1, frequency: 'monthly',
  status: 'upcoming', notes: '', isRecurring: true, ...over,
});

describe('expensesWithBills', () => {
  it('totals expenses + bills, excludes goals, itemizes bills', () => {
    const expenses = [
      exp({ date: '2026-08-01', amount: 8000, category: 'transport', type: 'necessary' }),
      exp({ date: '2026-08-02', amount: 1200, category: 'diningOut', type: 'unnecessary' }),
    ];
    const bills = [
      bill2({ id: 'r', name: 'Rent', category: 'rent', amount: 5000 }),
      bill2({ id: 'w', name: 'Wifi', category: 'internet', amount: 2000 }),
    ];
    const r = expensesWithBills(expenses, bills, 30);
    expect(r.billsSubtotal).toBe(7000);
    expect(r.total).toBe(16200);      // 8000 + 1200 + 7000
    expect(r.necessary).toBe(15000);  // 8000 transport + 7000 bills
    expect(r.unnecessary).toBe(1200);
    expect(r.billRows).toHaveLength(2);
    expect(r.categoryRows.map((c) => c.category)).toEqual(['transport', 'diningOut']);
  });

  it('empty bills yields subtotal 0', () => {
    const r = expensesWithBills([], [], 30);
    expect(r.billsSubtotal).toBe(0);
    expect(r.total).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/utils/history.test.ts`
Expected: FAIL — `expensesWithBills` not exported.

- [ ] **Step 3: Implement in `src/utils/history.ts`**

Add `Bill` and `BillCategory` to the existing `import type { ... } from '../types'` line (merge, no duplicate). Add a new import for the bill helper:

```ts
import { billMonthlyAmount } from '../hooks/bills';
```

Append:

```ts
export interface BillRow { id: string; name: string; category: BillCategory; amount: number; }

export interface ExpensesWithBills {
  total: number;          // expenses + bills (excludes goal contributions)
  necessary: number;      // necessary expenses + bills
  unnecessary: number;    // unnecessary expenses
  categoryRows: { category: ExpenseCategory; amount: number }[];
  billRows: BillRow[];    // itemized, monthly-equivalent
  billsSubtotal: number;
}

/**
 * Expenses view-model: expense categories PLUS itemized bills, so the total visibly
 * reconciles. Goal contributions are intentionally excluded (shown separately as saving).
 */
export const expensesWithBills = (
  monthlyExpenses: Expense[], bills: Bill[], dailyMultiplier: number,
): ExpensesWithBills => {
  // income/bills/goals set to 0 → pure expense breakdown (byCategory, necessary, unnecessary).
  const expenseOnly = calculateMonthlyBreakdown(monthlyExpenses, 0, 0, 0, dailyMultiplier);
  const billRows: BillRow[] = bills.map((b) => ({
    id: b.id, name: b.name, category: b.category, amount: billMonthlyAmount(b, dailyMultiplier),
  }));
  const billsSubtotal = billRows.reduce((s, r) => s + r.amount, 0);
  const necessary = expenseOnly.necessaryTotal + billsSubtotal;
  const unnecessary = expenseOnly.unnecessaryTotal;
  return {
    total: necessary + unnecessary,
    necessary, unnecessary,
    categoryRows: categoryBreakdown(expenseOnly),
    billRows, billsSubtotal,
  };
};
```

- [ ] **Step 4: Run to verify pass + build**

Run: `npx vitest run src/utils/history.test.ts` — Expected: PASS.
Run: `npm run build` — Expected: no TS errors.

- [ ] **Step 5: Commit**

```bash
git add src/utils/history.ts src/utils/history.test.ts
git commit -m "feat: expensesWithBills view-model (expenses + itemized bills)"
```

---

## Task 3: Expose `dailyMultiplier` from `useExpenses`

**Files:**
- Modify: `src/hooks/useExpenses.ts` (return statement)

- [ ] **Step 1: Add `dailyMultiplier` to the returned object**

In `src/hooks/useExpenses.ts`, the return currently reads (one line):

```ts
  return { expenses, monthlyExpenses, profile, selectedMonth, setSelectedMonth, breakdown, insight, warnings, history, goalsThisMonth, addExpense, removeExpense, updateExpense, updateProfile };
```

Add `dailyMultiplier` (already computed above as a memo):

```ts
  return { expenses, monthlyExpenses, profile, selectedMonth, setSelectedMonth, breakdown, insight, warnings, history, goalsThisMonth, dailyMultiplier, addExpense, removeExpense, updateExpense, updateProfile };
```

- [ ] **Step 2: Verify build + tests**

Run: `npm run build && npx vitest run`
Expected: build clean; all tests pass. (`dailyMultiplier` unused at call sites is fine — it's a hook return value, not a local.)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useExpenses.ts
git commit -m "feat: expose dailyMultiplier from useExpenses"
```

---

## Task 4: Rewrite `ExpenseSummary` to render expenses + bills; wire `App.tsx`

**Files:**
- Modify: `src/components/ExpenseManager.tsx` (`ExpenseSummary`, imports)
- Modify: `src/App.tsx` (destructure + `<ExpenseSummary>` call)

- [ ] **Step 1: Update imports in `ExpenseManager.tsx`**

Current relevant imports:
```ts
import type { Expense, ExpenseCategory, ExpenseFrequency, MonthlyBreakdown } from '../types';
import { categoryBreakdown } from '../utils/history';
import { CATEGORY_META, formatCurrency } from '../utils/expenses';
```
Change to (drop unused `MonthlyBreakdown`; add `Bill`; swap `categoryBreakdown` → `expensesWithBills`; add `BILL_META`):
```ts
import type { Expense, ExpenseCategory, ExpenseFrequency, Bill } from '../types';
import { expensesWithBills } from '../utils/history';
import { CATEGORY_META, formatCurrency } from '../utils/expenses';
import { BILL_META } from '../hooks/bills';
```
(Keep all other existing imports in the file unchanged. If `MonthlyBreakdown` or `categoryBreakdown` are used elsewhere in this file, do NOT remove them — grep first; they are only used by `ExpenseSummary`.)

- [ ] **Step 2: Replace the `ExpenseSummaryProps` interface and `ExpenseSummary` component**

Replace the entire current `interface ExpenseSummaryProps { ... }` and `export const ExpenseSummary ... };` block with:

```tsx
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
```

- [ ] **Step 3: Wire `App.tsx`**

Add `dailyMultiplier` to the `useExpenses` destructure (the block that starts `const { expenses, monthlyExpenses, profile, breakdown, insight, warnings, history, goalsThisMonth, ...`). Insert `dailyMultiplier` after `goalsThisMonth`:

```tsx
  const {
    expenses, monthlyExpenses, profile, breakdown, insight, warnings, history, goalsThisMonth, dailyMultiplier,
    selectedMonth, setSelectedMonth, addExpense, removeExpense, updateExpense, updateProfile,
  } = useExpenses(bills.monthlyTotal, goals.goals);
```

Replace the `<ExpenseSummary .../>` call in the Expenses view with:

```tsx
              <ExpenseSummary expenses={monthlyExpenses} bills={bills.bills} dailyMultiplier={dailyMultiplier} goalsThisMonth={goalsThisMonth} count={monthlyExpenses.length} currency={profile.currency} month={selectedMonth} />
```

- [ ] **Step 4: Verify build + tests**

Run: `npm run build && npx vitest run`
Expected: build clean (no unused-locals errors — `breakdown` is still used by `<Dashboard>`, `dailyMultiplier` is now consumed by `<ExpenseSummary>`); all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/ExpenseManager.tsx src/App.tsx
git commit -m "feat: Expenses summary itemizes bills; goals shown as separate saved note"
```

---

## Task 5: Manual verification

- [ ] **Step 1: Run the app** — `npm run dev`
- [ ] **Step 2:** On the Expenses tab, confirm the summary shows an EXPENSES section, a BILLS (monthly) section itemizing each bill (Airtime, Wifi, Netflix, Mkopa phone) with a subtotal, a "Total spending" that equals expenses + bills, and a muted "set aside to goals" note when a goal was funded this month. Switch months with the selector and confirm the summary follows.

---

## Self-Review Notes

- **Spec coverage:** §3.1 → Task 1; §3.2 → Task 2; §3.3 → Task 4; §3.4 → Tasks 3-4; §5 tests → Tasks 1-2.
- **Type consistency:** `billMonthlyAmount`, `expensesWithBills`, `BillRow`, `ExpensesWithBills` names used consistently. `ExpenseSummary` prop shape changed from `{breakdown,...}` to `{expenses, bills, dailyMultiplier, goalsThisMonth, count, currency, month}` — the App call in Task 4 matches exactly.
- **Import hygiene:** Task 4 drops now-unused `MonthlyBreakdown`/`categoryBreakdown` from ExpenseManager (grep-guarded) and adds `Bill`, `expensesWithBills`, `BILL_META`.
