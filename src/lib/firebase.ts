import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// authDomain is the standard Firebase value (finwise-948c8.firebaseapp.com). Google
// sign-in uses signInWithPopup (see useAuth.ts), which completes via postMessage from
// Firebase's own handler — so the redirect_uri Google validates is the default
// firebaseapp.com/__/auth/handler that's already registered on the OAuth client, and
// no cross-origin storage is involved. (An earlier attempt set authDomain to the app's
// own host to keep signInWithRedirect same-origin on mobile, but that made Google
// reject the request with redirect_uri_mismatch, since the app-host handler URL isn't
// registered. Popup makes the custom authDomain unnecessary.)
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'finwise-948c8.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app       = initializeApp(firebaseConfig);
export const db        = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');
export const auth      = getAuth(app);

// Isolated Firebase instance for the admin panel. Firebase namespaces auth
// persistence by app name, so the admin's session (adminAuth) never collides with
// the main app's user session — signing in as a normal user in the same browser can
// no longer clobber the admin's `admin` claim. Admin views read/write via adminDb and
// call admin-gated Cloud Functions via adminFunctions so the admin token is attached.
export const adminApp       = initializeApp(firebaseConfig, 'admin');
export const adminAuth      = getAuth(adminApp);
export const adminDb        = getFirestore(adminApp);
export const adminFunctions = getFunctions(adminApp, 'us-central1');

// Resolves once Firebase Auth has restored (or confirmed absent) the session, so
// Firestore reads/writes carry the auth token once per-user rules are enforced.
export const ensureAuthReady: () => Promise<void> = (() => {
  const p = new Promise<void>((resolve) => {
    const unsub = onAuthStateChanged(auth, () => { unsub(); resolve(); });
  });
  return () => p;
})();
