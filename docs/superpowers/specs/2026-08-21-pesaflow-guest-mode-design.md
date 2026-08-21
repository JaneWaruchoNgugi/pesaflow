# PesaFlow — Guest Mode + Demo Hook (Design)

**Date:** 2026-08-21
**Status:** Approved (pending spec review)

## Problem

New visitors must sign up / log in before they can see what PesaFlow does,
and the landing page carries too much marketing copy. This kills first-visit
conversion. We want to **hook visitors instantly** by dropping them straight
into a working app pre-filled with sample data, then invite them to sign up to
**save** their data.

## Goals

- A signed-out visitor lands **directly in the live app** (no landing-page gate).
- The app opens **pre-filled with realistic Kenyan demo data** so value is instant.
- Guests can use the **entire app**; data persists locally in the browser.
- A **well-timed, non-annoying nudge** invites signup to save data.
- On signup, the guest's **own** data migrates to their account — **demo data never does**.
- The existing landing page is **preserved as an "About" page**, reachable via a link.

## Non-goals

- No change to the Firestore data model or the sync layer's contracts.
- No new backend / Cloud Functions.
- No trimming/redesign of the landing page content (kept as-is for the About page).
- No account-level "guest → user" server migration; migration is client-side using
  the existing local-first data + `sync.ts`.

## Background: why this is cheap

The app is already **local-first**:

- Every data hook (`useExpenses`, `useGoals`, `useBills`, `useNetWorth`,
  `useInvestments`, `useEmergencyFund`, `useHabits`, `useAlerts`) reads/writes
  `localStorage` (`finwise_*` keys) as the primary store.
- `src/lib/sync.ts` derives the `uid` from the cached `finwise_auth_profile`.
  With **no uid, all Firestore reads/writes no-op** (`syncCollection` warns and
  returns; `fetchCollection` returns `null`).

So a guest (no `uid`) already gets a fully working, browser-local app for free.
The work is **routing, demo seeding, the signup nudge, and migration-on-signup.**

## Architecture

### 1. Routing (`src/App.tsx` → `MainApp`)

Add an `AppStage` value `'about'`. New precedence for a signed-out visitor is
**guest app by default** (was: landing page):

- `auth.status === 'loading'` → splash (unchanged)
- `stage === 'about'` → `<LandingPage>` (now the About page)
- `stage === 'auth'` → `<AuthGate>` (signup/login)
- `auth.status === 'ready'` → real app (unchanged)
- `auth.status === 'signed-out'` (and not about/auth) → **guest app** (new default)

The signed-in and guest paths render the **same** app tree (`<Header>`, `<main>`,
views, `<footer>`). The only difference is the **GuestBanner** overlay and the
data source (local only, no uid).

`LandingPage`'s existing callbacks map to stages:
- `onLogin` → `setAuthMode('login'); setStage('auth')`
- `onSelectTier(free)` → `setAuthMode('signup'); setStage('auth')`
- add an `onExplore`/back affordance → `setStage('app')` to return to the guest app.

Admin route (`/admin`, `?__admin`) is unchanged (handled by the `App` wrapper before `MainApp`).

### 2. Guest detection

A "guest" is simply: `auth.status === 'signed-out'` while viewing the app
(`stage !== 'about' && stage !== 'auth'`). No new persisted flag is required for
routing. A separate localStorage flag tracks demo seeding (below).

### 3. Demo data seeding (`src/lib/demoData.ts`, new)

On first guest visit, seed realistic sample data so the dashboard is alive:

- **Trigger:** on app mount, if `auth.status === 'signed-out'` AND
  `localStorage['pesaflow_demo_seeded']` is not set AND the data keys are empty.
- **Seed:** write to the existing `finwise_*` keys:
  - `finwise_profile` — monthly income (e.g. KES 45,000; or a daily-hustle example)
  - `finwise_expenses` — ~5 items (fare, bundles, lunch, a betting entry, airtime),
    each tagged `isDemo: true`
  - `finwise_goals` — one goal, e.g. "Plot deposit", tagged `isDemo: true`
  - `finwise_bills` — one recurring bill (rent), tagged `isDemo: true`
- Set `localStorage['pesaflow_demo_seeded'] = '1'` so we never re-seed.
- **Mechanism (explicit):** seeding runs in a top-level effect in `MainApp` **only
  once `auth.status === 'signed-out'`** (so we never seed for a returning signed-in
  user, whose status is `'loading'` until the session restores) AND
  `pesaflow_demo_seeded` is unset. It writes the `finwise_*` keys, sets the flag,
  then triggers **one** `window.location.reload()`. On reload the flag is set, so we
  don't re-seed, and the hooks initialise from the now-populated localStorage. The
  reload happens at most once, ever, on a first-time guest visit.

**`isDemo` tag:** add an optional `isDemo?: boolean` to the relevant item types
(`Expense`, `Goal`, `Bill`). It is (a) how "Clear sample data" finds demo items
and (b) how migration strips them.

### 4. "Clear & add yours"

A control in the demo notice / GuestBanner that:
- Removes all `isDemo` items from every seeded `finwise_*` key (leaving
  user-added items untouched), and
