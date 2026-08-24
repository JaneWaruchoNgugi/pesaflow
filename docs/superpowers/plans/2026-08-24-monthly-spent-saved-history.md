# Monthly Spent/Saved + Expense History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the monthly Spent/Saved calculation (lifetime goal savings were wrongly counted as this-month spending) and surface accurate per-month history on the Overview and Expenses views.

**Architecture:** Add a dated `contributions` log to goals so "saved this month" is a real flow, not the lifetime balance. Add pure helpers (`utils/history.ts`) that derive per-month spent/saved from already-dated expenses + contributions — no stored snapshots. `useExpenses` takes the goals array (keeping `selectedMonth`, the goal total, and history in sync) and returns `history`. Dashboard and ExpenseManager gain a month selector, a spending-over-time chart, and a summary panel.

**Tech Stack:** React 19 + TypeScript, Vite, Vitest, Firebase/Firestore, lucide-react. Inline-SVG charts (no chart lib).

**Spec:** `docs/superpowers/specs/2026-08-24-pesaflow-monthly-spent-saved-history-design.md`

---

## File Structure

- `src/types/index.ts` — add `Goal.contributions?` field.
- `src/utils/history.ts` **(new)** — pure helpers: `goalContributionsInMonth`, `availableMonths`, `monthlyHistory`, `categoryBreakdown`. One responsibility: deriving month-scoped figures.
- `src/utils/history.test.ts` **(new)** — Vitest unit tests incl. the regression test.
- `src/hooks/useGoals.ts` — `contribute()` appends a dated log entry.
- `src/hooks/useExpenses.ts` — accept `goals: Goal[]`; compute goal total via `goalContributionsInMonth`; return `history`, `expenses`, `selectedMonth`, `setSelectedMonth`.
- `src/App.tsx` — pass `goals.goals` into `useExpenses`; destructure and forward `history`/`selectedMonth` to views.
- `src/components/MonthSelector.tsx` **(new)** — small shared month `<select>`.
- `src/components/Dashboard.tsx` — month selector, spending-over-time chart, clarified cards.
- `src/components/ExpenseManager.tsx` — new `ExpenseSummary` component (summary panel).

---

## Task 1: `goalContributionsInMonth` helper + regression test

**Files:**
- Create: `src/utils/history.ts`
- Test: `src/utils/history.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/history.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { goalContributionsInMonth } from './history';
import type { Goal } from '../types';

const baseGoal = (over: Partial<Goal>): Goal => ({
  id: 'g1', name: 'Test', targetAmount: 100000, savedAmount: 0,
  category: 'other', deadline: '2027-01', monthlyContribution: 0,
  notes: '', createdAt: '2026-01-01T00:00:00.000Z', completed: false, ...over,
});

describe('goalContributionsInMonth', () => {
  it('sums only contributions dated in the given month', () => {
    const goals: Goal[] = [
      baseGoal({ id: 'a', contributions: [
        { id: 'c1', amount: 3000, date: '2026-08-05' },
        { id: 'c2', amount: 2000, date: '2026-08-20' },
        { id: 'c3', amount: 9000, date: '2026-07-11' },
      ] }),
      baseGoal({ id: 'b', contributions: [{ id: 'c4', amount: 500, date: '2026-08-01' }] }),
    ];
    expect(goalContributionsInMonth(goals, '2026-08')).toBe(5500);
  });

  // Regression: the KSh 111,240 bug. A legacy goal with a large savedAmount
  // and NO dated contributions must contribute 0 to the current month.
  it('ignores lifetime savedAmount for legacy goals (no contributions log)', () => {
    const goals: Goal[] = [baseGoal({ savedAmount: 80000 })];
    expect(goalContributionsInMonth(goals, '2026-08')).toBe(0);
  });

  it('returns 0 for an empty goal list', () => {
    expect(goalContributionsInMonth([], '2026-08')).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/history.test.ts`
Expected: FAIL — cannot import `goalContributionsInMonth` (module/file not found).

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/history.ts`:

```ts
import type { Goal } from '../types';

/**
 * Sum of a goal's dated contributions falling in `month` (YYYY-MM).
 * Legacy goals without a contributions log contribute 0 — their savedAmount
 * represents saving from prior months, not this month's spending.
 */
