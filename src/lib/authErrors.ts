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
