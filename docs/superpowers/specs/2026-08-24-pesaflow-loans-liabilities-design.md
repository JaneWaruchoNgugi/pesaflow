# PesaFlow — Loans as Tracked Liabilities (Piece D)

**Date:** 2026-08-24
**Status:** Approved (design)
**Branch:** `feat/networth-connections` (continues piece C + Advisor fix)
**Depends on:** piece C (`deriveNetWorth`, virtual lines).

---

## 1. Problem

Net worth shows **KSh 0 liabilities** because the app has no concept of a debt balance. A loan today exists only as a "Loan Payment" bill (a monthly *payment*), which carries no *remaining balance*. The user wants outstanding loan balances to feed Total Liabilities, with paydown progress over time. Bills/expenses stay out of liabilities (they're spending, not debt).

## 2. Chosen model

A first-class **Loan** with `principal` + `currentBalance`, optional `interestRate`/`monthlyPayment`, a **"Record payment"** action that reduces the balance and appends a dated payment, and a **paydown progress bar** (`(principal − currentBalance) / principal`). Each loan's `currentBalance` becomes an auto liability line in net worth (same virtual-line mechanism as piece C's assets).

## 3. Design

### 3.1 Types (`types/index.ts`)

```ts
export interface LoanPayment { id: string; amount: number; date: string; } // date = YYYY-MM-DD

export interface Loan {
  id: string;
  name: string;
  category: LiabilityCategory;   // reuse mortgage|carLoan|personalLoan|creditCard|studentLoan|other
  principal: number;             // original amount borrowed
  currentBalance: number;        // remaining owed = the liability
  interestRate?: number;         // % p.a.
  monthlyPayment?: number;
  payments?: LoanPayment[];      // dated paydown log
  notes?: string;
  createdAt: string;
  isDemo?: boolean;
}
```

### 3.2 Pure helpers (`hooks/loans.ts`, new)

```ts
export const loanPaydownPct = (loan: Loan): number   // (principal-balance)/principal, clamped 0..100; 0 if principal<=0
export const totalLoanBalance = (loans: Loan[]): number  // Σ currentBalance
```

### 3.3 Hook (`hooks/useLoans.ts`, new)

Mirrors `useNetWorth`/`useGoals`: localStorage key `finwise_loans`, Firestore collection `loans`, hydrate on mount. Actions:
- `addLoan(data)`, `removeLoan(id)`, `updateLoan(id, patch)`.
- `recordPayment(id, amount)`: `currentBalance = max(0, currentBalance − amount)`; append `{ id: generateId(), amount, date: today }` to `payments`.
- Returns `loans`, `totalOwed` (= `totalLoanBalance`), and the actions.

### 3.4 Extend `deriveNetWorth` (`hooks/netWorth.ts`)

Add an optional `loans` descriptor list to `sources`; append one virtual **liability** line per loan with `currentBalance > 0`:

```ts
sources: {
  investments: number; goalSavings: number; emergencyFund: number;
  loans?: { id: string; name: string; currentBalance: number; category: LiabilityCategory }[];
}
// for each loan with currentBalance > 0:
liabilityLines.push({ id: `loan:${loan.id}`, name: loan.name, amount: loan.currentBalance, category: loan.category, type: 'liability', auto: true });
```

`loans` defaults to none, so existing C tests are unaffected. `totalLiabilities` now includes loan balances.

### 3.5 Loans UI (`components/Loans.tsx`, new)

A management card rendered on the Net Worth view, below `<NetWorth>`:
- **List:** each loan with `LIABILITY_META` icon/label, `currentBalance` (bold), a **paydown progress bar** (`loanPaydownPct`), `principal` and (if set) `interestRate` / `monthlyPayment`, plus a **Record payment** button (opens an amount input → `onRecordPayment`), and edit/remove.
- **Add loan form** (modal, mirroring `NetWorth`'s form): name, category (`IconSelect` over `LIABILITY_META`), principal, current balance, interest rate (optional), monthly payment (optional), notes.
- If a `loan`-category **bill** exists, show a one-line hint: "You have a loan bill — add it here to track its balance."

### 3.6 Wiring (`App.tsx`)

- `const loans = useLoans();`
- Feed loans into the derived summary:
  ```ts
  const nwSummary = useMemo(() => deriveNetWorth(netWorth.items, {
    investments: investmentSummary.totalInvested,
    goalSavings: goals.totalSaved,
    emergencyFund: emergencyFund.data.currentAmount,
    loans: loans.loans.map((l) => ({ id: l.id, name: l.name, currentBalance: l.currentBalance, category: l.category })),
  }), [netWorth.items, investmentSummary.totalInvested, goals.totalSaved, emergencyFund.data.currentAmount, loans.loans]);
  ```
- In the `networth` view, render `<Loans loans={loans.loans} bills={bills.bills} currency={profile.currency} onAdd={loans.addLoan} onRemove={loans.removeLoan} onUpdate={loans.updateLoan} onRecordPayment={loans.recordPayment} />` after `<NetWorth>`.
- Loan balances now appear as read-only "From loan" liability lines in the Net Worth Liabilities card (via the existing `auto` rendering from piece C).

## 4. Backward compatibility

New collection/type only; nothing existing changes. `deriveNetWorth`'s new `loans` param is optional (piece C tests unaffected). Loan bills are untouched — they remain monthly expenses; a Loan is a separate balance record.

## 5. Testing (Vitest)

- `loanPaydownPct`: full/partial/zero/over-paid (clamped 0..100); principal 0 → 0.
- `totalLoanBalance`: sums balances; empty → 0.
- `deriveNetWorth` with loans: loans with balance add auto liability lines (`id: 'loan:<id>'`, `auto: true`); zero-balance omitted; `totalLiabilities` includes them; assets unaffected.

## 6. Files touched

| File | Change |
|---|---|
| `src/types/index.ts` | add `Loan`, `LoanPayment` |
| `src/hooks/loans.ts` (+ test) | `loanPaydownPct`, `totalLoanBalance` |
| `src/hooks/useLoans.ts` (new) | CRUD + `recordPayment` + `totalOwed` |
| `src/hooks/netWorth.ts` (+ test) | `deriveNetWorth` appends loan liability lines |
| `src/components/Loans.tsx` (new) | loans management card + paydown bars |
| `src/App.tsx` | `useLoans`; feed loans into `nwSummary`; render `<Loans>` |

## 7. Out of scope (piece E, later)

- Investment progress over time (current value vs invested).
- Auto-converting a loan bill into a Loan (only a gentle hint here).
- Interest accrual / amortization schedules (balance is user-maintained via payments).
