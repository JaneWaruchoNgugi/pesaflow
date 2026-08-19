# PesaFlow — Email + PIN & Google Sign-In (Auth Redesign)

**Date:** 2026-08-19
**Status:** Approved design, pending spec review
**Scope:** Replace phone + PIN registration/login with email + 6-digit PIN and Google Sign-In (web + Android + iOS). Fresh start — no migration of existing phone-keyed accounts.

---

## 1. Goals

- Users register and log in with **email + a 6-digit PIN**, or with a **Google account**.
- The 6-digit PIN **is** the Firebase email/password credential (6 digits meets Firebase's 6-character minimum), preserving the familiar numeric-pad UX with no custom auth server to maintain.
- **Google Sign-In works on web, Android, and iOS.**
- **Email verification is required** before an email/PIN user can use the app. Google users are verified automatically.
- **Phone number is still collected** (required) because M-Pesa subscription payments depend on it — but it is a profile field, not a login credential.

## 2. Non-goals

- No migration of existing phone+PIN accounts. This is a clean cutover.
- Admin authentication (`adminSignIn`, `useAdminAuth`, `AdminLogin`) is **unchanged** and out of scope.
- No change to the M-Pesa payment provider integration itself (only the user-doc keying it writes).

## 3. Security context

An automated security review flagged the existing `resetPin` Cloud Function (CRITICAL — Authentication Bypass / Account Takeover): it treated the account holder's **name** as an auth factor and returned a signed-in token from the reset endpoint.

This redesign **eliminates** that vulnerability rather than patching it:

- `authWithPin` and `resetPin` are **removed** from `functions/src/index.ts` (and regenerated out of `functions/lib/index.js` on the next build).
- PIN recovery is handled by **Firebase's `sendPasswordResetEmail`** — genuine possession proof (a link delivered to the verified inbox), and it does **not** return a signed-in session; the user sets a new PIN via the emailed link and then logs in normally.

## 4. Architecture

### 4.1 Source of truth
Firebase Authentication becomes the source of truth via `onAuthStateChanged`. Each authenticated user has a Firestore document at `users/{firebaseUid}`:

```
users/{firebaseUid} = {
  uid: string,               // === Firebase Auth UID
  name: string,
  email: string,
  phone: string,             // Kenyan format, collected at signup / after first Google sign-in
  authProvider: 'password' | 'google',
  tier: 'free' | ...,        // unchanged subscription fields
  subscriptionStatus, subscriptionStart, subscriptionExpiresAt, pendingTier, ...
  createdAt: string,
}
```

The PIN is **never** stored in Firestore — Firebase Auth holds the credential. The `pin`, `pinHash`, `pinSalt` fields are gone from the user profile.

### 4.2 Google Sign-In strategy (web + native)
**Firebase JS SDK + `@capacitor-firebase/authentication` plugin.** Email/PIN uses the Firebase JS SDK on every platform (works inside a WebView). Google:

- **Web:** `signInWithPopup(auth, new GoogleAuthProvider())`.
- **Native (Android/iOS):** the Capacitor Firebase Authentication plugin runs the *native* Google sign-in, returns an ID token, and we complete it in the JS SDK with `signInWithCredential(auth, GoogleAuthProvider.credential(idToken))`.

Both paths converge on the **same Firebase `User` object**, so `useAuth` has one unified code path. Platform is detected with Capacitor's `Capacitor.isNativePlatform()`.

## 5. Components & changes

### 5.1 `src/hooks/useAuth.ts` (rewrite)
Backed by `onAuthStateChanged`. Public surface:

- `signUpWithEmail(name, email, phone, pin)` — validate inputs → `createUserWithEmailAndPassword(auth, email, pin)` → `updateProfile({ displayName: name })` → `sendEmailVerification(user)` → write `users/{uid}` doc → surface **unverified** state.
- `signInWithEmail(email, pin)` — `signInWithEmailAndPassword`; on success load/refresh the user doc.
- `signInWithGoogle()` — platform-branched per §4.2; on first sign-in with no phone on file, surface **needs-phone** state.
- `sendPinReset(email)` — `sendPasswordResetEmail`.
- `resendVerification()` — `sendEmailVerification` on the current user.
- `savePhone(phone)` — for the post-Google add-phone step; writes phone to the user doc.
- `logout()` — `signOut`.
- State exposed: `profile`, `firebaseUser`, `status` (`'loading' | 'unverified' | 'needs-phone' | 'ready' | 'signed-out'`), `loading`, `error`.

Validation:
- Email: standard email regex / Firebase's own error surfaced.
- PIN: exactly `^\d{6}$`, with confirm-PIN match on signup.
- Phone: reuse the existing Kenyan validation `^0[17]\d{8}$` and `normalizePhone` (kept/exported from a shared util).

### 5.2 `src/components/AuthGate.tsx` (rewrite)
Reuse the existing visual language (card, tokens, `PinInput` component — widened to **6** cells). Screens:

- **Login:** email field, 6-digit `PinInput`, "Continue with Google" button, "Forgot PIN?" (→ `sendPinReset`).
- **Sign up:** name, email, phone (required), 6-digit PIN + confirm, "Continue with Google".
- **Verify email (interstitial):** shown while `status === 'unverified'`. Copy + "Resend email" + "I've verified — continue" (re-checks `user.reload()` / `emailVerified`).
- **Add phone (interstitial):** shown while `status === 'needs-phone'` (Google users with no phone). Single phone field → `savePhone`.

`PIN_LENGTH` constant changes `4 → 6`.

### 5.3 Data-key unification (correctness-critical)
Every place that derives a Firestore data key currently does `profile.uid || profile.phone`. With real Firebase UIDs these must all resolve to `profile.uid`:

- `src/App.tsx:415` currently keys a component by **phone only** — change to `profile.uid`.
- `src/App.tsx:232,434,468`, `src/hooks/useExpenses.ts:24`, `src/lib/sync.ts:7` — drop the `|| phone` fallbacks; standardize on `profile.uid`.
- `PaymentGate` / `AIChat` continue to receive `userId={profile.uid}`.

No data migration is required (fresh start), so standardizing is safe.

### 5.4 `functions/src/index.ts`
- **Remove** `authWithPin` and `resetPin` exports (closes the CRITICAL finding). Remove now-unused PIN-hash helpers if nothing else references them (`adminSignIn` keeps its own scrypt helpers).
- **Fix `initiateSubscriptionPayment`:** it currently writes `users/{userId}.phone = userId` (line ~212), which assumed userId === phone. Change it to write the **real phone** passed in (`phone: phone`) and keep the doc keyed by the Firebase UID passed as `userId`. Do not clobber the profile's phone.
- `adminSignIn`, payments, chat, newsletter functions: unchanged.
- Rebuild `functions/lib` so `functions/lib/index.js` no longer contains the removed endpoints.

### 5.5 `src/types.ts`
`UserProfile`: remove `pin`; make `uid` required; add `email: string` and `authProvider: 'password' | 'google'`; keep `phone: string`.

### 5.6 Firestore rules (`firestore.rules`)
Now that real Firebase UIDs exist, lock the user tree:

```
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
  match /{sub}/{docId}      { allow read, write: if request.auth != null && request.auth.uid == userId; }
  match /data/{docId}       { allow read, write: if request.auth != null && request.auth.uid == userId; }
}
```

Rules check `auth.uid == userId` only (not `email_verified`), because the user doc must be writable at signup *before* verification. UI-level gating enforces verification. Payments/chat use the Admin SDK and bypass rules — unaffected. Other collections in the current rules are left as-is in this change unless they reference the retired scheme.

## 6. Native configuration (prerequisites — done by the user in Firebase console / native projects)

Code will be wired for these; the console + keystore actions are the user's:

1. Firebase console → Authentication → enable **Email/Password** and **Google** providers.
2. Install plugin: `npm i @capacitor-firebase/authentication` then `npx cap sync`.
3. **Android:** add app SHA-1 (and SHA-256) fingerprints in Firebase; download updated `google-services.json` into `android/app/`.
4. **iOS:** download `GoogleService-Info.plist` into the iOS app; add the reversed-client-ID URL scheme to `Info.plist`.
5. Web OAuth client ID configured for the Google provider (used by `signInWithPopup`).

These are documented as a checklist in the implementation plan; the app cannot exercise native Google until they're complete (web Google + email/PIN work without them).

## 7. Known tradeoffs

- **6-digit PIN as a Firebase password:** the reset/verification pages are Firebase's default hosted handlers, which present a generic text field (they don't render a 6-digit pad and won't enforce numeric-only on the reset screen). Acceptable for launch; a custom email-action handler page can be added later to enforce a 6-digit PIN and match branding.
- **Brute-force surface:** a 6-digit numeric credential is ~1,000,000 combinations, protected by Firebase's built-in identity-toolkit throttling. Stronger than the retired 4-digit custom scheme; if stricter protection is wanted later, add App Check.

## 8. Testing

- **Unit:** PIN validation (`^\d{6}$` + confirm match), Kenyan phone validation, and the Google provider platform-branch selection (native vs web).
- **Manual (per TDD verification):**
  1. Email signup → verification email received → gate clears after verifying.
  2. Email login with correct / wrong PIN.
  3. Forgot PIN → reset email → new PIN → login.
  4. Google sign-in on web → add-phone interstitial → app.
  5. Google sign-in on Android and iOS builds.
  6. Firestore rules: a signed-in user can only read/write their own `users/{uid}` tree.

## 9. Out of scope / follow-ups

- Custom-branded verification/reset action handler pages.
- App Check hardening.
- Optionally switching `initiateStkPush` / `chatWithAdvisor` to trust `request.auth.uid` instead of a client-passed `userId` (defense-in-depth; not required for this change).
