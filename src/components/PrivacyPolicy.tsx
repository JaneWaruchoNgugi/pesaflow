import React from 'react';
import {
  COMPANY_NAME, SUPPORT_EMAIL, PRIVACY_POLICY_VERSION,
  PRIVACY_EFFECTIVE_DATE, ODPC_NAME, ODPC_URL,
} from '../lib/legal';

// Plain-language privacy policy, aligned with Kenya's Data Protection Act 2019.
// Rendered as an in-app modal (from the signup consent line, the footer, or the
// profile page). This is a starter written for a solo developer — have a Kenyan
// data-protection lawyer review it before you scale or sign B2B/partner deals.
export const PrivacyPolicy: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div style={S.overlay} role="dialog" aria-modal="true" aria-label="Privacy Policy">
    <div style={S.backdrop} onClick={onClose} />
    <div style={S.sheet}>
      <div style={S.header}>
        <div>
          <div style={S.title}>Privacy Policy</div>
          <div style={S.meta}>Version {PRIVACY_POLICY_VERSION} · Effective {PRIVACY_EFFECTIVE_DATE}</div>
        </div>
        <button style={S.close} onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div style={S.body}>
        <P>
          {COMPANY_NAME} helps you track your money, budget, set goals, and plan your
          finances. We know that means trusting us with sensitive information — so this
          page explains, in plain language, what we collect, why, and the rights you have
          over your data under Kenya&apos;s <B>Data Protection Act, 2019</B>.
        </P>

        <H>1. Who we are</H>
        <P>
          {COMPANY_NAME} is the data controller for the information you provide in this app.
          For any privacy question or request, contact us at <B>{SUPPORT_EMAIL}</B>.
        </P>

        <H>2. What we collect</H>
        <UL items={[
          'Account details: your name, email address, and phone number.',
          'Financial information you enter: income, expenses, bills, goals, savings, net worth, investments, and emergency-fund figures.',
          'Payment details for subscriptions: your M-Pesa phone number and transaction references (we never see or store your M-Pesa PIN).',
          'Basic technical data needed to run the app securely (e.g. sign-in session and device/browser info).',
        ]} />

        <H>3. Why we use it</H>
        <UL items={[
          'To run the app and show your dashboard, insights, and reminders.',
          'To process subscription payments you choose to make via M-Pesa.',
          'To keep your account secure and prevent misuse.',
          'To contact you about your account or important service changes.',
        ]} />

        <H>4. Our legal basis</H>
        <P>
          We process your data with <B>your consent</B> (which you give at signup and can
          withdraw at any time) and because it is <B>necessary to provide the service</B>
          you asked for. You can withdraw consent by deleting your account (see section 7).
        </P>

        <H>5. Who we share it with</H>
        <P>
          <B>We do not sell your personal or financial data. Full stop.</B> We share data
          only with the service providers that make the app work:
        </P>
        <UL items={[
          'Google Firebase — secure hosting, database, and sign-in (including Google Sign-In).',
          'Safaricom M-Pesa — only the details needed to process a payment you initiate.',
          'Email delivery providers — to send you account emails such as PIN resets.',
        ]} />
        <P>
          These providers process data on our behalf under their own security and privacy
          obligations. We may also disclose data if required by Kenyan law.
        </P>

        <H>6. How we protect it</H>
        <P>
          Your data is encrypted in transit, stored on Google Firebase&apos;s secured
          infrastructure, and protected by access rules so that only you (and, where
          strictly needed, our administrators) can reach your records. Your PIN is stored
          in hashed form — we cannot read it.
        </P>

        <H>7. Your rights</H>
        <P>Under the Data Protection Act, 2019, you have the right to:</P>
        <UL items={[
          'Access the personal data we hold about you.',
          'Correct data that is wrong or out of date (you can edit most of it in the app).',
          'Delete your account and data — use "Delete account" in the app, which removes your profile and financial records.',
          'Withdraw consent and object to certain processing.',
        ]} />
        <P>
          To exercise any of these, use the in-app controls or email <B>{SUPPORT_EMAIL}</B>.
          We respond within the timelines set by law.
        </P>

        <H>8. How long we keep it</H>
        <P>
          We keep your data for as long as your account is active. When you delete your
          account, we remove your profile and financial records, except where we must
          retain limited information to meet legal or accounting obligations.
        </P>

        <H>9. Children</H>
        <P>{COMPANY_NAME} is intended for users aged 18 and above. We do not knowingly collect data from children.</P>

        <H>10. Changes to this policy</H>
        <P>
          If we make material changes, we will update the version and effective date above
          and ask for your consent again where the law requires it.
        </P>

        <H>11. Complaints</H>
        <P>
          If you have a concern we cannot resolve, you have the right to complain to the{' '}
          <A href={ODPC_URL}>{ODPC_NAME}</A>.
        </P>

        <P style={S.footer}>
          By creating an account, you confirm you have read and understood this policy.
        </P>
      </div>

      <div style={S.actions}>
        <button style={S.doneBtn} onClick={onClose}>Close</button>
      </div>
    </div>
  </div>
);

// ── Small typographic helpers ───────────────────────────────
const B: React.FC<{ children: React.ReactNode }> = ({ children }) => <strong style={{ color: 'var(--text-1)' }}>{children}</strong>;
const P: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => <p style={{ ...S.p, ...style }}>{children}</p>;
const H: React.FC<{ children: React.ReactNode }> = ({ children }) => <h3 style={S.h}>{children}</h3>;
const A: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a href={href} target="_blank" rel="noreferrer" style={S.a}>{children}</a>
);
const UL: React.FC<{ items: string[] }> = ({ items }) => (
  <ul style={S.ul}>{items.map((t) => <li key={t} style={S.li}>{t}</li>)}</ul>
);

const S: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(8px, 3vw, 24px)' },
  backdrop: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' },
  sheet: { position: 'relative', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 560, maxHeight: '92vh', background: 'var(--bg-card)', border: '1px solid var(--border-acc)', borderRadius: 18, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: 'clamp(16px, 4vw, 22px)', borderBottom: '1px solid var(--border)' },
  title: { fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 700, color: 'var(--text-1)' },
  meta: { fontSize: 11, color: 'var(--text-3)', marginTop: 3, letterSpacing: '0.03em' },
  close: { flexShrink: 0, width: 34, height: 34, borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 14, cursor: 'pointer' },
  body: { padding: 'clamp(16px, 4vw, 22px)', overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  h: { fontFamily: 'Karla, sans-serif', fontSize: 15, fontWeight: 800, color: 'var(--text-1)', margin: '20px 0 6px' },
  p: { fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-2)', margin: '0 0 10px' },
  ul: { margin: '0 0 10px', paddingLeft: 18 },
  li: { fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-2)', marginBottom: 6 },
  a: { color: 'var(--gold)', textDecoration: 'underline' },
  footer: { marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', color: 'var(--text-3)', fontStyle: 'italic' },
  actions: { padding: 'clamp(12px, 3vw, 16px)', borderTop: '1px solid var(--border)' },
  doneBtn: { width: '100%', padding: '12px', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', borderRadius: 12, fontWeight: 700, fontSize: 14, fontFamily: 'Karla, sans-serif', border: 'none', cursor: 'pointer' },
};
