import React from 'react';

interface MonthSelectorProps {
  months: string[];        // 'YYYY-MM', newest-first
  value: string;
  onChange: (month: string) => void;
}

const label = (m: string): string => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
};

export const MonthSelector: React.FC<MonthSelectorProps> = ({ months, value, onChange }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    aria-label="Select month"
    style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-1)',
      borderRadius: 8, padding: '7px 12px', fontSize: 13, fontFamily: 'Karla, sans-serif', cursor: 'pointer',
    }}
  >
    {months.map((m) => <option key={m} value={m}>{label(m)}</option>)}
  </select>
);
