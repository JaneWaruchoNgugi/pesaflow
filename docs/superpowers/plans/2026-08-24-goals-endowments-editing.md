# Goals: Editing, Bank Savings & Endowments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add in-place editing of goals, a Bank Savings vehicle, lock-duration (years) on interest vehicles, and endowment modeling (regular + anticipated with a payout schedule).

**Architecture:** New optional `Goal` fields + a pure `projectEndowment` helper (reuses the existing compound-annuity math) + `updateGoal` on the hook. `Goals.tsx` gains an edit flow, a bank-savings category, a lock-years input, and an endowment sub-form with a live projection.

**Tech Stack:** React 19 + TS, Vite, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-24-pesaflow-goals-endowments-editing-design.md`
**Branch:** `feat/goals-endowments-editing`

---

## Task 1: Types + `GOAL_META.bankSavings` + `projectEndowment` + tests

**Files:**
- Modify: `src/types/index.ts`, `src/hooks/goals.ts`
- Create: `src/hooks/goals.test.ts`

- [ ] **Step 1: Types** — in `src/types/index.ts`:
  - Add `'bankSavings'` to the `GoalCategory` union.
  - Add to `interface Goal` (near `interestRate?`/`lockedIn?`):
    ```ts
      /** Lock duration in years (for locked-in interest vehicles). */
      lockYears?: number;
      /** Endowment sub-type for insurance-category goals. */
      endowmentType?: 'regular' | 'anticipated';
      /** Endowment term in years (10|15|20|25|30|35). */
      termYears?: number;
      /** Anticipated endowment: payout interval in years (2–10). */
      payoutIntervalYears?: number;
    ```

- [ ] **Step 2: `GOAL_META.bankSavings`** — in `src/hooks/goals.ts`, add to `GOAL_META` (the `Building2` icon is available from lucide-react — add it to the existing lucide import):
    ```ts
      bankSavings: { label: 'Bank Savings', icon: Building2, color: '#38BDF8', description: 'Bank account / fixed deposit' },
    ```

- [ ] **Step 3: Write failing tests** — create `src/hooks/goals.test.ts`:
    ```ts
    import { describe, it, expect } from 'vitest';
    import { projectEndowment } from './goals';
    import type { Goal } from '../types';

    const goal = (over: Partial<Goal>): Goal => ({
      id: 'g', name: 'E', targetAmount: 1, savedAmount: 0, category: 'insurance',
      deadline: '', monthlyContribution: 0, notes: '', createdAt: '2026-01-01', completed: false, ...over,
    });

    describe('projectEndowment', () => {
      it('regular endowment: single maturity payout above contributions', () => {
        const r = projectEndowment(goal({ endowmentType: 'regular', termYears: 10, interestRate: 12, savedAmount: 100000 }))!;
        expect(r.totalPayouts).toBe(1);
        expect(r.schedule).toHaveLength(1);
        expect(r.maturityValue).toBeGreaterThan(100000);
        expect(r.interestEarned).toBe(r.maturityValue - r.contributed);
      });

      it('anticipated: floor(term/interval) equal payouts at the right years', () => {
        const r = projectEndowment(goal({ endowmentType: 'anticipated', termYears: 20, payoutIntervalYears: 5, interestRate: 10, savedAmount: 200000 }))!;
        expect(r.totalPayouts).toBe(4);
        expect(r.schedule.map((s) => s.year)).toEqual([5, 10, 15, 20]);
        expect(r.perPayout).toBe(Math.round(r.maturityValue / 4));
        expect(r.schedule.every((s) => s.amount === r.perPayout)).toBe(true);
      });

      it('returns null when not an insurance endowment or missing fields', () => {
        expect(projectEndowment(goal({ category: 'mmf', endowmentType: 'regular', termYears: 10, interestRate: 12 }))).toBeNull();
        expect(projectEndowment(goal({ termYears: 10, interestRate: 12 }))).toBeNull();               // no endowmentType
        expect(projectEndowment(goal({ endowmentType: 'regular', interestRate: 12 }))).toBeNull();     // no term
        expect(projectEndowment(goal({ endowmentType: 'regular', termYears: 10 }))).toBeNull();        // no rate
      });
    });
    ```

- [ ] **Step 4: Run to verify failure** — `npx vitest run src/hooks/goals.test.ts` → FAIL.

- [ ] **Step 5: Implement `projectEndowment`** — append to `src/hooks/goals.ts`:
    ```ts
    export interface EndowmentProjection {
      maturityValue: number; contributed: number; interestEarned: number;
      termYears: number; endowmentType: 'regular' | 'anticipated';
      totalPayouts: number; perPayout: number;
      schedule: { year: number; date: string; amount: number }[];
    }

    const ym = (base: Date, monthsAhead: number): string => {
      const d = new Date(base.getFullYear(), base.getMonth() + monthsAhead, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    /**
     * Project an insurance endowment over its term. Reuses the same compound-annuity math
     * as projectGoalInterest. Anticipated endowments split the projected value into equal
     * survival benefits every `payoutIntervalYears`; regular endowments pay once at maturity.
     */
    export const projectEndowment = (goal: Goal): EndowmentProjection | null => {
      if (goal.category !== 'insurance' || !goal.endowmentType || !goal.termYears || goal.termYears <= 0
        || !goal.interestRate || goal.interestRate <= 0) return null;
      const months = goal.termYears * 12;
      const monthlyRate = goal.interestRate / 100 / 12;
      const P = goal.savedAmount || 0;
      const C = goal.monthlyContribution || 0;
      const growth = Math.pow(1 + monthlyRate, months);
      const fvContributions = monthlyRate > 0 ? C * ((growth - 1) / monthlyRate) : C * months;
      const maturityValue = Math.round(P * growth + fvContributions);
      const contributed = Math.round(P + C * months);

      const interval = goal.payoutIntervalYears || 0;
      const anticipated = goal.endowmentType === 'anticipated' && interval > 0;
      const totalPayouts = anticipated ? Math.max(1, Math.floor(goal.termYears / interval)) : 1;
      const perPayout = Math.round(maturityValue / totalPayouts);

      const now = new Date();
      const schedule: { year: number; date: string; amount: number }[] = [];
      if (anticipated) {
        for (let k = 1; k <= totalPayouts; k++) schedule.push({ year: k * interval, date: ym(now, k * interval * 12), amount: perPayout });
      } else {
        schedule.push({ year: goal.termYears, date: ym(now, goal.termYears * 12), amount: maturityValue });
      }

      return { maturityValue, contributed, interestEarned: maturityValue - contributed, termYears: goal.termYears, endowmentType: goal.endowmentType, totalPayouts, perPayout, schedule };
    };
    ```

- [ ] **Step 6: Run to verify pass + build** — `npx vitest run src/hooks/goals.test.ts` (PASS), `npm run build` (clean).

- [ ] **Step 7: Commit**
    ```bash
    git add src/types/index.ts src/hooks/goals.ts src/hooks/goals.test.ts
    git commit -m "feat: bankSavings category + projectEndowment helper + Goal endowment fields"
    ```

---

## Task 2: `useGoals.updateGoal` + App wiring

**Files:** `src/hooks/useGoals.ts`, `src/App.tsx`

- [ ] **Step 1: Add `updateGoal`** — in `src/hooks/useGoals.ts`, after `contribute` (or near the other actions), add:
    ```ts
      const updateGoal = useCallback((id: string, patch: Partial<Omit<Goal, 'id' | 'createdAt'>>) =>
        persist(goals.map((g) => g.id === id ? { ...g, ...patch, completed: (patch.savedAmount ?? g.savedAmount) >= (patch.targetAmount ?? g.targetAmount) } : g)), [goals]);
    ```
  Add `updateGoal` to the returned object.

- [ ] **Step 2: Pass to `<Goals>`** — in `src/App.tsx`, the `<Goals ... />` render currently passes `onAdd`, `onRemove`, `onContribute`, `onUpdateSaved`. Add:
    ```tsx
              onUpdate={goals.updateGoal}
    ```

- [ ] **Step 3: Verify** — `npm run build` (note: `onUpdate` is consumed in Task 3; if the build errors on an unknown prop before Task 3 adds it to `GoalsProps`, that's expected — do Task 3 in the same session before final verification, OR temporarily this passes because extra props are allowed on a typed component only if declared; to keep the build green, add `onUpdate?: (id: string, patch: Partial<Omit<Goal,'id'|'createdAt'>>) => void;` to `GoalsProps` now as part of this step). Then `npx vitest run` (all pass).

- [ ] **Step 4: Commit**
    ```bash
    git add src/hooks/useGoals.ts src/App.tsx
    git commit -m "feat: useGoals.updateGoal + wire onUpdate to Goals"
    ```

---

## Task 3: `Goals.tsx` — editing, bank savings, lock years, endowment sub-form

**File:** `src/components/Goals.tsx` (read the whole file first — it's ~550 lines and the changes touch the form state, the payload builder, the modal, and the card).

This task has four cohesive parts. Implement them together and keep the build green.

- [ ] **Step 1: Props + edit state**
  - Add to `GoalsProps` (if not already added in Task 2): `onUpdate?: (id: string, patch: Partial<Omit<Goal, 'id' | 'createdAt'>>) => void;`. Destructure `onUpdate` in the component.
  - Add state: `const [editId, setEditId] = useState<string | null>(null);` plus new field state `const [lockYears, setLockYears] = useState('');`, `const [endowmentType, setEndowmentType] = useState<'regular' | 'anticipated'>('regular');`, `const [termYears, setTermYears] = useState('10');`, `const [payoutInterval, setPayoutInterval] = useState('5');`.

- [ ] **Step 2: Category flags**
  - `VEHICLE_CATEGORIES` add `'bankSavings'`.
  - `isInterestVehicle` → `category === 'mmf' || category === 'sacco' || category === 'bankSavings'`.
  - Add `const isEndowment = category === 'insurance';`.
  - `institutionLabel`: add `category === 'bankSavings' ? 'Which bank?'` branch.

- [ ] **Step 3: `resetForm` + `buildPayload` helpers** (refactor the repeated reset block and centralise the payload so add and update share it):
    ```ts
    const resetForm = () => {
      setName(''); setTarget(''); setSaved(''); setMonthly(''); setDeadline(''); setNotes(''); setInstitution('');
      setInterestRate(''); setLockedIn(false); setLockYears('');
      setEndowmentType('regular'); setTermYears('10'); setPayoutInterval('5');
      setChamaMembers(''); setChamaPosition(''); setChamaContribution(''); setChamaFrequency('monthly');
      setCategory('emergency'); setSaccoHolding('dividends');
    };

    const buildPayload = (): Omit<Goal, 'id' | 'createdAt' | 'completed'> => {
      const tgt = parseFloat(target.replace(/,/g, ''));
      const sav = parseFloat(saved.replace(/,/g, '') || '0');
      const mon = parseFloat(monthly.replace(/,/g, '') || '0');
      const rate = parseFloat(interestRate) || 0;
      const ly = parseInt(lockYears) || 0;
      return {
        name: name.trim(), targetAmount: tgt, savedAmount: sav, category,
        deadline: isEndowment ? '' : deadline, monthlyContribution: mon, notes,
        ...(isVehicle && institution.trim() ? { institution: institution.trim() } : {}),
        ...(category === 'sacco' ? { saccoHolding } : {}),
        ...(isInterestVehicle && rate > 0 ? { interestRate: rate } : {}),
        ...(isInterestVehicle ? { lockedIn } : {}),
        ...(isInterestVehicle && lockedIn && ly > 0 ? { lockYears: ly } : {}),
        ...(isEndowment ? {
          endowmentType,
          termYears: parseInt(termYears) || 10,
          interestRate: rate,
          ...(endowmentType === 'anticipated' ? { payoutIntervalYears: parseInt(payoutInterval) || 5 } : {}),
        } : {}),
        ...(isChama ? {
          chamaMembers: parseInt(chamaMembers) || 0,
          chamaContribution: parseFloat(chamaContribution.replace(/,/g, '')) || 0,
          chamaFrequency,
          ...(parseInt(chamaPosition) > 0 ? { chamaPosition: parseInt(chamaPosition) } : {}),
        } : {}),
      };
    };
    ```
  - Replace `handleAdd` with a save handler that branches on `editId`:
    ```ts
    const handleSave = () => {
      const tgt = parseFloat(target.replace(/,/g, ''));
      if (!name.trim() || isNaN(tgt) || tgt <= 0 || (goalLimitReached && !editId)) return;
      const payload = buildPayload();
      if (editId) onUpdate?.(editId, payload); else onAdd(payload);
      resetForm(); setEditId(null); setShowForm(false);
    };

    const openEdit = (goal: Goal) => {
      setEditId(goal.id);
      setName(goal.name); setTarget(String(goal.targetAmount)); setSaved(String(goal.savedAmount));
      setMonthly(String(goal.monthlyContribution || '')); setDeadline(goal.deadline || ''); setNotes(goal.notes || '');
      setCategory(goal.category); setInstitution(goal.institution || '');
      setInterestRate(goal.interestRate != null ? String(goal.interestRate) : '');
      setLockedIn(!!goal.lockedIn); setLockYears(goal.lockYears != null ? String(goal.lockYears) : '');
      setSaccoHolding(goal.saccoHolding || 'dividends');
      setEndowmentType(goal.endowmentType || 'regular');
      setTermYears(goal.termYears != null ? String(goal.termYears) : '10');
      setPayoutInterval(goal.payoutIntervalYears != null ? String(goal.payoutIntervalYears) : '5');
      setChamaMembers(goal.chamaMembers != null ? String(goal.chamaMembers) : '');
      setChamaPosition(goal.chamaPosition != null ? String(goal.chamaPosition) : '');
      setChamaContribution(goal.chamaContribution != null ? String(goal.chamaContribution) : '');
      setChamaFrequency(goal.chamaFrequency || 'monthly');
      setShowForm(true);
    };
    ```
  - Update every reference to `handleAdd` → `handleSave`. Update the modal `onClose` to also `setEditId(null); resetForm();`. Update the modal title to `{editId ? 'Edit Investment' : 'Add Investment'}` (both the `<Modal title=...>` and the save button label `Save {editId ? 'Changes' : 'Investment'}`). The `goalLimitReached` gating should NOT block editing (an existing goal) — guard limit UI with `!editId`.

- [ ] **Step 4: Lock-duration input** — after the existing "Locked in?" toggle block (inside the `isInterestVehicle` section), add:
    ```tsx
          {isInterestVehicle && lockedIn && (
            <div style={S.field}>
              <label style={S.label}>Lock duration (years)</label>
              <input style={S.input} type="number" min="0" placeholder="e.g. 2" value={lockYears} onChange={(e) => setLockYears(e.target.value)} disabled={goalLimitReached && !editId} />
            </div>
          )}
    ```

- [ ] **Step 5: Endowment sub-form** — add an `isEndowment` block in the form grid (place it after the institution field). Provide: an endowment-type toggle (Regular | Anticipated) reusing the `holdingRow`/`holdingBtn` styles; a Term select (10,15,20,25,30,35); an interest-rate input; and for anticipated, a "Payout every (years)" select (2..10). Example:
    ```tsx
          {isEndowment && (
            <>
              <div style={S.field}>
                <label style={S.label}>Endowment type</label>
                <div style={S.holdingRow}>
                  {(['regular', 'anticipated'] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setEndowmentType(t)}
                      style={{ ...S.holdingBtn, ...(endowmentType === t ? S.holdingBtnActive : {}) }}>
                      {t === 'regular' ? 'Regular' : 'Anticipated'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>Term (years)</label>
                <select style={S.select} value={termYears} onChange={(e) => setTermYears(e.target.value)}>
                  {[10, 15, 20, 25, 30, 35].map((y) => <option key={y} value={y}>{y} years</option>)}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Interest rate (% p.a.)</label>
                <input style={S.input} type="number" min="0" step="0.1" placeholder="e.g. 8" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
              </div>
              {endowmentType === 'anticipated' && (
                <div style={S.field}>
                  <label style={S.label}>Payout every (years)</label>
                  <select style={S.select} value={payoutInterval} onChange={(e) => setPayoutInterval(e.target.value)}>
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((y) => <option key={y} value={y}>Every {y} years</option>)}
                  </select>
                </div>
              )}
            </>
          )}
    ```
  - Add a live projection box for endowments (after the interest-vehicle projection box), using `projectEndowment` on a temp goal built from form state:
    ```tsx
          {isEndowment && (() => {
            const proj = projectEndowment({
              category: 'insurance', endowmentType, termYears: parseInt(termYears) || 0,
              interestRate: parseFloat(interestRate) || 0, savedAmount: parseFloat(saved.replace(/,/g, '') || '0'),
              monthlyContribution: parseFloat(monthly.replace(/,/g, '') || '0'),
              payoutIntervalYears: parseInt(payoutInterval) || 0,
            } as Goal);
            return (
              <div style={S.projectionBox}>
                <Umbrella size={16} strokeWidth={2.2} style={{ color: 'var(--green)', flexShrink: 0 }} />
                {proj ? (
                  <span>
                    Projected maturity <strong style={{ color: 'var(--green)' }}>{formatCurrency(proj.maturityValue, currency)}</strong>
                    {' '}(+{formatCurrency(proj.interestEarned, currency)} interest).
                    {proj.endowmentType === 'anticipated' && proj.totalPayouts > 1
                      ? <> ≈ <strong style={{ color: 'var(--text-1)' }}>{proj.totalPayouts}</strong> payouts of <strong style={{ color: 'var(--green)' }}>{formatCurrency(proj.perPayout, currency)}</strong> — first around <strong style={{ color: 'var(--text-1)' }}>{proj.schedule[0].date}</strong>.</>
                      : <> Paid at maturity ({proj.schedule[0].date}).</>}
                  </span>
                ) : <span style={{ color: 'var(--text-3)' }}>Add a term and interest rate to project the endowment.</span>}
              </div>
            );
          })()}
    ```
  - Import `projectEndowment` from `../hooks/goals` and ensure `Umbrella` is imported from lucide-react (it may already be used via GOAL_META, but the component needs a direct import for this JSX).
  - Hide the generic `deadline` input when `isEndowment` (wrap it in `{!isEndowment && (...)}`).

- [ ] **Step 6: Card display + Edit button**
  - In the active-goal card meta row, add lock-years and endowment info:
    ```tsx
                    {goal.lockYears ? <span style={S.metaItem}><Lock size={13} strokeWidth={2.2} /> Locked {goal.lockYears} yrs</span> : null}
                    {goal.termYears ? <span style={S.metaItem}><Calendar size={13} strokeWidth={2.2} /> {goal.termYears}-yr term</span> : null}
    ```
  - Add an endowment projection box on the card (mirroring the `interestProj` box), computed via `projectEndowment(goal)`:
    ```tsx
                  {(() => { const ep = projectEndowment(goal); return ep ? (
                    <div style={{ ...S.projectionBox, margin: 0 }}>
                      <Umbrella size={15} strokeWidth={2.2} style={{ color: 'var(--green)', flexShrink: 0 }} />
                      <span>
                        Maturity <strong style={{ color: 'var(--green)' }}>{formatCurrency(ep.maturityValue, currency)}</strong> in {ep.termYears} yrs
                        {ep.endowmentType === 'anticipated' && ep.totalPayouts > 1 ? <> · {ep.totalPayouts} payouts of <strong style={{ color: 'var(--green)' }}>{formatCurrency(ep.perPayout, currency)}</strong></> : ''}
                      </span>
                    </div>
                  ) : null; })()}
    ```
  - In the card's `goalActions` (the non-contributing state), add an Edit button before Remove:
    ```tsx
                      <button style={S.contributeBtn} onClick={() => setContributeId(goal.id)}>+ Contribute</button>
                      <button style={S.editBtn} onClick={() => openEdit(goal)}>Edit</button>
                      <button style={S.removeBtn} onClick={() => onRemove(goal.id)}>Remove</button>
    ```
    Add an `editBtn` style to `S` (mirror `removeBtn` with a subtle accent):
    ```ts
      editBtn: { padding: '9px 14px', background: 'transparent', border: '1px solid var(--border-acc)', color: 'var(--gold)', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'Karla, sans-serif' },
    ```

- [ ] **Step 7: Verify** — `npm run build` (no TS errors) and `npx vitest run` (all pass). Manually confirm the form still adds; editing pre-fills and saves; bank savings/lock-years/endowment fields appear for the right categories.

- [ ] **Step 8: Commit**
    ```bash
    git add src/components/Goals.tsx
    git commit -m "feat: Goals editing, bank savings, lock years, endowment sub-form + projections"
    ```

---

## Task 4: Manual verification

- [ ] `npm run dev`. Add a **Bank Savings** goal (bank name, rate, Locked + lock years) → card shows bank + "Locked N yrs" + growth projection. Add an **Insurance** goal, choose **Anticipated**, term 20, every 5, rate 8 → projection shows ~4 payouts + first date; card shows the schedule. **Edit** an existing goal → form pre-fills, Save updates it.

---

## Self-Review Notes

- **Spec coverage:** §2 → Task 1; §3 → Task 1; §4 → Task 2; §5.1–5.5 → Task 3; §6 → Task 2; §7 → Task 1.
- **Type consistency:** `projectEndowment`, `EndowmentProjection`, `updateGoal`, `GoalsProps.onUpdate`, new `Goal` fields all match across tasks. `buildPayload` returns `Omit<Goal,'id'|'createdAt'|'completed'>` — shared by add (onAdd) and edit (onUpdate accepts the wider `Partial<Omit<Goal,'id'|'createdAt'>>`, compatible).
- **Editing is foundational** (Step 3) before the new fields matter; limit-gating excludes edits (`goalLimitReached && !editId`).
