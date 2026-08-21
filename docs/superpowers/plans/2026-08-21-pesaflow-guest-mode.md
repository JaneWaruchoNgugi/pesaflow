# Guest Mode + Demo Hook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let signed-out visitors use the whole app immediately, pre-filled with demo data, and invite them to sign up to save their own data (demo never carries over).

**Architecture:** The app is already local-first (data hooks read/write `finwise_*` localStorage; Firestore sync no-ops without a `uid`). We seed demo data before render, route signed-out visitors into the app (not a landing gate), show a `GuestBanner`, and on signup push only the user's non-demo data to Firestore via the existing `sync.ts`, then reload.

**Tech Stack:** React + TypeScript + Vite, Firebase (Auth/Firestore), Vitest (node env — pure-function tests only, inject a storage stub for anything touching `localStorage`).

**Spec:** `docs/superpowers/specs/2026-08-21-pesaflow-guest-mode-design.md`

---

## File structure

**New**
- `src/lib/demoData.ts` — demo dataset builders, `isDemo` strip helper, seed/clear + guard (pure core + thin localStorage wrappers).
- `src/lib/demoData.test.ts` — unit tests (storage stub).
- `src/lib/guestMigration.ts` — collect non-demo guest data + push to cloud.
- `src/lib/guestMigration.test.ts` — unit tests for the pure collector.
- `src/components/GuestBanner.tsx` — banner + smart-prompt modal.

**Modified**
- `src/types/index.ts` — add `isDemo?: boolean` to `Expense`, `Goal`, `Bill`, `FinancialProfile`.
- `src/main.tsx` — `seedDemoIfNeeded()` before render.
- `src/App.tsx` — `'about'` stage, guest-app default routing, render `GuestBanner`, wire actions.
- `src/hooks/useAuth.ts` — migrate guest data on sign-in that started as a guest.
- `src/components/LandingPage.tsx` — add an "explore the app" affordance (About page).

---

## Task 1: Add `isDemo` to data types

**Files:**
- Modify: `src/types/index.ts` (interfaces `Expense`, `Goal`, `Bill`, `FinancialProfile`)

- [ ] **Step 1: Add the field to each interface**

In `src/types/index.ts`, add this line inside `Expense`, `Goal`, and `Bill` (before the closing `}` of each):

```ts
  /** Seeded sample data shown to guests; stripped before a real account is created. */
  isDemo?: boolean;
```

And inside `FinancialProfile` add the same line.

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: exit 0 (optional field is backward-compatible).

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add optional isDemo flag to Expense/Goal/Bill/FinancialProfile"
```

---

## Task 2: `demoData.ts` — dataset, guard, seed, clear

**Files:**
- Create: `src/lib/demoData.ts`
- Test: `src/lib/demoData.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/demoData.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  stripDemo, shouldSeedDemo, seedDemoIfNeeded, clearDemoData,
  buildDemoExpenses, buildDemoGoals, buildDemoBills, KEYS, DEMO_FLAG,
  type StorageLike,
} from './demoData';

// Minimal in-memory Storage (node test env has no localStorage).
const makeStore = (init: Record<string, string> = {}): StorageLike => {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => { m.set(k, v); },
    removeItem: (k) => { m.delete(k); },
  };
};

describe('demo dataset', () => {
  it('every seeded item is tagged isDemo', () => {
    expect(buildDemoExpenses().every(e => e.isDemo === true)).toBe(true);
    expect(buildDemoGoals().every(g => g.isDemo === true)).toBe(true);
    expect(buildDemoBills().every(b => b.isDemo === true)).toBe(true);
  });
  it('seeds a non-empty, realistic set', () => {
    expect(buildDemoExpenses().length).toBeGreaterThanOrEqual(4);
  });
});

describe('stripDemo', () => {
  it('removes only isDemo items', () => {
    const out = stripDemo([{ id: '1', isDemo: true }, { id: '2' }] as any);
    expect(out.map(i => i.id)).toEqual(['2']);
  });
});

