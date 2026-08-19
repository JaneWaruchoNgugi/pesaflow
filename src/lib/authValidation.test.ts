import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidPin, isValidKenyanPhone, normalizePhone } from './authValidation';

describe('isValidEmail', () => {
  it('accepts a normal email', () => expect(isValidEmail('a@b.com')).toBe(true));
  it('rejects missing @', () => expect(isValidEmail('ab.com')).toBe(false));
  it('rejects empty', () => expect(isValidEmail('')).toBe(false));
  it('trims surrounding spaces', () => expect(isValidEmail('  a@b.com ')).toBe(true));
});

describe('isValidPin', () => {
  it('accepts exactly 6 digits', () => expect(isValidPin('123456')).toBe(true));
  it('rejects 4 digits', () => expect(isValidPin('1234')).toBe(false));
  it('rejects 7 digits', () => expect(isValidPin('1234567')).toBe(false));
  it('rejects non-numeric', () => expect(isValidPin('12a456')).toBe(false));
});

describe('isValidKenyanPhone', () => {
  it('accepts 07xxxxxxxx', () => expect(isValidKenyanPhone('0712345678')).toBe(true));
  it('accepts 01xxxxxxxx', () => expect(isValidKenyanPhone('0110123456')).toBe(true));
  it('accepts spaced input', () => expect(isValidKenyanPhone('0712 345 678')).toBe(true));
  it('accepts +254 form', () => expect(isValidKenyanPhone('+254712345678')).toBe(true));
  it('rejects too short', () => expect(isValidKenyanPhone('07123')).toBe(false));
});

describe('normalizePhone', () => {
  it('keeps 0-prefixed form', () => expect(normalizePhone('0712345678')).toBe('0712345678'));
  it('converts 254 form', () => expect(normalizePhone('254712345678')).toBe('0712345678'));
  it('converts +254 form', () => expect(normalizePhone('+254712345678')).toBe('0712345678'));
  it('strips spaces', () => expect(normalizePhone('0712 345 678')).toBe('0712345678'));
});
