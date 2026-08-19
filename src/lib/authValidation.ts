// Single source of truth for auth input validation + phone normalization.

export const normalizePhone = (phone: string): string => {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  if (/^0\d{9}$/.test(digits)) return digits;
  if (/^254\d{9}$/.test(digits)) return '0' + digits.slice(3);
  if (/^\+254\d{9}$/.test(digits)) return '0' + digits.slice(4);
  return String(phone || '').replace(/\s+/g, '');
};

// Kenyan mobile numbers start with 07 (Safaricom/Airtel) or 01 (e.g. 011x).
export const isValidKenyanPhone = (phone: string): boolean =>
  /^0[17]\d{8}$/.test(normalizePhone(phone));

export const isValidPin = (pin: string): boolean => /^\d{6}$/.test(pin);

export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
