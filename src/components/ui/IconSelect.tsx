import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface IconSelectOption<T extends string> {
  value: T;
  label: string;
  icon: LucideIcon;
  color?: string;
  group?: string;
}

interface IconSelectProps<T extends string> {
  value: T;
  options: IconSelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * A dropdown that renders real lucide icons per option — native <option> elements
 * can only hold text, so this replaces <select> anywhere we want iconified choices.
 */
export function IconSelect<T extends string>({ value, options, onChange, disabled, placeholder }: IconSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Preserve group order by first appearance; ungrouped options share the '' bucket.
  const groups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, IconSelectOption<T>[]>();
    for (const opt of options) {
      const g = opt.group ?? '';
      if (!map.has(g)) { map.set(g, []); order.push(g); }
      map.get(g)!.push(opt);
    }
    return order.map(g => ({ label: g, items: map.get(g)! }));
  }, [options]);

  const SelIcon = selected?.icon;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        style={{ ...S.trigger, opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        <span style={S.triggerLeft}>
          {SelIcon && <SelIcon size={16} strokeWidth={2.1} style={{ color: selected?.color ?? 'var(--gold)', flexShrink: 0 }} />}
          <span style={S.triggerLabel}>{selected?.label ?? placeholder ?? 'Select…'}</span>
        </span>
        <ChevronDown size={16} style={{ color: 'var(--text-3)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>

      {open && (
        <div style={S.menu} role="listbox">
          {groups.map((grp, gi) => (
            <div key={grp.label || `g${gi}`}>
              {grp.label && <div style={S.groupLabel}>{grp.label}</div>}
              {grp.items.map(opt => {
                const OptIcon = opt.icon;
                const isSel = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    onClick={() => { onChange(opt.value); setOpen(false); }}
                    style={{ ...S.option, ...(isSel ? S.optionActive : {}) }}
                    onMouseEnter={e => { if (!isSel) (e.currentTarget.style.background = 'var(--bg-surface)'); }}
                    onMouseLeave={e => { if (!isSel) (e.currentTarget.style.background = 'transparent'); }}
                  >
                    <OptIcon size={16} strokeWidth={2.1} style={{ color: opt.color ?? 'var(--gold)', flexShrink: 0 }} />
                    <span style={S.optionLabel}>{opt.label}</span>
                    {isSel && <Check size={15} strokeWidth={2.6} style={{ color: 'var(--gold)', flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  trigger: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-1)', fontSize: 14, fontFamily: 'Karla, sans-serif' },
  triggerLeft: { display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 },
  triggerLabel: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  menu: { position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 60, background: 'var(--bg-card)', border: '1px solid var(--border-acc)', borderRadius: 10, padding: 6, boxShadow: 'var(--shadow-lg, 0 12px 32px rgba(0,0,0,0.25))', maxHeight: 280, overflowY: 'auto' },
  groupLabel: { fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, padding: '8px 10px 4px' },
  option: { width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--text-1)', fontSize: 14, fontFamily: 'Karla, sans-serif', cursor: 'pointer', textAlign: 'left' },
  optionActive: { background: 'var(--gold-dim)', color: 'var(--gold)' },
  optionLabel: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
};
