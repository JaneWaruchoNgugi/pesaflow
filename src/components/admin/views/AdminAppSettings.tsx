import React, { useEffect, useState } from 'react';
import { addDoc, collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { adminDb as db } from '../../../lib/firebase';
import type { AdminUser } from '../../../types';

interface AppConfig {
  silverPrice: number;
  goldPrice: number;
  supportEmail: string;
  supportPhone: string;
  gracePeriodDays: number;
  maintenanceMode: boolean;
  paymentsEnabled: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_CONFIG: AppConfig = {
  silverPrice: 299,
  goldPrice: 599,
  supportEmail: 'support@finwise.app',
  supportPhone: '',
  gracePeriodDays: 3,
  maintenanceMode: false,
  paymentsEnabled: true,
};

const writeAudit = async (admin: AdminUser, summary: string) => {
  await addDoc(collection(db, 'auditLogs'), {
    action: 'app_settings_updated',
    actorEmail: admin.email,
    actorRole: admin.role,
    targetType: 'appConfig',
    targetId: 'adminSettings',
    summary,
    createdAt: new Date().toISOString(),
  });
};

export const AdminAppSettings: React.FC<{ admin: AdminUser }> = ({ admin }) => {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getDoc(doc(db, 'appConfig', 'adminSettings')).then(snap => {
      if (snap.exists()) setConfig({ ...DEFAULT_CONFIG, ...snap.data() } as AppConfig);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...config, updatedAt: new Date().toISOString(), updatedBy: admin.email };
    await setDoc(doc(db, 'appConfig', 'adminSettings'), payload, { merge: true });
    await writeAudit(admin, 'Updated plan prices, support settings, or operational toggles.');
    setConfig(payload);
    setMsg('Settings saved.');
    setTimeout(() => setMsg(''), 2500);
  };

  if (loading) return <div style={{ color: 'var(--text-3)', padding: 32 }}>Loading settings...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div><h2 style={heading}>App Configuration</h2><div style={subhead}>Business settings for plans, support, and operational controls.</div></div>
      <form onSubmit={save} style={panelStyle}>
        <div style={sectionTitle}>Plan Prices</div>
        <div style={grid3}>
          <Field label="Silver price" value={config.silverPrice} onChange={value => setConfig(c => ({ ...c, silverPrice: Number(value) }))} />
          <Field label="Gold price" value={config.goldPrice} onChange={value => setConfig(c => ({ ...c, goldPrice: Number(value) }))} />
        </div>

        <div style={sectionTitle}>Support</div>
        <div style={grid2}>
          <TextField label="Support email" value={config.supportEmail} onChange={value => setConfig(c => ({ ...c, supportEmail: value }))} />
          <TextField label="Support phone" value={config.supportPhone} onChange={value => setConfig(c => ({ ...c, supportPhone: value }))} />
        </div>

        <div style={sectionTitle}>Operations</div>
        <div style={grid3}>
          <Field label="Grace period days" value={config.gracePeriodDays} onChange={value => setConfig(c => ({ ...c, gracePeriodDays: Number(value) }))} />
          <label style={toggleStyle}><input type="checkbox" checked={config.paymentsEnabled} onChange={e => setConfig(c => ({ ...c, paymentsEnabled: e.target.checked }))} /> Payments enabled</label>
          <label style={toggleStyle}><input type="checkbox" checked={config.maintenanceMode} onChange={e => setConfig(c => ({ ...c, maintenanceMode: e.target.checked }))} /> Maintenance mode</label>
        </div>

        <button type="submit" style={btnStyle}>Save Configuration</button>
        {msg && <div style={{ color: 'var(--green)', fontSize: 12 }}>{msg}</div>}
        {config.updatedAt && <div style={{ color: 'var(--text-3)', fontSize: 11 }}>Last updated by {config.updatedBy || 'unknown'} on {new Date(config.updatedAt).toLocaleString('en-KE')}</div>}
      </form>
    </div>
  );
};

const Field: React.FC<{ label: string; value: number; onChange: (value: string) => void }> = ({ label, value, onChange }) => <label style={labelStyle}><span>{label}</span><input type="number" min="0" value={value} onChange={e => onChange(e.target.value)} style={inputStyle} /></label>;
const TextField: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => <label style={labelStyle}><span>{label}</span><input value={value} onChange={e => onChange(e.target.value)} style={inputStyle} /></label>;
const heading: React.CSSProperties = { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: 0 };
const subhead: React.CSSProperties = { color: 'var(--text-3)', fontSize: 12, marginTop: 4 };
const panelStyle: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 };
const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginTop: 4 };
const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 };
const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text-3)', fontSize: 12 };
const inputStyle: React.CSSProperties = { padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-s)', background: 'var(--bg-surface)', color: 'var(--text-1)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' };
const toggleStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', fontSize: 13, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px' };
const btnStyle: React.CSSProperties = { padding: '10px 14px', borderRadius: 8, border: 'none', background: 'var(--btn-gradient)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', alignSelf: 'flex-start' };
