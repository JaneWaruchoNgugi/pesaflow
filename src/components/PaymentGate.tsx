import React, { useState, useEffect, useRef } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ArrowRight, Banknote, Check, CreditCard, Crown, Circle, Gem, LockKeyhole, PartyPopper, RotateCcw, Smartphone, Sparkles, X, XCircle, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { app } from '../lib/firebase';
import type { SubscriptionTier } from '../types';

interface PaymentGateProps {
  tierName: string;
  tierPrice: number;
  tierColor: string;
  userId: string;
  userPhone: string;
  tier: SubscriptionTier;
  onPaymentComplete: () => void;
  onBack: () => void;
}

type Step = 'method' | 'awaiting' | 'success' | 'failed' | 'card';

const fns = getFunctions(app);
const initiateStkPush   = httpsCallable(fns, 'initiateStkPush');
const getPaymentStatus  = httpsCallable(fns, 'getPaymentStatus');
const confirmSubscriptionPayment = httpsCallable(fns, 'confirmSubscriptionPayment');

const TIER_META: Record<SubscriptionTier, { name: string; color: string; icon: LucideIcon; features: string[] }> = {
  free:     { name: 'Free',     color: '#9BAAC4', icon: Circle, features: [] },
  silver:   { name: 'Silver',   color: '#C0C0C0', icon: Gem, features: ['Bills & recurring payments', 'Savings goals', 'Emergency fund', 'Net Worth'] },
  gold:     { name: 'Gold',     color: '#C9A84C', icon: Crown, features: ['Everything in Silver', 'Investments', 'Insights', 'AI Chat', 'Alerts & SOS', 'Priority support', 'CSV exports'] },
  platinum: { name: 'Platinum', color: '#A78BFA', icon: Sparkles, features: ['Legacy Platinum access', 'Everything in Gold', 'Priority support'] },
};

const INTRO_PRICE_END_MS = Date.parse('2026-06-30T20:59:59.999+03:00');
const currentTierPrice = (tier: SubscriptionTier): number => {
  const introPrices: Record<SubscriptionTier, number> = { free: 0, silver: 10, gold: 20, platinum: 999 };
  const standardPrices: Record<SubscriptionTier, number> = { free: 0, silver: 299, gold: 599, platinum: 999 };
  return Date.now() <= INTRO_PRICE_END_MS ? introPrices[tier] : standardPrices[tier];
};

const SALE_TIERS: SubscriptionTier[] = ['silver', 'gold'];