export const goalContributionsInMonth = (goals: Goal[], month: string): number =>
  goals.reduce(
    (sum, g) =>
      sum + (g.contributions ?? [])
        .filter((c) => c.date.startsWith(month))
        .reduce((s, c) => s + c.amount, 0),
    0,
  );
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/history.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/history.ts src/utils/history.test.ts
git commit -m "feat: goalContributionsInMonth helper + regression test for savings-as-spending bug"
```

---

## Task 2: Add `Goal.contributions?` type + dated logging in `contribute()`

**Files:**
- Modify: `src/types/index.ts` (Goal interface, ends line 162)
- Modify: `src/hooks/useGoals.ts:49-55` (`contribute`)

- [ ] **Step 1: Add the type field**

In `src/types/index.ts`, inside `interface Goal`, add before the closing `}` (after the `isDemo?` line):

```ts
  /** Dated log of contributions; drives per-month "saved this month". Absent on legacy goals. */
  contributions?: { id: string; amount: number; date: string }[]; // date = YYYY-MM-DD
```

- [ ] **Step 2: Log a dated entry in `contribute()`**

In `src/hooks/useGoals.ts`, replace the `contribute` callback (lines 49-55):

```ts
  const contribute = useCallback((id: string, amount: number) => {
    const today = new Date().toISOString().slice(0, 10);
    persist(goals.map((g) => {
      if (g.id !== id) return g;
      const newSaved = g.savedAmount + amount;
      const entry = { id: generateId(), amount, date: today };
      return {
        ...g,
        savedAmount: newSaved,
        contributions: [...(g.contributions ?? []), entry],
        completed: newSaved >= g.targetAmount,
      };
    }));
  }, [goals]);
```

- [ ] **Step 3: Verify typecheck/build passes**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/hooks/useGoals.ts
git commit -m "feat: log dated goal contributions so 'saved this month' is accurate"
```

---

## Task 3: `availableMonths` + `monthlyHistory` helpers

**Files:**
- Modify: `src/utils/history.ts`
- Modify: `src/utils/history.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/utils/history.test.ts`:

```ts
import { availableMonths, monthlyHistory } from './history';
import type { Expense } from '../types';

const exp = (over: Partial<Expense>): Expense => ({
  id: 'e', name: 'x', amount: 0, category: 'food', type: 'necessary',
  date: '2026-08-10', isRecurring: false, ...over,
});

describe('availableMonths', () => {
  it('returns unique months newest-first, including the current month', () => {
    const expenses = [exp({ date: '2026-07-02' }), exp({ date: '2026-08-09' }), exp({ date: '2026-08-20' })];
    const months = availableMonths(expenses, '2026-08');
    expect(months).toEqual(['2026-08', '2026-07']);
  });
});

describe('monthlyHistory', () => {
  it('derives spent and saved per month from dated data', () => {
    const expenses = [
      exp({ date: '2026-08-05', amount: 10000, category: 'food', type: 'necessary' }),
      exp({ date: '2026-07-05', amount: 4000, category: 'food', type: 'necessary' }),
    ];
    const goals = [{
      id: 'g', name: 'G', targetAmount: 1, savedAmount: 50000, category: 'other' as const,
      deadline: '2027-01', monthlyContribution: 0, notes: '', createdAt: '2026-01-01', completed: false,
      contributions: [{ id: 'c', amount: 2000, date: '2026-08-01' }],
    }];
    // billsTotal 3000, income 50000, dailyMultiplier 30, months anchored at 2026-08
    const hist = monthlyHistory(expenses, goals, 3000, 50000, 30, 2, '2026-08');
    expect(hist.map((h) => h.month)).toEqual(['2026-07', '2026-08']); // oldest-first for charting
    const aug = hist[1];
    // spent = expenses 10000 + bills 3000 + goal-this-month 2000 = 15000
    expect(aug.spent).toBe(15000);
    expect(aug.saved).toBe(35000); // 50000 - 15000
    const jul = hist[0];
    // spent = 4000 + 3000 bills + 0 goal = 7000
    expect(jul.spent).toBe(7000);
    expect(jul.saved).toBe(43000);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/history.test.ts`
Expected: FAIL — `availableMonths` / `monthlyHistory` not exported.

- [ ] **Step 3: Implement**

