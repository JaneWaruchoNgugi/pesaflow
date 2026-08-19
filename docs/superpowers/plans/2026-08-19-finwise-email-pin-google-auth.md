# Email + PIN & Google Sign-In — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace phone+PIN auth with email + 6-digit PIN and Google Sign-In (web + Android + iOS), keying all user data on the Firebase Auth UID.

**Architecture:** Firebase Authentication is the source of truth via `onAuthStateChanged`. The 6-digit PIN IS the Firebase email/password credential. Google uses `signInWithPopup` on web and the `@capacitor-firebase/authentication` plugin on native, both converging on one Firebase `User`. Email verification is required; phone is a required profile field for M-Pesa. The legacy PIN Cloud Functions are removed (closing a CRITICAL security finding), and Firestore user rules are locked to `request.auth.uid == userId`.

**Tech Stack:** React 19, Vite, TypeScript, Firebase JS SDK v12, Capacitor 6, `@capacitor-firebase/authentication`, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-19-finwise-email-pin-google-auth-design.md`

---

## File map

- Create: `src/lib/authValidation.ts` — pure email/PIN/phone validators + `normalizePhone` (single source of truth).
- Create: `src/lib/authValidation.test.ts` — unit tests for validators.
- Create: `src/lib/authErrors.ts` — maps Firebase Auth error codes to user-facing messages.
- Create: `src/lib/authErrors.test.ts` — unit tests for the mapper.
- Create: `vitest.config.ts` — test runner config.
- Create: `docs/NATIVE_AUTH_SETUP.md` — Firebase console + native config checklist.
- Rewrite: `src/hooks/useAuth.ts` — Firebase-native auth hook.
- Rewrite: `src/components/AuthGate.tsx` — email/PIN + Google UI, 6-digit pad, verify + add-phone screens.
- Modify: `src/App.tsx` — wire the new auth surface; unify data keys on `profile.uid`.
- Modify: `src/hooks/useExpenses.ts:24`, `src/lib/sync.ts:7` — key on `profile.uid`.
- Modify: `src/types.ts` — `UserProfile` (drop `pin`, add `email`/`authProvider`, require `uid`).
- Modify: `functions/src/index.ts` — remove `authWithPin`/`resetPin`; fix `initiateSubscriptionPayment` phone write.
- Modify: `firestore.rules` — lock `users/{userId}` to the signed-in UID.
- Modify: `package.json` — add `test` script + Vitest dev deps; add `@capacitor-firebase/authentication`.

---

## Task 1: Add Vitest test tooling

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Vitest**

Run:
```bash
cd /home/jane-ngugi/Documents/Desktop/finwise
npm i -D vitest
```
Expected: `vitest` added to devDependencies.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Add the test script to `package.json`**

In the `"scripts"` block, add:
```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 4: Verify the runner starts (no tests yet)**

Run: `npm test`
Expected: Vitest runs and reports "No test files found" (exit is fine) — the runner is wired.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest test runner"
```

---

## Task 2: Auth validation module (TDD)

**Files:**
- Create: `src/lib/authValidation.test.ts`
- Create: `src/lib/authValidation.ts`

- [ ] **Step 1: Write the failing tests**

`src/lib/authValidation.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidPin, isValidKenyanPhone, normalizePhone } from './authValidation';

describe('isValidEmail', () => {
  it('accepts a normal email', () => expect(isValidEmail('a@b.com')).toBe(true));
  it('rejects missing @', () => expect(isValidEmail('ab.com')).toBe(false));
  it('rejects empty', () => expect(isValidEmail('')).toBe(false));
  it('trims surrounding spaces', () => expect(isValidEmail('  a@b.com ')).toBe(true));
});

describe('isValidPin', () => {
  it('accepts exactly 6 digits', () => expect(isValidPin('123456')).toBe(true));
  it('rejects 4 digits', () => expect(isValidPin('1234')).toBe(false));
  it('rejects 7 digits', () => expect(isValidPin('1234567')).toBe(false));
  it('rejects non-numeric', () => expect(isValidPin('12a456')).toBe(false));
});

describe('isValidKenyanPhone', () => {
  it('accepts 07xxxxxxxx', () => expect(isValidKenyanPhone('0712345678')).toBe(true));
  it('accepts 01xxxxxxxx', () => expect(isValidKenyanPhone('0110123456')).toBe(true));
  it('accepts spaced input', () => expect(isValidKenyanPhone('0712 345 678')).toBe(true));
  it('accepts +254 form', () => expect(isValidKenyanPhone('+254712345678')).toBe(true));
  it('rejects too short', () => expect(isValidKenyanPhone('07123')).toBe(false));
});

