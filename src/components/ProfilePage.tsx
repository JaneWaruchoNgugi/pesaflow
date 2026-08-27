import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import type { UserProfile, SubscriptionTier, AppView } from '../types';

interface ProfilePageProps {
  profile: UserProfile;
  uid: string;
  onNavigate: (view: AppView) => void;
}

const TIER_COLOR: Record<SubscriptionTier, string> = {
  free: '#9BAAC4', silver: '#C0C0C0', gold: '#C9A84C', platinum: '#A78BFA', pro: '#D97706',
};
const TIER_PRICE: Record<SubscriptionTier, number> = { free: 0, silver: 299, gold: 599, platinum: 999, pro: 299 };

const renewalDate = (profile: UserProfile): string | null => {
  const start = profile.subscriptionStart ?? profile.createdAt;
  if (!start || profile.tier === 'free') return null;
  const d = new Date(start);
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });
};

const daysUntilRenewal = (profile: UserProfile): number | null => {
  const start = profile.subscriptionStart ?? profile.createdAt;
  if (!start || profile.tier === 'free') return null;
  const d = new Date(start);
  d.setMonth(d.getMonth() + 1);
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
};

export const ProfilePage: React.FC<ProfilePageProps> = ({ profile, uid, onNavigate }) => {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMsg, setPinMsg] = useState('');
  const [nameMsg, setNameMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const trimmedPhone = phone.trim();
  const dirty = name.trim() !== profile.name || trimmedPhone !== (profile.phone ?? '');
  // Loose validation: allow an optional +, digits, spaces and dashes (7–15 chars).
  const phoneValid = trimmedPhone === '' || /^\+?[\d\s-]{7,15}$/.test(trimmedPhone);

  const handleSaveDetails = async () => {
    if (!name.trim() || !dirty) return;
    if (!phoneValid) { setNameMsg('Enter a valid phone number, e.g. 0712 345 678.'); return; }
    setSaving(true);
    const updates: Record<string, string> = {};
    if (name.trim() !== profile.name) updates.name = name.trim();
    if (trimmedPhone !== (profile.phone ?? '')) updates.phone = trimmedPhone;
    try {
      await updateDoc(doc(db, 'users', uid), updates);
      // Mirror into localStorage so the change survives a reload before the next profile fetch.
      const stored = JSON.parse(localStorage.getItem('finwise_auth_profile') || '{}');
      localStorage.setItem('finwise_auth_profile', JSON.stringify({ ...stored, ...updates }));
      setNameMsg('Saved!');
      setTimeout(() => setNameMsg(''), 3000);
    } catch {
      setNameMsg('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // The 6-digit PIN is the Firebase password. Changing it reauthenticates with the
  // current PIN, then calls updatePassword — no PIN is ever stored in Firestore.
  const handleChangePin = async () => {
    setPinMsg('');
    if (newPin.length !== 6) { setPinMsg('New PIN must be 6 digits.'); return; }
    if (newPin !== confirmPin) { setPinMsg('PINs do not match.'); return; }
    const user = auth.currentUser;
    if (!user?.email) { setPinMsg('You must be signed in to change your PIN.'); return; }
    setSaving(true);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPin));
      await updatePassword(user, newPin);
      setCurrentPin(''); setNewPin(''); setConfirmPin('');
      setPinMsg('PIN updated successfully!');
      setTimeout(() => setPinMsg(''), 3000);
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') setPinMsg('Current PIN is incorrect.');
      else if (code === 'auth/too-many-requests') setPinMsg('Too many attempts. Please try again later.');
      else setPinMsg('Could not update PIN. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const days = daysUntilRenewal(profile);
  const renewal = renewalDate(profile);
  const color = TIER_COLOR[profile.tier];
  const isPasswordUser = profile.authProvider === 'password';

  return (
    <div className="animate-in" style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20, padding: '8px 0 40px' }}>

      {/* Subscription card */}
      <div style={{ background: 'var(--bg-card)', border: `1px solid ${color}44`, borderRadius: 16, padding: '20px 24px' }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.1em', marginBottom: 8 }}>ACTIVE SUBSCRIPTION</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 26, fontWeight: 700, color }}>{profile.tier.charAt(0).toUpperCase() + profile.tier.slice(1)}</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
              {profile.tier === 'free' ? 'Free forever' : `KES ${TIER_PRICE[profile.tier].toLocaleString()}/month`}
            </div>
          </div>
          {profile.tier !== 'free' && days !== null && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: 'Cormorant Garamond, serif' }}>{days}d</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>until renewal</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Renews {renewal}</div>
            </div>
          )}
        </div>
        <button onClick={() => onNavigate('upgrade')} style={upgradeBtn}>
          Manage Plan →
        </button>
      </div>

      {/* User details */}
      <div style={card}>
        <div style={sectionTitle}>Personal Details</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          <label style={label}>Display Name</label>
          <input value={name} onChange={e => setName(e.target.value)} style={input} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          <label style={label}>Email</label>
          <input value={profile.email} disabled style={{ ...input, opacity: 0.5, cursor: 'not-allowed' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 }}>
          <label style={label}>Phone Number</label>
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="e.g. 0712 345 678"
            style={input}
          />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', margin: '6px 0 16px' }}>
          Member since {new Date(profile.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        {nameMsg && <div style={{ fontSize: 12, color: nameMsg === 'Saved!' ? 'var(--green)' : 'var(--red)', marginBottom: 8 }}>{nameMsg}</div>}
        <button onClick={handleSaveDetails} disabled={saving || !dirty || !name.trim()} style={{ ...saveBtn, opacity: !dirty || !name.trim() ? 0.5 : 1 }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Change PIN — email/PIN accounts only (Google users have no PIN) */}
      {isPasswordUser && (
      <div style={card}>
        <div style={sectionTitle}>Change PIN</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={label}>Current PIN</label>
            <input type="password" inputMode="numeric" maxLength={6} value={currentPin}
              onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))} style={input} placeholder="••••••" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={label}>New PIN</label>
            <input type="password" inputMode="numeric" maxLength={6} value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} style={input} placeholder="••••••" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={label}>Confirm New PIN</label>
            <input type="password" inputMode="numeric" maxLength={6} value={confirmPin}
              onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))} style={input} placeholder="••••••" />
          </div>
        </div>
        {pinMsg && (
          <div style={{ fontSize: 12, marginTop: 8, color: pinMsg.includes('success') ? 'var(--green)' : 'var(--red)' }}>{pinMsg}</div>
        )}
        <button onClick={handleChangePin} disabled={saving || !currentPin || !newPin || !confirmPin} style={{ ...saveBtn, marginTop: 14 }}>
          Update PIN
        </button>
      </div>
      )}
    </div>
  );
};

const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' };
const sectionTitle: React.CSSProperties = { fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 };
const label: React.CSSProperties = { fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' };
const input: React.CSSProperties = { background: 'var(--bg-surface)', border: '1px solid var(--border-s)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-1)', fontSize: 14, fontFamily: 'DM Sans, sans-serif', width: '100%', boxSizing: 'border-box' };
const saveBtn: React.CSSProperties = { padding: '10px 20px', background: 'var(--btn-gradient)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: 1 };
const upgradeBtn: React.CSSProperties = { marginTop: 14, padding: '9px 18px', background: 'var(--btn-gradient)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' };