Append to `src/utils/history.ts`:

```ts
import type { Expense } from '../types';
import { filterByMonth } from './expenses';
import { calculateMonthlyBreakdown } from './calculations';

/** Shift a YYYY-MM string by `delta` months (negative = past). */
const shiftMonth = (month: string, delta: number): string => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** Unique months present in expenses (plus `current`), newest-first. */
export const availableMonths = (expenses: Expense[], current: string): string[] => {
  const set = new Set<string>([current]);
  for (const e of expenses) set.add(e.date.slice(0, 7));
  return [...set].sort().reverse();
};

export interface MonthPoint {
  month: string; spent: number; saved: number; necessary: number; unnecessary: number;
}

/**
 * Per-month derived history for the last `n` months ending at `anchor` (YYYY-MM),
 * oldest-first for left-to-right charting. Bills use the current monthly projection
 * for every month (payments are not dated yet — accepted tradeoff).
 */
export const monthlyHistory = (
  expenses: Expense[], goals: Goal[], billsMonthlyTotal: number,
  income: number, dailyMultiplier: number, n = 6, anchor = '',
): MonthPoint[] => {
  const end = anchor || new Date().toISOString().slice(0, 7);
  const points: MonthPoint[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const month = shiftMonth(end, -i);
    const monthExpenses = filterByMonth(expenses, month);
    const goalTotal = goalContributionsInMonth(goals, month);
    const b = calculateMonthlyBreakdown(monthExpenses, income, billsMonthlyTotal, goalTotal, dailyMultiplier);
    points.push({
      month,
      spent: b.totalExpenses,
      saved: Math.max(0, income - b.totalExpenses),
      necessary: b.necessaryTotal,
      unnecessary: b.unnecessaryTotal,
    });
  }
  return points;
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/history.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/history.ts src/utils/history.test.ts
git commit -m "feat: availableMonths + monthlyHistory derived from dated data"
```

---

## Task 4: `categoryBreakdown` shared selector

**Files:**
- Modify: `src/utils/history.ts`
- Modify: `src/utils/history.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/utils/history.test.ts`:

```ts
import { categoryBreakdown } from './history';
import type { MonthlyBreakdown } from '../types';

describe('categoryBreakdown', () => {
  it('lists non-zero categories sorted by amount desc', () => {
    const breakdown = {
      totalExpenses: 0, necessaryTotal: 0, unnecessaryTotal: 0, savingsLeft: 0,
      byCategory: { food: 3000, transport: 8000, shopping: 0 },
    } as unknown as MonthlyBreakdown;
    expect(categoryBreakdown(breakdown)).toEqual([
      { category: 'transport', amount: 8000 },
      { category: 'food', amount: 3000 },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/history.test.ts`
Expected: FAIL — `categoryBreakdown` not exported.

- [ ] **Step 3: Implement**

Append to `src/utils/history.ts` (add `MonthlyBreakdown` and `ExpenseCategory` to the existing `import type ... from '../types'` — combine with the `Goal`/`Expense` imports):

```ts
import type { MonthlyBreakdown, ExpenseCategory } from '../types';

/** Non-zero expense categories, sorted by amount descending. Shared by Overview + Expenses views. */
export const categoryBreakdown = (
  breakdown: MonthlyBreakdown,
): { category: ExpenseCategory; amount: number }[] =>
  (Object.entries(breakdown.byCategory) as [ExpenseCategory, number][])
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([category, amount]) => ({ category, amount }));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/history.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/history.ts src/utils/history.test.ts
git commit -m "feat: categoryBreakdown shared selector"
```

---

## Task 5: Wire `useExpenses` to goals + history; update `App.tsx`

**Files:**
- Modify: `src/hooks/useExpenses.ts` (signature line 28; breakdown line 110; return line 114)
- Modify: `src/App.tsx:119` and Dashboard/Expenses render blocks

- [ ] **Step 1: Change `useExpenses` to take the goals array and expose history**

In `src/hooks/useExpenses.ts`:

Update imports at top:

```ts
import type { Expense, FinancialProfile, Goal } from '../types';
import { goalContributionsInMonth, monthlyHistory } from '../utils/history';
```

Change the signature (line 28) from `export const useExpenses = (billsTotal = 0, goalsTotal = 0) => {` to:

