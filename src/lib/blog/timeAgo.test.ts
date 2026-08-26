import { describe, it, expect } from 'vitest';
import { timeAgo } from './timeAgo';

const agoIso = (sec: number) => new Date(Date.now() - sec * 1000).toISOString();

describe('timeAgo', () => {
  it('returns empty for null or invalid dates', () => {
    expect(timeAgo(null)).toBe('');
    expect(timeAgo('not-a-date')).toBe('');
  });
  it('shows "just now" under a minute', () => {
    expect(timeAgo(agoIso(30))).toBe('just now');
  });
  it('formats minutes (singular + plural)', () => {
    expect(timeAgo(agoIso(60))).toBe('1 minute ago');
    expect(timeAgo(agoIso(60 * 5))).toBe('5 minutes ago');
  });
  it('formats hours', () => {
    expect(timeAgo(agoIso(3600 * 3))).toBe('3 hours ago');
  });
  it('formats days', () => {
    expect(timeAgo(agoIso(86400 * 2))).toBe('2 days ago');
  });
});
