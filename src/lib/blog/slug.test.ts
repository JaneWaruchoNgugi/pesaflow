import { describe, it, expect } from 'vitest';
import { slugify, ensureUniqueSlug } from './slug';

describe('slugify', () => {
  it('lowercases and hyphenates words', () => {
    expect(slugify('How To Save Money')).toBe('how-to-save-money');
  });
  it('strips punctuation', () => {
    expect(slugify('SACCO vs. MMF: Which?')).toBe('sacco-vs-mmf-which');
  });
  it('collapses and trims separators', () => {
    expect(slugify('  Best   MMF — 2026  ')).toBe('best-mmf-2026');
  });
  it('keeps digits', () => {
    expect(slugify('Top 7 side hustles')).toBe('top-7-side-hustles');
  });
  it('returns empty string for empty input', () => {
    expect(slugify('   ')).toBe('');
  });
});

describe('ensureUniqueSlug', () => {
  it('returns the base slug when unused', () => {
    expect(ensureUniqueSlug('save-money', new Set())).toBe('save-money');
  });
  it('appends -2 on first collision', () => {
    expect(ensureUniqueSlug('save-money', new Set(['save-money']))).toBe('save-money-2');
  });
  it('increments until free', () => {
    const taken = new Set(['save-money', 'save-money-2', 'save-money-3']);
    expect(ensureUniqueSlug('save-money', taken)).toBe('save-money-4');
  });
});
