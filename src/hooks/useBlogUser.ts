import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export interface BlogUser { uid: string; name: string }

// Lightweight session view for the public blog (rendered OUTSIDE the app's AuthGate).
// Subscribes to the shared `auth` instance and resolves a display name for comments:
// Firebase displayName first, then the user's Firestore profile name (which the app
// collects at sign-up), falling back to a friendly default.
export const useBlogUser = (): { user: BlogUser | null; signedIn: boolean; ready: boolean } => {
  const [user, setUser] = useState<BlogUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setUser(null); setReady(true); return; }
      let name = u.displayName ?? '';
      if (!name) {
        try {
          const snap = await getDoc(doc(db, 'users', u.uid));
          name = (snap.data() as { name?: string } | undefined)?.name ?? '';
        } catch { /* own-profile read blocked or offline — fall back */ }
      }
      setUser({ uid: u.uid, name: name || 'PesaFlow member' });
      setReady(true);
    });
    return unsub;
  }, []);

  return { user, signedIn: !!user, ready };
};
