import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  GoogleAuthProvider,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  deleteUser,
  type User,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { Capacitor } from '@capacitor/core';
import { db, auth, functions } from '../lib/firebase';
import { isValidEmail, isValidPin, isValidKenyanPhone, normalizePhone } from '../lib/authValidation';
import { currentConsent } from '../lib/legal';
import { mapAuthError } from '../lib/authErrors';
import { migrateGuestDataToAccount } from '../lib/guestMigration';
import { DEMO_FLAG } from '../lib/demoData';
import type { UserProfile } from '../types';

// 'loading'   — resolving the persisted Firebase session
// 'signed-out'— no user
// 'unverified'— email/PIN user who has not verified their email
// 'needs-phone'— signed in (usually via Google) but no phone on file for M-Pesa
// 'ready'     — fully signed in with a complete profile
export type AuthStatus = 'loading' | 'signed-out' | 'unverified' | 'needs-phone' | 'ready';

// The sync layer (lib/sync.ts, hooks/useExpenses.ts) reads the uid from this cached
// profile synchronously on mount — so it must survive reloads. Written whenever the
// profile changes; cleared only on explicit logout/delete (never on the initial null,
// which would wipe the cache before the sync layer reads it on a fresh page load).
const PROFILE_KEY = 'finwise_auth_profile';

const loadUserDoc = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
};

// Loads a Google user's profile, creating a fresh one the first time they sign in.
// Shared by the popup, redirect, and native flows so a brand-new Google user always
// gets a doc regardless of which flow brought them in. Google users are never asked
// for a phone number, so the profile is created with an empty phone.
const ensureUserProfile = async (user: User): Promise<UserProfile> => {
  const existing = await loadUserDoc(user.uid);
  if (existing) return existing;
  const p: UserProfile = {
    uid: user.uid,
    name: user.displayName || 'PesaFlow User',
    email: user.email || '',
    phone: '',
    authProvider: 'google',
    tier: 'free',
    subscriptionStatus: 'active',
    createdAt: new Date().toISOString(),
    // The signup screen requires agreeing to the Privacy Policy before the Google
    // button works, so a first-time Google profile is created with consent given.
    consent: currentConsent(),
  };
  await setDoc(doc(db, 'users', user.uid), p);
  return p;
};

// A popup can be blocked (installed PWA, in-app webview, aggressive blocker); these
// are the codes worth retrying via the full-page redirect flow instead.
const isPopupBlocked = (e: unknown): boolean => {
  const code = (e as { code?: string })?.code ?? '';
  return code === 'auth/popup-blocked'
    || code === 'auth/cancelled-popup-request'
    || code === 'auth/operation-not-supported-in-this-environment';
};

const sendVerificationEmailFn = httpsCallable(functions, 'sendVerificationEmail');

// Sends the verification link via our Brevo-backed Cloud Function (authenticated
// sender domain → inbox, not spam). Falls back to Firebase's default sender if the
// function is unavailable, so verification never silently fails.
const sendVerification = async (user: User): Promise<void> => {
  try {
    await sendVerificationEmailFn();
  } catch (e) {
    console.warn('Branded verification email unavailable; using default sender:', e);
    await sendEmailVerification(user);
  }
};

