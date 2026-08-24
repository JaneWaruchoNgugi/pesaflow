# Net Worth Assets Connection (Piece C) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make Total Assets reflect real value by auto-connecting investments, goal savings, and the emergency fund as read-only "virtual" asset lines, combined with manual net-worth items.

**Architecture:** A pure `deriveNetWorth(manualItems, sources)` returns combined totals plus `assetLines`/`liabilityLines` (virtual lines flagged `auto: true`, never persisted). `App.tsx` computes it from the live hooks and passes it to the Net Worth screen and the Dashboard card.

**Tech Stack:** React 19 + TypeScript, Vite, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-24-pesaflow-networth-assets-connection-design.md`
**Branch:** `feat/networth-connections`

---

## Task 1: `deriveNetWorth` helper + types + tests

**Files:**
- Modify: `src/hooks/netWorth.ts`
- Test: `src/hooks/netWorth.test.ts` (new)

- [ ] **Step 1: Write failing tests**

Create `src/hooks/netWorth.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { deriveNetWorth } from './netWorth';
import type { NetWorthItem } from '../types';

const item = (over: Partial<NetWorthItem>): NetWorthItem => ({
  id: 'm', name: 'Manual', amount: 0, category: 'cash', type: 'asset', notes: '', ...over,
});

describe('deriveNetWorth', () => {
  it('sums manual assets and liabilities with no sources', () => {
    const items = [
      item({ id: 'a', amount: 100000, type: 'asset', category: 'property' }),
      item({ id: 'l', amount: 40000, type: 'liability', category: 'mortgage' }),
    ];
    const r = deriveNetWorth(items, { investments: 0, goalSavings: 0, emergencyFund: 0 });
    expect(r.totalAssets).toBe(100000);
    expect(r.totalLiabilities).toBe(40000);
    expect(r.netWorth).toBe(60000);
    expect(r.assetLines).toHaveLength(1);
    expect(r.assetLines[0].auto).toBe(false);
  });

  it('adds virtual asset lines for investments, goals, emergency fund when > 0', () => {
    const r = deriveNetWorth([], { investments: 30000, goalSavings: 12000, emergencyFund: 8000 });
    expect(r.totalAssets).toBe(50000);
    expect(r.assetLines.map((l) => l.id)).toEqual(['auto:investments', 'auto:goals', 'auto:emergency']);
    expect(r.assetLines.every((l) => l.auto)).toBe(true);
  });

  it('omits zero-value virtual lines', () => {
    const r = deriveNetWorth([], { investments: 5000, goalSavings: 0, emergencyFund: 0 });
    expect(r.assetLines).toHaveLength(1);
    expect(r.assetLines[0].id).toBe('auto:investments');
  });

  it('combines manual and virtual; netWorth = assets - liabilities', () => {
    const items = [item({ id: 'l', amount: 20000, type: 'liability', category: 'carLoan' })];
    const r = deriveNetWorth(items, { investments: 50000, goalSavings: 0, emergencyFund: 0 });
    expect(r.totalAssets).toBe(50000);
    expect(r.totalLiabilities).toBe(20000);
    expect(r.netWorth).toBe(30000);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/hooks/netWorth.test.ts`
Expected: FAIL — `deriveNetWorth` not exported.

- [ ] **Step 3: Implement in `src/hooks/netWorth.ts`**

Append (the imports `NetWorthItem, AssetCategory, LiabilityCategory` already exist at the top of the file):

```ts
export interface NetWorthLine {
  id: string;
  name: string;
  amount: number;
  category: AssetCategory | LiabilityCategory;
  type: 'asset' | 'liability';
  auto?: boolean;           // true = derived/read-only virtual line
  notes?: string;
}

export interface DerivedNetWorth {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  assetLines: NetWorthLine[];
  liabilityLines: NetWorthLine[];
}

/**
 * Combine manually-entered net-worth items with auto-derived virtual asset lines
 * (investments, goal savings, emergency fund). Virtual lines are read-only and never
 * persisted — recomputed each render from their source so they cannot drift.
 */
export const deriveNetWorth = (
  manualItems: NetWorthItem[],
  sources: { investments: number; goalSavings: number; emergencyFund: number },
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
  const totalAssets = assetLines.reduce((s, l) => s + l.amount, 0);
  const totalLiabilities = liabilityLines.reduce((s, l) => s + l.amount, 0);
  return { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities, assetLines, liabilityLines };
};
```

- [ ] **Step 4: Run to verify pass + build**

Run: `npx vitest run src/hooks/netWorth.test.ts` — Expected: PASS.
Run: `npm run build` — Expected: no TS errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/netWorth.ts src/hooks/netWorth.test.ts
git commit -m "feat: deriveNetWorth combines manual items with virtual asset lines"
```

---

## Task 2: Render lines in `NetWorth.tsx` + wire `App.tsx`

**Files:**
- Modify: `src/components/NetWorth.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Update `NetWorth.tsx` imports + props**

Change the import line 4 from:
```ts
import { ASSET_META, LIABILITY_META, calculateNetWorth } from '../hooks/netWorth';
```
to:
```ts
import { ASSET_META, LIABILITY_META } from '../hooks/netWorth';
import type { NetWorthLine, DerivedNetWorth } from '../hooks/netWorth';
```

Replace the `NetWorthProps` interface (lines 9-16) with:
```ts
interface NetWorthProps {
  assetLines: NetWorthLine[];
  liabilityLines: NetWorthLine[];
  summary: DerivedNetWorth;
  onAdd: (data: Omit<NetWorthItem, 'id'>) => void;
  onRemove: (id: string) => void;
  onUpdateAmount: (id: string, amount: number) => void;
  currency: string;
}
```

Update the component signature (line 18) to destructure the new props:
```ts
export const NetWorth: React.FC<NetWorthProps> = ({ assetLines, liabilityLines, summary, onAdd, onRemove, onUpdateAmount, currency }) => {
```

Replace the two filter lines (47-48):
```ts
  const assets      = items.filter((i) => i.type === 'asset');
  const liabilities = items.filter((i) => i.type === 'liability');
```
with:
```ts
  const assets      = assetLines;
  const liabilities = liabilityLines;
```

- [ ] **Step 2: Make virtual lines read-only with an "Auto" badge**

In the list `.map((item) => { ... })` (around lines 172-206), the `item` is now a `NetWorthLine`. Replace the returned row JSX (the `return ( <div key={item.id} style={S.itemRow}> ... </div> )`) with this version, which gates edit/remove on `!item.auto` and shows an "Auto" badge for virtual lines:

```tsx
              return (
                <div key={item.id} style={S.itemRow}>
                  <div style={{ ...S.itemIcon, background: `${meta.color}18` }}><Icon size={18} strokeWidth={2.1} style={{ color: meta.color }} /></div>
                  <div style={S.itemInfo}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={S.itemName}>{item.name}</div>
                      {item.auto && <span style={S.autoBadge}>Auto</span>}
                    </div>
                    <div style={{ ...S.itemCat, color: meta.color }}>{item.auto ? `From your ${meta.label}` : meta.label}</div>
                    <div style={S.itemBar}><div style={{ ...S.itemBarFill, width: `${pct}%`, background: meta.color }} /></div>
                  </div>
                  {editId === item.id && !item.auto ? (
                    <div style={S.editRow}>
                      <input style={{ ...S.input, width: 100, padding: '6px 10px', fontSize: 13 }}
                        type="number" value={editAmt} onChange={(e) => setEditAmt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateAmt(item.id)} autoFocus />
                      <button style={{ ...S.saveBtn, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleUpdateAmt(item.id)} aria-label="Save"><Check size={14} strokeWidth={2.6} /></button>
                      <button style={{ ...S.cancelBtn, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setEditId(null)} aria-label="Cancel"><X size={14} strokeWidth={2.4} /></button>
                    </div>
                  ) : (
                    <div style={S.itemRight}>
                      <div style={{ ...S.itemAmount, color: totalColor }}>{formatCurrency(item.amount, currency)}</div>
                      <div style={S.itemPct}>{pct}%</div>
                    </div>
                  )}
                  {!item.auto && (
                    <div style={S.rowActions}>
                      <button style={{ ...S.editBtn, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setEditId(item.id); setEditAmt(String(item.amount)); }} aria-label="Edit"><Pencil size={13} strokeWidth={2.2} /></button>
                      <button style={{ ...S.removeBtn, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => onRemove(item.id)} aria-label="Remove"><X size={13} strokeWidth={2.4} /></button>
                    </div>
                  )}
                </div>
              );
```

Add an `autoBadge` style to the `S` object (near `itemPct`):
```ts
  autoBadge: { fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px' },
```

- [ ] **Step 3: Wire `App.tsx`**

Add the import (near the `useNetWorth` import, line 9):
```ts
import { deriveNetWorth } from './hooks/netWorth';
```
(`useMemo` is already imported in App.tsx; if not, add it to the existing `react` import.)

After the `emergencyFund` hook is created (line 128), add:
```ts
  const nwSummary = useMemo(() => deriveNetWorth(netWorth.items, {
    investments: investmentSummary.totalInvested,
    goalSavings: goals.totalSaved,
    emergencyFund: emergencyFund.data.currentAmount,
  }), [netWorth.items, investmentSummary.totalInvested, goals.totalSaved, emergencyFund.data.currentAmount]);
```

Replace every `netWorthSummary={netWorth.summary}` (lines ~309, ~453, ~475) with `netWorthSummary={nwSummary}` (there are three occurrences — replace all).

Replace the `<NetWorth ... />` props (lines ~409-414). Change:
```tsx
              <NetWorth
                items={netWorth.items}
                summary={netWorth.summary}
                onAdd={netWorth.addItem}
                onRemove={netWorth.removeItem}
                onUpdateAmount={netWorth.updateAmount}
```
to:
```tsx
              <NetWorth
                assetLines={nwSummary.assetLines}
                liabilityLines={nwSummary.liabilityLines}
                summary={nwSummary}
                onAdd={netWorth.addItem}
                onRemove={netWorth.removeItem}
                onUpdateAmount={netWorth.updateAmount}
```
Keep the existing `currency={...}` prop and the closing `/>` exactly as they are. Do NOT change the CSV export lines (they use `netWorth.items` — leave them; they export manual items).

- [ ] **Step 4: Verify build + tests**

Run: `npm run build && npx vitest run`
Expected: build clean (no TS errors; `netWorth.summary` no longer referenced where replaced; `NetWorth` props match); all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/NetWorth.tsx src/App.tsx
git commit -m "feat: net worth shows investments/goals/emergency fund as auto asset lines"
```

---

## Task 3: Manual verification

- [ ] **Step 1: Run** `npm run dev`.
- [ ] **Step 2:** On the Net Worth screen, confirm the Assets card now lists **Investments**, **Goal savings**, and **Emergency fund** as "Auto"-badged rows (only when > 0), with no edit/remove controls, and that Total Assets / Your Net Worth / the Dashboard "Net Worth" card all reflect them. Manual assets/liabilities still add and edit normally. Liabilities remain manual-only (loans arrive in piece D).

---

## Self-Review Notes

- **Spec coverage:** §3.1 → Task 1; §3.2 → Task 2 Step 3; §3.3 → Task 2 Steps 1-2; §5 tests → Task 1.
- **Type consistency:** `NetWorthLine`, `DerivedNetWorth`, `deriveNetWorth` names match across tasks. `NetWorth` prop shape changed to `{ assetLines, liabilityLines, summary, ... }` — App call in Task 2 Step 3 matches. Dashboard/Advisor `netWorthSummary` keeps the `{ totalAssets, totalLiabilities, netWorth }` shape (subset of `DerivedNetWorth`), so those consumers are unaffected.
- **No persistence of virtual lines:** `useNetWorth` still stores only manual items; virtual lines exist only in the derived summary.
