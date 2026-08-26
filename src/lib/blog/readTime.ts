const WORDS_PER_MINUTE = 200;

/** Estimate reading time in whole minutes (minimum 1). */
export const readMinutes = (body: string): number => {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
};