describe('shouldSeedDemo', () => {
  it('true for a fresh guest (no auth profile, unseeded, empty)', () => {
    expect(shouldSeedDemo(makeStore())).toBe(true);
  });
  it('false when a user is signed in (auth profile cached)', () => {
    expect(shouldSeedDemo(makeStore({ [KEYS.authProfile]: '{"uid":"x"}' }))).toBe(false);
  });
  it('false when already seeded', () => {
    expect(shouldSeedDemo(makeStore({ [DEMO_FLAG]: '1' }))).toBe(false);
  });
  it('false when data already exists', () => {
    expect(shouldSeedDemo(makeStore({ [KEYS.expenses]: '[{"id":"1"}]' }))).toBe(false);
  });
});

describe('seedDemoIfNeeded', () => {
  it('seeds once and sets the flag', () => {
    const store = makeStore();
    expect(seedDemoIfNeeded(store)).toBe(true);
    expect(store.getItem(DEMO_FLAG)).toBe('1');
    expect(JSON.parse(store.getItem(KEYS.expenses)!).length).toBeGreaterThan(0);
    expect(seedDemoIfNeeded(store)).toBe(false); // no re-seed
  });
});

describe('clearDemoData', () => {
  it('removes demo items but keeps user items and zeroes income', () => {
    const store = makeStore();
    seedDemoIfNeeded(store);
    // add a real expense alongside demo
    const withReal = [...JSON.parse(store.getItem(KEYS.expenses)!), { id: 'real', name: 'Mine', amount: 10, category: 'food', type: 'necessary', date: '2026-08-01', isRecurring: false }];
    store.setItem(KEYS.expenses, JSON.stringify(withReal));
    clearDemoData(store);
    const left = JSON.parse(store.getItem(KEYS.expenses)!);
    expect(left.map((e: any) => e.id)).toEqual(['real']);
    expect(JSON.parse(store.getItem(KEYS.profile)!).monthlyIncome).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/demoData.test.ts`
Expected: FAIL — cannot resolve `./demoData`.

- [ ] **Step 3: Implement `src/lib/demoData.ts`**

```ts
import type { Expense, Goal, Bill, FinancialProfile } from '../types';

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export const DEMO_FLAG = 'pesaflow_demo_seeded';
export const KEYS = {
  authProfile: 'finwise_auth_profile',
  profile: 'finwise_profile',
  expenses: 'finwise_expenses',
  goals: 'finwise_goals',
  bills: 'finwise_bills',
} as const;

const store = (): StorageLike => localStorage;

export const stripDemo = <T extends { isDemo?: boolean }>(items: T[]): T[] =>
  items.filter(i => !i.isDemo);

const readArray = <T>(s: StorageLike, key: string): T[] => {
  try { return JSON.parse(s.getItem(key) || '[]'); } catch { return []; }
};

// ── Demo dataset (realistic Kenyan sample) ──────────────────────────
export const buildDemoProfile = (): FinancialProfile =>
  ({ monthlyIncome: 45000, currency: 'KES', isDemo: true });

export const buildDemoExpenses = (): Expense[] => ([
  { id: 'demo-e1', name: 'Matatu fare',   amount: 3000, category: 'transport',     type: 'necessary',   date: '2026-08-03', isRecurring: false, isDemo: true },
  { id: 'demo-e2', name: 'Data bundles',  amount: 1000, category: 'utilities',     type: 'necessary',   date: '2026-08-05', isRecurring: false, isDemo: true },
  { id: 'demo-e3', name: 'Lunch (kibanda)', amount: 4500, category: 'food',        type: 'necessary',   date: '2026-08-07', isRecurring: false, isDemo: true },
  { id: 'demo-e4', name: 'Betika',        amount: 2000, category: 'entertainment', type: 'unnecessary', date: '2026-08-09', isRecurring: false, isDemo: true },
  { id: 'demo-e5', name: 'Airtime',       amount: 500,  category: 'utilities',     type: 'necessary',   date: '2026-08-10', isRecurring: false, isDemo: true },
]);

export const buildDemoGoals = (): Goal[] => ([
  { id: 'demo-g1', name: 'Plot deposit', targetAmount: 200000, savedAmount: 15000, category: 'property', deadline: '2027-06', monthlyContribution: 5000, notes: 'Sample goal — clear it and add your own.', createdAt: '2026-08-01T00:00:00Z', completed: false, isDemo: true },
]);

export const buildDemoBills = (): Bill[] => ([
  { id: 'demo-b1', name: 'Rent', amount: 12000, category: 'rent', dueDay: 5, frequency: 'monthly', status: 'upcoming', notes: '', isRecurring: true, isDemo: true },
]);

// ── Guard + seed + clear ────────────────────────────────────────────
export const shouldSeedDemo = (s: StorageLike): boolean => {
  if (s.getItem(KEYS.authProfile)) return false; // a (past or present) signed-in user
  if (s.getItem(DEMO_FLAG)) return false;         // already seeded this browser
  const empty =
    readArray(s, KEYS.expenses).length === 0 &&
    readArray(s, KEYS.goals).length === 0 &&
    readArray(s, KEYS.bills).length === 0;
  return empty;
};

export const seedDemoIfNeeded = (s: StorageLike = store()): boolean => {
  if (!shouldSeedDemo(s)) return false;
  s.setItem(KEYS.profile,  JSON.stringify(buildDemoProfile()));
  s.setItem(KEYS.expenses, JSON.stringify(buildDemoExpenses()));
  s.setItem(KEYS.goals,    JSON.stringify(buildDemoGoals()));
  s.setItem(KEYS.bills,    JSON.stringify(buildDemoBills()));
  s.setItem(DEMO_FLAG, '1');
  return true;
};

export const clearDemoData = (s: StorageLike = store()): void => {
  s.setItem(KEYS.expenses, JSON.stringify(stripDemo(readArray<Expense>(s, KEYS.expenses))));
  s.setItem(KEYS.goals,    JSON.stringify(stripDemo(readArray<Goal>(s, KEYS.goals))));
  s.setItem(KEYS.bills,    JSON.stringify(stripDemo(readArray<Bill>(s, KEYS.bills))));
  s.setItem(KEYS.profile,  JSON.stringify({ monthlyIncome: 0, currency: 'KES' } as FinancialProfile));
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/demoData.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Typecheck + commit**

```bash
npx tsc -b
git add src/lib/demoData.ts src/lib/demoData.test.ts
git commit -m "feat(guest): demo dataset, seed guard, and clear helpers"
```

---

## Task 3: Seed demo data before render (`main.tsx`)

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Call the seeder before render**

In `src/main.tsx`, add this import near the other imports:

```ts
import { seedDemoIfNeeded } from './lib/demoData';
```

Then, immediately before `createRoot(document.getElementById('root')!).render(`, add:

```ts
// Guests see a populated app on first paint: seed demo data (once) before render,
// so the data hooks initialise from it. No-ops for signed-in/returning users.
try { seedDemoIfNeeded(); } catch { /* non-fatal: empty app still works */ }
```

- [ ] **Step 2: Build to verify wiring**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual check**

Run `npm run dev`, open a fresh/incognito tab at the dev URL. Expected: dashboard shows sample income + expenses (from demo). `localStorage.pesaflow_demo_seeded === '1'`.

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx
git commit -m "feat(guest): seed demo data before first render"
```

---

## Task 4: `guestMigration.ts` — collect non-demo data + push to cloud

**Files:**
- Create: `src/lib/guestMigration.ts`
- Test: `src/lib/guestMigration.test.ts`

- [ ] **Step 1: Write the failing test (pure collector)**

Create `src/lib/guestMigration.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { collectGuestData } from './guestMigration';
import { KEYS, seedDemoIfNeeded, type StorageLike } from './demoData';

const makeStore = (init: Record<string, string> = {}): StorageLike => {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => { m.set(k, v); },
    removeItem: (k) => { m.delete(k); },
  };
};

describe('collectGuestData', () => {
  it('drops demo items and keeps user items', () => {
    const store = makeStore();
    seedDemoIfNeeded(store);
    const expenses = [...JSON.parse(store.getItem(KEYS.expenses)!), { id: 'r1', isDemo: false }];
    store.setItem(KEYS.expenses, JSON.stringify(expenses));
    const out = collectGuestData(store);
    expect(out.expenses.map(e => e.id)).toEqual(['r1']);
    expect(out.goals).toEqual([]);   // only demo goal existed
    expect(out.bills).toEqual([]);   // only demo bill existed
  });

  it('excludes a demo profile but keeps a user profile', () => {
    const demoStore = makeStore();
    seedDemoIfNeeded(demoStore);
    expect(collectGuestData(demoStore).profile).toBeNull(); // demo income not migrated

    const userStore = makeStore({ [KEYS.profile]: JSON.stringify({ monthlyIncome: 30000, currency: 'KES' }) });
    expect(collectGuestData(userStore).profile?.monthlyIncome).toBe(30000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/guestMigration.test.ts`
Expected: FAIL — cannot resolve `./guestMigration`.

- [ ] **Step 3: Implement `src/lib/guestMigration.ts`**

```ts
import { syncCollection, syncDoc } from './sync';
import { stripDemo, KEYS, DEMO_FLAG, type StorageLike } from './demoData';
import type { Expense, Goal, Bill, FinancialProfile } from '../types';

const store = (): StorageLike => localStorage;
const readArray = <T>(s: StorageLike, key: string): T[] => {
  try { return JSON.parse(s.getItem(key) || '[]'); } catch { return []; }
};

export interface GuestPayload {
  expenses: Expense[];
  goals: Goal[];
  bills: Bill[];
  profile: FinancialProfile | null;
}

/** Pure: read localStorage, strip demo items, return only user-created data. */
export const collectGuestData = (s: StorageLike): GuestPayload => {
  let profile: FinancialProfile | null = null;
  try {
    const p = JSON.parse(s.getItem(KEYS.profile) || 'null') as (FinancialProfile & { isDemo?: boolean }) | null;
    profile = p && !p.isDemo ? p : null; // never migrate demo income
  } catch { profile = null; }
  return {
    expenses: stripDemo(readArray<Expense>(s, KEYS.expenses)),
    goals: stripDemo(readArray<Goal>(s, KEYS.goals)),
    bills: stripDemo(readArray<Bill>(s, KEYS.bills)),
    profile,
  };
};

/**
 * On a guest signing up / logging in, strip demo data locally and push the user's
 * real data to Firestore. Safe for returning users: a demo-only session yields empty
 * arrays (syncCollection no-ops), and their cloud data loads on the reload the caller
 * triggers afterwards. Best-effort: never throws to the caller.
 */
export const migrateGuestDataToAccount = async (s: StorageLike = store()): Promise<void> => {
  const { expenses, goals, bills, profile } = collectGuestData(s);
  // Persist the cleaned (demo-free) data locally so the post-reload app is clean.
  s.setItem(KEYS.expenses, JSON.stringify(expenses));
  s.setItem(KEYS.goals, JSON.stringify(goals));
  s.setItem(KEYS.bills, JSON.stringify(bills));
  s.setItem(KEYS.profile, JSON.stringify(profile ?? { monthlyIncome: 0, currency: 'KES' }));
  s.removeItem(DEMO_FLAG);
  try {
    if (expenses.length) await syncCollection('expenses', expenses);
    if (goals.length) await syncCollection('goals', goals);
    if (bills.length) await syncCollection('bills', bills);
    if (profile) await syncDoc('financialProfile', profile);
  } catch (e) {
    console.error('guest migration push failed (kept locally, will resync on edit):', e);
  }
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/guestMigration.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck + commit**

```bash
npx tsc -b
git add src/lib/guestMigration.ts src/lib/guestMigration.test.ts
git commit -m "feat(guest): collect + migrate non-demo guest data to the account"
```

---

## Task 5: `GuestBanner.tsx`

**Files:**
- Create: `src/components/GuestBanner.tsx`

- [ ] **Step 1: Implement the component**

```tsx
import React, { useEffect, useState } from 'react';

interface GuestBannerProps {
  hasRealData: boolean;       // guest has entered non-demo data
  onSignUp: () => void;
  onLogin: () => void;
  onAbout: () => void;
  onClearDemo: () => void;
}

const PROMPT_SHOWN = 'pesaflow_guest_prompt_shown';

export const GuestBanner: React.FC<GuestBannerProps> = ({ hasRealData, onSignUp, onLogin, onAbout, onClearDemo }) => {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('pesaflow_guest_banner_dismissed') === '1');
  const [showPrompt, setShowPrompt] = useState(false);

  // Smart prompt: once the guest has real data worth saving, nudge (only once/session).
  useEffect(() => {
    if (hasRealData && sessionStorage.getItem(PROMPT_SHOWN) !== '1') {
      setShowPrompt(true);
      sessionStorage.setItem(PROMPT_SHOWN, '1');
    }
  }, [hasRealData]);

  // Warn on leave only when there is unsaved real data.
  useEffect(() => {
    if (!hasRealData) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasRealData]);

  const dismiss = () => { setDismissed(true); sessionStorage.setItem('pesaflow_guest_banner_dismissed', '1'); };

  return (
    <>
      {!dismissed && (
        <div style={S.bar}>
          <span style={S.text}>You&apos;re exploring as a guest — sign up to save your data.</span>
          <span style={S.actions}>
            <button style={S.primary} onClick={onSignUp}>Sign up</button>
            <button style={S.link} onClick={onLogin}>Log in</button>
            <button style={S.link} onClick={onAbout}>About</button>
            <button style={S.link} onClick={onClearDemo}>Clear sample data</button>
            <button style={S.close} onClick={dismiss} aria-label="Dismiss">✕</button>
          </span>
        </div>
      )}

      {showPrompt && (
        <div style={S.overlay} role="dialog" aria-modal="true">
          <div style={S.backdrop} onClick={() => setShowPrompt(false)} />
          <div style={S.modal}>
            <div style={S.modalTitle}>Don&apos;t lose your data</div>
            <p style={S.modalBody}>You&apos;ve started tracking real money. Create a free account to save it — it stays yours, we never sell it.</p>
            <button style={{ ...S.primary, width: '100%', marginBottom: 8 }} onClick={onSignUp}>Sign up to save</button>
            <button style={S.link} onClick={() => setShowPrompt(false)}>Keep exploring</button>
          </div>
        </div>
      )}
    </>
  );
};

const S: Record<string, React.CSSProperties> = {
  bar: { position: 'sticky', top: 0, zIndex: 400, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 14px', background: 'var(--gold-dim)', borderBottom: '1px solid var(--border-acc)' },
  text: { fontSize: 13, color: 'var(--text-1)', fontWeight: 600 },
  actions: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  primary: { padding: '6px 12px', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  link: { background: 'transparent', border: 'none', color: 'var(--gold)', fontSize: 12, textDecoration: 'underline', cursor: 'pointer', padding: 0 },
  close: { background: 'transparent', border: 'none', color: 'var(--text-3)', fontSize: 14, cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  backdrop: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' },
  modal: { position: 'relative', background: 'var(--bg-card)', border: '1px solid var(--border-acc)', borderRadius: 16, padding: 24, maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: 'var(--shadow-lg)' },
  modalTitle: { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 },
  modalBody: { fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 16 },
};
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc -b
git add src/components/GuestBanner.tsx
git commit -m "feat(guest): GuestBanner with signup nudge + smart prompt"
```

---

## Task 6: Route signed-out visitors into the guest app (`App.tsx`)

**Files:**
- Modify: `src/App.tsx` (`MainApp`)

- [ ] **Step 1: Add imports, stage, and guest helpers**

At the top of `src/App.tsx`, add imports:

```tsx
import { GuestBanner } from './components/GuestBanner';
import { clearDemoData } from './lib/demoData';
```

Change the `AppStage` type to include `'about'`:

```tsx
type AppStage = 'landing' | 'about' | 'payment' | 'auth' | 'app';
```

- [ ] **Step 2: Compute guest state + hasRealData near the other derived values in `MainApp`**

After the hooks are set up (after `const alerts = useAlerts();`), add:

```tsx
  const isGuest = auth.status === 'signed-out';
  const hasRealData =
    monthlyExpenses.some(e => !e.isDemo) ||
    goals.goals.some(g => !g.isDemo) ||
    bills.bills.some(b => !b.isDemo);

  const goToAuth = (mode: 'login' | 'signup') => { setAuthMode(mode); setStage('auth'); };
  const handleClearDemo = () => { clearDemoData(); window.location.reload(); };
```

- [ ] **Step 3: Replace the landing/auth routing block**

Find the current block that renders the landing page for signed-out users:

```tsx
  if (auth.status === 'signed-out' && stage === 'landing') {
    return (
      <ThemeProvider>
        <LandingPage
          onSelectTier={(tier) => {
            if (tier !== 'free') return;
            setSelectedTier('free');
            setAuthMode('signup');
            setStage('auth');
          }}
          onLogin={() => { setAuthMode('login'); setStage('auth'); }}
        />
      </ThemeProvider>
    );
  }
```

Replace it with the About-page route (now triggered only by `stage === 'about'`):

```tsx
  // About page (the former landing page) — reachable from the guest banner.
  if (stage === 'about') {
    return (
      <ThemeProvider>
        <LandingPage
          onSelectTier={(tier) => { if (tier !== 'free') return; setSelectedTier('free'); goToAuth('signup'); }}
          onLogin={() => goToAuth('login')}
          onExplore={() => setStage('app')}
        />
      </ThemeProvider>
    );
  }
```

- [ ] **Step 4: Change the auth-gate guard so guests are NOT sent to AuthGate by default**

Find:

```tsx
  if (auth.status !== 'ready') {
    return (
      <ThemeProvider>
        <AuthGate
          ...
        />
      </ThemeProvider>
    );
  }
```

Change the condition so AuthGate only shows when the user explicitly went to auth (or is mid email-verify), NOT for a plain guest:

```tsx
  if (auth.status !== 'ready' && stage === 'auth') {
    return (
      <ThemeProvider>
        <AuthGate
          status={auth.status}
          onSignUp={auth.signUpWithEmail}
          onSignIn={auth.signInWithEmail}
          onGoogle={auth.signInWithGoogle}
          onSavePhone={auth.savePhone}
          onResendVerification={auth.resendVerification}
          onRefreshVerification={auth.refreshVerification}
          onSendPinReset={auth.sendPinReset}
          loading={auth.loading}
          error={auth.error}
          defaultMode={stage === 'payment' ? 'signup' : authMode}
        />
      </ThemeProvider>
    );
  }
```

Everything after this point (the main app render) now runs for BOTH `ready` users and guests.

- [ ] **Step 5: Render the GuestBanner at the top of the app tree**

Inside the final `return (<ThemeProvider><div ...>`, immediately after the opening `<div style={{ minHeight: '100vh', ... }}>`, add:

```tsx
      {isGuest && (
        <GuestBanner
          hasRealData={hasRealData}
          onSignUp={() => goToAuth('signup')}
          onLogin={() => goToAuth('login')}
          onAbout={() => setStage('about')}
          onClearDemo={handleClearDemo}
        />
      )}
```

- [ ] **Step 6: Guard signed-in-only chrome for guests**

The header's account actions (`onLock={auth.logout}`, `onLogout={auth.deleteAccount}`) and `<SupportChatWidget>` assume a profile. For a guest (`auth.profile` is null) these already handle null (`auth.profile?.name`, `{auth.profile && <SupportChatWidget .../>}`). Confirm the `<Header>` still renders with `userName={auth.profile?.name}` (undefined is fine) and `userTier={userTier}` (defaults to `'free'`). No change needed unless typecheck complains.

- [ ] **Step 7: Typecheck + build**

Run: `npx tsc -b && npm run build`
Expected: exit 0, build succeeds. (If `LandingPage` doesn't yet accept `onExplore`, Task 8 adds it — you can do Task 8 before this build, or temporarily omit `onExplore`.)

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx
git commit -m "feat(guest): default signed-out visitors into the app + GuestBanner; landing becomes About"
```

---

## Task 7: Migrate guest data on sign-in (`useAuth.ts`)

**Files:**
- Modify: `src/hooks/useAuth.ts`

- [ ] **Step 1: Import the migration + demo flag**

Add near the other imports in `src/hooks/useAuth.ts`:

```ts
import { migrateGuestDataToAccount } from '../lib/guestMigration';
import { DEMO_FLAG } from '../lib/demoData';
```

- [ ] **Step 2: Add a one-shot migration helper inside `useAuth`**

Add this near the other callbacks (it reads the current cached profile so `sync.ts` sees the new `uid`):

```ts
  // When a browser that started as a guest signs in/up, push the guest's real
  // (non-demo) data to the new account, then reload for one clean signed-in state.
  const migrateIfGuest = useCallback(async (p: UserProfile) => {
    if (!localStorage.getItem(DEMO_FLAG)) return; // browser didn't start as a guest
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); // ensure sync.ts sees the uid
    await migrateGuestDataToAccount();
    window.location.reload();
  }, []);
```

- [ ] **Step 3: Call it from the three sign-in success paths**

In `signUpWithEmail`, after `setStatus('ready');` (on success) — replace:

```ts
      setProfile(p);
      setStatus('ready');
```

with:

```ts
      setProfile(p);
      setStatus('ready');
      await migrateIfGuest(p);
```

In `completeGoogleSignIn`, after `setStatus('ready');`, add a migration call using the resolved profile:

```ts
  const completeGoogleSignIn = useCallback(async (user: User) => {
    const p = await ensureUserProfile(user);
    setProfile(p);
    setStatus('ready');
    await migrateIfGuest(p);
  }, [migrateIfGuest]);
```

In `signInWithEmail`, after `await resolveStatus(cred.user);` and before `return true;`, load the profile and migrate:

```ts
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pin);
      await resolveStatus(cred.user);
      const p = await loadUserDoc(cred.user.uid);
      if (p) await migrateIfGuest(p);
      return true;
```

> Note: `migrateGuestDataToAccount` strips demo items, so a returning user whose
> guest session held only demo data pushes nothing; the reload then loads their
> cloud data via each hook's mount fetch. A user who added real data as a guest
> keeps it (merged into their account).

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc -b && npm run build`
Expected: exit 0, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAuth.ts
git commit -m "feat(guest): migrate guest data to the account on sign-in, then reload"
```

---

## Task 8: About-page affordance in `LandingPage`

**Files:**
- Modify: `src/components/LandingPage.tsx`

- [ ] **Step 1: Add an optional `onExplore` prop and a button**

In `LandingPage`'s props interface, add:

```tsx
  onExplore?: () => void;
```

Destructure it in the component signature (e.g. `({ onSelectTier, onLogin, onExplore }) =>`). Then add a visible control near the top nav / hero — a button that returns to the app:

```tsx
        {onExplore && (
          <button
            onClick={onExplore}
            style={{ padding: '10px 18px', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
          >
            ← Back to the app
          </button>
        )}
```

Place it where the existing top-nav actions live (next to the Login button) so it's visible on load.

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc -b && npm run build`
Expected: exit 0, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/LandingPage.tsx
git commit -m "feat(guest): 'Back to the app' affordance on the About page"
```

---

## Task 9: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the whole suite + build**

```bash
npx tsc -b && npm run test && npm run build
```
Expected: typecheck exit 0; all vitest tests pass (incl. new demoData/guestMigration tests); build succeeds.

- [ ] **Step 2: Manual E2E — guest hook**

`npm run dev`, open an incognito tab:
- App loads straight into a **populated dashboard** (demo income + expenses), with the **GuestBanner** on top. No landing gate.
- Click **About** → landing page shows → **Back to the app** returns to the dashboard.

- [ ] **Step 3: Manual E2E — smart prompt + clear**

- Add a **real** expense (Expenses tab). The **smart-prompt modal** appears once.
- Click **Clear sample data** → page reloads → dashboard shows only your real expense; income shows 0.

- [ ] **Step 4: Manual E2E — signup migration**

- With one real expense present, **Sign up** (email). After signup the page reloads into the signed-in app showing **only your real expense** (no demo).
- In Firebase console (or via the app on another device), confirm `users/{uid}/expenses` contains the real item and **no `demo-*` items**.

- [ ] **Step 5: Manual E2E — returning user unaffected**

- Log out → you return to a guest app. Log in as an existing user → after reload you see that account's real cloud data (no demo, no duplication).

- [ ] **Step 6: Final commit (if any tweaks were needed)**

```bash
git add -A
git commit -m "test(guest): verification tweaks"
```

---

## Self-review notes (addressed)

- **Spec coverage:** entry routing (T6), demo seed (T2/T3), demo tag + strip (T1/T2/T4), clear (T2/T6), nudge banner + smart prompt + beforeunload (T5), migration incl. demo-profile exclusion + reload (T4/T7), About page (T6/T8), logout→guest (T6, inherent). ✓
- **Type consistency:** `StorageLike`, `KEYS`, `DEMO_FLAG`, `stripDemo`, `collectGuestData`, `migrateGuestDataToAccount`, `seedDemoIfNeeded`, `clearDemoData` used identically across tasks. ✓
- **Known limitation:** logout leaves data keys in localStorage (single-device assumption), documented in the spec.
