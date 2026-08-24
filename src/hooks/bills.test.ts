import { describe, it, expect } from 'vitest';
import { billMonthlyAmount, getMonthlyTotal } from './bills';
import type { Bill } from '../types';

const bill = (over: Partial<Bill>): Bill => ({
  id: 'b', name: 'B', amount: 0, category: 'other', dueDay: 1, frequency: 'monthly',
  status: 'upcoming', notes: '', isRecurring: true, ...over,
});

describe('billMonthlyAmount', () => {
  it('scales each frequency to a monthly figure', () => {
    expect(billMonthlyAmount(bill({ amount: 100, frequency: 'daily' }), 30)).toBe(3000);
    expect(billMonthlyAmount(bill({ amount: 100, frequency: 'weekly' }), 30)).toBe(400);
    expect(billMonthlyAmount(bill({ amount: 300, frequency: 'quarterly' }), 30)).toBe(100);
    expect(billMonthlyAmount(bill({ amount: 1200, frequency: 'annually' }), 30)).toBe(100);
    expect(billMonthlyAmount(bill({ amount: 500, frequency: 'monthly' }), 30)).toBe(500);
  });
});

describe('getMonthlyTotal', () => {
  it('sums monthly-equivalents across a mixed list (non-daily = multiplier-independent)', () => {
    const bills = [
      bill({ amount: 5000, frequency: 'monthly' }),
      bill({ amount: 300, frequency: 'quarterly' }),   // 100
      bill({ amount: 1200, frequency: 'annually' }),    // 100
      bill({ amount: 100, frequency: 'weekly' }),       // 400
    ];
    expect(getMonthlyTotal(bills)).toBe(5600);
  });
});
