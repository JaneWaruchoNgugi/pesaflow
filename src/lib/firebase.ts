import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
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
