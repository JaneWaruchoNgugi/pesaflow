import { describe, it, expect } from 'vitest';
import { collectGuestData } from './guestMigration';
import { KEYS, seedDemoIfNeeded, type StorageLike } from './demoData';

const makeStore = (init: Record<string, string> = {}): StorageLike => {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => { m.set(k, v); },
    removeItem: (k) => { m.delete(k); },
  };
};

describe('collectGuestData', () => {
  it('drops demo items and keeps user items', () => {
    const store = makeStore();
    seedDemoIfNeeded(store);
    const expenses = [...JSON.parse(store.getItem(KEYS.expenses)!), { id: 'r1', isDemo: false }];
    store.setItem(KEYS.expenses, JSON.stringify(expenses));
    const out = collectGuestData(store);
    expect(out.expenses.map(e => e.id)).toEqual(['r1']);
    expect(out.goals).toEqual([]);
    expect(out.bills).toEqual([]);
  });

  it('excludes a demo profile but keeps a user profile', () => {
    const demoStore = makeStore();
    seedDemoIfNeeded(demoStore);
    expect(collectGuestData(demoStore).profile).toBeNull();

    const userStore = makeStore({ [KEYS.profile]: JSON.stringify({ monthlyIncome: 30000, currency: 'KES' }) });
    expect(collectGuestData(userStore).profile?.monthlyIncome).toBe(30000);
  });
});
