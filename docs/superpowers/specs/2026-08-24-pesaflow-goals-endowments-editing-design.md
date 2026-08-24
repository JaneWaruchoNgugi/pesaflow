# PesaFlow — Goals: Editing, Bank Savings & Endowments

**Date:** 2026-08-24
**Status:** Approved (design)
**Branch:** `feat/goals-endowments-editing`

---

## 1. Problem

The Goals ("Add Investment") screen can't be **edited** (only Contribute/Remove). Interest rate + locked-in exist only for MMF/SACCO. Users want: (a) editing, (b) a **Bank Savings** vehicle (bank name, interest rate, locked-in + lock duration), (c) **lock duration** on interest vehicles, and (d) **endowment** modeling — regular (single maturity) and anticipated (periodic survival benefits).

## 2. Model changes (`types/index.ts`)

- `GoalCategory` gains `'bankSavings'`.
- `Goal` gains:
  - `lockYears?: number` — lock duration (years).
  - `endowmentType?: 'regular' | 'anticipated'`.
  - `termYears?: number` — endowment term (10|15|20|25|30|35).
  - `payoutIntervalYears?: number` — anticipated payout interval (2–10).
- Existing `interestRate?`, `lockedIn?`, `institution?` reused.

## 3. Helpers (`hooks/goals.ts`)

- `GOAL_META` gains `bankSavings: { label: 'Bank Savings', icon: Landmark (or Building), color, description }`.
- New `projectEndowment(goal): EndowmentProjection | null`:
  - Requires `category === 'insurance'`, `endowmentType`, `termYears > 0`, `interestRate > 0`.
  - Horizon = `termYears * 12` months. Compound FV of `savedAmount` + `monthlyContribution` at `interestRate` (reuse the annuity math from `projectGoalInterest`).
  - `maturityValue = FV`, `contributed`, `interestEarned`.
  - **Anticipated** (`endowmentType === 'anticipated'`, needs `payoutIntervalYears`): `totalPayouts = floor(termYears / payoutIntervalYears)`; `perPayout = round(maturityValue / totalPayouts)`; `schedule = [{ year: k*interval, date: 'YYYY-MM' (now + k*interval yrs), amount: perPayout }]` for `k = 1..totalPayouts`.
  - **Regular**: `totalPayouts = 1`, single payout at term end.

```ts
export interface EndowmentProjection {
  maturityValue: number; contributed: number; interestEarned: number;
  termYears: number; endowmentType: 'regular' | 'anticipated';
  totalPayouts: number; perPayout: number;
  schedule: { year: number; date: string; amount: number }[];
}
```

## 4. Hook (`hooks/useGoals.ts`)

Add `updateGoal(id, patch: Partial<Omit<Goal, 'id' | 'createdAt'>>)` (persist map-merge), returned alongside the existing actions.

## 5. UI (`components/Goals.tsx`)

### 5.1 Editing
- Track `editId: string | null`. An **Edit** (pencil) button on each active goal card loads the goal into the form (pre-fill all state), opens the modal titled **"Edit Investment"**, and **Save** calls `onUpdate(editId, patch)` instead of `onAdd`. Cancel/close clears `editId`.

### 5.2 Bank Savings
- `VEHICLE_CATEGORIES` += `'bankSavings'`; `isInterestVehicle` += `'bankSavings'` (gets rate + lock + growth projection via existing `projectGoalInterest`). `institutionLabel` for bankSavings → "Which bank?".

### 5.3 Lock duration
- When `isInterestVehicle && lockedIn`, show a **"Lock duration (years)"** number input bound to `lockYears`. Card meta shows "Locked N yrs" when set.

### 5.4 Endowment sub-form (category `insurance`)
- Endowment type toggle: **Regular** | **Anticipated**.
- **Term (years)** select: 10/15/20/25/30/35.
- **Interest rate (% p.a.)** input.
- For Anticipated: **Payout every** select: 2–10 years.
- Live projection box (via `projectEndowment`): "Projected maturity ~KSh X (+KSh Y interest)"; for anticipated: "≈ N payouts of KSh Z — every M yrs" and the first payout date.
- The generic `deadline` input is hidden for `insurance` (term drives the horizon).

### 5.5 Card display
- Endowment cards show term, projected maturity, and (anticipated) the payout cadence; interest vehicles show rate + "Locked N yrs"; bank savings shows bank name (existing `institution` display).

## 6. Wiring (`App.tsx`)

Pass `onUpdate={goals.updateGoal}` to `<Goals>` (already passes `onAdd`, `onRemove`, `onContribute`, `onUpdateSaved`).

## 7. Testing (Vitest)

`projectEndowment`:
- Regular: maturity FV correct for a known rate/term/contribution; `totalPayouts === 1`.
- Anticipated: `totalPayouts === floor(term/interval)`; `perPayout === round(maturity/totalPayouts)`; `schedule` length + years correct; `payoutInterval. missing → null`.
- Returns null when not an insurance endowment / no rate / no term.

## 8. Backward compatibility

New optional fields only. Existing goals unaffected. `updateGoal` is additive. `projectGoalInterest` unchanged (bank savings reuses it).

## 9. Files touched

| File | Change |
|---|---|
| `src/types/index.ts` | `GoalCategory` += bankSavings; `Goal` += lockYears/endowmentType/termYears/payoutIntervalYears |
| `src/hooks/goals.ts` (+ test) | `GOAL_META.bankSavings`; `projectEndowment` |
| `src/hooks/useGoals.ts` | `updateGoal` |
| `src/components/Goals.tsx` | editing, bank savings, lock years, endowment sub-form + display |
| `src/App.tsx` | pass `onUpdate` |

## 10. Out of scope

- Actuarial bonus/annuity precision (uses simple compound projection).
- Editing completed goals (edit applies to active goals).
