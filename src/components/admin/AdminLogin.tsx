import React, { useState } from 'react';
import { Shield } from 'lucide-react';

interface AdminLoginProps {
  login: (email: string, password: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ login, loading, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <div style={overlay}>
      <form onSubmit={handleSubmit} style={card}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><Shield size={28} color="var(--gold)" /></div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>
            Admin Access
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>PesaFlow Control Panel</div>
        </div>

        <input
          type="email" placeholder="Admin email" value={email}
          onChange={e => setEmail(e.target.value)}
          required style={inputStyle}
        />
        <input
          type="password" placeholder="Password" value={password}
          onChange={e => setPassword(e.target.value)}
          required style={{ ...inputStyle, marginTop: 10 }}
        />

        {error && <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{error}</div>}

        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? 'Verifying…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
};

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'var(--bg-page)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
};
const card: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 16, padding: '36px 32px', width: '100%', maxWidth: 360,
  boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1px solid var(--border-s)', background: 'var(--bg-surface)',
  color: 'var(--text-1)', fontSize: 14, fontFamily: 'DM Sans, sans-serif',
  boxSizing: 'border-box',
};
const btnStyle: React.CSSProperties = {
  marginTop: 18, padding: '11px', borderRadius: 8, border: 'none',
  background: 'var(--btn-gradient)', color: '#fff', fontWeight: 700,
  fontSize: 14, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
};