```ts
export const useExpenses = (billsTotal = 0, goals: Goal[] = []) => {
```

Replace the derived `breakdown` line (currently line 110) and add history, so the derived block reads:

```ts
  const monthlyExpenses = useMemo(() => filterByMonth(expenses, selectedMonth), [expenses, selectedMonth]);
  const dailyMultiplier = useMemo(() => getDailyMultiplier(profile), [profile]);
  const goalsThisMonth = useMemo(() => goalContributionsInMonth(goals, selectedMonth), [goals, selectedMonth]);
  const breakdown = useMemo(() => calculateMonthlyBreakdown(monthlyExpenses, profile.monthlyIncome, billsTotal, goalsThisMonth, dailyMultiplier), [monthlyExpenses, profile.monthlyIncome, billsTotal, goalsThisMonth, dailyMultiplier]);
  const insight = useMemo(() => getSpendingInsight(breakdown, profile.monthlyIncome), [breakdown, profile.monthlyIncome]);
  const warnings = useMemo(() => getUnnecessaryWarnings(monthlyExpenses, profile.monthlyIncome), [monthlyExpenses, profile.monthlyIncome]);
  const history = useMemo(() => monthlyHistory(expenses, goals, billsTotal, profile.monthlyIncome, dailyMultiplier, 6, selectedMonth), [expenses, goals, billsTotal, profile.monthlyIncome, dailyMultiplier, selectedMonth]);
```

Update the return (currently line 114) to add `expenses`, `history`, `goalsThisMonth`:

```ts
  return { expenses, monthlyExpenses, profile, selectedMonth, setSelectedMonth, breakdown, insight, warnings, history, goalsThisMonth, addExpense, removeExpense, updateExpense, updateProfile };
```

- [ ] **Step 2: Update the `useExpenses` call in `App.tsx`**

In `src/App.tsx`, change the destructure/call (lines 117-119) to:

```ts
  const {
    expenses, monthlyExpenses, profile, breakdown, insight, warnings, history, goalsThisMonth,
    selectedMonth, setSelectedMonth, addExpense, removeExpense, updateExpense, updateProfile,
  } = useExpenses(bills.monthlyTotal, goals.goals);
```

- [ ] **Step 3: Verify build + full test suite**

Run: `npm run build && npx vitest run`
Expected: build succeeds; all tests pass. The Overview number now drops from the inflated value because lifetime savings no longer count as spending.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useExpenses.ts src/App.tsx
git commit -m "fix: use this-month goal contributions (not lifetime balance) in monthly breakdown"
```

---

## Task 6: `MonthSelector` shared component

**Files:**
- Create: `src/components/MonthSelector.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/MonthSelector.tsx`:

```tsx
import React from 'react';

interface MonthSelectorProps {
  months: string[];        // 'YYYY-MM', newest-first
  value: string;
  onChange: (month: string) => void;
}

const label = (m: string): string => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
};

export const MonthSelector: React.FC<MonthSelectorProps> = ({ months, value, onChange }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    aria-label="Select month"
    style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-1)',
      borderRadius: 8, padding: '7px 12px', fontSize: 13, fontFamily: 'Karla, sans-serif', cursor: 'pointer',
    }}
  >
    {months.map((m) => <option key={m} value={m}>{label(m)}</option>)}
  </select>
);
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/MonthSelector.tsx
git commit -m "feat: shared MonthSelector component"
```

---

## Task 7: Overview — month selector, spending-over-time chart, clarified cards

**Files:**
- Modify: `src/components/Dashboard.tsx`
- Modify: `src/App.tsx` (Dashboard render block, lines ~297-322)

- [ ] **Step 1: Extend `DashboardProps` and imports**

In `src/components/Dashboard.tsx`:

Add to the top imports:

```tsx
import { MonthSelector } from './MonthSelector';
import type { MonthPoint } from '../utils/history';
import { availableMonths } from '../utils/history';
```

Add these props to `interface DashboardProps` (after `expenseCount?`):

```tsx
  expenses?: import('../types').Expense[];
  history?: MonthPoint[];
  selectedMonth?: string;
  onSelectMonth?: (month: string) => void;
  goalsThisMonth?: number;
