import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { Category } from '../../types';

export const fetchCategories = async (): Promise<Category[]> => {
  const snap = await getDocs(query(collection(db, 'categories'), orderBy('order', 'asc')));
  return snap.docs.map(d => ({ ...(d.data() as Category), id: d.id }));
};
