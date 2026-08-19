import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { adminDb as db } from '../../../lib/firebase';
import type { AdminUser, UserProfile, SubscriptionTier } from '../../../types';
import { UserDetailDrawer } from './UserDetailDrawer';
import { TIER_COLOR, TIER_LABEL, ACTIVE_TIERS, LEGACY_TIERS, GOLD_COMING_SOON } from '../../../lib/tiers';

// Change-tier dropdown keeps every tier so an admin can still set a legacy tier.
const TIERS: SubscriptionTier[] = [...ACTIVE_TIERS, ...LEGACY_TIERS];

interface UserRow extends UserProfile { uid: string; }

export const AdminUsers: React.FC<{ canEdit: boolean; admin: AdminUser }> = ({ canEdit, admin }) => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<UserRow | null>(null);

  useEffect(() => {
    getDocs(collection(db, 'users'))
      .then(snap => setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() }) as UserRow)))
      .catch((err: { code?: string }) => {
        console.error('Failed to load users:', err);
        setError(err?.code === 'permission-denied'
          ? 'Your admin session lost its admin access (it can be replaced by signing in as a regular user in the same browser, or it expired). Please sign out and sign back into the admin panel.'
          : 'Could not load users. Check your connection and try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  const changeTier = async (uid: string, tier: SubscriptionTier) => {
    await updateDoc(doc(db, 'users', uid), { tier });
    setUsers(prev => prev.map(u => u.uid === uid ? { ...u, tier } : u));
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search)
  );

  if (loading) return <div style={{ color: 'var(--text-3)', padding: 32 }}>Loading…</div>;
  if (error) return (
    <div style={{ padding: 32, maxWidth: 520 }}>
      <div style={{ color: 'var(--red, #DC2626)', background: 'var(--red-dim, #FEF2F2)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 10, padding: '14px 16px', fontSize: 14, lineHeight: 1.5 }}>
        {error}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={heading}>Users <span style={{ fontSize: 14, color: 'var(--text-3)', fontFamily: 'DM Sans' }}>({users.length})</span></h2>

      <input
        placeholder="Search by name or phone…"
        value={search} onChange={e => setSearch(e.target.value)}
        style={inputStyle}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(u => (
          <div key={u.uid} onClick={() => setSelected(u)} style={{ ...rowStyle, cursor: 'pointer' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>{u.name}</span>
                {u.blacklisted && <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red-b)', borderRadius: 4, padding: '1px 5px' }}>BLACKLISTED</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{u.phone}</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginRight: 12 }}>
              {new Date(u.createdAt).toLocaleDateString()}
            </div>
            {canEdit ? (
              <select
                value={u.tier}
                onClick={e => e.stopPropagation()}
                onChange={e => { e.stopPropagation(); changeTier(u.uid, e.target.value as SubscriptionTier); }}
                style={{ ...selectStyle, color: TIER_COLOR[u.tier] }}
              >
                {TIERS.map(t => (
                  <option key={t} value={t}>
                    {TIER_LABEL[t]}{t === 'gold' && GOLD_COMING_SOON ? ' (coming soon)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <span style={{ fontSize: 12, fontWeight: 700, color: TIER_COLOR[u.tier] }}>
                {TIER_LABEL[u.tier]}{u.tier === 'gold' && GOLD_COMING_SOON ? ' (coming soon)' : ''}
              </span>
            )}
          </div>
        ))}
        {filtered.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 13, padding: 16 }}>No users found.</div>}
      </div>

      {selected && (
        <UserDetailDrawer
          uid={selected.uid}
          name={selected.name}
          blacklisted={selected.blacklisted}
          isSuperAdmin={canEdit}
          admin={admin}
          onClose={() => setSelected(null)}
          onDeleted={(uid) => setUsers(prev => prev.filter(u => u.uid !== uid))}
          onBlacklistToggled={(uid, blacklisted) => {
            setUsers(prev => prev.map(u => u.uid === uid ? { ...u, blacklisted } : u));
            setSelected(prev => prev ? { ...prev, blacklisted } : null);
          }}
        />
      )}
    </div>
  );
};

const heading: React.CSSProperties = { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: 0 };
const inputStyle: React.CSSProperties = { padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border-s)', background: 'var(--bg-surface)', color: 'var(--text-1)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', width: '100%', boxSizing: 'border-box' };
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' };
const selectStyle: React.CSSProperties = { background: 'var(--bg-surface)', border: '1px solid var(--border-s)', borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' };
