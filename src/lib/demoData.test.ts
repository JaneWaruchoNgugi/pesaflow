import { describe, it, expect } from 'vitest';
import {
  stripDemo, shouldSeedDemo, seedDemoIfNeeded, clearDemoData,
  buildDemoExpenses, buildDemoGoals, buildDemoBills, KEYS, DEMO_FLAG,
  type StorageLike,
} from './demoData';

const makeStore = (init: Record<string, string> = {}): StorageLike => {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => { m.set(k, v); },
    removeItem: (k) => { m.delete(k); },
  };
};

describe('demo dataset', () => {
  it('every seeded item is tagged isDemo', () => {
    expect(buildDemoExpenses().every(e => e.isDemo === true)).toBe(true);
    expect(buildDemoGoals().every(g => g.isDemo === true)).toBe(true);
    expect(buildDemoBills().every(b => b.isDemo === true)).toBe(true);
  });
  it('seeds a non-empty, realistic set', () => {
    expect(buildDemoExpenses().length).toBeGreaterThanOrEqual(4);
  });
});

describe('stripDemo', () => {
  it('removes only isDemo items', () => {
    const out = stripDemo([{ id: '1', isDemo: true }, { id: '2' }] as any);
    expect(out.map(i => i.id)).toEqual(['2']);
  });
});

describe('shouldSeedDemo', () => {
  it('true for a fresh guest (no auth profile, unseeded, empty)', () => {
    expect(shouldSeedDemo(makeStore())).toBe(true);
  });
  it('false when a user is signed in (auth profile cached)', () => {
    expect(shouldSeedDemo(makeStore({ [KEYS.authProfile]: '{"uid":"x"}' }))).toBe(false);
  });
  it('false when already seeded', () => {
    expect(shouldSeedDemo(makeStore({ [DEMO_FLAG]: '1' }))).toBe(false);
  });
  it('false when data already exists', () => {
    expect(shouldSeedDemo(makeStore({ [KEYS.expenses]: '[{"id":"1"}]' }))).toBe(false);
  });
});

describe('seedDemoIfNeeded', () => {
  it('seeds once and sets the flag', () => {
    const store = makeStore();
    expect(seedDemoIfNeeded(store)).toBe(true);
    expect(store.getItem(DEMO_FLAG)).toBe('1');
    expect(JSON.parse(store.getItem(KEYS.expenses)!).length).toBeGreaterThan(0);
    expect(seedDemoIfNeeded(store)).toBe(false);
  });
});

describe('clearDemoData', () => {
  it('removes demo items but keeps user items and zeroes income', () => {
    const store = makeStore();
    seedDemoIfNeeded(store);
    const withReal = [...JSON.parse(store.getItem(KEYS.expenses)!), { id: 'real', name: 'Mine', amount: 10, category: 'food', type: 'necessary', date: '2026-08-01', isRecurring: false }];
    store.setItem(KEYS.expenses, JSON.stringify(withReal));
    clearDemoData(store);
    const left = JSON.parse(store.getItem(KEYS.expenses)!);
    expect(left.map((e: any) => e.id)).toEqual(['real']);
    expect(JSON.parse(store.getItem(KEYS.profile)!).monthlyIncome).toBe(0);
  });
});
