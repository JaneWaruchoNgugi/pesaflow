import { describe, it, expect } from 'vitest';
import { mapAuthError } from './authErrors';

describe('mapAuthError', () => {
  it('maps email-already-in-use', () => {
    expect(mapAuthError({ code: 'auth/email-already-in-use' }, 'fallback'))
      .toBe('An account already exists for this email. Please log in.');
  });
  it('maps invalid-credential to a generic wrong email/PIN', () => {
    expect(mapAuthError({ code: 'auth/invalid-credential' }, 'fallback'))
      .toBe('Wrong email or PIN.');
  });
  it('maps wrong-password to the same generic message', () => {
    expect(mapAuthError({ code: 'auth/wrong-password' }, 'fallback'))
      .toBe('Wrong email or PIN.');
  });
  it('maps too-many-requests', () => {
    expect(mapAuthError({ code: 'auth/too-many-requests' }, 'fallback'))
      .toBe('Too many attempts. Please wait a moment and try again.');
  });
  it('maps popup-closed to a friendly cancel message', () => {
    expect(mapAuthError({ code: 'auth/popup-closed-by-user' }, 'fallback'))
      .toBe('Google sign-in was cancelled.');
  });
  it('returns the fallback for unknown codes', () => {
    expect(mapAuthError({ code: 'auth/whatever' }, 'fallback')).toBe('fallback');
  });
  it('returns the fallback for non-error input', () => {
    expect(mapAuthError(null, 'fallback')).toBe('fallback');
  });
});