```

Add them to the destructured params (with defaults):

```tsx
  expenses = [], history = [], selectedMonth = '', onSelectMonth,
  goalsThisMonth = 0,
```

- [ ] **Step 2: Add the month selector to the header area**

In `Dashboard.tsx`, immediately after the opening `<div style={S.container} className="animate-in">` and its `<style>` block, insert:

```tsx
      {onSelectMonth && selectedMonth && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <MonthSelector months={availableMonths(expenses, selectedMonth)} value={selectedMonth} onChange={onSelectMonth} />
        </div>
      )}
```

- [ ] **Step 3: Clarify the Total Spent + Available to Save cards**

In the "Total spent" card, replace the `statSub` line:

```tsx
          <div style={S.statSub}>{spendingPct}% of income · expenses + bills + goals</div>
```

In the "Savings" card, after the existing `statSub` div (before the card's closing `</div>`), add:

```tsx
          {goalsThisMonth > 0 && (
            <div style={{ ...S.statSub, color: 'var(--green)' }}>
              +{formatCurrency(goalsThisMonth, profile.currency)} saved to goals this month
            </div>
          )}
```

- [ ] **Step 4: Add the spending-over-time chart**

In `Dashboard.tsx`, insert this block just before the `{/* Score + categories */}` comment:

```tsx
      {history.length > 0 && (() => {
        const maxVal = Math.max(1, ...history.map((h) => Math.max(h.spent, h.saved)));
        return (
          <div style={S.categoriesCard}>
            <div style={S.cardTitle}>Spending over time</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 140, padding: '8px 4px 0' }}>
              {history.map((h) => (
                <div key={h.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100, width: '100%', justifyContent: 'center' }}>
                    <div title={`Spent ${formatCurrency(h.spent, profile.currency)}`}
                      style={{ width: 12, height: `${(h.spent / maxVal) * 100}%`, background: 'var(--blue)', borderRadius: '3px 3px 0 0' }} />
                    <div title={`Saved ${formatCurrency(h.saved, profile.currency)}`}
                      style={{ width: 12, height: `${(h.saved / maxVal) * 100}%`, background: 'var(--green)', borderRadius: '3px 3px 0 0' }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{h.month.slice(5)}/{h.month.slice(2, 4)}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: 'var(--text-3)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--blue)' }} /> Spent</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--green)' }} /> Saved</span>
              <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>Bills use current projection</span>
            </div>
          </div>
        );
      })()}
```

- [ ] **Step 5: Pass the new props from `App.tsx`**

In `src/App.tsx`, inside the `<Dashboard ... />` render (after `expenseCount={monthlyExpenses.length}`), add:

```tsx
              expenses={expenses}
              history={history}
              selectedMonth={selectedMonth}
              onSelectMonth={setSelectedMonth}
              goalsThisMonth={goalsThisMonth}
```

(`goalsThisMonth` is already destructured from `useExpenses` in Task 5.)

- [ ] **Step 6: Verify build + suite**

Run: `npm run build && npx vitest run`
Expected: build succeeds; all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/Dashboard.tsx src/App.tsx
git commit -m "feat: Overview month selector, spending-over-time chart, clarified cards"
```

---

## Task 8: Expenses view — summary panel + month selector

**Files:**
- Modify: `src/components/ExpenseManager.tsx` (add `ExpenseSummary` export)
- Modify: `src/App.tsx` (Expenses render block, lines ~338-348)

- [ ] **Step 1: Add the `ExpenseSummary` component**

In `src/components/ExpenseManager.tsx`, add these imports at the top (merge with existing import lines):

```tsx
import type { MonthlyBreakdown } from '../types';
import { formatCurrency, CATEGORY_META } from '../utils/expenses';
import { categoryBreakdown } from '../utils/history';
```

Append this component at the end of the file:

