import { describe, it, expect } from 'vitest';
import { readMinutes } from './readTime';

describe('readMinutes', () => {
  it('returns at least 1 for short text', () => {
    expect(readMinutes('a few short words here')).toBe(1);
  });
  it('rounds up based on ~200 wpm', () => {
    const words = Array.from({ length: 400 }, () => 'word').join(' ');
    expect(readMinutes(words)).toBe(2);
  });
  it('markdown tokens do not inflate the estimate', () => {
    const body = '## Heading\n\n' + Array.from({ length: 450 }, () => 'save').join(' ');
    expect(readMinutes(body)).toBe(3);
  });
  it('returns 1 for empty', () => {
    expect(readMinutes('')).toBe(1);
  });
});
