# PesaFlow — Net Worth Assets Connection (Piece C)

**Date:** 2026-08-24
**Status:** Approved (design)
**Branch:** `feat/networth-connections`
**Next:** Piece D (Loans → liabilities) in a separate spec.

---

## 1. Problem

The Net Worth screen shows **KSh 0** for assets even when the user has active investments, goal savings, and an emergency fund. `calculateNetWorth` (`hooks/netWorth.ts:27`) only sums manually-entered `NetWorthItem`s; it has no knowledge of the other features. The user wants assets to reflect what they actually own.

## 2. Chosen model

Assets = **manual asset items** + **auto-derived virtual lines** from the live sources:
- **Investments** → Σ active investments (`investmentSummary.totalInvested`).
- **Goal savings** → Σ goal `savedAmount` (`goals.totalSaved`).
- **Emergency fund** → current balance (`emergencyFund.data.currentAmount`).

Virtual lines are **read-only** (edit the source feature, not net worth), **badged "Auto"**, and **never persisted** — recomputed each render so they can't drift from their source. Bills and expenses are excluded by design (they are spending, not owned value). Liabilities are unchanged in this piece (loans come in D).

## 3. Design

### 3.1 New types + pure helper (`hooks/netWorth.ts`)

```ts
export interface NetWorthLine {
  id: string;                                  // manual item id, or 'auto:investments' etc.
  name: string;
  amount: number;
  category: AssetCategory | LiabilityCategory;
  type: 'asset' | 'liability';
  auto?: boolean;                              // true = derived/read-only
  notes?: string;
}

export interface DerivedNetWorth {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  assetLines: NetWorthLine[];
  liabilityLines: NetWorthLine[];
}

export const deriveNetWorth = (
  manualItems: NetWorthItem[],
  sources: { investments: number; goalSavings: number; emergencyFund: number },
): DerivedNetWorth
```

Behavior:
- Map manual items → `NetWorthLine` (`auto: false`), split by `type`.
- Append virtual **asset** lines, only when amount > 0:
  - `{ id: 'auto:investments', name: 'Investments', amount: sources.investments, category: 'investments', type: 'asset', auto: true }`
  - `{ id: 'auto:goals', name: 'Goal savings', amount: sources.goalSavings, category: 'cash', type: 'asset', auto: true }`
  - `{ id: 'auto:emergency', name: 'Emergency fund', amount: sources.emergencyFund, category: 'cash', type: 'asset', auto: true }`
- `totalAssets` = Σ assetLines; `totalLiabilities` = Σ liabilityLines (manual only for now); `netWorth` = totalAssets − totalLiabilities.

`calculateNetWorth` stays for now (unused paths); `deriveNetWorth` is the new source of truth wired into the UI.

### 3.2 Wiring (`App.tsx`)

Compute once and pass everywhere `netWorth.summary` currently flows:

```ts
const nwSummary = useMemo(() => deriveNetWorth(netWorth.items, {
  investments: investmentSummary.totalInvested,
  goalSavings: goals.totalSaved,
  emergencyFund: emergencyFund.data.currentAmount,
}), [netWorth.items, investmentSummary.totalInvested, goals.totalSaved, emergencyFund.data.currentAmount]);
```

- Dashboard `netWorthSummary={nwSummary}` (it reads `.totalAssets/.totalLiabilities/.netWorth` — unchanged shape, so it just starts showing real numbers).
- Net Worth screen receives `assetLines`, `liabilityLines`, and the totals from `nwSummary`, plus the existing manual CRUD handlers.

### 3.3 Net Worth screen (`components/NetWorth.tsx`)

- Render `assetLines` / `liabilityLines` instead of raw `items`.
- Virtual lines (`auto === true`): show an **"Auto"** badge; **no edit/remove controls** (the source feature owns them). Include a one-line hint (e.g. "From your Investments / Goals / Emergency Fund").
- Manual lines: unchanged edit/remove behavior via the existing `updateAmount`/`removeItem`.
- Totals (`YOUR NET WORTH`, `TOTAL ASSETS`, `TOTAL LIABILITIES`) use `nwSummary`.

## 4. Backward compatibility

`useNetWorth` CRUD and storage are unchanged; only manual items persist. Existing `calculateNetWorth` untouched. The Dashboard prop shape (`{ totalAssets, totalLiabilities, netWorth }`) is preserved. Zero-value sources produce no virtual line (no "Investments KSh 0" clutter).

## 5. Testing (Vitest)

`deriveNetWorth`:
- Manual asset + manual liability only → totals match `calculateNetWorth`.
- Adds virtual lines for investments/goals/emergency when > 0; omits them when 0.
- `totalAssets` = manual assets + all virtual assets; `netWorth` = assets − liabilities.
- Virtual lines carry `auto: true` and stable ids; manual lines carry `auto: false`.

## 6. Files touched

| File | Change |
|---|---|
| `src/hooks/netWorth.ts` (+ test) | add `NetWorthLine`, `DerivedNetWorth`, `deriveNetWorth` |
| `src/App.tsx` | compute `nwSummary`; pass to Dashboard + Net Worth screen |
| `src/components/NetWorth.tsx` | render asset/liability lines; "Auto" badge + read-only virtual lines |

## 7. Out of scope (piece D, next spec)

- First-class `Loan` type (principal, rate, remaining balance), management UI, paydown progress, and loan balances → Total Liabilities. The "Mkopa phone" loan bill is the bridge.
- Investment progress over time (piece E).
