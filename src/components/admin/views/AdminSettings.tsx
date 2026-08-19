import React, { useEffect, useState } from 'react';
import { addDoc, collection, getDocs } from 'firebase/firestore';
import { adminDb as db } from '../../../lib/firebase';
import type { AdminUser, AdminRole } from '../../../types';
import { useAdminAuth } from '../../../hooks/useAdminAuth';

const ROLE_COLOR: Record<AdminRole, string> = {
  super_admin: '#A78BFA', support: '#34D399', finance: '#60A5FA',
};

export const AdminSettings: React.FC<{ admin: AdminUser }> = ({ admin }) => {
  const { createAdmin, deleteAdmin } = useAdminAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [form, setForm] = useState({ email: '', password: '', role: 'support' as AdminRole });
  const [msg, setMsg] = useState('');

  const load = () => getDocs(collection(db, 'admins')).then(snap =>
    setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() }) as AdminUser))
  );

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAdmin(form.email, form.password, form.role);
    await addDoc(collection(db, 'auditLogs'), { action: 'admin_created', actorEmail: admin.email, actorRole: admin.role, targetType: 'admin', targetId: form.email, summary: `Created ${form.role} admin`, createdAt: new Date().toISOString() });
    setMsg('Admin created.');
    setForm({ email: '', password: '', role: 'support' });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this admin?')) return;
    await deleteAdmin(id);
    await addDoc(collection(db, 'auditLogs'), { action: 'admin_removed', actorEmail: admin.email, actorRole: admin.role, targetType: 'admin', targetId: id, summary: 'Removed admin account', createdAt: new Date().toISOString() });
    load();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h2 style={heading}>Admin Settings</h2>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 14 }}>Create Admin</div>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input placeholder="Email" type="email" required value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
          <input placeholder="Password" type="password" required value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))} style={inputStyle} />
          <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as AdminRole }))} style={inputStyle}>
            <option value="support">Support</option>
            <option value="finance">Finance</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <button type="submit" style={btnStyle}>Create Admin</button>
          {msg && <div style={{ fontSize: 12, color: 'var(--green)' }}>{msg}</div>}
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Existing Admins</div>
        {admins.map(a => (
          <div key={a.id} style={rowStyle}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{a.email}</div>
              <div style={{ fontSize: 11, color: ROLE_COLOR[a.role], fontWeight: 700, marginTop: 2 }}>{a.role.replace('_', ' ')}</div>
            </div>
            <button onClick={() => handleDelete(a.id)} style={deleteBtnStyle}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const heading: React.CSSProperties = { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: 0 };
const inputStyle: React.CSSProperties = { padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border-s)', background: 'var(--bg-surface)', color: 'var(--text-1)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' as const };
const btnStyle: React.CSSProperties = { padding: '10px', borderRadius: 8, border: 'none', background: 'var(--btn-gradient)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' };
const deleteBtnStyle: React.CSSProperties = { padding: '5px 12px', borderRadius: 6, border: '1px solid var(--red)', background: 'var(--red-dim)', color: 'var(--red)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' };
