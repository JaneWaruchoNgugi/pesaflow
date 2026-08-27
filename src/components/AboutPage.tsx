import React from 'react';
import {
  Compass, ShieldCheck, HeartHandshake, Sparkles, Wallet, TrendingUp,
  BookOpen, Bot, Mail, ArrowUpRight,
} from 'lucide-react';

/* PesaFlow's "About Us" — the story, the mission, and what the product does.
   Pure presentation: no data, no props. Uses the same CSS-variable theme tokens
   (var(--gold), var(--text-1)…) as the rest of the app so it follows light/dark. */

interface AboutPageProps {
  onNavigate?: (view: 'upgrade' | 'tools' | 'advisor') => void;
}

const VALUES = [
  { icon: ShieldCheck, title: 'Privacy first', body: 'Your money data is yours. We keep it secure, never sell it, and give you full control — export or delete any time.' },
  { icon: HeartHandshake, title: 'Built for Kenyans', body: 'M-Pesa, SACCOs, MMFs, chamas and shilling-first thinking. PesaFlow speaks how you actually manage money.' },
  { icon: Compass, title: 'Guidance, not judgement', body: 'No shame, no jargon. Just clear next steps that meet you where you are on your financial journey.' },
  { icon: Sparkles, title: 'Always improving', body: 'We ship often, listen closely, and grow the product around the goals our members are chasing.' },
];

const OFFERINGS = [
  { icon: Wallet, title: 'Track every shilling', body: 'Expenses, bills and income in one clear picture — so you always know where your money goes.' },
  { icon: TrendingUp, title: 'Grow your wealth', body: 'Investments, net worth, emergency fund and goal planning tuned for Kenyan instruments.' },
  { icon: Bot, title: 'AI money coach', body: 'Personalised insights and an assistant that answers your money questions in plain language.' },
  { icon: BookOpen, title: 'Learn as you go', body: 'A free financial learning hub with practical, no-nonsense guides written for Kenya.' },
];

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 920, margin: '0 auto' }}>

    {/* Hero */}
    <section style={hero}>
      <span style={eyebrow}>About PesaFlow</span>
      <h1 style={heroTitle}>Track your money. Grow your wealth. Sleep better.</h1>
      <p style={heroLead}>
        PesaFlow is a personal finance companion built for Kenya. We help everyday people take
        control of their money — from the first shilling budgeted to the first million invested —
        with tools that are simple, honest, and genuinely useful.
      </p>
    </section>

    {/* Mission */}
    <section style={card}>
      <h2 style={h2}>Our mission</h2>
      <p style={body}>
        Money stress is one of the heaviest weights people carry, yet good financial tools have
        long been built for someone else — another country, another currency, another life.
        We're changing that. PesaFlow exists to put clear, trustworthy money management in the
        hands of every Kenyan, so building wealth feels less like a mystery and more like a habit.
      </p>
    </section>

    {/* What we offer */}
    <section>
      <h2 style={{ ...h2, marginBottom: 14 }}>What PesaFlow does</h2>
      <div style={grid}>
        {OFFERINGS.map(({ icon: Icon, title, body }) => (
          <div key={title} style={featureCard}>
            <div style={iconWrap}><Icon size={20} strokeWidth={2.2} /></div>
            <div style={featureTitle}>{title}</div>
            <div style={featureBody}>{body}</div>
          </div>
        ))}
      </div>
    </section>

    {/* Values */}
    <section>
      <h2 style={{ ...h2, marginBottom: 14 }}>What we stand for</h2>
      <div style={grid}>
        {VALUES.map(({ icon: Icon, title, body }) => (
          <div key={title} style={featureCard}>
            <div style={iconWrap}><Icon size={20} strokeWidth={2.2} /></div>
            <div style={featureTitle}>{title}</div>
            <div style={featureBody}>{body}</div>
          </div>
        ))}
      </div>
    </section>

    {/* Contact + CTA */}
    <section style={{ ...card, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <h2 style={{ ...h2, marginBottom: 6 }}>Say hello</h2>
        <p style={{ ...body, margin: 0 }}>Questions, feedback, or a partnership idea? We'd love to hear from you.</p>
        <a href="mailto:support@pesaflow.app" style={mailLink}>
          <Mail size={15} strokeWidth={2.2} /> support@pesaflow.app
        </a>
      </div>
      {onNavigate && (
        <button style={ctaBtn} onClick={() => onNavigate('upgrade')}>
          Explore Pro <ArrowUpRight size={16} strokeWidth={2.4} />
        </button>
      )}
    </section>

    <p style={footNote}>PesaFlow © {new Date().getFullYear()} · Smart money management for every Kenyan.</p>
  </div>
);

/* ── styles ─────────────────────────────────────────────── */
const hero: React.CSSProperties = { textAlign: 'center', padding: '8px 0 4px' };
const eyebrow: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--gold)' };
const heroTitle: React.CSSProperties = { fontFamily: 'Cormorant Garamond, serif', fontSize: 34, lineHeight: 1.12, fontWeight: 700, color: 'var(--text-1)', margin: '10px auto 12px', maxWidth: 640 };
const heroLead: React.CSSProperties = { fontSize: 15.5, lineHeight: 1.65, color: 'var(--text-2)', maxWidth: 620, margin: '0 auto' };

const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 24px' };
const h2: React.CSSProperties = { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 8px' };
const body: React.CSSProperties = { fontSize: 14.5, lineHeight: 1.65, color: 'var(--text-2)', margin: 0 };

const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 };
const featureCard: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 18px 20px' };
const iconWrap: React.CSSProperties = { width: 40, height: 40, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid var(--border-acc)', marginBottom: 12 };
const featureTitle: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 5 };
const featureBody: React.CSSProperties = { fontSize: 13, lineHeight: 1.55, color: 'var(--text-3)' };

const mailLink: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 10, fontSize: 14, fontWeight: 700, color: 'var(--gold)', textDecoration: 'none' };
const ctaBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 20px', borderRadius: 11, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 700, color: '#0A1628', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', boxShadow: '0 3px 14px var(--gold-glow)' };
const footNote: React.CSSProperties = { textAlign: 'center', fontSize: 12, color: 'var(--text-3)', margin: '4px 0 8px' };