```tsx
interface ExpenseSummaryProps {
  breakdown: MonthlyBreakdown;
  count: number;
  currency: string;
}

export const ExpenseSummary: React.FC<ExpenseSummaryProps> = ({ breakdown, count, currency }) => {
  const rows = categoryBreakdown(breakdown);
  const total = breakdown.totalExpenses;
  const necPct = total > 0 ? Math.round((breakdown.necessaryTotal / total) * 100) : 0;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>This month · {count} {count === 1 ? 'entry' : 'entries'}</span>
        <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 700, color: 'var(--text-1)' }}>{formatCurrency(total, currency)}</span>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
        <div style={{ width: `${necPct}%`, background: 'var(--green)' }} />
        <div style={{ width: `${100 - necPct}%`, background: 'var(--amber)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6, color: 'var(--text-3)' }}>
        <span style={{ color: 'var(--green)' }}>Necessary {formatCurrency(breakdown.necessaryTotal, currency)}</span>
        <span style={{ color: 'var(--amber)' }}>Unnecessary {formatCurrency(breakdown.unnecessaryTotal, currency)}</span>
      </div>
      {rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          {rows.map(({ category, amount }) => {
            const meta = CATEGORY_META[category];
            const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
            const Icon = meta?.icon;
            return (
              <div key={category} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {Icon && <Icon size={18} strokeWidth={2.1} style={{ color: meta.color, flexShrink: 0 }} />}
                <span style={{ fontSize: 13, color: 'var(--text-1)', minWidth: 90 }}>{meta?.label}</span>
                <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: meta?.color }} />
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-2)', minWidth: 80, textAlign: 'right' }}>{formatCurrency(amount, currency)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Render summary + month selector in the Expenses view**

In `src/App.tsx`, import at top (merge with component imports):

```tsx
import { ExpenseForm, ExpenseList, ExpenseSummary } from './components/ExpenseManager';
import { MonthSelector } from './components/MonthSelector';
import { availableMonths } from './utils/history';
```

Replace the Expenses render block body so it becomes:

```tsx
          {activeView === 'expenses' && (
            <div className="animate-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <MonthSelector months={availableMonths(expenses, selectedMonth)} value={selectedMonth} onChange={setSelectedMonth} />
                <button style={exportBtnStyle} onClick={() => exportExpensesToCSV(monthlyExpenses)}>
                  <Download size={14} strokeWidth={2.2} /> Export CSV
                </button>
              </div>
              <ExpenseSummary breakdown={breakdown} count={monthlyExpenses.length} currency={profile.currency} />
              <ExpenseForm onAdd={addExpense} />
              <ExpenseList expenses={monthlyExpenses} onRemove={removeExpense} onUpdate={updateExpense} currency={profile.currency} />
            </div>
          )}
```

- [ ] **Step 3: Verify build + suite**

Run: `npm run build && npx vitest run`
Expected: build succeeds; all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/ExpenseManager.tsx src/App.tsx
git commit -m "feat: Expenses view summary panel + month selector"
```

---

## Task 9: Manual verification

- [ ] **Step 1: Run the app**

Run: `npm run dev`

- [ ] **Step 2: Verify the fix**

With income 50,000 and existing goal savings: confirm **Total Spent** is now realistic (expenses + bills + this-month goal contributions), not inflated by the lifetime goal balance, and **Available to Save** is no longer wrongly 0.

- [ ] **Step 3: Verify history + summary**

- Overview: month selector switches all stats; "Spending over time" shows twin Spent/Saved bars for available months.
- Contribute to a goal → "saved to goals this month" appears and that amount reflects in the month's figures.
- Expenses tab: summary panel shows total, necessary/unnecessary split, full category breakdown; month selector reviews past months.

- [ ] **Step 4: Final commit (if any tweaks)**

```bash
git add -A && git commit -m "chore: manual-verification tweaks for monthly spent/saved history"
```

---

## Self-Review Notes

- **Spec coverage:** §3.1 → Task 2; §3.2 → Task 2; §3.3 helpers → Tasks 1,3,4; §3.4 wiring → Task 5; §3.5 Overview → Tasks 6,7; §3.6 Expenses → Task 8; §5 tests → Tasks 1,3,4 (incl. regression in Task 1); §4 backward-compat → Task 1 legacy test.
- **Deviation from spec §3.4 (intentional):** goal total computed inside `useExpenses` (which owns `selectedMonth`) rather than at `App.tsx:119`, keeping `selectedMonth`, goal total, and history in sync. Same functional result.
- **Type consistency:** `MonthPoint`, `goalContributionsInMonth`, `monthlyHistory`, `availableMonths`, `categoryBreakdown`, `ExpenseSummary`, `MonthSelector` names used consistently across tasks.
