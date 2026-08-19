import React, { useState, useRef, useEffect } from 'react';

interface AuthGateProps {
  status: 'signed-out' | 'unverified' | 'needs-phone';
  onSignUp: (name: string, email: string, phone: string, pin: string) => void;
  onSignIn: (email: string, pin: string) => Promise<boolean>;
  onGoogle: () => Promise<boolean>;
  onSavePhone: (phone: string) => Promise<boolean>;
  onResendVerification: () => void;
  onRefreshVerification: () => void;
  onSendPinReset: (email: string) => Promise<boolean>;
  loading?: boolean;
  error?: string | null;
  defaultMode?: 'login' | 'signup';
}

const PIN_LENGTH = 6;

const PinInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  error: boolean;
  autoFocus?: boolean;
}> = ({ value, onChange, onComplete, error, autoFocus }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH);
    onChange(v);
    if (v.length === PIN_LENGTH) onComplete?.(v);
  };

  return (
    <div style={{ position: 'relative', marginBottom: 4 }} onClick={() => inputRef.current?.focus()}>
      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', top: 0, left: 0, cursor: 'pointer' }}
        autoFocus={autoFocus}
      />
      <div style={{ display: 'flex', gap: 9, justifyContent: 'center', padding: '12px 0' }}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div key={i} style={{
            width: 46, height: 52, borderRadius: 14,
            background: error ? 'rgba(220,38,38,0.08)' : i < value.length ? 'rgba(167,139,250,0.18)' : 'rgba(167,139,250,0.10)',
            border: `2px solid ${error ? 'rgba(220,38,38,0.4)' : i < value.length ? 'rgba(167,139,250,0.7)' : 'rgba(167,139,250,0.35)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
          }}>
            {i < value.length && <div style={{ width: 9, height: 9, borderRadius: '50%', background: error ? 'var(--red)' : '#A78BFA' }} />}
          </div>
        ))}
      </div>
    </div>
  );
};

const GoogleButton: React.FC<{ onClick: () => void; disabled?: boolean; label: string }> = ({ onClick, disabled, label }) => (
  <button type="button" style={S.googleBtn} disabled={disabled} onClick={onClick}>
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 34.9 26.7 36 24 36c-5.3 0-9.7-2.6-11.3-6.9l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C39.9 36 44 30.6 44 24c0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
    {label}
  </button>
);

export const AuthGate: React.FC<AuthGateProps> = ({
  status, onSignUp, onSignIn, onGoogle, onSavePhone,
  onResendVerification, onRefreshVerification, onSendPinReset,
  loading, error: authError, defaultMode,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode ?? 'signup');

  // Signup
  const [name, setName] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPhone, setSuPhone] = useState('');
  const [suPin, setSuPin] = useState('');
  const [suConfirm, setSuConfirm] = useState('');
  const [suStep, setSuStep] = useState<'info' | 'pin' | 'confirm'>('info');
  const [suErr, setSuErr] = useState('');

  // Login
  const [liEmail, setLiEmail] = useState('');
  const [liPin, setLiPin] = useState('');
  const [liStep, setLiStep] = useState<'email' | 'pin' | 'reset'>('email');
  const [liErr, setLiErr] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Add-phone
  const [phoneOnly, setPhoneOnly] = useState('');
  const [phoneErr, setPhoneErr] = useState('');

  const handleSignupInfoContinue = () => {
    setSuErr('');
    if (!name.trim()) { setSuErr('Enter your name.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(suEmail.trim())) { setSuErr('Enter a valid email address.'); return; }
    if (!/^0[17]\d{8}$/.test(suPhone.replace(/[^\d+]/g, '').replace(/^\+?254/, '0'))) {
      setSuErr('Enter a valid Kenyan phone number, e.g. 0712 345 678 or 0110 123 456.');
      return;
    }
    setSuStep('pin');
  };

  const handleSignupConfirm = (v: string) => {
    setTimeout(() => {
      if (v !== suPin) { setSuErr('PINs do not match.'); setSuConfirm(''); setSuPin(''); setSuStep('pin'); }
      else onSignUp(name.trim(), suEmail.trim(), suPhone.trim(), v);
    }, 120);
  };

  const handleLoginPinComplete = (v: string) => {
    if (loading) return;
    setLiErr('');
    setTimeout(async () => { const ok = await onSignIn(liEmail.trim(), v); if (!ok) setLiPin(''); }, 120);
  };

  const handleReset = async () => {
    setLiErr('');
    const ok = await onSendPinReset(liEmail.trim());
    if (ok) setResetSent(true);
  };

  const handleSavePhone = async () => {
    setPhoneErr('');
    const ok = await onSavePhone(phoneOnly.trim());
    if (!ok) setPhoneErr(authError || 'Enter a valid Kenyan phone number.');
  };

  const switchToLogin = () => { setSuStep('info'); setSuErr(''); setMode('login'); };
  const switchToSignup = () => { setLiStep('email'); setLiErr(''); setResetSent(false); setMode('signup'); };

  return (
    <div style={S.overlay}>
      <style>{`
        @keyframes authIn { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        .auth-card { animation: authIn 0.35s ease forwards; }
        @keyframes authSpin { to { transform: rotate(360deg); } }
      `}</style>
      <div style={S.bg} />
      <div style={S.card} className="auth-card">

        <div style={S.logoRow}>
          <div style={S.logoMark}><span style={S.logoSym}>P</span></div>
          <div>
            <div style={S.logoName}>PesaFlow</div>
            <div style={S.logoTag}>TRACK YOUR MONEY. GROW YOUR WEALTH. SLEEP BETTER.</div>
          </div>
        </div>

        {/* ADD PHONE (post-Google) */}
        {status === 'needs-phone' && (
          <>
            <div style={S.title}>One last thing</div>
            <p style={S.sub}>Add your M-Pesa phone number so we can process subscriptions.</p>
            <div style={S.field}>
              <label style={S.label}>Phone Number</label>
              <input style={S.input} type="tel" placeholder="e.g. 0712 345 678" value={phoneOnly} autoFocus
                onChange={(e) => { setPhoneOnly(e.target.value.replace(/[^\d\s+]/g, '')); setPhoneErr(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSavePhone()} />
            </div>
            {loading && <div style={S.loadingBox}><span style={S.spinner} /> Saving…</div>}
            {(phoneErr || authError) && !loading && <div style={S.err}>{phoneErr || authError}</div>}
            <button style={{ ...S.btn, marginTop: 16, opacity: loading ? 0.6 : 1 }} disabled={loading} onClick={handleSavePhone}>Continue →</button>
          </>
        )}

        {/* VERIFY EMAIL */}
        {status === 'unverified' && (
          <>
            <div style={S.title}>Verify your email</div>
            <p style={S.sub}>We sent a verification link to your inbox. Click it, then come back and continue.</p>
            {loading && <div style={S.loadingBox}><span style={S.spinner} /> Checking…</div>}
            <button style={{ ...S.btn, marginTop: 8, opacity: loading ? 0.6 : 1 }} disabled={loading} onClick={onRefreshVerification}>I&apos;ve verified — continue</button>
            <div style={S.hint}>Didn&apos;t get it? <button style={S.link} onClick={onResendVerification}>Resend email</button></div>
          </>
        )}

        {/* LOGIN: email */}
        {status === 'signed-out' && mode === 'login' && liStep === 'email' && (
          <>
            <div style={S.title}>Welcome Back</div>
            <p style={S.sub}>Enter your email to continue</p>
            <div style={S.field}>
              <label style={S.label}>Email</label>
              <input style={S.input} type="email" placeholder="you@example.com" value={liEmail} autoFocus
                onChange={(e) => { setLiEmail(e.target.value); setLiErr(''); }}
                onKeyDown={(e) => e.key === 'Enter' && liEmail.trim() && setLiStep('pin')} />
            </div>
            <button style={{ ...S.btn, marginTop: 18, opacity: !liEmail.trim() || loading ? 0.5 : 1 }}
              disabled={!liEmail.trim() || loading} onClick={() => setLiStep('pin')}>Continue →</button>
            <div style={S.divider}><span style={S.dividerText}>or</span></div>
            <GoogleButton onClick={onGoogle} disabled={loading} label="Continue with Google" />
            <div style={S.hint}>No account? <button style={S.link} onClick={switchToSignup}>Create one</button></div>
          </>
        )}

        {/* LOGIN: pin */}
        {status === 'signed-out' && mode === 'login' && liStep === 'pin' && (
          <>
            <div style={S.title}>Enter PIN</div>
            <p style={S.sub}>Enter your 6-digit PIN</p>
            <PinInput value={liPin} onChange={(v) => { if (!loading) { setLiPin(v); setLiErr(''); } }} onComplete={handleLoginPinComplete} error={!!(liErr || authError)} autoFocus={!loading} />
            {loading && <div style={S.loadingBox}><span style={S.spinner} /> Checking…</div>}
            {(liErr || authError) && !loading && <div style={S.err}>{liErr || authError}</div>}
            <button style={{ ...S.backLink, opacity: loading ? 0.45 : 1 }} disabled={loading} onClick={() => { setLiPin(''); setLiErr(''); setLiStep('email'); }}>← Back</button>
            <div style={S.hint}>Forgot PIN? <button style={S.link} onClick={() => { setResetSent(false); setLiStep('reset'); }}>Reset PIN</button></div>
          </>
        )}

        {/* LOGIN: reset */}
        {status === 'signed-out' && mode === 'login' && liStep === 'reset' && (
          <>
            <div style={S.title}>Reset PIN</div>
            <p style={S.sub}>We&apos;ll email a link to set a new PIN.</p>
            <div style={S.field}>
              <label style={S.label}>Email</label>
              <input style={S.input} type="email" placeholder="you@example.com" value={liEmail} autoFocus
                onChange={(e) => { setLiEmail(e.target.value); setLiErr(''); }} />
            </div>
            {resetSent
              ? <div style={S.banner}>Check your inbox for the reset link.</div>
              : <button style={{ ...S.btn, marginTop: 16, opacity: loading ? 0.6 : 1 }} disabled={loading} onClick={handleReset}>Send reset link</button>}
            {(liErr || authError) && !loading && <div style={S.err}>{liErr || authError}</div>}
            <button style={S.backLink} disabled={loading} onClick={() => { setLiErr(''); setLiStep('pin'); }}>← Back</button>
          </>
        )}

        {/* SIGNUP: info */}
        {status === 'signed-out' && mode === 'signup' && suStep === 'info' && (
          <>
            <div style={S.title}>Create Account</div>
            <div style={S.fields}>
              <div style={S.field}>
                <label style={S.label}>Your Name</label>
                <input style={S.input} placeholder="e.g. Amina" value={name} autoFocus onChange={(e) => { setName(e.target.value); setSuErr(''); }} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Email</label>
                <input style={S.input} type="email" placeholder="you@example.com" value={suEmail} onChange={(e) => { setSuEmail(e.target.value); setSuErr(''); }} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Phone Number</label>
                <input style={S.input} type="tel" placeholder="e.g. 0712 345 678" value={suPhone}
                  onChange={(e) => { setSuPhone(e.target.value.replace(/[^\d\s+]/g, '')); setSuErr(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSignupInfoContinue()} />
              </div>
            </div>
            <button style={{ ...S.btn, opacity: loading ? 0.6 : 1 }} disabled={loading} onClick={handleSignupInfoContinue}>Continue →</button>
            <div style={S.divider}><span style={S.dividerText}>or</span></div>
            <GoogleButton onClick={onGoogle} disabled={loading} label="Sign up with Google" />
            {suErr && <div style={S.err}>{suErr}</div>}
            {authError && !suErr && <div style={S.err}>{authError}</div>}
            <div style={S.hint}>Already have an account? <button style={S.link} onClick={switchToLogin}>Log in</button></div>
          </>
        )}

        {/* SIGNUP: set pin */}
        {status === 'signed-out' && mode === 'signup' && suStep === 'pin' && (
          <>
            <div style={S.title}>Set Your PIN</div>
            <p style={S.sub}>Choose a {PIN_LENGTH}-digit PIN</p>
            <PinInput value={suPin} onChange={(v) => { setSuPin(v); setSuErr(''); }} onComplete={() => setTimeout(() => setSuStep('confirm'), 180)} error={false} autoFocus />
            <button style={S.backLink} onClick={() => { setSuPin(''); setSuStep('info'); }}>← Back</button>
          </>
        )}

        {/* SIGNUP: confirm pin */}
        {status === 'signed-out' && mode === 'signup' && suStep === 'confirm' && (
          <>
            <div style={S.title}>Confirm PIN</div>
            <p style={S.sub}>Re-enter your {PIN_LENGTH}-digit PIN</p>
            <PinInput value={suConfirm} onChange={(v) => { if (!loading) { setSuConfirm(v); setSuErr(''); } }} onComplete={handleSignupConfirm} error={!!(suErr || authError)} autoFocus={!loading} />
            {loading && <div style={S.loadingBox}><span style={S.spinner} /> Creating account…</div>}
            {(suErr || authError) && !loading && <div style={S.err}>{suErr || authError}</div>}
            <button style={{ ...S.backLink, opacity: loading ? 0.45 : 1 }} disabled={loading} onClick={() => { setSuConfirm(''); setSuPin(''); setSuStep('pin'); }}>← Back</button>
          </>
        )}

      </div>
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  overlay:  { position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  bg:       { position: 'absolute', inset: 0, background: 'var(--bg-page)' },
  card:     { position: 'relative', background: 'var(--bg-card)', border: '1px solid var(--border-acc)', borderRadius: 20, padding: '36px 32px', width: '100%', maxWidth: 380, boxShadow: 'var(--shadow-lg)' },
  logoRow:  { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 },
  logoMark: { width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(145deg, var(--gold), var(--gold-l))', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoSym:  { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 800, color: '#0A1628' },
  logoName: { fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 700, color: 'var(--gold-l)' },
  logoTag:  { fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.14em' },
  title:    { fontFamily: 'Cormorant Garamond, serif', fontSize: 26, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 },
  sub:      { fontSize: 13, color: 'var(--text-2)', marginBottom: 20 },
  fields:   { display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 },
  field:    { display: 'flex', flexDirection: 'column', gap: 5 },
  label:    { fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  input:    { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', color: 'var(--text-1)', fontSize: 15, fontFamily: 'Karla, sans-serif', outline: 'none' },
  btn:      { width: '100%', padding: '13px', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', borderRadius: 12, fontWeight: 700, fontSize: 15, fontFamily: 'Karla, sans-serif', border: 'none', cursor: 'pointer' },
  googleBtn:{ width: '100%', padding: '12px', background: 'var(--bg-surface)', color: 'var(--text-1)', borderRadius: 12, fontWeight: 700, fontSize: 14, fontFamily: 'Karla, sans-serif', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 },
  divider:  { display: 'flex', alignItems: 'center', textAlign: 'center', margin: '16px 0', color: 'var(--text-3)', fontSize: 11 },
  dividerText: { margin: '0 auto', padding: '0 10px' },
  err:      { fontSize: 13, color: 'var(--red)', background: 'var(--red-dim)', padding: '9px 12px', borderRadius: 8, marginTop: 10, textAlign: 'center' },
  banner:   { fontSize: 13, color: '#065F46', background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.35)', padding: '9px 12px', borderRadius: 8, marginTop: 12, textAlign: 'center', fontWeight: 700 },
  loadingBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, color: 'var(--gold)', background: 'rgba(255,127,0,0.1)', border: '1px solid rgba(255,127,0,0.18)', padding: '9px 12px', borderRadius: 8, marginTop: 10, textAlign: 'center', fontWeight: 700 },
  spinner:  { width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,127,0,0.25)', borderTopColor: 'var(--gold)', animation: 'authSpin 0.75s linear infinite' },
  hint:     { fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginTop: 16, lineHeight: 1.6 },
  link:     { background: 'transparent', border: 'none', color: 'var(--gold)', fontSize: 12, fontFamily: 'Karla, sans-serif', cursor: 'pointer', textDecoration: 'underline', padding: 0 },
  backLink: { background: 'transparent', border: 'none', color: 'var(--text-3)', fontSize: 13, fontFamily: 'Karla, sans-serif', cursor: 'pointer', display: 'block', margin: '8px auto 0', padding: '6px 12px' },
};
