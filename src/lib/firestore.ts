import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, getDocs, addDoc,
  onSnapshot, type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

/** Get a single document */
export const getDocument = async <T>(path: string): Promise<T | null> => {
  const snap = await getDoc(doc(db, path));
  return snap.exists() ? (snap.data() as T) : null;
};

/** Set (overwrite) a document */
export const setDocument = <T extends object>(path: string, data: T) =>
  setDoc(doc(db, path), data);

/** Merge-update a document */
export const updateDocument = <T extends object>(path: string, data: Partial<T>) =>
  updateDoc(doc(db, path), data as Record<string, unknown>);

/** Delete a document */
export const deleteDocument = (path: string) =>
  deleteDoc(doc(db, path));

/** Get all docs in a collection */
export const getCollection = async <T>(path: string): Promise<T[]> => {
  const snap = await getDocs(collection(db, path));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as T);
};

/** Add a doc to a collection (auto-id) */
export const addDocument = <T extends object>(path: string, data: T) =>
  addDoc(collection(db, path), data);

/** Real-time listener on a document */
export const watchDocument = <T>(
  path: string,
  onChange: (data: T | null) => void,
): Unsubscribe =>
  onSnapshot(doc(db, path), snap =>
    onChange(snap.exists() ? (snap.data() as T) : null),
  );

/** Real-time listener on a collection */
export const watchCollection = <T>(
  path: string,
  onChange: (items: T[]) => void,
): Unsubscribe =>
  onSnapshot(collection(db, path), snap =>
    onChange(snap.docs.map(d => ({ id: d.id, ...d.data() }) as T)),
  );