- Resets `finwise_profile` income to 0 (or leaves it — see review note),
so the guest starts entering their own data. `pesaflow_demo_seeded` stays set
(don't re-seed).

### 5. Signup nudge (`src/components/GuestBanner.tsx`, new)

Rendered only in guest mode (signed-out, in-app):

- **Always:** a slim, dismissible top banner — "You're exploring as a guest.
  **Sign up to save your data.**" with **Sign up** / **Log in** / **About** links.
  Dismissal is per-session (`sessionStorage`), so it returns next visit.
- **Smart prompt (modal):** shown once, when the guest has entered **real**
  (non-`isDemo`) data, OR on `beforeunload`/tab-hide — "Don't lose your data —
  sign up to save it." Buttons: **Sign up** / **Keep exploring**. Tracked with a
  `sessionStorage` flag so it doesn't nag repeatedly.

### 6. Migration on signup (`src/lib/guestMigration.ts`, new)

When a guest completes **signup or first login**:

1. Read each `finwise_*` collection from localStorage.
2. **Strip all `isDemo` items** (fake data never enters a real account).
3. Also clear the stripped demo items from localStorage so the real session is clean.
4. Push the remaining user-created items to Firestore via `sync.ts`
   (`syncCollection('expenses', ...)`, etc.) and the profile via
   `syncDoc('financialProfile', ...)`. Both helpers already exist and derive the
   new `uid` from the freshly-written `finwise_auth_profile` cache.
5. Clear `pesaflow_demo_seeded`.

Hook point: in `useAuth`, after a successful `signUpWithEmail` / Google
`completeGoogleSignIn` / email `signInWithEmail` that transitions a
previously-guest session to a real `uid`. The migration runs once, guarded so a
normal returning login (that already had a uid / cloud data) does not double-push.

> Note: `sync.ts` already exposes `syncCollection` (local→cloud, subcollections)
> and `syncDoc` (local→cloud, `users/{uid}/data/{name}`). Migration reuses both —
> no new Firestore shapes or sync code.

### 7. Logout

`logout` returns the user to **guest mode** (the app), not a dead end. User data
keys are left in localStorage as today (acceptable for single-user devices; noted
as a known limitation).

## Components / files

**New**
- `src/lib/demoData.ts` — sample dataset + `seedDemoIfNeeded()` + `clearDemoData()`.
- `src/lib/guestMigration.ts` — `migrateGuestDataToAccount()` (strip demo, push local→cloud).
- `src/components/GuestBanner.tsx` — banner + smart-prompt modal.

**Modified**
- `src/App.tsx` — `AppStage` adds `'about'`; routing precedence (guest app default);
  render `<GuestBanner>` in guest mode; seed demo on mount; wire About link.
- `src/hooks/useAuth.ts` — call `migrateGuestDataToAccount()` on guest→account transition.
- `src/types/index.ts` — add optional `isDemo?: boolean` to `Expense`, `Goal`, `Bill`.
- `src/components/LandingPage.tsx` — add a "back to app / explore" affordance (as About page).
- `src/lib/sync.ts` — **no change needed**; `syncCollection`, `syncDoc`,
  `deleteFromCollection`, `fetchCollection`, `fetchDoc` already cover migration.

## Data flow

**First visit (guest):** mount → `seedDemoIfNeeded()` writes demo to `finwise_*` →
hooks render populated dashboard → GuestBanner shows. No network.

**Guest edits:** hooks write localStorage (no uid → no cloud). If the edit is a
new real item, the smart-prompt becomes eligible.

**Signup from guest:** `AuthGate` → `useAuth` creates account → `uid` now exists →
`migrateGuestDataToAccount()` strips demo, pushes real data to
`users/{uid}/...` → app continues as `ready` with the user's data intact.

**Returning real user:** unchanged — loads cloud→local as today.

## Error handling

- Demo seeding is best-effort and wrapped in try/catch; failure just yields an
  empty app (still usable).
- Migration failures are logged and non-blocking: the local data remains, the
  user is still signed in, and normal per-mutation sync will retry on next edit.
  Never block signup on a migration error.
- `beforeunload` prompt uses the standard browser mechanism; if blocked, the
  always-on banner still covers the ask.

## Testing

- **Unit:** `demoData` seeds only when empty/unseeded; `clearDemoData` removes only
  `isDemo` items and preserves user items; `guestMigration` strips `isDemo` and
  returns only user-created items to push.
- **Manual/E2E:** fresh browser → lands in populated guest app; add a real expense →
  smart prompt appears; sign up → dashboard shows the real expense only (no demo);
  Firestore `users/{uid}/expenses` contains the real item and no demo items;
  About link opens the landing page and back returns to the app; returning login
  is unaffected.

## Open questions (resolved defaults)

- **Demo carry-over:** never — `isDemo` stripped on signup. (resolved)
- **Clear behavior:** explicit "Clear & add yours" wipes demo instantly; no
  auto-clear on first edit. (resolved)
- **Income on clear:** reset to 0 vs keep — default reset to 0 (treat income as
  demo too); revisit if it feels abrupt.
