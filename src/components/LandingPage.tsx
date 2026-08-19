import React, { useEffect, useState } from 'react';
import {
  ArrowRight, Bell, Bot, BarChart3, CalendarDays, Check, ChevronDown, ChevronRight,
  CircleDollarSign, Crown, Download, Layers3, LineChart,
  LockKeyhole, Menu, PieChart, Quote, ReceiptText, Shield, Sparkles, Star, Target,
  TrendingUp, Users, WalletCards, X, XCircle,
} from 'lucide-react';
import type { SubscriptionTier } from '../types';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

// lucide-react dropped brand icons in recent versions — render social marks as inline SVG.
const SOCIAL_ICONS: React.FC<{ size?: number }>[] = [
  ({ size = 16 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3l.5-3H14V4.2c0-.9.3-1.5 1.6-1.5H17V.1C16.4 0 15.5 0 14.6 0 12.3 0 11 1.3 11 3.7V6H8v3h3v9h3V9z" /></svg>),
  ({ size = 16 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.1 8.1L23 22h-6.6l-5.2-6.8L5.3 22H2.2l7.6-8.7L1.5 2h6.8l4.7 6.2L18.9 2zm-1.2 18h1.8L7.1 3.9H5.2L17.7 20z" /></svg>),
  ({ size = 16 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5.5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" /></svg>),
];

type IconComponent = React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;

const ANDROID_APK_URL = '/downloads/finwise-android.apk';

// ── Design tokens (self-contained light theme so the landing always matches the mockup) ──
const C = {
  ink: '#0F1B2D',
  body: '#55627A',
  muted: '#8A93A5',
  orange: '#F97316',
  orangeDark: '#EA580C',
  line: 'rgba(15,27,45,0.08)',
  cardShadow: '0 10px 34px rgba(15,27,45,0.06)',
  cream: '#FDF6EE',
};

const FREE_FEATURES = [
  'Expense tracking & categorisation',
  'Financial Advisor view',
  'Dashboard overview',
  'Monthly spending summary',
  'Bills & recurring payments',
  'Savings goals with deadlines',
  'Emergency fund tracker',
  'Net Worth calculator',
];

const GOLD_FEATURES = [
  'Investment portfolio tracking',
  'Spending insights & analytics',
  'AI chat financial advisor',
  'Alerts & SOS emergency system',
  'Priority support',
  'CSV data exports',
];

const STATS: { icon: IconComponent; value: string; label: string }[] = [
  { icon: Users, value: '12,000+', label: 'Active users' },
  { icon: LineChart, value: 'KES 2.4B+', label: 'Tracked across users' },
  { icon: Target, value: '98%', label: 'Goal achievement rate' },
  { icon: Star, value: '4.9 / 5', label: 'Average user rating' },
];

const VALUE_POINTS: { icon: IconComponent; title: string; desc: string }[] = [
  { icon: WalletCards, title: 'Built for real Kenyan lives', desc: 'KES-first pricing, M-Pesa friendly, and categories that make sense locally.' },
  { icon: Shield, title: 'Private by design', desc: 'Your day-to-day records stay on your device unless you choose paid activation.' },
  { icon: Layers3, title: 'One place for the full picture', desc: 'Expenses, goals, bills, investments, net worth, alerts, and AI support work together.' },
];

const FEATURES: { icon: IconComponent; title: string; desc: string; color: string }[] = [
  { icon: BarChart3, title: 'Smart Budgeting', desc: 'Categorise wisely, set limits, and see exactly where your money is going.', color: '#16A34A' },
  { icon: Target, title: 'Goal Tracking', desc: 'Set savings targets with deadlines and measure progress in real time.', color: '#EA580C' },
  { icon: TrendingUp, title: 'Investment Manager', desc: 'Track SACCOs, MMFs, stocks, bonds and crypto in one calm portfolio view.', color: '#2563EB' },
  { icon: Bot, title: 'AI Financial Advisor', desc: 'Get guidance based on your income, spending, goals, and actual habits.', color: '#7C3AED' },
  { icon: Bell, title: 'Bills & Alerts', desc: 'Stay ahead of recurring bills, overdue payments, and emergency signals.', color: '#DC2626' },
  { icon: PieChart, title: 'Net Worth Clarity', desc: 'Bring assets and liabilities together so your financial position is easy to read.', color: '#0891B2' },
];

const STEPS: { icon: IconComponent; title: string; desc: string }[] = [
  { icon: ReceiptText, title: 'Log your money', desc: 'Capture income, expenses, bills, and commitments without spreadsheet friction.' },
  { icon: LineChart, title: 'Read the pattern', desc: 'See what is recurring, what is growing, and what needs attention this month.' },
  { icon: CalendarDays, title: 'Act with a plan', desc: 'Use goals, alerts, and recommendations to make your next money move clear.' },
];

const MINI_TRUST: { icon: IconComponent; title: string; desc: string; color: string }[] = [
  { icon: WalletCards, title: 'Made for Kenya', desc: 'KES-first, M-Pesa friendly, and built for Kenyan lives — not borrowed from abroad.', color: '#EA580C' },
  { icon: Shield, title: 'Secure by default', desc: 'Your data stays on your device and you choose when to sync or activate.', color: '#16A34A' },
  { icon: Sparkles, title: 'Simple & actionable', desc: 'Clear insights that help you make better money decisions every single day.', color: '#7C3AED' },
];

const TESTIMONIALS: { quote: string; name: string; place: string }[] = [
  { quote: 'PesaFlow changed how I manage my money. Everything I need is in one place, and it finally makes sense.', name: 'Grace M.', place: 'Nairobi' },
  { quote: 'I used to lose track of my daily hustle earnings. Now I set aside my savings the moment I get paid.', name: 'Brian O.', place: 'Nakuru' },
  { quote: 'Seeing my SACCO, M-Pesa and bills in one view helped me finally build a real emergency fund.', name: 'Amina H.', place: 'Mombasa' },
];

const NAV_LINKS: { label: string; target: string }[] = [
  { label: 'Features', target: 'features' },
  { label: 'How It Works', target: 'how' },
  { label: 'Pricing', target: 'plans' },
  { label: 'About Us', target: 'why' },
  { label: 'Blog', target: 'footer' },
];

const FOOTER_COLS: { heading: string; links: { label: string; target: string }[] }[] = [
  { heading: 'Product', links: [{ label: 'Features', target: 'features' }, { label: 'How It Works', target: 'how' }, { label: 'Pricing', target: 'plans' }, { label: 'Updates', target: 'features' }] },
  { heading: 'Company', links: [{ label: 'About Us', target: 'why' }, { label: 'Blog', target: 'footer' }, { label: 'Privacy Policy', target: 'footer' }, { label: 'Terms of Service', target: 'footer' }] },
  { heading: 'Support', links: [{ label: 'Help Center', target: 'footer' }, { label: 'Contact Us', target: 'footer' }, { label: 'Security', target: 'footer' }] },
];

interface LandingPageProps {
  onSelectTier: (tier: SubscriptionTier) => void;
  onLogin: () => void;
}

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectTier, onLogin }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [testi, setTesti] = useState(0);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTesti(t => (t + 1) % TESTIMONIALS.length), 6000);
    return () => clearInterval(id);
  }, []);

  const goFree = () => onSelectTier('free');
  const nav = (id: string) => { setMenuOpen(false); scrollTo(id); };

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return;
    setSubscribed(true);
    setEmail('');
    try {
      // Doc id = sanitized email so re-subscribing updates rather than duplicates.
      await setDoc(doc(db, 'subscribers', clean.replace(/[^a-z0-9]/g, '_')), {
        email: clean,
        source: 'landing',
        subscribedAt: serverTimestamp(),
        active: true,
      }, { merge: true });
    } catch (err) {
      console.error('subscribe failed:', err);
    }
  };

  return (
    <div style={S.page}>
      <style>{CSS}</style>

      {/* ─── Nav ─────────────────────────────────────── */}
      <nav style={S.nav}>
        <div style={S.navInner}>
          <button style={S.logoRow} onClick={() => scrollTo('top')}>
            <div style={S.logoMark}><span style={S.logoSym}>P</span></div>
            <div style={{ textAlign: 'left' }}>
              <div style={S.logoName}>PesaFlow</div>
              <div style={S.logoTag}>TRACK YOUR MONEY. GROW YOUR WEALTH. SLEEP BETTER.</div>
            </div>
          </button>

          <div className="lp-nav-links" style={S.navLinks}>
            {NAV_LINKS.map(l => (
              <button key={l.label} style={S.navLink} className="lp-navlink" onClick={() => nav(l.target)}>{l.label}</button>
            ))}
          </div>

          <div className="lp-nav-actions" style={S.navActions}>
            <button style={S.btnGhost} className="lp-btn" onClick={onLogin}>Log in</button>
            <button style={S.btnPrimary} className="lp-btn" onClick={goFree}>Get Started Free</button>
          </div>

          <div className="lp-mobile-actions" style={S.mobileActions}>
            <button style={S.btnPrimary} className="lp-btn" onClick={onLogin}>Log in</button>
            <button className="lp-hamburger" style={S.hamburger} onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="lp-mobile-menu" style={S.mobileMenu}>
            {NAV_LINKS.map(l => (
              <button key={l.label} style={S.mobileLink} onClick={() => nav(l.target)}>{l.label}</button>
            ))}
            <button style={{ ...S.btnGhost, width: '100%', justifyContent: 'center' }} onClick={() => { setMenuOpen(false); onLogin(); }}>Log in</button>
            <button style={{ ...S.btnPrimary, width: '100%', justifyContent: 'center' }} onClick={() => { setMenuOpen(false); goFree(); }}>Get Started Free</button>
          </div>
        )}
      </nav>

      <div id="top" />

      {/* ─── Hero ────────────────────────────────────── */}
      <section style={S.hero}>
        <div className="lp-hero-grid" style={S.heroGrid}>
          <div style={S.heroText}>
            <h1 style={S.headline}>Money clarity for every <span style={{ color: C.orangeDark }}>Kenyan</span> household</h1>
            <p style={S.heroSub}>
              PesaFlow brings your spending, bills, goals, investments, net worth, alerts, and AI guidance into one polished money dashboard.
            </p>
            <div style={S.heroBtns}>
              <button style={S.btnPrimaryLg} className="lp-btn" onClick={goFree}>Get Started Free <ArrowRight size={17} strokeWidth={2.4} /></button>
              <a style={S.btnWhite} className="lp-btn" href={ANDROID_APK_URL} download><Download size={17} strokeWidth={2.3} /> Android App</a>
              <button style={S.btnWhite} className="lp-btn" onClick={() => scrollTo('plans')}>View Plans <ChevronDown size={16} strokeWidth={2.3} /></button>
            </div>
            <div className="lp-hero-trust" style={S.heroTrust}>
              <div style={S.heroTrustItem}>
                <LockKeyhole size={18} strokeWidth={2.2} style={{ color: C.orange, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={S.heroTrustTitle}>Bank-level security</div>
                  <div style={S.heroTrustDesc}>Your data is encrypted and always protected.</div>
                </div>
              </div>
              <div style={S.heroTrustItem}>
                <Users size={18} strokeWidth={2.2} style={{ color: C.orange, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={S.heroTrustTitle}>Trusted by 12,000+ Kenyans</div>
                  <div style={S.heroTrustDesc}>Join thousands taking control of their money.</div>
                </div>
              </div>
            </div>
          </div>

          <DashboardPreview />
        </div>
      </section>

      {/* ─── Stats ───────────────────────────────────── */}
      <section style={S.statsWrap}>
        <div style={S.statsCard} className="lp-stats-grid">
          {STATS.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} style={S.statItem}>
                <div style={S.statIcon}><Icon size={20} strokeWidth={2.2} /></div>
                <div style={S.statValue}>{s.value}</div>
                <div style={S.statLabel}>{s.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Why PesaFlow ─────────────────────────────── */}
      <section id="why" style={S.section}>
        <div style={S.sectionLabel}>WHY FINWISE</div>
        <h2 style={S.sectionTitle}>A personal finance workspace<br className="lp-brk" /> that feels calm, useful, and complete.</h2>
        <div className="lp-grid-3" style={S.grid3}>
          {VALUE_POINTS.map(v => {
            const Icon = v.icon;
            return (
              <div key={v.title} style={S.card} className="lp-card">
                <div style={{ ...S.cardIcon, background: '#FEF3E7', color: C.orangeDark }}><Icon size={22} strokeWidth={2.1} /></div>
                <div style={S.cardTitle}>{v.title}</div>
                <div style={S.cardDesc}>{v.desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── What you get ────────────────────────────── */}
      <section id="features" style={S.section}>
        <div style={S.sectionLabel}>WHAT YOU GET</div>
        <h2 style={S.sectionTitle}>Everything you need to master your money</h2>
        <div className="lp-grid-3" style={S.grid3}>
          {FEATURES.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.title} style={S.card} className="lp-card">
                <div style={{ ...S.cardIcon, background: `${f.color}14`, color: f.color }}><Icon size={22} strokeWidth={2.1} /></div>
                <div style={S.cardTitle}>{f.title}</div>
                <div style={S.cardDesc}>{f.desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── How it works ────────────────────────────── */}
      <section id="how" style={S.section}>
        <div style={S.sectionLabel}>HOW IT WORKS</div>
        <h2 style={S.sectionTitle}>From scattered money notes to a monthly plan</h2>
        <div className="lp-steps" style={S.stepsRow}>
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <React.Fragment key={step.title}>
                <div style={S.stepCard} className="lp-card">
                  <div style={S.stepTop}>
                    <span style={S.stepNum}>{i + 1}</span>
                    <Icon size={20} strokeWidth={2.1} style={{ color: C.orange }} />
                  </div>
                  <div style={S.cardTitle}>{step.title}</div>
                  <div style={S.cardDesc}>{step.desc}</div>
                </div>
                {i < STEPS.length - 1 && <ChevronRight size={22} className="lp-step-arrow" style={S.stepArrow} />}
              </React.Fragment>
            );
          })}
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────────────── */}
      <section id="plans" style={S.section}>
        <div style={S.sectionLabel}>PRICING</div>
        <h2 style={S.sectionTitle}>Free while we grow — premium tools on the way</h2>
        <p style={S.sectionSub}>Every everyday and planning tool is free for everyone. Advanced AI intelligence is coming soon.</p>
        <div className="lp-plans" style={S.plansGrid}>
          {/* Free */}
          <div style={S.planCard} className="lp-card">
            <div style={S.planName}>Free</div>
            <div style={S.planSub}>Free forever</div>
            <div style={S.planLead}>Everything you need to track, plan and save — for free.</div>
            <ul style={S.featList}>
              {FREE_FEATURES.map(f => (
                <li key={f} style={S.featItem}><Check size={15} strokeWidth={2.6} style={{ color: '#16A34A', flexShrink: 0 }} /> {f}</li>
              ))}
            </ul>
            <button style={S.planBtnFree} className="lp-btn" onClick={goFree}>Get Started Free</button>
          </div>

          {/* Gold (coming soon) */}
          <div style={{ ...S.planCard, border: `2px solid ${C.orange}`, boxShadow: '0 20px 54px rgba(249,115,22,0.16)' }}>
            <div style={S.comingBadge}><Sparkles size={12} strokeWidth={2.4} /> COMING SOON</div>
            <div style={{ ...S.planIconWrap }}><Crown size={26} strokeWidth={2.1} style={{ color: C.orange }} /></div>
            <div style={{ ...S.planName, color: C.orange }}>Gold</div>
            <div style={S.planSub}>Premium · Launching soon</div>
            <div style={S.planLead}>Advanced intelligence for deeper insights and smarter decisions.</div>
            <ul style={S.featList}>
              {GOLD_FEATURES.map(f => (
                <li key={f} style={S.featItem}><Check size={15} strokeWidth={2.6} style={{ color: C.orange, flexShrink: 0 }} /> {f}</li>
              ))}
            </ul>
            <button style={S.planBtnComing} disabled>Coming Soon</button>
          </div>
        </div>
      </section>

      {/* ─── Testimonials ────────────────────────────── */}
      <section style={S.section}>
        <div style={S.sectionLabel}>WHY THOUSANDS OF KENYANS TRUST FINWISE</div>
        <div className="lp-grid-3" style={{ ...S.grid3, marginTop: 8 }}>
          {MINI_TRUST.map(m => {
            const Icon = m.icon;
            return (
              <div key={m.title} style={S.card} className="lp-card">
                <div style={{ ...S.cardIcon, background: `${m.color}14`, color: m.color }}><Icon size={22} strokeWidth={2.1} /></div>
                <div style={S.cardTitle}>{m.title}</div>
                <div style={S.cardDesc}>{m.desc}</div>
              </div>
            );
          })}
        </div>

        <div style={S.quoteCard}>
          <Quote size={30} strokeWidth={2} style={{ color: C.orange, opacity: 0.5 }} />
          <p style={S.quoteText}>“{TESTIMONIALS[testi].quote}”</p>
          <div style={S.quoteName}>— {TESTIMONIALS[testi].name}, {TESTIMONIALS[testi].place}</div>
          <div style={S.dots}>
            {TESTIMONIALS.map((_, i) => (
              <button key={i} aria-label={`Testimonial ${i + 1}`} onClick={() => setTesti(i)}
                style={{ ...S.dot, background: i === testi ? C.orange : 'rgba(15,27,45,0.18)', width: i === testi ? 22 : 8 }} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────── */}
      <section style={S.ctaWrap}>
        <h2 style={{ ...S.sectionTitle, marginBottom: 10 }}>Ready to take control of your money?</h2>
        <p style={{ ...S.sectionSub, marginBottom: 22 }}>Join 12,000+ Kenyans already building a better financial future.</p>
        <div style={{ ...S.heroBtns, justifyContent: 'center' }}>
          <button style={S.btnPrimaryLg} className="lp-btn" onClick={goFree}>Get Started Free <ArrowRight size={17} strokeWidth={2.4} /></button>
          <a style={S.btnWhite} className="lp-btn" href={ANDROID_APK_URL} download><Download size={17} strokeWidth={2.3} /> Android App</a>
        </div>
      </section>

      {/* ─── Trust strip ─────────────────────────────── */}
      <section style={S.trustStrip}>
        {[
          { icon: LockKeyhole, label: 'PIN protected access' },
          { icon: CircleDollarSign, label: 'KES currency support' },
          { icon: XCircle, label: 'No bank login required' },
        ].map((t, i) => {
          const Icon = t.icon;
          return (
            <React.Fragment key={t.label}>
              {i > 0 && <span style={{ color: 'rgba(15,27,45,0.2)' }}>·</span>}
              <span style={S.trustItem}><Icon size={16} strokeWidth={2.2} style={{ color: C.orange }} /> {t.label}</span>
            </React.Fragment>
          );
        })}
      </section>

      {/* ─── Footer ──────────────────────────────────── */}
      <footer id="footer" style={S.footer}>
        <div className="lp-footer-grid" style={S.footerGrid}>
          <div style={{ maxWidth: 280 }}>
            <div style={S.footerLogoRow}>
              <div style={{ ...S.logoMark, width: 34, height: 34 }}><span style={{ ...S.logoSym, fontSize: 17 }}>P</span></div>
              <div>
                <div style={{ ...S.logoName, color: '#fff' }}>PesaFlow</div>
                <div style={{ ...S.logoTag, color: 'rgba(255,255,255,0.5)' }}>TRACK YOUR MONEY. GROW YOUR WEALTH. SLEEP BETTER.</div>
              </div>
            </div>
            <p style={S.footerBlurb}>A calm, private, and powerful way for Kenyan households to plan, grow, and protect their money.</p>
            <div style={S.socialRow}>
              {SOCIAL_ICONS.map((Ico, i) => (
                <a key={i} href="#" style={S.socialBtn} aria-label="social"><Ico size={16} /></a>
              ))}
            </div>
          </div>

          {FOOTER_COLS.map(col => (
            <div key={col.heading}>
              <div style={S.footerHeading}>{col.heading}</div>
              {col.links.map(l => (
                <button key={l.label} style={S.footerLink} onClick={() => nav(l.target)}>{l.label}</button>
              ))}
            </div>
          ))}

          <div style={{ minWidth: 220 }}>
            <div style={S.footerHeading}>Stay in the loop</div>
            <p style={{ ...S.footerBlurb, marginTop: 0 }}>Get updates on new features and smart money tips.</p>
            <form style={S.newsletter} onSubmit={subscribe}>
              <input style={S.newsInput} type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={subscribed ? 'Thanks — you’re in!' : 'Enter your email'} disabled={subscribed} />
              <button style={S.newsBtn} type="submit" aria-label="Subscribe" disabled={subscribed}><ArrowRight size={16} strokeWidth={2.4} /></button>
            </form>
          </div>
        </div>
        <div style={S.footerBottom}>© {new Date().getFullYear()} PesaFlow. Smart money management for every Kenyan.</div>
      </footer>
    </div>
  );
};

/* ── Decorative in-hero dashboard preview ─────────────────── */
const DashboardPreview: React.FC = () => (
  <div style={S.previewShell} className="lp-preview">
    <div style={S.previewBar}>
      {['#F87171', '#FBBF24', '#34D399'].map(c => <span key={c} style={{ ...S.previewDot, background: c }} />)}
    </div>
    <div style={S.previewBody}>
      <div style={S.previewSidebar} className="lp-preview-side">
        <div style={S.previewBrand}><span style={S.previewBrandF}>P</span> PesaFlow</div>
        {['Overview', 'Transactions', 'Budgets', 'Goals', 'Investments', 'Bills & Alerts', 'Net Worth'].map((it, i) => (
          <div key={it} style={{ ...S.previewNavItem, ...(i === 0 ? S.previewNavActive : {}) }}>
            <span style={{ ...S.previewNavDot, background: i === 0 ? C.orange : 'rgba(255,255,255,0.25)' }} /> {it}
          </div>
        ))}
      </div>
      <div style={S.previewMain}>
        <div style={S.previewHeadRow}>
          <div>
            <div style={S.previewH}>Overview</div>
            <div style={S.previewSubtle}>Good morning, Wanjiku</div>
          </div>
          <div style={S.previewChip}>May 2026</div>
        </div>
        <div style={S.previewStatRow}>
          {[
            ['Total Balance', 'KES 124,000', '#16A34A'],
            ['Bills Due', 'KES 12,400', '#EA580C'],
            ['Monthly Savings', 'KES 24,000', '#2563EB'],
          ].map(([l, v, col]) => (
            <div key={l} style={S.previewStat}>
              <div style={S.previewStatL}>{l}</div>
              <div style={{ ...S.previewStatV, color: col as string }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={S.previewSplit}>
          <div style={S.previewPanel}>
            <div style={S.previewStatL}>Spending Health</div>
            <div style={S.previewScore}>84</div>
            {[['Essentials', '72%', '#2563EB'], ['Goals', '58%', '#16A34A'], ['Investments', '41%', '#EA580C']].map(([l, w, col]) => (
              <div key={l as string} style={{ marginTop: 7 }}>
                <div style={S.previewBarMeta}><span>{l}</span><span>{w}</span></div>
                <div style={S.previewTrack}><div style={{ height: '100%', borderRadius: 3, width: w as string, background: col as string }} /></div>
              </div>
            ))}
          </div>
          <div style={S.previewPanel}>
            <div style={S.previewStatL}>Spending Breakdown</div>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0' }}>
              <Donut />
            </div>
            <div style={S.previewLegend}>
              {[['Housing', '#2563EB'], ['Food', '#16A34A'], ['Transport', '#EA580C'], ['Other', '#8A93A5']].map(([l, c]) => (
                <span key={l as string} style={S.previewLegendItem}><span style={{ width: 7, height: 7, borderRadius: 2, background: c as string }} /> {l}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Donut: React.FC = () => {
  const segs = [['#2563EB', 35], ['#16A34A', 25], ['#EA580C', 22], ['#8A93A5', 18]] as [string, number][];
  const R = 30, CIRC = 2 * Math.PI * R;
  let offset = 0;
  return (
    <svg width="96" height="96" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={R} fill="none" stroke="#EEF1F5" strokeWidth="12" />
      {segs.map(([col, pct], i) => {
        const len = (pct / 100) * CIRC;
        const el = (
          <circle key={i} cx="40" cy="40" r={R} fill="none" stroke={col} strokeWidth="12"
            strokeDasharray={`${len} ${CIRC - len}`} strokeDashoffset={-offset} transform="rotate(-90 40 40)" />
        );
        offset += len;
        return el;
      })}
      <text x="40" y="38" textAnchor="middle" fontSize="7" fontWeight="700" fill={C.ink} fontFamily="Karla">KES 54,000</text>
      <text x="40" y="48" textAnchor="middle" fontSize="5.5" fill={C.muted} fontFamily="Karla">Total spend</text>
    </svg>
  );
};

const CSS = `
  .lp-btn { transition: transform .15s ease, box-shadow .15s ease, opacity .15s; cursor: pointer; }
  .lp-btn:hover { transform: translateY(-1px); }
  .lp-navlink:hover { color: ${C.orangeDark}; }
  .lp-card { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
  .lp-card:hover { transform: translateY(-3px); box-shadow: 0 18px 40px rgba(15,27,45,0.09); border-color: rgba(249,115,22,0.28); }
  .lp-hamburger { display: none; }
  .lp-mobile-menu { display: none; }
  .lp-mobile-actions { display: none; }
  @media (max-width: 940px) {
    .lp-nav-links, .lp-nav-actions { display: none !important; }
    .lp-hamburger { display: inline-flex !important; }
    .lp-mobile-actions { display: inline-flex !important; }
    .lp-mobile-menu { display: flex !important; }
    .lp-hero-grid { grid-template-columns: 1fr !important; }
    .lp-grid-3, .lp-plans, .lp-footer-grid { grid-template-columns: 1fr !important; }
    .lp-steps { flex-direction: column !important; }
    .lp-step-arrow { transform: rotate(90deg); align-self: center; }
    .lp-brk { display: none; }
  }
  @media (max-width: 620px) {
    .lp-stats-grid { grid-template-columns: 1fr 1fr !important; }
  }
`;

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: `linear-gradient(180deg, ${C.cream} 0%, #FFFFFF 420px)`, color: C.ink, fontFamily: 'Karla, system-ui, sans-serif' },

  nav: { position: 'sticky', top: 0, zIndex: 50, background: 'rgba(253,246,238,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.line}` },
  navInner: { maxWidth: 1180, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
  logoMark: { width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDark})`, display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: '0 6px 16px rgba(234,88,12,0.3)' },
  logoSym: { fontFamily: 'Cormorant Garamond, serif', fontSize: 19, fontWeight: 700, color: '#fff' },
  logoName: { fontFamily: 'Cormorant Garamond, serif', fontSize: 19, fontWeight: 700, color: C.ink, lineHeight: 1.05 },
  logoTag: { fontSize: 8.5, letterSpacing: '0.12em', color: C.muted, fontWeight: 700 },
  navLinks: { display: 'flex', alignItems: 'center', gap: 26 },
  navLink: { background: 'none', border: 'none', fontSize: 14, fontWeight: 600, color: C.body, cursor: 'pointer', fontFamily: 'Karla, sans-serif', transition: 'color .15s' },
  navActions: { display: 'flex', alignItems: 'center', gap: 10 },
  hamburger: { alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 10, border: `1px solid ${C.line}`, background: '#fff', color: C.ink, cursor: 'pointer' },
  mobileActions: { alignItems: 'center', gap: 8 },
  mobileMenu: { flexDirection: 'column', gap: 8, padding: '10px 20px 18px', borderTop: `1px solid ${C.line}`, background: 'rgba(253,246,238,0.98)' },
  mobileLink: { textAlign: 'left', background: 'none', border: 'none', padding: '10px 4px', fontSize: 15, fontWeight: 600, color: C.ink, cursor: 'pointer', borderBottom: `1px solid ${C.line}`, fontFamily: 'Karla, sans-serif' },

  btnGhost: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: `1px solid ${C.line}`, background: '#fff', color: C.ink, fontSize: 14, fontWeight: 700, fontFamily: 'Karla, sans-serif' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDark})`, color: '#fff', fontSize: 14, fontWeight: 800, fontFamily: 'Karla, sans-serif', boxShadow: '0 8px 22px rgba(234,88,12,0.28)' },
  btnPrimaryLg: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 24px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDark})`, color: '#fff', fontSize: 15, fontWeight: 800, fontFamily: 'Karla, sans-serif', boxShadow: '0 12px 30px rgba(234,88,12,0.3)' },
  btnWhite: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 20px', borderRadius: 12, border: `1px solid ${C.line}`, background: '#fff', color: C.ink, fontSize: 15, fontWeight: 700, fontFamily: 'Karla, sans-serif', textDecoration: 'none', boxShadow: C.cardShadow },

  hero: { maxWidth: 1180, margin: '0 auto', padding: '46px 20px 30px' },
  heroGrid: { display: 'grid', gridTemplateColumns: '1fr 1.05fr', gap: 40, alignItems: 'center' },
  heroText: {},
  headline: { fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(38px, 6vw, 60px)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.01em', margin: 0, color: C.ink },
  heroSub: { fontSize: 16, color: C.body, lineHeight: 1.65, margin: '20px 0 26px', maxWidth: 460 },
  heroBtns: { display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 26 },
  heroTrust: { display: 'flex', flexWrap: 'wrap', gap: 14 },
  heroTrustItem: { display: 'flex', gap: 10, alignItems: 'flex-start', flex: '1 1 220px', background: '#fff', border: `1px solid ${C.line}`, borderRadius: 12, padding: '13px 15px', boxShadow: C.cardShadow },
  heroTrustTitle: { fontSize: 13, fontWeight: 800, color: C.ink },
  heroTrustDesc: { fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.4 },

  statsWrap: { maxWidth: 1080, margin: '0 auto', padding: '10px 20px 20px' },
  statsCard: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, background: '#fff', border: `1px solid ${C.line}`, borderRadius: 18, padding: '26px 20px', boxShadow: C.cardShadow },
  statItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6 },
  statIcon: { color: C.orange, marginBottom: 2 },
  statValue: { fontFamily: 'Cormorant Garamond, serif', fontSize: 30, fontWeight: 700, color: C.ink, lineHeight: 1 },
  statLabel: { fontSize: 12.5, color: C.muted, fontWeight: 600 },

  section: { maxWidth: 1080, margin: '0 auto', padding: '46px 20px' },
  sectionLabel: { textAlign: 'center', fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', color: C.orange, marginBottom: 12 },
  sectionTitle: { textAlign: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 700, color: C.ink, lineHeight: 1.18, margin: 0 },
  sectionSub: { textAlign: 'center', fontSize: 15, color: C.body, lineHeight: 1.6, maxWidth: 620, margin: '14px auto 0' },

  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginTop: 30 },
  card: { background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16, padding: '24px 22px', boxShadow: C.cardShadow },
  cardIcon: { width: 46, height: 46, borderRadius: 12, display: 'grid', placeItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 8 },
  cardDesc: { fontSize: 13.5, color: C.body, lineHeight: 1.6 },

  stepsRow: { display: 'flex', alignItems: 'stretch', gap: 12, marginTop: 30 },
  stepCard: { flex: 1, background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16, padding: '22px 20px', boxShadow: C.cardShadow },
  stepTop: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  stepNum: { width: 28, height: 28, borderRadius: '50%', background: C.ink, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 },
  stepArrow: { color: 'rgba(15,27,45,0.25)', alignSelf: 'center', flexShrink: 0 },

  plansGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 780, margin: '30px auto 0' },
  planCard: { position: 'relative', background: '#fff', border: `1.5px solid ${C.line}`, borderRadius: 18, padding: '30px 26px', boxShadow: C.cardShadow, display: 'flex', flexDirection: 'column' },
  planIconWrap: { width: 50, height: 50, borderRadius: 14, background: '#FEF3E7', display: 'grid', placeItems: 'center', margin: '0 auto 6px' },
  comingBadge: { position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 900, letterSpacing: '0.06em', color: '#fff', background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDark})`, padding: '5px 14px', borderRadius: 999, whiteSpace: 'nowrap' },
  planName: { fontFamily: 'Cormorant Garamond, serif', fontSize: 27, fontWeight: 700, textAlign: 'center', color: C.ink },
  planSub: { textAlign: 'center', fontSize: 13, color: C.muted, marginTop: 2 },
  planLead: { textAlign: 'center', fontSize: 13, color: C.body, lineHeight: 1.55, margin: '14px 0 18px' },
  featList: { listStyle: 'none', padding: 0, margin: '0 0 22px', display: 'flex', flexDirection: 'column', gap: 11, flex: 1 },
  featItem: { display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13.5, color: C.body, lineHeight: 1.4 },
  planBtnFree: { width: '100%', padding: '12px', borderRadius: 10, border: `1px solid ${C.line}`, background: '#fff', color: C.ink, fontSize: 14, fontWeight: 800, fontFamily: 'Karla, sans-serif', cursor: 'pointer' },
  planBtnComing: { width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDark})`, color: '#fff', fontSize: 14, fontWeight: 800, fontFamily: 'Karla, sans-serif', opacity: 0.75, cursor: 'default' },

  quoteCard: { maxWidth: 640, margin: '30px auto 0', background: '#fff', border: `1px solid ${C.line}`, borderRadius: 18, padding: '28px 30px', textAlign: 'center', boxShadow: C.cardShadow },
  quoteText: { fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(19px, 3vw, 24px)', fontWeight: 600, color: C.ink, lineHeight: 1.4, margin: '10px 0 14px' },
  quoteName: { fontSize: 13, fontWeight: 700, color: C.orangeDark },
  dots: { display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 },
  dot: { height: 8, borderRadius: 999, border: 'none', cursor: 'pointer', transition: 'all .2s', padding: 0 },

  ctaWrap: { maxWidth: 720, margin: '0 auto', padding: '30px 20px 50px', textAlign: 'center' },

  trustStrip: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 16, padding: '0 20px 44px', maxWidth: 900, margin: '0 auto' },
  trustItem: { display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: C.body },

  footer: { background: C.ink, color: 'rgba(255,255,255,0.72)', padding: '46px 20px 26px' },
  footerGrid: { maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1.2fr', gap: 30 },
  footerLogoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 },
  footerBlurb: { fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: '0 0 16px' },
  socialRow: { display: 'flex', gap: 10 },
  socialBtn: { width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' },
  footerHeading: { fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff', marginBottom: 14 },
  footerLink: { display: 'block', background: 'none', border: 'none', padding: '5px 0', fontSize: 13.5, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', textAlign: 'left', fontFamily: 'Karla, sans-serif' },
  newsletter: { display: 'flex', gap: 8, marginTop: 12 },
  newsInput: { flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 9, padding: '10px 12px', color: '#fff', fontSize: 13, fontFamily: 'Karla, sans-serif' },
  newsBtn: { width: 42, flexShrink: 0, borderRadius: 9, border: 'none', background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDark})`, color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' },
  footerBottom: { maxWidth: 1080, margin: '32px auto 0', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 12.5, color: 'rgba(255,255,255,0.45)', textAlign: 'center' },

  // Dashboard preview
  previewShell: { background: '#0F1B2D', borderRadius: 18, padding: 10, boxShadow: '0 30px 70px rgba(15,27,45,0.28)', border: '1px solid rgba(15,27,45,0.1)' },
  previewBar: { display: 'flex', gap: 6, padding: '4px 8px 10px' },
  previewDot: { width: 9, height: 9, borderRadius: '50%' },
  previewBody: { display: 'flex', background: '#0F1B2D', borderRadius: 12, overflow: 'hidden', minHeight: 300 },
  previewSidebar: { width: 128, flexShrink: 0, background: '#0B1422', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 3 },
  previewBrand: { display: 'flex', alignItems: 'center', gap: 6, color: '#fff', fontSize: 12, fontWeight: 800, fontFamily: 'Cormorant Garamond, serif', marginBottom: 10, paddingLeft: 2 },
  previewBrandF: { width: 18, height: 18, borderRadius: 5, background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDark})`, display: 'grid', placeItems: 'center', fontSize: 11, color: '#fff' },
  previewNavItem: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 10.5, color: 'rgba(255,255,255,0.55)', padding: '6px 7px', borderRadius: 7 },
  previewNavActive: { background: 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: 700 },
  previewNavDot: { width: 5, height: 5, borderRadius: '50%', flexShrink: 0 },
  previewMain: { flex: 1, background: '#F7F9FB', padding: 14, minWidth: 0 },
  previewHeadRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  previewH: { fontSize: 15, fontWeight: 800, color: C.ink },
  previewSubtle: { fontSize: 10.5, color: C.muted, marginTop: 1 },
  previewChip: { fontSize: 9.5, fontWeight: 700, color: C.body, background: '#fff', border: `1px solid ${C.line}`, borderRadius: 999, padding: '3px 9px' },
  previewStatRow: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 },
  previewStat: { background: '#fff', border: `1px solid ${C.line}`, borderRadius: 9, padding: '9px 10px' },
  previewStatL: { fontSize: 9, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' },
  previewStatV: { fontFamily: 'Cormorant Garamond, serif', fontSize: 15, fontWeight: 700, marginTop: 2 },
  previewSplit: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  previewPanel: { background: '#fff', border: `1px solid ${C.line}`, borderRadius: 10, padding: '11px 12px' },
  previewScore: { fontFamily: 'Cormorant Garamond, serif', fontSize: 30, fontWeight: 700, color: '#16A34A', lineHeight: 1, margin: '2px 0 4px' },
  previewBarMeta: { display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.body, marginBottom: 3 },
  previewTrack: { height: 5, background: '#EEF1F5', borderRadius: 3, overflow: 'hidden' },
  previewLegend: { display: 'flex', flexWrap: 'wrap', gap: '4px 10px', justifyContent: 'center', marginTop: 4 },
  previewLegendItem: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 8.5, color: C.body },
};
