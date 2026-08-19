import type { Expense, Investment } from '../types';
import {CATEGORY_META} from "../utils/expenses.ts";
import {INVESTMENT_META} from "../utils/investments.ts";


const download = (content: string, filename: string, mime = 'text/csv') => {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const escapeCsv = (val: string | number): string => {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export const exportExpensesToCSV = (expenses: Expense[], month?: string) => {
  const rows = [['Date', 'Name', 'Category', 'Type', 'Amount (KES)', 'Recurring']];
  for (const e of expenses) {
    const meta = CATEGORY_META[e.category];
    rows.push([e.date, e.name, meta.label, meta.type, String(e.amount), e.isRecurring ? 'Yes' : 'No']);
  }
  const csv = rows.map((r) => r.map(escapeCsv).join(',')).join('\n');
  download(csv, `finwise-expenses${month ? `-${month}` : ''}.csv`);
};

export const exportInvestmentsToCSV = (investments: Investment[]) => {
  const rows = [['Date', 'Name', 'Category', 'Amount (KES)', 'Expected Return %', 'Status', 'Recurring', 'Notes']];
  for (const inv of investments) {
    const meta = INVESTMENT_META[inv.category];
    rows.push([
      inv.date, inv.name, meta.label, String(inv.amount),
      String(inv.expectedReturnPct), inv.status,
      inv.isRecurring ? 'Yes' : 'No', inv.notes,
    ]);
  }
  const csv = rows.map((r) => r.map(escapeCsv).join(',')).join('\n');
  download(csv, 'finwise-investments.csv');
};

export const exportNetWorthToCSV = (items: import('../types').NetWorthItem[]) => {
  const rows = [['Type', 'Name', 'Category', 'Amount (KES)', 'Notes']];
  for (const item of items) {
    rows.push([item.type, item.name, item.category, String(item.amount), item.notes]);
  }
  const csv = rows.map((r) => r.map(escapeCsv).join(',')).join('\n');
  download(csv, 'finwise-networth.csv');
};
