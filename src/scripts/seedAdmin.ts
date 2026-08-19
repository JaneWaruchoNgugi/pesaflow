// Run once: npx vite-node src/scripts/seedAdmin.ts
// Then delete this file.

import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const hashPassword = (pw: string): string => {
  let h = 5381;
  for (let i = 0; i < pw.length; i++) h = (h * 33) ^ pw.charCodeAt(i);
  return (h >>> 0).toString(36);
};

const ADMIN_EMAIL = 'waruchojanen@gmail.com';
const ADMIN_PASSWORD = '1234';

const id = ADMIN_EMAIL.replace(/[^a-z0-9]/gi, '_');
const existing = await getDoc(doc(db, 'admins', id));

if (existing.exists()) {
  console.log('Super admin already exists. Skipping.');
} else {
  await setDoc(doc(db, 'admins', id), {
    email: ADMIN_EMAIL,
    passwordHash: hashPassword(ADMIN_PASSWORD),
    role: 'super_admin',
    createdAt: new Date().toISOString(),
  });

  console.log(`Super admin created: ${ADMIN_EMAIL}`);
  console.log('Delete this file after use.');
}