export const PaymentGate: React.FC<PaymentGateProps> = ({
  tierName, tierPrice, tierColor, userId, userPhone, tier, onPaymentComplete, onBack,
}) => {
  const [step, setStep] = useState<Step>('method');
  const [checkoutId, setCheckoutId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStep('method');
    setCheckoutId('');
    setError('');
    setLoading(false);
    setConfirming(false);
  }, [tier, userId, userPhone]);

  // Poll payment status every 3s while awaiting
  useEffect(() => {
    if (step === 'awaiting' && checkoutId) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await getPaymentStatus({ checkoutId }) as { data: { status: string } };
          if (res.data.status === 'success' || res.data.status === 'paid') {
            clearInterval(pollRef.current!);
            setStep('success');
          } else if (res.data.status === 'failed') {
            clearInterval(pollRef.current!);
            setStep('failed');
          }
        } catch { /* keep polling */ }
      }, 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, checkoutId]);

  const handleConfirmComplete = async () => {
    if (!checkoutId) return;
    setConfirming(true);
    setError('');
    try {
      const res = await confirmSubscriptionPayment({ checkoutId, userId, tier }) as { data: { status: string; message?: string } };
      if (res.data.status === 'success' || res.data.status === 'paid') setStep('success');
      else setError(res.data.message || 'Payment is still awaiting provider confirmation.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Payment confirmation failed. Try again after a few seconds.');
    } finally {
      setConfirming(false);
    }
  };

  const handleSendStk = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await initiateStkPush({ phone: userPhone, amount: tierPrice, tier, userId, name: 'PesaFlow ' + tier }) as { data: { checkoutId: string } };
      setCheckoutId(res.data.checkoutId);
      setStep('awaiting');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to initiate payment. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .pg-in { animation: fadeUp 0.35s ease forwards; }
        .pg-layout { display:flex; min-height:100vh; }
        .pg-left { width:340px; flex-shrink:0; background:linear-gradient(160deg,#0A1628 0%,#1a2f50 100%); display:flex; align-items:center; justify-content:center; padding:40px; }
        .pg-right { flex:1; display:flex; flex-direction:column; justify-content:center; padding:60px 64px; max-width:520px; }
        .pg-method:hover { border-color:rgba(217,119,6,0.5)!important; background:rgba(217,119,6,0.03)!important; }
        .pg-btn { transition:transform .15s,box-shadow .15s; }
        .pg-btn:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(217,119,6,0.3); }
        .spinner { width:40px;height:40px;border:3px solid rgba(201,168,76,0.2);border-top-color:#C9A84C;border-radius:50%;animation:spin 0.8s linear infinite; }
        .pulse-dot { animation: pulse 1.5s ease-in-out infinite; }
        @media(max-width:700px){
          .pg-layout{flex-direction:column;}
          .pg-left{width:100%;padding:24px 20px;}
          .pg-right{padding:24px 20px;max-width:100%;}
        }
      `}</style>

      <div className="pg-layout">
        {/* Left */}
        <div className="pg-left">
          <div style={{ display:'flex', flexDirection:'column', gap:28, width:'100%' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={S.logoMark}><span style={S.logoSym}>P</span></div>
              <div>
                <div style={S.logoName}>PesaFlow</div>
                <div style={S.logoTag}>TRACK YOUR MONEY. GROW YOUR WEALTH. SLEEP BETTER.</div>
              </div>
            </div>
            <div style={S.planBox}>
              <div style={S.planBoxLabel}>SUBSCRIBING TO</div>
              <div style={{ ...S.planBoxName, color: tierColor }}>{tierName}</div>
              <div style={S.planBoxPrice}>
                KES <span style={S.planBoxAmt}>{tierPrice.toLocaleString()}</span>
                <span style={S.planBoxPer}>/first month</span>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                { icon: <Zap size={14} strokeWidth={2.3} />, label: 'Instant activation' },
                { icon: <RotateCcw size={14} strokeWidth={2.3} />, label: 'Cancel anytime' },
                { icon: <Banknote size={14} strokeWidth={2.3} />, label: 'KES billing' },
              ].map((item) => (
                <div key={item.label} style={{ fontSize:13, color:'rgba(255,255,255,0.5)', display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:14, height:14, flexShrink:0 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="pg-right">
          {step !== 'success' && (
            <button style={S.back} onClick={step === 'method' ? onBack : () => setStep('method')}>← Back</button>
          )}

          {/* Method select */}
          {step === 'method' && (
            <div className="pg-in">
              <div style={S.title}>Complete your subscription</div>
              <p style={S.sub}>Choose how you'd like to pay for <strong style={{ color: tierColor }}>{tierName}</strong></p>
              <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:20 }}>
                <button className="pg-method" style={S.methodBtn} onClick={handleSendStk} disabled={loading || !userPhone}>
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <Smartphone size={26} strokeWidth={2.1} color="#0F172A" />
                    <div>
                      <div style={S.methodName}>M-Pesa</div>
                      <div style={S.methodDesc}>{loading ? 'Sending STK request...' : 'STK Push to ' + userPhone}</div>
                    </div>
                  </div>
                  <ArrowRight size={18} strokeWidth={2.4} color="#D97706" />
                </button>
                <button className="pg-method" style={S.methodBtn} onClick={() => setStep('card')}>
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <CreditCard size={26} strokeWidth={2.1} color="#0F172A" />
                    <div>
                      <div style={S.methodName}>Visa / Mastercard</div>
                      <div style={S.methodDesc}>Pay with debit or credit card</div>
                    </div>
                  </div>
                  <ArrowRight size={18} strokeWidth={2.4} color="#D97706" />
                </button>
              </div>
              {error && <div style={S.err}>{error}</div>}
              <div style={{ fontSize:12, color:'#9CA3AF', textAlign:'center', display:'flex', justifyContent:'center', alignItems:'center', gap:6 }}><LockKeyhole size={13} strokeWidth={2.2} /> All payments are encrypted and secure</div>
            </div>
          )}

          {/* Awaiting */}
          {step === 'awaiting' && (
            <div className="pg-in" style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', gap:20 }}>
              <div className="spinner" />
              <div style={S.title}>Awaiting Payment</div>
              <p style={S.sub}>
                Check your phone <strong>{userPhone}</strong> and enter your M-Pesa PIN to complete the payment of{' '}
                <strong style={{ color:'#D97706' }}>KES {tierPrice.toLocaleString()}</strong>
              </p>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <div className="pulse-dot" style={{ width:8, height:8, borderRadius:'50%', background:'#C9A84C' }} />
                <span style={{ fontSize:13, color:'#9CA3AF' }}>Waiting for confirmation…</span>
              </div>
              {error && <div style={S.err}>{error}</div>}
              <button className="pg-btn" style={{ ...S.btn, maxWidth: 260 }} onClick={handleConfirmComplete} disabled={confirming}>
                {confirming ? 'Confirming...' : 'I have completed payment'}
              </button>
              <button style={{ ...S.back, marginTop:8 }} onClick={() => setStep('failed')}>Cancel</button>
            </div>
          )}

          {/* Failed */}
          {step === 'failed' && (
            <div className="pg-in" style={{ textAlign:'center' }}>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}><XCircle size={48} strokeWidth={1.8} color="#DC2626" /></div>
              <div style={S.title}>Payment Failed</div>
              <p style={S.sub}>The payment was not completed. You can try again.</p>
              <button className="pg-btn" style={S.btn} onClick={handleSendStk} disabled={loading || !userPhone}>
                {loading ? 'Sending...' : 'Try Again'}
              </button>
            </div>
          )}

          {/* Card coming soon */}
          {step === 'card' && (
            <div className="pg-in" style={{ textAlign:'center' }}>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}><CreditCard size={40} strokeWidth={1.8} color="#D97706" /></div>
              <div style={S.title}>Coming Soon</div>
              <p style={S.sub}>Card payments are coming soon. Please use M-Pesa to complete your subscription.</p>
              <button style={S.outlineBtn} onClick={() => setStep('method')}>← Use M-Pesa instead</button>
            </div>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="pg-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>
              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button onClick={onPaymentComplete} style={{ background:'var(--bg-surface,#f3f4f6)', border:'1px solid var(--border,#e5e7eb)', borderRadius:8, width:32, height:32, cursor:'pointer', fontSize:16, color:'#6B7280', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={16} strokeWidth={2.4} /></button>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}><PartyPopper size={52} strokeWidth={1.7} color="#D97706" /></div>
                <div style={S.title}>You're on {tierName}!</div>
                <p style={S.sub}>Your subscription is now active. Enjoy your new features.</p>
              </div>

              {/* Active plan */}
              <div style={{ background:'var(--gold-dim)', border:'1px solid var(--border-acc)', borderRadius:14, padding:'16px 20px' }}>
                <div style={{ fontSize:11, color:'var(--text-3)', letterSpacing:'0.1em', marginBottom:6 }}>ACTIVE PLAN</div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  {(() => { const TierIcon = TIER_META[tier].icon; return <span style={{ display:'inline-flex', alignItems:'center', color: tierColor }}><TierIcon size={24} strokeWidth={2} /></span>; })()}
                  <div>
                    <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:20, fontWeight:700, color: tierColor }}>{tierName}</div>
                    <div style={{ fontSize:12, color:'var(--text-3)' }}>KES {tierPrice.toLocaleString()}/month</div>
                  </div>
                </div>
                <ul style={{ margin:'12px 0 0', padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:5 }}>
                  {TIER_META[tier].features.map(f => (
                    <li key={f} style={{ fontSize:13, color:'var(--text-2)', display:'flex', alignItems:'center', gap:6 }}>
                      <Check size={14} strokeWidth={3} color={tierColor} style={{ flexShrink:0 }} />{f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Other plans */}
              <div>
                <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:10, fontWeight:600 }}>OTHER PLANS</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {SALE_TIERS.filter(t => t !== tier).map(t => {
                    const m = TIER_META[t];
                    const prices: Record<SubscriptionTier, number> = { free: 0, silver: currentTierPrice('silver'), gold: currentTierPrice('gold'), platinum: currentTierPrice('platinum') };
                    const MIcon = m.icon;
                    return (
                      <div key={t} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 14px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ display:'inline-flex', alignItems:'center', color: m.color }}><MIcon size={16} strokeWidth={2} /></span>
                          <span style={{ fontWeight:600, color: m.color, fontSize:14 }}>{m.name}</span>
                        </div>
                        <span style={{ fontSize:12, color:'var(--text-3)' }}>KES {prices[t].toLocaleString()}/mo</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button className="pg-btn" style={S.btn} onClick={onPaymentComplete}>
                Go to Dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  page:       { minHeight:'100vh', background:'var(--bg-page)', fontFamily:'DM Sans, sans-serif' },
  logoMark:   { width:44, height:44, borderRadius:12, background:'linear-gradient(145deg,#F59E0B,#D97706)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  logoSym:    { fontFamily:'Cormorant Garamond, serif', fontSize:24, fontWeight:800, color:'#fff' },
  logoName:   { fontFamily:'Cormorant Garamond, serif', fontSize:22, fontWeight:700, color:'#F59E0B' },
  logoTag:    { fontSize:8, color:'rgba(255,255,255,0.4)', letterSpacing:'0.14em' },
  planBox:    { background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, padding:'16px 18px' },
  planBoxLabel:{ fontSize:10, color:'rgba(255,255,255,0.4)', letterSpacing:'0.12em', marginBottom:6 },
  planBoxName: { fontFamily:'Cormorant Garamond, serif', fontSize:26, fontWeight:700, marginBottom:4 },
  planBoxPrice:{ fontSize:14, color:'rgba(255,255,255,0.6)' },
  planBoxAmt: { fontFamily:'Cormorant Garamond, serif', fontSize:24, fontWeight:700, color:'#fff' },
  planBoxPer: { fontSize:13, color:'rgba(255,255,255,0.4)', marginLeft:3 },
  back:       { background:'transparent', border:'none', color:'#9CA3AF', fontSize:13, fontFamily:'DM Sans, sans-serif', cursor:'pointer', padding:'0 0 24px', textAlign:'left', width:'fit-content' },
  title:      { fontFamily:'Cormorant Garamond, serif', fontSize:'clamp(22px,5vw,30px)', fontWeight:700, color:'var(--text-1)', marginBottom:8 },
  sub:        { fontSize:14, color:'var(--text-2)', lineHeight:1.7, marginBottom:20 },
  methodBtn:  { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 18px', background:'var(--bg-surface)', border:'1.5px solid var(--border)', borderRadius:14, cursor:'pointer', fontFamily:'DM Sans, sans-serif', width:'100%' },
  methodName: { fontSize:15, fontWeight:700, color:'var(--text-1)', textAlign:'left' },
  methodDesc: { fontSize:12, color:'var(--text-3)', marginTop:2, textAlign:'left' },
  label:      { fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em' },
  input:      { background:'var(--bg-surface)', border:'1.5px solid var(--border-s)', borderRadius:10, padding:'13px 16px', color:'var(--text-1)', fontSize:16, fontFamily:'DM Sans, sans-serif', outline:'none', width:'100%', boxSizing:'border-box' },
  err:        { fontSize:13, color:'var(--red)', background:'var(--red-dim)', padding:'9px 12px', borderRadius:8, marginBottom:12 },
  btn:        { width:'100%', padding:'14px', background:'linear-gradient(135deg,#F59E0B,#D97706)', color:'#fff', border:'none', borderRadius:12, fontWeight:700, fontSize:15, fontFamily:'DM Sans, sans-serif', cursor:'pointer' },
  outlineBtn: { padding:'12px 24px', background:'transparent', color:'#D97706', border:'2px solid rgba(217,119,6,0.3)', borderRadius:10, fontWeight:700, fontSize:14, fontFamily:'DM Sans, sans-serif', cursor:'pointer' },
};