describe('normalizePhone', () => {
  it('keeps 0-prefixed form', () => expect(normalizePhone('0712345678')).toBe('0712345678'));
  it('converts 254 form', () => expect(normalizePhone('254712345678')).toBe('0712345678'));
  it('converts +254 form', () => expect(normalizePhone('+254712345678')).toBe('0712345678'));
  it('strips spaces', () => expect(normalizePhone('0712 345 678')).toBe('0712345678'));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/authValidation.test.ts`
Expected: FAIL — "Cannot find module './authValidation'".

- [ ] **Step 3: Implement `src/lib/authValidation.ts`**

```ts
// Single source of truth for auth input validation + phone normalization.

export const normalizePhone = (phone: string): string => {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  if (/^0\d{9}$/.test(digits)) return digits;
  if (/^254\d{9}$/.test(digits)) return '0' + digits.slice(3);
  if (/^\+254\d{9}$/.test(digits)) return '0' + digits.slice(4);
  return String(phone || '').replace(/\s+/g, '');
};

// Kenyan mobile numbers start with 07 (Safaricom/Airtel) or 01 (e.g. 011x).
export const isValidKenyanPhone = (phone: string): boolean =>
  /^0[17]\d{8}$/.test(normalizePhone(phone));

export const isValidPin = (pin: string): boolean => /^\d{6}$/.test(pin);

export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/authValidation.test.ts`
Expected: PASS — all cases green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/authValidation.ts src/lib/authValidation.test.ts
git commit -m "feat: add auth validation utils (email, 6-digit PIN, Kenyan phone)"
```

---

## Task 3: Firebase Auth error mapping (TDD)

**Files:**
- Create: `src/lib/authErrors.test.ts`
- Create: `src/lib/authErrors.ts`

- [ ] **Step 1: Write the failing tests**

`src/lib/authErrors.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { mapAuthError } from './authErrors';

describe('mapAuthError', () => {
  it('maps email-already-in-use', () => {
    expect(mapAuthError({ code: 'auth/email-already-in-use' }, 'fallback'))
      .toBe('An account already exists for this email. Please log in.');
  });
  it('maps invalid-credential to a generic wrong email/PIN', () => {
    expect(mapAuthError({ code: 'auth/invalid-credential' }, 'fallback'))
      .toBe('Wrong email or PIN.');
  });
  it('maps wrong-password to the same generic message', () => {
    expect(mapAuthError({ code: 'auth/wrong-password' }, 'fallback'))
      .toBe('Wrong email or PIN.');
  });
  it('maps too-many-requests', () => {
    expect(mapAuthError({ code: 'auth/too-many-requests' }, 'fallback'))
      .toBe('Too many attempts. Please wait a moment and try again.');
  });
  it('maps popup-closed to a friendly cancel message', () => {
    expect(mapAuthError({ code: 'auth/popup-closed-by-user' }, 'fallback'))
      .toBe('Google sign-in was cancelled.');
  });
  it('returns the fallback for unknown codes', () => {
    expect(mapAuthError({ code: 'auth/whatever' }, 'fallback')).toBe('fallback');
  });
  it('returns the fallback for non-error input', () => {
    expect(mapAuthError(null, 'fallback')).toBe('fallback');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/authErrors.test.ts`
Expected: FAIL — "Cannot find module './authErrors'".

- [ ] **Step 3: Implement `src/lib/authErrors.ts`**

```ts
// Maps Firebase Auth error codes to user-facing copy. Login failures use one
// generic message ("Wrong email or PIN") to avoid account-existence enumeration.

const MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'An account already exists for this email. Please log in.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/invalid-credential': 'Wrong email or PIN.',
  'auth/wrong-password': 'Wrong email or PIN.',
  'auth/user-not-found': 'Wrong email or PIN.',
  'auth/weak-password': 'PIN must be exactly 6 digits.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
  'auth/cancelled-popup-request': 'Google sign-in was cancelled.',
};

export const mapAuthError = (err: unknown, fallback: string): string => {
  const code = (err as { code?: string })?.code;
  return (code && MESSAGES[code]) || fallback;
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/authErrors.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/authErrors.ts src/lib/authErrors.test.ts
git commit -m "feat: add Firebase auth error message mapper"
```

---

## Task 4: Update `UserProfile` type

**Files:**
- Modify: `src/types.ts:228-243`

- [ ] **Step 1: Replace the `UserProfile` interface**

Find (starts at line 228):
```ts
export interface UserProfile {
  uid?: string;
  name: string;
  phone: string;
  pin: string;
  createdAt: string;
  tier: SubscriptionTier;
```
Replace the top of the interface with:
```ts
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  authProvider: 'password' | 'google';
  createdAt: string;
  tier: SubscriptionTier;
```
Leave the remaining optional subscription fields (`blacklisted`, `subscriptionStatus`, `pendingTier`, `previousTier`, `subscriptionExpiredAt`, `subscriptionExpiresAt`, `subscriptionStart`) unchanged.

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: Errors ONLY in `src/hooks/useAuth.ts`, `src/components/AuthGate.tsx`, and `src/App.tsx` (they still reference `pin` / the old surface). These are fixed in Tasks 6–9. No errors elsewhere.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: UserProfile uses email + authProvider, drops pin"
```

---

## Task 5: Install the native Google auth plugin

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the plugin**

Run:
```bash
cd /home/jane-ngugi/Documents/Desktop/finwise
npm i @capacitor-firebase/authentication
```
Expected: `@capacitor-firebase/authentication` added to dependencies.

- [ ] **Step 2: Sync Capacitor (safe to run even before native config)**

Run: `npx cap sync`
Expected: Completes; it copies the web build and registers the plugin for android/ios. (Full native Google won't work until `docs/NATIVE_AUTH_SETUP.md` steps in Task 12 are done, but the JS build is unaffected.)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @capacitor-firebase/authentication plugin"
```

---

## Task 6: Rewrite `useAuth` on Firebase-native auth

**Files:**
- Rewrite: `src/hooks/useAuth.ts`

- [ ] **Step 1: Replace the entire file contents**

```ts
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  deleteUser,
  type User,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { db, auth } from '../lib/firebase';
import { isValidEmail, isValidPin, isValidKenyanPhone, normalizePhone } from '../lib/authValidation';
import { mapAuthError } from '../lib/authErrors';
import type { UserProfile } from '../types';

// 'loading'   — resolving the persisted Firebase session
// 'signed-out'— no user
// 'unverified'— email/PIN user who has not verified their email
// 'needs-phone'— signed in (usually via Google) but no phone on file for M-Pesa
// 'ready'     — fully signed in with a complete profile
export type AuthStatus = 'loading' | 'signed-out' | 'unverified' | 'needs-phone' | 'ready';

const loadUserDoc = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
};

const isGoogleUser = (user: User): boolean =>
  user.providerData.some((p) => p.providerId === 'google.com');

export const useAuth = () => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derives the correct gate state from a Firebase user + their Firestore doc.
  const resolveStatus = useCallback(async (user: User | null) => {
    if (!user) { setProfile(null); setStatus('signed-out'); return; }
    if (!isGoogleUser(user) && !user.emailVerified) { setStatus('unverified'); return; }
    const p = await loadUserDoc(user.uid);
    setProfile(p);
    setStatus(p?.phone ? 'ready' : 'needs-phone');
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      try { await resolveStatus(user); }
      catch (e) { console.error('resolveStatus failed', e); setStatus(user ? 'needs-phone' : 'signed-out'); }
    });
    return unsub;
  }, [resolveStatus]);

  const signUpWithEmail = useCallback(async (name: string, email: string, phone: string, pin: string) => {
    setError(null);
    if (!name.trim()) { setError('Enter your name.'); return; }
    if (!isValidEmail(email)) { setError('Enter a valid email address.'); return; }
    if (!isValidKenyanPhone(phone)) { setError('Enter a valid Kenyan phone number, e.g. 0712 345 678.'); return; }
    if (!isValidPin(pin)) { setError('PIN must be exactly 6 digits.'); return; }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pin);
      await updateProfile(cred.user, { displayName: name.trim() });
      const now = new Date().toISOString();
      const p: UserProfile = {
        uid: cred.user.uid,
        name: name.trim(),
        email: email.trim(),
        phone: normalizePhone(phone),
        authProvider: 'password',
        tier: 'free',
        subscriptionStatus: 'active',
        createdAt: now,
      };
      await setDoc(doc(db, 'users', cred.user.uid), p);
      await sendEmailVerification(cred.user);
      setProfile(p);
      setStatus('unverified');
    } catch (e) {
      setError(mapAuthError(e, 'Could not create account. Check your connection.'));
    } finally { setLoading(false); }
  }, []);

  const signInWithEmail = useCallback(async (email: string, pin: string): Promise<boolean> => {
    setError(null);
    if (!isValidEmail(email)) { setError('Enter a valid email address.'); return false; }
    if (!isValidPin(pin)) { setError('PIN must be exactly 6 digits.'); return false; }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pin);
      await resolveStatus(cred.user);
      return true;
    } catch (e) {
      setError(mapAuthError(e, 'Wrong email or PIN.'));
      return false;
    } finally { setLoading(false); }
  }, [resolveStatus]);

  // Web: Firebase popup. Native: the Capacitor Firebase Auth plugin performs the
  // native Google flow, then we complete it in the JS SDK via signInWithCredential
  // so both platforms share one Firebase User.
  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    setError(null);
    setLoading(true);
    try {
      let user: User;
      if (Capacitor.isNativePlatform()) {
        const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
        const result = await FirebaseAuthentication.signInWithGoogle();
        const idToken = result.credential?.idToken;
        if (!idToken) throw new Error('No Google credential returned.');
        const credential = GoogleAuthProvider.credential(idToken);
        user = (await signInWithCredential(auth, credential)).user;
      } else {
        user = (await signInWithPopup(auth, new GoogleAuthProvider())).user;
      }
      let p = await loadUserDoc(user.uid);
      if (!p) {
        const now = new Date().toISOString();
        p = {
          uid: user.uid,
          name: user.displayName || 'PesaFlow User',
          email: user.email || '',
          phone: '',
          authProvider: 'google',
          tier: 'free',
          subscriptionStatus: 'active',
          createdAt: now,
        };
        await setDoc(doc(db, 'users', user.uid), p);
      }
      setProfile(p);
      setStatus(p.phone ? 'ready' : 'needs-phone');
      return true;
    } catch (e) {
      setError(mapAuthError(e, 'Google sign-in failed. Please try again.'));
      return false;
    } finally { setLoading(false); }
  }, []);

  // Used by the post-Google "add phone" step.
  const savePhone = useCallback(async (phone: string): Promise<boolean> => {
    setError(null);
    if (!isValidKenyanPhone(phone)) { setError('Enter a valid Kenyan phone number, e.g. 0712 345 678.'); return false; }
    const user = auth.currentUser;
    if (!user) { setError('You are not signed in.'); return false; }
    setLoading(true);
    try {
      const normalized = normalizePhone(phone);
      await setDoc(doc(db, 'users', user.uid), { phone: normalized }, { merge: true });
      setProfile((prev) => (prev ? { ...prev, phone: normalized } : prev));
      setStatus('ready');
      return true;
    } catch {
      setError('Could not save your phone. Check your connection.');
      return false;
    } finally { setLoading(false); }
  }, []);

  const resendVerification = useCallback(async () => {
    if (auth.currentUser) {
      try { await sendEmailVerification(auth.currentUser); }
      catch (e) { setError(mapAuthError(e, 'Could not resend the email. Try again shortly.')); }
    }
  }, []);

  // Re-checks emailVerified after the user clicks the link in their inbox.
  const refreshVerification = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    await user.reload();
    await resolveStatus(auth.currentUser);
  }, [resolveStatus]);

  const sendPinReset = useCallback(async (email: string): Promise<boolean> => {
    setError(null);
    if (!isValidEmail(email)) { setError('Enter a valid email address.'); return false; }
    setLoading(true);
    try { await sendPasswordResetEmail(auth, email.trim()); return true; }
    catch (e) { setError(mapAuthError(e, 'Could not send the reset email.')); return false; }
    finally { setLoading(false); }
  }, []);

  // Re-reads the profile doc (e.g. after a subscription payment activates a tier).
  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    const user = auth.currentUser;
    if (!user) return null;
    const p = await loadUserDoc(user.uid);
    if (p) setProfile(p);
    return p;
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setProfile(null);
    setStatus('signed-out');
  }, []);

  const deleteAccount = useCallback(async () => {
    const user = auth.currentUser;
    try { if (user) await deleteDoc(doc(db, 'users', user.uid)); } catch { /* best effort */ }
    [ 'finwise_expenses', 'finwise_investments', 'finwise_goals', 'finwise_bills', 'finwise_networth' ]
      .forEach((k) => localStorage.removeItem(k));
    try { if (user) await deleteUser(user); } catch { await signOut(auth).catch(() => {}); }
    setProfile(null);
    setStatus('signed-out');
  }, []);

  return {
    firebaseUser, profile, status, loading, error,
    signUpWithEmail, signInWithEmail, signInWithGoogle, savePhone,
    resendVerification, refreshVerification, sendPinReset,
    refreshProfile, logout, deleteAccount,
  };
};
```

- [ ] **Step 2: Type-check the hook**

Run: `npx tsc -b --noEmit`
Expected: `useAuth.ts` is now clean. Remaining errors only in `AuthGate.tsx` and `App.tsx` (fixed in Tasks 7–9).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAuth.ts
git commit -m "feat: Firebase-native useAuth (email+PIN, Google, verify, add-phone)"
```

---

## Task 7: Rewrite `AuthGate` (email/PIN + Google, 6-digit)

**Files:**
- Rewrite: `src/components/AuthGate.tsx`

- [ ] **Step 1: Replace the entire file contents**

```tsx
import React, { useState, useRef, useEffect } from 'react';

interface AuthGateProps {
  status: 'signed-out' | 'unverified' | 'needs-phone';
  onSignUp: (name: string, email: string, phone: string, pin: string) => void;
  onSignIn: (email: string, pin: string) => Promise<boolean>;
  onGoogle: () => Promise<boolean>;
  onSavePhone: (phone: string) => Promise<boolean>;
  onResendVerification: () => void;
  onRefreshVerification: () => void;
  onSendPinReset: (email: string) => Promise<boolean>;
  loading?: boolean;
  error?: string | null;
  defaultMode?: 'login' | 'signup';
}

const PIN_LENGTH = 6;

const PinInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  error: boolean;
  autoFocus?: boolean;
}> = ({ value, onChange, onComplete, error, autoFocus }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH);
    onChange(v);
    if (v.length === PIN_LENGTH) onComplete?.(v);
  };

  return (
    <div style={{ position: 'relative', marginBottom: 4 }} onClick={() => inputRef.current?.focus()}>
      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', top: 0, left: 0, cursor: 'pointer' }}
        autoFocus={autoFocus}
      />
      <div style={{ display: 'flex', gap: 9, justifyContent: 'center', padding: '12px 0' }}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div key={i} style={{
            width: 46, height: 52, borderRadius: 14,
            background: error ? 'rgba(220,38,38,0.08)' : i < value.length ? 'rgba(167,139,250,0.18)' : 'rgba(167,139,250,0.10)',
            border: `2px solid ${error ? 'rgba(220,38,38,0.4)' : i < value.length ? 'rgba(167,139,250,0.7)' : 'rgba(167,139,250,0.35)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
          }}>
            {i < value.length && <div style={{ width: 9, height: 9, borderRadius: '50%', background: error ? 'var(--red)' : '#A78BFA' }} />}
          </div>
        ))}
      </div>
    </div>
  );
};

const GoogleButton: React.FC<{ onClick: () => void; disabled?: boolean; label: string }> = ({ onClick, disabled, label }) => (
  <button type="button" style={S.googleBtn} disabled={disabled} onClick={onClick}>
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 34.9 26.7 36 24 36c-5.3 0-9.7-2.6-11.3-6.9l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C39.9 36 44 30.6 44 24c0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
    {label}
  </button>
);

export const AuthGate: React.FC<AuthGateProps> = ({
  status, onSignUp, onSignIn, onGoogle, onSavePhone,
  onResendVerification, onRefreshVerification, onSendPinReset,
  loading, error: authError, defaultMode,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode ?? 'signup');

  // Signup
  const [name, setName] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPhone, setSuPhone] = useState('');
  const [suPin, setSuPin] = useState('');
  const [suConfirm, setSuConfirm] = useState('');
  const [suStep, setSuStep] = useState<'info' | 'pin' | 'confirm'>('info');
  const [suErr, setSuErr] = useState('');

  // Login
  const [liEmail, setLiEmail] = useState('');
  const [liPin, setLiPin] = useState('');
  const [liStep, setLiStep] = useState<'email' | 'pin' | 'reset'>('email');
  const [liErr, setLiErr] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Add-phone
  const [phoneOnly, setPhoneOnly] = useState('');
  const [phoneErr, setPhoneErr] = useState('');

  const handleSignupInfoContinue = () => {
    setSuErr('');
    if (!name.trim()) { setSuErr('Enter your name.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(suEmail.trim())) { setSuErr('Enter a valid email address.'); return; }
    if (!/^0[17]\d{8}$/.test(suPhone.replace(/[^\d+]/g, '').replace(/^\+?254/, '0'))) {
      setSuErr('Enter a valid Kenyan phone number, e.g. 0712 345 678 or 0110 123 456.');
      return;
    }
    setSuStep('pin');
  };

  const handleSignupConfirm = (v: string) => {
    setTimeout(() => {
      if (v !== suPin) { setSuErr('PINs do not match.'); setSuConfirm(''); setSuPin(''); setSuStep('pin'); }
      else onSignUp(name.trim(), suEmail.trim(), suPhone.trim(), v);
    }, 120);
  };

  const handleLoginPinComplete = (v: string) => {
    if (loading) return;
    setLiErr('');
    setTimeout(async () => { const ok = await onSignIn(liEmail.trim(), v); if (!ok) setLiPin(''); }, 120);
  };

  const handleReset = async () => {
    setLiErr('');
    const ok = await onSendPinReset(liEmail.trim());
    if (ok) setResetSent(true);
  };

  const handleSavePhone = async () => {
    setPhoneErr('');
    const ok = await onSavePhone(phoneOnly.trim());
    if (!ok) setPhoneErr(authError || 'Enter a valid Kenyan phone number.');
  };

  const switchToLogin = () => { setSuStep('info'); setSuErr(''); setMode('login'); };
  const switchToSignup = () => { setLiStep('email'); setLiErr(''); setResetSent(false); setMode('signup'); };

  return (
    <div style={S.overlay}>
      <style>{`
        @keyframes authIn { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        .auth-card { animation: authIn 0.35s ease forwards; }
        @keyframes authSpin { to { transform: rotate(360deg); } }
      `}</style>
      <div style={S.bg} />
      <div style={S.card} className="auth-card">

        <div style={S.logoRow}>
          <div style={S.logoMark}><span style={S.logoSym}>P</span></div>
          <div>
            <div style={S.logoName}>PesaFlow</div>
            <div style={S.logoTag}>TRACK YOUR MONEY. GROW YOUR WEALTH. SLEEP BETTER.</div>
          </div>
        </div>

        {/* ── ADD PHONE (post-Google) ── */}
        {status === 'needs-phone' && (
          <>
            <div style={S.title}>One last thing</div>
            <p style={S.sub}>Add your M-Pesa phone number so we can process subscriptions.</p>
            <div style={S.field}>
              <label style={S.label}>Phone Number</label>
              <input style={S.input} type="tel" placeholder="e.g. 0712 345 678" value={phoneOnly} autoFocus
                onChange={(e) => { setPhoneOnly(e.target.value.replace(/[^\d\s+]/g, '')); setPhoneErr(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSavePhone()} />
            </div>
            {loading && <div style={S.loadingBox}><span style={S.spinner} /> Saving…</div>}
            {(phoneErr || authError) && !loading && <div style={S.err}>{phoneErr || authError}</div>}
            <button style={{ ...S.btn, marginTop: 16, opacity: loading ? 0.6 : 1 }} disabled={loading} onClick={handleSavePhone}>Continue →</button>
          </>
        )}

        {/* ── VERIFY EMAIL ── */}
        {status === 'unverified' && (
          <>
            <div style={S.title}>Verify your email</div>
            <p style={S.sub}>We sent a verification link to your inbox. Click it, then come back and continue.</p>
            {loading && <div style={S.loadingBox}><span style={S.spinner} /> Checking…</div>}
            <button style={{ ...S.btn, marginTop: 8, opacity: loading ? 0.6 : 1 }} disabled={loading} onClick={onRefreshVerification}>I&apos;ve verified — continue</button>
            <div style={S.hint}>Didn&apos;t get it? <button style={S.link} onClick={onResendVerification}>Resend email</button></div>
          </>
        )}

        {/* ── LOGIN: email ── */}
        {status === 'signed-out' && mode === 'login' && liStep === 'email' && (
          <>
            <div style={S.title}>Welcome Back</div>
            <p style={S.sub}>Enter your email to continue</p>
            <div style={S.field}>
              <label style={S.label}>Email</label>
              <input style={S.input} type="email" placeholder="you@example.com" value={liEmail} autoFocus
                onChange={(e) => { setLiEmail(e.target.value); setLiErr(''); }}
                onKeyDown={(e) => e.key === 'Enter' && liEmail.trim() && setLiStep('pin')} />
            </div>
            <button style={{ ...S.btn, marginTop: 18, opacity: !liEmail.trim() || loading ? 0.5 : 1 }}
              disabled={!liEmail.trim() || loading} onClick={() => setLiStep('pin')}>Continue →</button>
            <div style={S.divider}><span style={S.dividerText}>or</span></div>
            <GoogleButton onClick={onGoogle} disabled={loading} label="Continue with Google" />
            <div style={S.hint}>No account? <button style={S.link} onClick={switchToSignup}>Create one</button></div>
          </>
        )}

        {/* ── LOGIN: pin ── */}
        {status === 'signed-out' && mode === 'login' && liStep === 'pin' && (
          <>
            <div style={S.title}>Enter PIN</div>
            <p style={S.sub}>Enter your 6-digit PIN</p>
            <PinInput value={liPin} onChange={(v) => { if (!loading) { setLiPin(v); setLiErr(''); } }} onComplete={handleLoginPinComplete} error={!!(liErr || authError)} autoFocus={!loading} />
            {loading && <div style={S.loadingBox}><span style={S.spinner} /> Checking…</div>}
            {(liErr || authError) && !loading && <div style={S.err}>{liErr || authError}</div>}
            <button style={{ ...S.backLink, opacity: loading ? 0.45 : 1 }} disabled={loading} onClick={() => { setLiPin(''); setLiErr(''); setLiStep('email'); }}>← Back</button>
            <div style={S.hint}>Forgot PIN? <button style={S.link} onClick={() => { setResetSent(false); setLiStep('reset'); }}>Reset PIN</button></div>
          </>
        )}

        {/* ── LOGIN: reset ── */}
        {status === 'signed-out' && mode === 'login' && liStep === 'reset' && (
          <>
            <div style={S.title}>Reset PIN</div>
            <p style={S.sub}>We&apos;ll email a link to set a new PIN.</p>
            <div style={S.field}>
              <label style={S.label}>Email</label>
              <input style={S.input} type="email" placeholder="you@example.com" value={liEmail} autoFocus
                onChange={(e) => { setLiEmail(e.target.value); setLiErr(''); }} />
            </div>
            {resetSent
              ? <div style={S.banner}>Check your inbox for the reset link.</div>
              : <button style={{ ...S.btn, marginTop: 16, opacity: loading ? 0.6 : 1 }} disabled={loading} onClick={handleReset}>Send reset link</button>}
            {(liErr || authError) && !loading && <div style={S.err}>{liErr || authError}</div>}
            <button style={S.backLink} disabled={loading} onClick={() => { setLiErr(''); setLiStep('pin'); }}>← Back</button>
          </>
        )}

        {/* ── SIGNUP: info ── */}
        {status === 'signed-out' && mode === 'signup' && suStep === 'info' && (
          <>
            <div style={S.title}>Create Account</div>
            <div style={S.fields}>
              <div style={S.field}>
                <label style={S.label}>Your Name</label>
                <input style={S.input} placeholder="e.g. Amina" value={name} autoFocus onChange={(e) => { setName(e.target.value); setSuErr(''); }} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Email</label>
                <input style={S.input} type="email" placeholder="you@example.com" value={suEmail} onChange={(e) => { setSuEmail(e.target.value); setSuErr(''); }} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Phone Number</label>
                <input style={S.input} type="tel" placeholder="e.g. 0712 345 678" value={suPhone}
                  onChange={(e) => { setSuPhone(e.target.value.replace(/[^\d\s+]/g, '')); setSuErr(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSignupInfoContinue()} />
              </div>
            </div>
            <button style={{ ...S.btn, opacity: loading ? 0.6 : 1 }} disabled={loading} onClick={handleSignupInfoContinue}>Continue →</button>
            <div style={S.divider}><span style={S.dividerText}>or</span></div>
            <GoogleButton onClick={onGoogle} disabled={loading} label="Sign up with Google" />
            {suErr && <div style={S.err}>{suErr}</div>}
            {authError && !suErr && <div style={S.err}>{authError}</div>}
            <div style={S.hint}>Already have an account? <button style={S.link} onClick={switchToLogin}>Log in</button></div>
          </>
        )}

        {/* ── SIGNUP: set pin ── */}
        {status === 'signed-out' && mode === 'signup' && suStep === 'pin' && (
          <>
            <div style={S.title}>Set Your PIN</div>
            <p style={S.sub}>Choose a {PIN_LENGTH}-digit PIN</p>
            <PinInput value={suPin} onChange={(v) => { setSuPin(v); setSuErr(''); }} onComplete={() => setTimeout(() => setSuStep('confirm'), 180)} error={false} autoFocus />
            <button style={S.backLink} onClick={() => { setSuPin(''); setSuStep('info'); }}>← Back</button>
          </>
        )}

        {/* ── SIGNUP: confirm pin ── */}
        {status === 'signed-out' && mode === 'signup' && suStep === 'confirm' && (
          <>
            <div style={S.title}>Confirm PIN</div>
            <p style={S.sub}>Re-enter your {PIN_LENGTH}-digit PIN</p>
            <PinInput value={suConfirm} onChange={(v) => { if (!loading) { setSuConfirm(v); setSuErr(''); } }} onComplete={handleSignupConfirm} error={!!(suErr || authError)} autoFocus={!loading} />
            {loading && <div style={S.loadingBox}><span style={S.spinner} /> Creating account…</div>}
            {(suErr || authError) && !loading && <div style={S.err}>{suErr || authError}</div>}
            <button style={{ ...S.backLink, opacity: loading ? 0.45 : 1 }} disabled={loading} onClick={() => { setSuConfirm(''); setSuPin(''); setSuStep('pin'); }}>← Back</button>
          </>
        )}

      </div>
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  overlay:  { position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  bg:       { position: 'absolute', inset: 0, background: 'var(--bg-page)' },
  card:     { position: 'relative', background: 'var(--bg-card)', border: '1px solid var(--border-acc)', borderRadius: 20, padding: '36px 32px', width: '100%', maxWidth: 380, boxShadow: 'var(--shadow-lg)' },
  logoRow:  { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 },
  logoMark: { width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(145deg, var(--gold), var(--gold-l))', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoSym:  { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 800, color: '#0A1628' },
  logoName: { fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 700, color: 'var(--gold-l)' },
  logoTag:  { fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.14em' },
  title:    { fontFamily: 'Cormorant Garamond, serif', fontSize: 26, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 },
  sub:      { fontSize: 13, color: 'var(--text-2)', marginBottom: 20 },
  fields:   { display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 },
  field:    { display: 'flex', flexDirection: 'column', gap: 5 },
  label:    { fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  input:    { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', color: 'var(--text-1)', fontSize: 15, fontFamily: 'Karla, sans-serif', outline: 'none' },
  btn:      { width: '100%', padding: '13px', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', borderRadius: 12, fontWeight: 700, fontSize: 15, fontFamily: 'Karla, sans-serif', border: 'none', cursor: 'pointer' },
  googleBtn:{ width: '100%', padding: '12px', background: 'var(--bg-surface)', color: 'var(--text-1)', borderRadius: 12, fontWeight: 700, fontSize: 14, fontFamily: 'Karla, sans-serif', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 },
  divider:  { display: 'flex', alignItems: 'center', textAlign: 'center', margin: '16px 0', color: 'var(--text-3)', fontSize: 11 },
  dividerText: { margin: '0 auto', padding: '0 10px' },
  err:      { fontSize: 13, color: 'var(--red)', background: 'var(--red-dim)', padding: '9px 12px', borderRadius: 8, marginTop: 10, textAlign: 'center' },
  banner:   { fontSize: 13, color: '#065F46', background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.35)', padding: '9px 12px', borderRadius: 8, marginTop: 12, textAlign: 'center', fontWeight: 700 },
  loadingBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, color: 'var(--gold)', background: 'rgba(255,127,0,0.1)', border: '1px solid rgba(255,127,0,0.18)', padding: '9px 12px', borderRadius: 8, marginTop: 10, textAlign: 'center', fontWeight: 700 },
  spinner:  { width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,127,0,0.25)', borderTopColor: 'var(--gold)', animation: 'authSpin 0.75s linear infinite' },
  hint:     { fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginTop: 16, lineHeight: 1.6 },
  link:     { background: 'transparent', border: 'none', color: 'var(--gold)', fontSize: 12, fontFamily: 'Karla, sans-serif', cursor: 'pointer', textDecoration: 'underline', padding: 0 },
  backLink: { background: 'transparent', border: 'none', color: 'var(--text-3)', fontSize: 13, fontFamily: 'Karla, sans-serif', cursor: 'pointer', display: 'block', margin: '8px auto 0', padding: '6px 12px' },
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: `AuthGate.tsx` clean. Remaining errors only in `App.tsx` (fixed in Task 8).

- [ ] **Step 3: Commit**

```bash
git add src/components/AuthGate.tsx
git commit -m "feat: AuthGate with email+6-digit PIN, Google, verify & add-phone screens"
```

---

## Task 8: Wire `App.tsx` to the new auth surface

**Files:**
- Modify: `src/App.tsx` (auth gating ~105-160, payment overlay ~225-252)

- [ ] **Step 1: Replace the three pre-app auth stages (lines ~105-160)**

Find the block from `// ── Stage: Landing ──` through the end of the `// ── Stage: Auth ──` `if (!auth.isUnlocked) { ... }` block and replace with:
```tsx
  // ── Stage: Landing ──────────────────────────────────────
  if (auth.status !== 'ready' && stage === 'landing') {
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

  // ── Stage: Auth / Verify / Add-phone ────────────────────
  if (auth.status !== 'ready') {
    const gateStatus = auth.status === 'loading' ? 'signed-out' : auth.status;
    return (
      <ThemeProvider>
        <AuthGate
          status={gateStatus}
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
(This collapses the old separate Landing/Payment/Auth gates: the payment stage now falls through to the app where the payment overlay renders, and unauthenticated users always see `AuthGate`.)

- [ ] **Step 2: Update the payment overlay condition + keys (lines ~225-239)**

Find:
```tsx
      {stage === 'payment' && auth.isUnlocked && (
```
Replace with:
```tsx
      {stage === 'payment' && auth.status === 'ready' && (
```
Then within that `PaymentGate`, replace the `userId`/`userPhone` props:
```tsx
            userId={auth.profile?.uid || auth.profile?.phone?.replace(/\s+/g, '') || ''}
            userPhone={auth.profile?.phone ?? auth.profile?.uid ?? ''}
```
with:
```tsx
            userId={auth.profile?.uid ?? ''}
            userPhone={auth.profile?.phone ?? ''}
```
And replace the `onPaymentComplete` tier refresh:
```tsx
              const activated = await auth.updateTier(selectedTier);
              if (!activated) return;
```
with:
```tsx
              const refreshed = await auth.refreshProfile();
              if (refreshed?.tier !== selectedTier) return;
```

- [ ] **Step 3: Update the settings/logout wiring (lines ~250-252)**

Find `onLogout={auth.deleteAccount}` — leave it as-is (still valid). If a separate lock/sign-out control exists nearby referencing `auth.lock`, change it to `auth.logout`. (Search the file: `grep -n "auth.lock" src/App.tsx` — replace any hit with `auth.logout`.)

- [ ] **Step 4: Type-check the whole app**

Run: `npx tsc -b --noEmit`
Expected: PASS with no errors across the project.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: Vite build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire App to Firebase-native auth (status gate, verify, add-phone)"
```

---

## Task 9: Unify all data keys on `profile.uid`

**Files:**
- Modify: `src/hooks/useExpenses.ts:24`
- Modify: `src/lib/sync.ts:7`
- Modify: `src/App.tsx` (lines ~415, 434, 468 — data-key props)

- [ ] **Step 1: `src/hooks/useExpenses.ts`**

Find (line ~24):
```ts
    return p?.uid || p?.phone?.replace(/\s+/g, '') || null;
```
Replace with:
```ts
    return p?.uid || null;
```

- [ ] **Step 2: `src/lib/sync.ts`**

Find (line ~7):
```ts
    return p?.uid || p?.phone?.replace(/\s+/g, '') || null;
```
Replace with:
```ts
    return p?.uid || null;
```

- [ ] **Step 3: `src/App.tsx` — the phone-keyed and fallback data props**

Run `grep -n "phone?.replace\|phone.replace" src/App.tsx`. For each data-key usage, standardize on uid:
- Line ~415 `userId={auth.profile?.phone?.replace(/\s+/g, '') ?? ''}` → `userId={auth.profile?.uid ?? ''}`
- Line ~434 `userId={auth.profile?.uid || auth.profile?.phone?.replace(/\s+/g, '') || ''}` → `userId={auth.profile?.uid ?? ''}`
- Line ~468 `uid={auth.profile.uid || auth.profile.phone.replace(/\s+/g, '')}` → `uid={auth.profile.uid}`

(Leave any prop that intentionally displays the phone — e.g. `userPhone`, ProfilePage's phone field — unchanged.)

- [ ] **Step 4: Type-check + build**

Run: `npx tsc -b --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useExpenses.ts src/lib/sync.ts src/App.tsx
git commit -m "fix: key all user data on Firebase uid (drop phone-based keys)"
```

---

## Task 10: Remove legacy PIN Cloud Functions & fix payment phone write

**Files:**
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Remove the `authWithPin` export**

Delete the entire `export const authWithPin = onCall(...)` block (the "User auth: verify phone + PIN, mint a Firebase custom token" section, ~lines 683-736).

- [ ] **Step 2: Remove the `resetPin` export**

Delete the entire `export const resetPin = onCall(...)` block (the "Reset PIN" section, ~lines 767-814). This closes the CRITICAL security finding (name-as-auth-factor + token-from-reset).

- [ ] **Step 3: Remove now-dead PIN helpers**

Delete the PIN-specific helpers that only `authWithPin`/`resetPin` used: `authNormalizePhone`, `phoneToUid`, `legacyHashPin`, `legacyHashPassword`, `genSalt` **only if unused elsewhere**, and `strongHash` **only if unused elsewhere**.

Run: `grep -nE "genSalt|strongHash|scryptHashPw|timingSafe" functions/src/index.ts`
Keep any helper still referenced by `adminSignIn` (which uses `scryptHashPw`, `timingSafeHexEqual`, `timingSafeStrEqual`, `genSalt`). Delete only the ones with zero remaining references (`authNormalizePhone`, `phoneToUid`, `legacyHashPin`, `legacyHashPassword`, and `strongHash` if unreferenced).

- [ ] **Step 4: Fix `initiateSubscriptionPayment` phone write**

Find (~line 211-216):
```ts
  await db.collection('users').doc(userId).set({
    phone: userId,
    pendingTier: input.tier,
    subscriptionStatus: 'pending_payment',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
```
Replace `phone: userId,` with `phone,` (the real normalized phone already in scope on the line above), so the user's actual phone is written instead of the Firebase UID:
```ts
  await db.collection('users').doc(userId).set({
    phone,
    pendingTier: input.tier,
    subscriptionStatus: 'pending_payment',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
```

- [ ] **Step 5: Build the functions (regenerates `functions/lib/index.js`)**

Run:
```bash
cd /home/jane-ngugi/Documents/Desktop/finwise/functions
npm run build
```
Expected: TypeScript compiles with no references to `authWithPin`/`resetPin`. Verify:
```bash
grep -c "resetPin\|authWithPin" lib/index.js
```
Expected: `0`.

- [ ] **Step 6: Commit**

```bash
cd /home/jane-ngugi/Documents/Desktop/finwise
git add functions/src/index.ts functions/lib/index.js
git commit -m "security: remove authWithPin/resetPin, fix M-Pesa phone write

Closes CRITICAL account-takeover finding (name-as-auth-factor PIN reset)."
```

---

## Task 11: Lock Firestore user rules to the signed-in UID

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Replace the `users/{userId}` match block**

Find:
```
    // User data — readable/writable by anyone with the userId (no Firebase Auth used)
    match /users/{userId} {
      allow read, write: if true;

      // Financial subcollections (expenses, investments, goals, bills, networth, chat)
      match /{subcollection}/{docId} {
        allow read, write: if true;
      }

      // Named data docs (profile, habits, emergencyFund)
      match /data/{docId} {
        allow read, write: if true;
      }
    }
```
Replace with:
```
    // User data — each signed-in user may only access their own tree.
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Financial subcollections (expenses, investments, goals, bills, networth, chat)
      match /{subcollection}/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      // Named data docs (profile, habits, emergencyFund)
      match /data/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
```
(Leave the other collections unchanged in this task.)

- [ ] **Step 2: Validate the rules compile (dry deploy)**

Run: `cd /home/jane-ngugi/Documents/Desktop/finwise && npx firebase deploy --only firestore:rules --dry-run`
Expected: Rules compile successfully. (If `--dry-run` is unsupported by the installed CLI, run `npx firebase firestore:rules:test` if available, or visually confirm — actual deploy happens in Task 13.)

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "security: lock users/{uid} Firestore rules to request.auth.uid"
```

---

## Task 12: Document native Google Sign-In config

**Files:**
- Create: `docs/NATIVE_AUTH_SETUP.md`

- [ ] **Step 1: Create the checklist doc**

```markdown
# Native Google Sign-In — Setup Checklist

Web Google + email/PIN work without these steps. Complete them to enable Google
Sign-In in the Android and iOS builds.

## Firebase console
- [ ] Authentication → Sign-in method → enable **Email/Password**.
- [ ] Authentication → Sign-in method → enable **Google**. Note the **Web client ID**.

## Android
- [ ] Get the signing SHA-1 (and SHA-256):
      `cd android && ./gradlew signingReport`
- [ ] Firebase console → Project settings → your Android app → add the SHA-1/SHA-256.
- [ ] Download the updated `google-services.json` into `android/app/`.
- [ ] `npx cap sync android`

## iOS
- [ ] Download `GoogleService-Info.plist` into the iOS app target.
- [ ] In `Info.plist`, add a URL scheme equal to the **REVERSED_CLIENT_ID** from
      `GoogleService-Info.plist`.
- [ ] `npx cap sync ios`

## Verify
- [ ] Android device/emulator: "Continue with Google" opens the native chooser and returns to the app signed in.
- [ ] iOS device/simulator: same.
- [ ] Web: "Continue with Google" opens the popup and returns signed in.
```

- [ ] **Step 2: Commit**

```bash
git add docs/NATIVE_AUTH_SETUP.md
git commit -m "docs: native Google sign-in setup checklist"
```

---

## Task 13: Full verification pass

**Files:** none (verification + deploy).

- [ ] **Step 1: Run all unit tests**

Run: `npm test`
Expected: `authValidation.test.ts` and `authErrors.test.ts` all pass.

- [ ] **Step 2: Type-check + build**

Run: `npx tsc -b --noEmit && npm run build`
Expected: no type errors; build succeeds.

- [ ] **Step 3: Deploy rules + functions**

Run:
```bash
npx firebase deploy --only firestore:rules,functions
```
Expected: rules + functions deploy; the deployed function list no longer contains `authWithPin` or `resetPin`.

- [ ] **Step 4: Manual smoke test on web (`npm run dev`)**

Confirm each flow (see spec §8):
- [ ] Email signup (name/email/phone/6-digit PIN + confirm) → "Verify your email" screen → click emailed link → "I've verified — continue" → app loads.
- [ ] Log out → email login with correct PIN succeeds; wrong PIN shows "Wrong email or PIN."
- [ ] "Forgot PIN?" → reset email arrives → set new PIN via link → login with new PIN.
- [ ] "Continue with Google" (web popup) on a fresh Google account → "One last thing" add-phone screen → enter phone → app loads.
- [ ] In the app, confirm expenses/goals/etc. persist and reload under the same account (data keyed by uid).

- [ ] **Step 5: Native smoke test (after `docs/NATIVE_AUTH_SETUP.md` is done)**

- [ ] `npm run android:run` → Google sign-in returns signed in.
- [ ] iOS build → Google sign-in returns signed in.

- [ ] **Step 6: Final commit (if any build artifacts changed)**

```bash
git add -A
git commit -m "chore: verified email+PIN & Google auth end-to-end" || echo "nothing to commit"
```

---

## Self-review notes

- **Spec coverage:** §4 model → Tasks 4,6; §4.2 Google strategy → Tasks 5,6; §5.1 useAuth → Task 6; §5.2 AuthGate → Task 7; §5.3 data-key unification → Tasks 8,9; §5.4 functions → Task 10; §5.5 types → Task 4; §5.6 rules → Task 11; §6 native config → Tasks 5,12; §8 testing → Tasks 2,3,13. Security finding (§3) → Task 10.
- **PIN length** is 6 everywhere (`isValidPin` `^\d{6}$`, `PIN_LENGTH = 6`).
- **Type consistency:** hook returns `{ status, signUpWithEmail, signInWithEmail, signInWithGoogle, savePhone, resendVerification, refreshVerification, sendPinReset, refreshProfile, logout, deleteAccount, profile, loading, error }`; AuthGate props and App wiring (Task 8) consume exactly these names.
- **Known tradeoff:** Firebase's default hosted verification/reset pages are used (generic text field, not a 6-digit pad) — recorded in spec §7 as a follow-up.
