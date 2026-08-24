# PesaFlow — Accurate Monthly Spent/Saved + Expense History (A + B)

**Date:** 2026-08-24
**Status:** Approved (design)
**Scope:** Fix the wrong monthly Spent/Saved calculation, add a dated goal-contribution log, derive per-month history from existing dated data, and surface it on the Overview and Expenses views.

---

## 1. Problem

The Overview shows impossible numbers: with income KSh 50,000 it reported **Total Spent KSh 111,240** and **Available to Save KSh 0 ("Overspent!")**, while the visible "Top Spending Categories" summed to only ~KSh 20,000.

### Root cause (verified in code)

`App.tsx:119` wires expenses as:

```ts
} = useExpenses(bills.monthlyTotal, goals.totalSaved);
```

The second argument becomes `goalsTotal`. `useGoals.ts:64` defines:

```ts
const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0); // LIFETIME balance
```

`calculateMonthlyBreakdown` (`utils/calculations.ts:33`) then does:

```ts
necessaryTotal += billsTotal + goalsTotal;         // lifetime savings added as spending
...
savingsLeft: Math.max(0, income - totalExpenses);  // → 0
```

So the **entire accumulated goal balance is subtracted from every month's income as if freshly spent**. A *stock* (accumulated savings) is being treated as a *flow* (monthly spending). Two consequences:

1. Total Spent is inflated by the lifetime savings balance.
2. `byCategory` (Top Spending Categories) excludes bills + goals, so it can never reconcile with Total Spent — which is what made the discrepancy visible.

## 2. Chosen model

Selected by the user: **keep the bill projection, but replace the lifetime goal balance with this month's goal contributions only.**

Worked example:

```
Income                       50,000
Expenses (this month)        20,430
Bills (monthly projection)    8,000
Goal contributions THIS month 5,000
──────────────────────────────────
"Spent"                      33,430
Available to Save            16,570
Saved to goals this month     5,000   (shown explicitly as saving)
```

The lifetime goal balance (e.g. 80,000) never touches the current month again.

## 3. Design

### 3.1 Data model — dated goal contributions

Add to `Goal` (`types/index.ts`), mirroring the existing `EmergencyFundData.contributions` pattern (`types/index.ts:291`):

```ts
export interface Goal {
  // ...existing fields unchanged...
  /** Dated log of contributions; drives per-month "saved this month". Absent on legacy goals. */
  contributions?: { id: string; amount: number; date: string }[]; // date = YYYY-MM-DD
}
```

`savedAmount` remains the running balance (drives all progress bars — no regression). `contributions` is the flow log. Storing both, explicitly, is the fix for the stock/flow conflation.

### 3.2 `useGoals.contribute()` logs a dated entry

`contribute(id, amount)` appends `{ id, amount, date: today }` to that goal's `contributions` array **and** still increments `savedAmount`. `updateSaved()` (manual balance set) does **not** log a dated contribution — it is a correction to the balance, not a dated inflow.

### 3.3 Pure helpers (new, unit-tested)

Location: `utils/history.ts` (new) — pure, no hooks/Firestore.

```ts
// Sum of dated contributions in a given month. Legacy goals (no log) contribute 0.
goalContributionsInMonth(goals: Goal[], month: string /* YYYY-MM */): number

// Per-month derived history for the last n months (default 6), newest last.
monthlyHistory(
  expenses: Expense[], goals: Goal[], billsMonthlyTotal: number,
  income: number, dailyMultiplier: number, n = 6,
): { month: string; spent: number; saved: number; necessary: number; unnecessary: number }[]

// Shared selector so Overview top-5 and Expenses full list use one formula.
categoryBreakdown(breakdown: MonthlyBreakdown): { category: ExpenseCategory; amount: number }[]
```

`monthlyHistory` computes each month by filtering the already-dated `expenses`, summing that month's goal contributions, and running the existing `calculateMonthlyBreakdown`. **No snapshots stored** — history is derived from the single source of truth, so editing/back-dating an expense keeps history self-consistent, and no new Firestore collection is needed.

**Honest caveat (accepted tradeoff):** bills apply the *current* monthly projection to every past month (payments aren't dated yet). Expenses and goal-savings history are exact; the bills component is a flat projection. Charts are labeled accordingly. Making bills historically dated is a later spec (piece D).

### 3.4 Wiring

- `App.tsx:119` → `useExpenses(bills.monthlyTotal, goalContributionsInMonth(goals.goals, selectedMonth))`.
- Expose `selectedMonth` / `setSelectedMonth` (already in `useExpenses`) plus a `history` value to the views.

### 3.5 Overview (`Dashboard.tsx`)

1. **Month selector** — compact dropdown in the header bound to `selectedMonth`; selecting a past month re-renders all stats for that month.
2. **"Spending over time" mini chart** — last 6 months from `monthlyHistory()`, twin bars per month (Spent = blue, Saved = green). Inline SVG matching the existing score-ring idiom; no new chart dependency.
3. **Clarified stat cards** — Total Spent gets a subtext breakdown (`expenses + bills + goals`); add a small **"Saved to goals this month"** figure so set-aside money reads as saving.

### 3.6 Expenses view (`ExpenseManager`)

Summary panel for the selected month: total, necessary-vs-unnecessary split (proportional bar), full by-category breakdown (all categories with spend, via `categoryBreakdown`), entry count, and the same month selector.

## 4. Backward compatibility

Legacy goals have `savedAmount` but no `contributions` log. They are treated as **saved in prior months → contribute 0 to the current month** (correct). New contributions from ship date onward are dated and tracked. No migration/backfill required.

## 5. Testing (Vitest, alongside `src/lib/*.test.ts`)

- `goalContributionsInMonth`: sums current-month dated contributions; legacy goal (no log) → 0; ignores other months.
- **Regression test (the point of this spec):** a goal with `savedAmount: 80000` and no current-month contribution adds **0** to `calculateMonthlyBreakdown` spending — proving KSh 111,240 cannot return.
- `monthlyHistory`: correct per-month spent/saved; fewer than n months → only available months; daily multiplier respected; income 0 → saved 0.
- `categoryBreakdown`: sorted desc, excludes zero categories.

## 6. Files touched

| File | Change |
|---|---|
| `types/index.ts` | add `Goal.contributions?` |
| `hooks/useGoals.ts` | `contribute()` logs dated entry |
| `utils/history.ts` (new) | `goalContributionsInMonth`, `monthlyHistory`, `categoryBreakdown` + tests |
| `hooks/useExpenses.ts` | expose `history`; keep `selectedMonth` |
| `App.tsx` | this-month goal contributions (line 119); wire `selectedMonth`/history to views |
| `components/Dashboard.tsx` | month selector, mini bar chart, clarified cards |
| `components/ExpenseManager.tsx` | summary panel + month selector |

## 7. Out of scope (later specs)

- **C** — Net worth ← investments (assets) + loan balances (liabilities), auto-connected.
- **D** — Loans as a first-class concept (principal, rate, balance) + paydown progress; making bills historically dated.
- **E** — Investment progress over time (current value vs invested).

## 8. Edge cases

Income 0 (score 0, saved 0, unchanged); < 6 months of data (show available months only); daily expenses scaled per `dailyMultiplier` in every month; demo/guest data unaffected.
