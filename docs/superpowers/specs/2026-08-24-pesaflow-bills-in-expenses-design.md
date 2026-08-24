# PesaFlow — Bills as Line Items in the Expenses Summary

**Date:** 2026-08-24
**Status:** Approved (design)
**Branch:** `fix/monthly-spent-saved-history` (bundled with the A+B monthly spent/saved work so both deploy together)
**Depends on:** `2026-08-24-pesaflow-monthly-spent-saved-history-design.md` (the `ExpenseSummary` component and `categoryBreakdown` helper it builds on)

---

## 1. Problem

Bills are added into the Overview "Total Spent" as a lump (`bills.monthlyTotal`) but are **not itemized anywhere in the Expenses view**. The `ExpenseSummary` panel shows a total (`breakdown.totalExpenses`, which includes bills + goal contributions) but lists only expense *categories* — so the total is larger than the visible rows and never reconciles. Users see "Total Spent" but cannot find the bills that make it up (e.g. Airtime 1,500, Wifi 2,000, Netflix 350, Mkopa phone loan 2,380 = 6,230).

## 2. Chosen model

Selected by the user: **itemize bills in the Expenses view; the Expenses "Total spending" = expenses + bills, EXCLUDING goal contributions.** Goal contributions are shown as a separate muted "set aside to goals" note (saving, not spending).

Worked example (matches the current data):

```
Expenses (categories)   20,430
Bills (monthly)          6,230
──────────────────────────────
Total spending          26,660   ← Expenses view total; rows now add up

＋ 2,000 set aside to goals this month   (muted note, NOT in total)
```

### Intentional cross-view difference (approved)

The Overview "Total Spent" (28,660) still counts goal contributions as spending (per the A+B model); the Expenses "Total spending" (26,660) excludes them. Both screens display the same goal figure (2,000), so the 2,000 gap is fully traceable. Each screen is labeled to make the basis explicit; this is a deliberate product choice, not an inconsistency to fix.

## 3. Design

### 3.1 New pure helper — `billMonthlyAmount(bill)`

Location: `src/hooks/bills.ts` (alongside `getMonthlyTotal`). Extract the per-bill frequency scaling that `getMonthlyTotal` currently inlines:

```ts
export const billMonthlyAmount = (bill: Bill, dailyMultiplier: number): number => {
  if (bill.frequency === 'daily')     return bill.amount * dailyMultiplier;
  if (bill.frequency === 'weekly')    return bill.amount * 4;
  if (bill.frequency === 'quarterly') return bill.amount / 3;
  if (bill.frequency === 'annually')  return bill.amount / 12;
  return bill.amount; // monthly
};
```

Refactor `getMonthlyTotal` to reduce over `billMonthlyAmount` (using its existing `readProfileDailyMultiplier()` value) so the formula lives in exactly one place.

### 3.2 New pure helper — `expensesWithBills(...)`

Location: `src/utils/history.ts` (the month-scoped derivations module). Pure and unit-tested:

```ts
export interface BillRow { id: string; name: string; category: BillCategory; amount: number; }
export interface ExpensesWithBills {
  total: number;          // expenses + bills (excludes goals)
  necessary: number;      // necessary expenses + bills
  unnecessary: number;    // unnecessary expenses
  categoryRows: { category: ExpenseCategory; amount: number }[]; // via categoryBreakdown
  billRows: BillRow[];    // itemized, monthly-equivalent
  billsSubtotal: number;
}

export const expensesWithBills = (
  monthlyExpenses: Expense[], bills: Bill[], dailyMultiplier: number,
): ExpensesWithBills
```

Implementation reuses existing pure functions:
- `expenseOnly = calculateMonthlyBreakdown(monthlyExpenses, 0, 0, 0, dailyMultiplier)` → expense-only `byCategory`, `necessaryTotal`, `unnecessaryTotal` (income/bills/goals set to 0 so the result is pure expenses).
- `categoryRows = categoryBreakdown(expenseOnly)`.
- `billRows = bills.map(b => ({ id: b.id, name: b.name, category: b.category, amount: billMonthlyAmount(b, dailyMultiplier) }))`.
- `billsSubtotal = sum(billRows.amount)`.
- `necessary = expenseOnly.necessaryTotal + billsSubtotal`, `unnecessary = expenseOnly.unnecessaryTotal`, `total = necessary + unnecessary`.

### 3.3 `ExpenseSummary` component changes

`src/components/ExpenseManager.tsx`. New props: `expenses: Expense[]`, `bills: Bill[]`, `dailyMultiplier: number`, `goalsThisMonth: number`, `currency: string`, `count: number`, `month?: string`. (Replaces the current `breakdown` prop.)

Renders:
- Header: month label (or "This month") · N entries, and the **Total spending** = `expensesWithBills(...).total`.
- Necessary/unnecessary split bar from `necessary`/`unnecessary`.
- **EXPENSES** section: `categoryRows` (as today, via the shared category rendering).
- **BILLS (monthly)** section (only when `billRows.length > 0`): each bill with its `BILL_META` icon/label, monthly amount; a subtotal row.
- **Muted "set aside to goals" note** (only when `goalsThisMonth > 0`): `＋{formatCurrency(goalsThisMonth)} set aside to goals this month` — visually distinct, NOT included in the total.
- Bills projection caveat label (consistent with the Overview chart): bills reflect their monthly projection for the selected month.

### 3.4 Wiring

- `src/hooks/useExpenses.ts`: add `dailyMultiplier` to the returned object (already computed internally).
- `src/App.tsx`: pass `bills={bills.bills}`, `dailyMultiplier={dailyMultiplier}`, `goalsThisMonth={goalsThisMonth}` (already destructured), `expenses={monthlyExpenses}` to `<ExpenseSummary>`; remove the now-unused `breakdown` prop from that call.

## 4. Backward compatibility

No data model changes. Bills without a recognized frequency fall through to the monthly branch (`bill.amount`), matching current `getMonthlyTotal` behavior. Empty bills → no BILLS section. Legacy behavior of the Overview is unchanged.

## 5. Testing (Vitest)

- `billMonthlyAmount`: daily × multiplier, weekly × 4, quarterly ÷ 3, annually ÷ 12, monthly = amount.
- `getMonthlyTotal`: unchanged results after the refactor (regression — a mixed-frequency bill list sums identically).
- `expensesWithBills`: `total = expenses + bills` (excludes goals); `necessary` includes bills; `categoryRows` exclude bills; `billRows` itemized with correct monthly amounts; empty bills → subtotal 0.

## 6. Files touched

| File | Change |
|---|---|
| `src/hooks/bills.ts` | add `billMonthlyAmount`; refactor `getMonthlyTotal` to reuse it |
| `src/utils/history.ts` (+ test) | add `expensesWithBills` (+ `BillRow`/`ExpensesWithBills` types) |
| `src/hooks/useExpenses.ts` | expose `dailyMultiplier` |
| `src/components/ExpenseManager.tsx` | `ExpenseSummary` renders expenses + itemized bills + goals note |
| `src/App.tsx` | pass `bills`, `dailyMultiplier`, `goalsThisMonth`, `expenses` to `ExpenseSummary` |

## 7. Out of scope (later specs)

- **C/D** — Net worth ← investments (assets) + loans (liabilities); first-class Loan concept (principal/rate/balance) with paydown progress. (The "Mkopa phone" loan bill is the bridge to that work.)
- **E** — Investment progress over time.
- Changing the Overview "Total Spent" basis (it keeps goals-in-spent per the A+B decision).
