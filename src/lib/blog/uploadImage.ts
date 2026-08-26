import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { adminStorage } from '../firebase';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const safeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * Upload an image to Firebase Storage under blog/<folder>/ and return its download URL.
 * Uses adminStorage so the write carries the admin token (see storage.rules).
 */
export const uploadBlogImage = async (file: File, folder: 'covers' | 'body' = 'covers'): Promise<string> => {
  if (!file.type.startsWith('image/')) throw new Error('That file is not an image.');
  if (file.size > MAX_BYTES) throw new Error('Image must be under 5 MB.');
  const path = `blog/${folder}/${Date.now()}-${safeName(file.name) || 'image'}`;
  const storageRef = ref(adminStorage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
};
