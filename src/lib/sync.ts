import { doc, setDoc, deleteDoc, writeBatch, collection, getDocs, getDoc } from 'firebase/firestore';
import { db, ensureAuthReady } from './firebase';

const getUid = (): string | null => {
  try {
    const p = JSON.parse(localStorage.getItem('finwise_auth_profile') || 'null');
    return p?.uid || null;
  } catch { return null; }
};

/** Strip undefined and NaN values so Firestore doesn't reject the document */
const clean = <T extends object>(obj: T): T =>
  JSON.parse(JSON.stringify(obj, (_, v) => (v === undefined || (typeof v === 'number' && isNaN(v)) ? null : v)));

/** Sync a full array to a subcollection using a batch write */
export const syncCollection = async (name: string, items: Array<{ id: string } & object>) => {
  await ensureAuthReady();
  const uid = getUid();
  if (!uid) { console.warn('syncCollection: no uid, skipping', name); return; }
  if (items.length === 0) return;
  try {
    const batch = writeBatch(db);
    items.forEach(item => batch.set(doc(db, 'users', uid, name, item.id), clean(item)));
    await batch.commit();
  } catch (e) {
    console.error(`syncCollection(${name}) failed:`, e);
  }
};

/** Delete a single item from a subcollection */
export const deleteFromCollection = async (name: string, id: string) => {
  await ensureAuthReady();
  const uid = getUid();
  if (!uid) return;
  try {
    await deleteDoc(doc(db, 'users', uid, name, id));
  } catch (e) {
    console.error(`deleteFromCollection(${name}/${id}) failed:`, e);
  }
};

/** Fetch a full subcollection back from Firestore (returns null if no uid, empty, or error). */
export const fetchCollection = async <T extends { id: string }>(name: string): Promise<T[] | null> => {
  await ensureAuthReady();
  const uid = getUid();
  if (!uid) return null;
  try {
    const snap = await getDocs(collection(db, 'users', uid, name));
    if (snap.empty) return null;
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as T);
  } catch (e) {
    console.error(`fetchCollection(${name}) failed:`, e);
    return null;
  }
};

/** Fetch a single document under users/{uid}/data/{name} (returns null if absent/error). */
export const fetchDoc = async <T>(name: string): Promise<T | null> => {
  await ensureAuthReady();
  const uid = getUid();
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'data', name));
    return snap.exists() ? (snap.data() as T) : null;
  } catch (e) {
    console.error(`fetchDoc(${name}) failed:`, e);
    return null;
  }
};

/** Save a single document under users/{uid}/data/{name} */
export const syncDoc = async (name: string, data: object) => {
  await ensureAuthReady();
  const uid = getUid();
  if (!uid) { console.warn('syncDoc: no uid, skipping', name); return; }
  try {
    const cleaned = clean(data);
    await setDoc(doc(db, 'users', uid, 'data', name), cleaned);
    if (name === 'financialProfile') {
      await setDoc(doc(db, 'users', uid, 'data', 'profile'), cleaned);
    }
  } catch (e) {
    console.error(`syncDoc(${name}) failed:`, e);
  }
};
