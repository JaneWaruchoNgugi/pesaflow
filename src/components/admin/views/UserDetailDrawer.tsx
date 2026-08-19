import React, { useEffect, useState } from 'react';
import { X, Check, Ban, Trash2 } from 'lucide-react';
import { addDoc, collection, getDocs, doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { adminDb as db } from '../../../lib/firebase';
import type { AdminUser } from '../../../types';

interface UserDetailDrawerProps {
  uid: string;
  name: string;
  blacklisted?: boolean;
  isSuperAdmin: boolean;
  admin: AdminUser;
  onClose: () => void;
  onDeleted: (uid: string) => void;
  onBlacklistToggled: (uid: string, blacklisted: boolean) => void;
}

interface UserData {
  profile: Record<string, unknown> | null;
  expenses: unknown[];
  investments: unknown[];
  goals: unknown[];
  bills: unknown[];
  networth: unknown[];
  emergency: Record<string, unknown> | null;
  supportNotes: Record<string, unknown>[];
}

const SUBCOLLECTIONS = ['expenses', 'investments', 'goals', 'bills', 'networth'] as const;

export const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({
  uid, name, blacklisted, isSuperAdmin, admin, onClose, onDeleted, onBlacklistToggled,
}) => {
  const [data, setData] = useState<UserData | null>(null);
  const [tab, setTab] = useState<string>('profile');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    const load = async () => {
      const [profileSnap, emergencySnap, ...colSnaps] = await Promise.all([
        getDoc(doc(db, 'users', uid)),
        getDoc(doc(db, 'users', uid, 'data', 'emergencyFund')),
        getDocs(collection(db, 'users', uid, 'supportNotes')),
        ...SUBCOLLECTIONS.map(c => getDocs(collection(db, 'users', uid, c))),
      ]);
      setData({
        profile:     profileSnap.exists() ? profileSnap.data() as Record<string, unknown> : null,
        emergency:   emergencySnap.exists() ? emergencySnap.data() as Record<string, unknown> : null,
        supportNotes: colSnaps[0].docs.map(d => ({ id: d.id, ...d.data() })),
        expenses:    colSnaps[1].docs.map(d => d.data()),
        investments: colSnaps[2].docs.map(d => d.data()),
        goals:       colSnaps[3].docs.map(d => d.data()),
        bills:       colSnaps[4].docs.map(d => d.data()),
        networth:    colSnaps[5].docs.map(d => d.data()),
      });
    };
    load();
  }, [uid]);

  const handleDelete = async () => {
    if (!confirm(`Permanently delete ${name} and all their data? This cannot be undone.`)) return;
    setBusy(true);
    const batch = writeBatch(db);
    for (const col of SUBCOLLECTIONS) {
      const snap = await getDocs(collection(db, 'users', uid, col));
      snap.docs.forEach(d => batch.delete(d.ref));
    }
    batch.delete(doc(db, 'users', uid));
    await batch.commit();
    onDeleted(uid);
    onClose();
  };

  const handleBlacklist = async () => {
    const next = !blacklisted;
    if (!confirm(`${next ? 'Blacklist' : 'Unblacklist'} ${name}?`)) return;
    setBusy(true);
    await updateDoc(doc(db, 'users', uid), { blacklisted: next });
    onBlacklistToggled(uid, next);
    setBusy(false);
  };

  const addSupportNote = async () => {
    if (!note.trim()) return;
    const payload = { note: note.trim(), createdBy: admin.email, createdAt: new Date().toISOString() };
    const ref = await addDoc(collection(db, 'users', uid, 'supportNotes'), payload);
    await addDoc(collection(db, 'auditLogs'), { action: 'user_note_added', actorEmail: admin.email, actorRole: admin.role, targetType: 'user', targetId: uid, summary: note.trim(), createdAt: new Date().toISOString() });
    setData(prev => prev ? { ...prev, supportNotes: [{ id: ref.id, ...payload }, ...prev.supportNotes] } : prev);
    setNote('');
  };

  const tabs = [
    { key: 'profile',     label: 'Profile' },
    { key: 'supportNotes', label: `Notes${data ? ` (${data.supportNotes.length})` : ''}` },
    { key: 'expenses',    label: `Expenses${data ? ` (${data.expenses.length})` : ''}` },
    { key: 'investments', label: `Investments${data ? ` (${data.investments.length})` : ''}` },
    { key: 'goals',       label: `Goals${data ? ` (${data.goals.length})` : ''}` },
    { key: 'bills',       label: `Bills${data ? ` (${data.bills.length})` : ''}` },
    { key: 'networth',    label: `Net Worth${data ? ` (${data.networth.length})` : ''}` },
    { key: 'emergency',   label: 'Emergency Fund' },
  ];

  const currentData = data
    ? (tab === 'profile' ? data.profile : tab === 'emergency' ? data.emergency : data[tab as keyof UserData])
    : null;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100 }} />
      <div style={drawer}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>{name}</div>
              {blacklisted && <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red-b)', borderRadius: 4, padding: '2px 6px' }}>BLACKLISTED</span>}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{uid}</div>
          </div>
          <button onClick={onClose} style={{ ...closeBtn, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Close"><X size={16} strokeWidth={2.4} /></button>
        </div>

        {isSuperAdmin && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button onClick={handleBlacklist} disabled={busy} style={{
              ...actionBtn,
              background: blacklisted ? 'var(--green-dim)' : 'var(--amber-dim)',
              color: blacklisted ? 'var(--green)' : 'var(--amber)',
              border: `1px solid ${blacklisted ? 'var(--green-b)' : 'rgba(217,119,6,0.3)'}`,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              {blacklisted
                ? <><Check size={14} strokeWidth={2.6} /> Unblacklist</>
                : <><Ban size={14} strokeWidth={2.4} /> Blacklist</>}
            </button>
            <button onClick={handleDelete} disabled={busy} style={{ ...actionBtn, background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red-b)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Trash2 size={14} strokeWidth={2.4} /> Delete User
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              ...tabBtn,
              background: tab === t.key ? 'var(--gold-dim)' : 'var(--bg-surface)',
              color: tab === t.key ? 'var(--gold)' : 'var(--text-3)',
              border: `1px solid ${tab === t.key ? 'var(--border-acc)' : 'var(--border)'}`,
            }}>{t.label}</button>
          ))}
        </div>

        {tab === 'supportNotes' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input placeholder="Add support note..." value={note} onChange={e => setNote(e.target.value)} style={{ ...noteInput, flex: 1 }} />
            <button onClick={addSupportNote} style={actionBtn}>Add Note</button>
          </div>
        )}

        {!data ? (
          <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Loading...</div>
        ) : !currentData || (Array.isArray(currentData) && currentData.length === 0) ? (
          <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No data.</div>
        ) : Array.isArray(currentData) ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {currentData.map((item, i) => <DataCard key={i} data={item as Record<string, unknown>} />)}
          </div>
        ) : (
          <DataCard data={currentData as Record<string, unknown>} />
        )}
      </div>
    </>
  );
};

const DataCard: React.FC<{ data: Record<string, unknown> }> = ({ data }) => (
  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
    {Object.entries(data).filter(([k]) => k !== 'id').map(([k, v]) => (
      <div key={k} style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-3)', minWidth: 120, flexShrink: 0 }}>{k}</span>
        <span style={{ color: 'var(--text-1)', wordBreak: 'break-all' }}>
          {typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}
        </span>
      </div>
    ))}
  </div>
);

const drawer: React.CSSProperties = {
  position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, maxWidth: '95vw',
  background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
  zIndex: 101, padding: '28px 24px', overflowY: 'auto',
  boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
};
const closeBtn: React.CSSProperties = {
  background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8,
  width: 32, height: 32, cursor: 'pointer', color: 'var(--text-2)', fontSize: 14, flexShrink: 0,
};
const tabBtn: React.CSSProperties = {
  padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
};
const actionBtn: React.CSSProperties = {
  padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700,
  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
};

const noteInput: React.CSSProperties = { padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border-s)', background: 'var(--bg-surface)', color: 'var(--text-1)', fontSize: 12, fontFamily: 'DM Sans, sans-serif' };