export const useAuth = () => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When a browser that started as a guest signs in/up, push the guest's real
  // (non-demo) data to the new account, then reload for one clean signed-in state.
  const migrateIfGuest = useCallback(async (p: UserProfile) => {
    if (!localStorage.getItem(DEMO_FLAG)) return; // browser didn't start as a guest
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); // ensure sync.ts sees the uid
    await migrateGuestDataToAccount();
    window.location.reload();
  }, []);

  // Phone is captured once, on the email signup form. Login, Google sign-in, and
  // session-restore all send the user straight to the app — we never re-prompt.
  const resolveStatus = useCallback(async (user: User | null) => {
    if (!user) { setProfile(null); setStatus('signed-out'); return; }
    // Email verification is currently NOT required (no authenticated sending domain
    // yet). Re-enable by gating unverified email/PIN users here once a domain is set up:
    //   const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
    //   if (!isGoogle && !user.emailVerified) { setStatus('unverified'); return; }
    const p = await loadUserDoc(user.uid);
    setProfile(p);
    setStatus('ready');
  }, []);

  // Completes a Google sign-in (popup, redirect, or native flow). Google users go
  // straight to the app — they are never asked for a phone number.
  const completeGoogleSignIn = useCallback(async (user: User) => {
    const p = await ensureUserProfile(user);
    setProfile(p);
    setStatus('ready');
    await migrateIfGuest(p);
  }, [migrateIfGuest]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      try { await resolveStatus(user); }
      catch (e) { console.error('resolveStatus failed', e); setStatus(user ? 'ready' : 'signed-out'); }
    });
    return unsub;
  }, [resolveStatus]);

  // Finishes a mobile/PWA redirect sign-in: when the user is sent back from Google,
  // pick up the result and ensure their profile doc exists (mirrors the popup path).
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => { if (result?.user) return completeGoogleSignIn(result.user); })
      .catch((e) => setError(mapAuthError(e, 'Google sign-in failed. Please try again.')));
  }, [completeGoogleSignIn]);

  // Cache the profile so the sync layer can resolve the uid synchronously on reload.
  useEffect(() => {
    if (profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);

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
        consent: currentConsent(),   // consent gate enforced on the signup screen
      };
      await setDoc(doc(db, 'users', cred.user.uid), p);
      // No email verification for now (no authenticated sending domain) — let them in.
      setProfile(p);
      setStatus('ready');
      await migrateIfGuest(p);
    } catch (e) {
      setError(mapAuthError(e, 'Could not create account. Check your connection.'));
    } finally { setLoading(false); }
  }, [migrateIfGuest]);

  const signInWithEmail = useCallback(async (email: string, pin: string): Promise<boolean> => {
    setError(null);
    if (!isValidEmail(email)) { setError('Enter a valid email address.'); return false; }
    if (!isValidPin(pin)) { setError('PIN must be exactly 6 digits.'); return false; }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pin);
      await resolveStatus(cred.user);
      const p = await loadUserDoc(cred.user.uid);
      if (p) await migrateIfGuest(p);
      return true;
    } catch (e) {
      setError(mapAuthError(e, 'Wrong email or PIN.'));
      return false;
    } finally { setLoading(false); }
  }, [resolveStatus, migrateIfGuest]);

  // Native: the Capacitor Firebase Auth plugin runs the native Google flow, then we
  // complete it in the JS SDK via signInWithCredential so all platforms share one User.
  // Web (desktop AND mobile): prefer the popup. It completes via postMessage on our own
  // origin without a full-page navigation, so it doesn't depend on the browser keeping
  // auth state across a redirect — which mobile browsers (iOS Safari ITP, Chrome's
  // third-party-storage partitioning) drop, dumping the user back signed-out. The
  // redirect flow stays only as a fallback for contexts that genuinely block the popup
  // (installed PWA, in-app webviews); it's finished by the getRedirectResult effect above.
  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    setError(null);
    setLoading(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
        const result = await FirebaseAuthentication.signInWithGoogle();
        const idToken = result.credential?.idToken;
        if (!idToken) throw new Error('No Google credential returned.');
        const credential = GoogleAuthProvider.credential(idToken);
        await completeGoogleSignIn((await signInWithCredential(auth, credential)).user);
        return true;
      }

      const provider = new GoogleAuthProvider();
      try {
        await completeGoogleSignIn((await signInWithPopup(auth, provider)).user);
        return true;
      } catch (e) {
        if (isPopupBlocked(e)) { await signInWithRedirect(auth, provider); return true; }
        throw e;
      }
    } catch (e) {
      setError(mapAuthError(e, 'Google sign-in failed. Please try again.'));
      return false;
    } finally { setLoading(false); }
  }, [completeGoogleSignIn]);

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
      try { await sendVerification(auth.currentUser); }
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
    localStorage.removeItem(PROFILE_KEY);
    setProfile(null);
    setStatus('signed-out');
  }, []);

  const deleteAccount = useCallback(async () => {
    const user = auth.currentUser;
    try { if (user) await deleteDoc(doc(db, 'users', user.uid)); } catch { /* best effort */ }
    [ PROFILE_KEY, 'finwise_expenses', 'finwise_investments', 'finwise_goals', 'finwise_bills', 'finwise_networth' ]
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
