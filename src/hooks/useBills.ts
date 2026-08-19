import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Bill, BillStatus } from '../types';
import { generateId } from '../utils/expenses';
import { getMonthlyTotal, getUpcomingBills, sortBillsByDueDate } from "./bills.ts";
import { syncCollection, deleteFromCollection, fetchCollection } from '../lib/sync';

const STORAGE_KEY = 'finwise_bills';
const load = (): Bill[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
};

export const useBills = () => {
  const [bills, setBills] = useState<Bill[]>(load);

  // Hydrate from Firestore on mount so bills load across devices, not just localStorage.
  useEffect(() => {
    let alive = true;
    fetchCollection<Bill>('bills').then(remote => {
      if (alive && remote) { setBills(remote); localStorage.setItem(STORAGE_KEY, JSON.stringify(remote)); }
    });
    return () => { alive = false; };
  }, []);

  const persist = (updated: Bill[]) => {
    setBills(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    syncCollection('bills', updated);
  };

  const addBill = useCallback((data: Omit<Bill, 'id'>) => {
    persist([...bills, { ...data, id: generateId() }]);
  }, [bills]);

  const removeBill = useCallback((id: string) => {
    const updated = bills.filter((b) => b.id !== id);
    setBills(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    deleteFromCollection('bills', id);
  }, [bills]);

  const markPaid = useCallback((id: string) => {
    persist(bills.map((b) => b.id === id ? { ...b, status: 'paid' as BillStatus, lastPaidDate: new Date().toISOString().slice(0, 10) } : b));
  }, [bills]);

  const markUnpaid = useCallback((id: string) => {
    persist(bills.map((b) => b.id === id ? { ...b, status: 'upcoming' as BillStatus } : b));
  }, [bills]);

  const sortedBills      = useMemo(() => sortBillsByDueDate(bills), [bills]);
  const monthlyTotal     = useMemo(() => getMonthlyTotal(bills), [bills]);
  const upcomingThisWeek = useMemo(() => getUpcomingBills(bills, 7), [bills]);
  const overdueCount     = useMemo(() => bills.filter((b) => b.status === 'overdue').length, [bills]);
  const paidCount        = useMemo(() => bills.filter((b) => b.status === 'paid').length, [bills]);

  return { bills, sortedBills, monthlyTotal, upcomingThisWeek, overdueCount, paidCount, addBill, removeBill, markPaid, markUnpaid };
};
