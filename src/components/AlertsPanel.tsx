import React, { useEffect, useRef, useState } from 'react';
import {
  Radio, UserCog, Save, Check, Siren, Mail, MessageCircle, Phone,
  Sparkles, Bot, ScrollText,
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import type { AlertContact, AlertLog, Bill, Goal, SubscriptionTier } from '../types';
import type { MonthlyBreakdown, FinancialProfile, InvestmentSummary } from '../types';
import { formatCurrency } from '../utils/expenses';

type AdvisorCallable = (data: {
  userId: string;
  message: string;
  conversationHistory: Array<{ role: string; content: string }>;
}) => Promise<{ data: { reply: string } }>;

const chatWithAdvisor = httpsCallable(functions, 'chatWithAdvisor') as unknown as AdvisorCallable;

type SavedContact = {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  phone: string;
  updatedAt: string;
};

interface AlertsPanelProps {
  userId: string;
  userTier: SubscriptionTier;
  contact: AlertContact;
  log: AlertLog[];
  hasContact: boolean;
  profile: FinancialProfile;
  breakdown: MonthlyBreakdown;
  investmentSummary: InvestmentSummary;
  bills: Bill[];
  billsMonthlyTotal: number;
  goals: Goal[];
  netWorthSummary: { totalAssets: number; totalLiabilities: number; netWorth: number };
  efCurrent: number;
  efTarget: number;
  userName?: string;
  onSaveContact: (contact: AlertContact) => void;
  onRecordAlert: (channel: AlertLog['channel'], snapshot: string) => void;
  onClearLog: () => void;
  onNavigateToAdvisor?: () => void;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  userId, userTier, contact, log, hasContact,
  profile, breakdown, investmentSummary, bills, billsMonthlyTotal, goals, netWorthSummary,
  efCurrent, efTarget,
  userName, onSaveContact, onRecordAlert, onClearLog, onNavigateToAdvisor,
}) => {
  const [form, setForm] = useState<AlertContact>(contact);
  const [emailTo, setEmailTo] = useState(contact.email || '');
  const [emailSubject, setEmailSubject] = useState(`PesaFlow update for ${userName || 'User'}`);
  const [emailMessage, setEmailMessage] = useState('');
  const [whatsappTo, setWhatsappTo] = useState(contact.whatsapp || '');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const [savedContacts, setSavedContacts] = useState<SavedContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPlan, setAiPlan] = useState('');
  const [aiError, setAiError] = useState('');
  const [composeNote, setComposeNote] = useState('');
  const [activeCompose, setActiveCompose] = useState<'email' | 'whatsapp' | 'ai' | null>('ai');
  const emailComposerRef = useRef<HTMLDivElement | null>(null);
  const whatsappComposerRef = useRef<HTMLDivElement | null>(null);
  const emailFieldRef = useRef<HTMLInputElement | null>(null);
  const whatsappFieldRef = useRef<HTMLInputElement | null>(null);
  const canUseComposeTools = userTier === 'gold' || userTier === 'platinum';
  const contactsStorageKey = `finwise_alert_contacts_${userId || 'guest'}`;

  const billsDue = bills.filter((b) => b.status !== 'paid').reduce((s, b) => s + b.amount, 0);
  const spendPct = profile.monthlyIncome > 0
    ? Math.round((breakdown.totalExpenses / profile.monthlyIncome) * 100) : 0;
  const efPct = efTarget > 0 ? Math.min(100, Math.round((efCurrent / efTarget) * 100)) : 0;

  const buildSnapshot = (): string =>
    `🚨 PesaFlow SOS Alert
From: ${userName || 'PesaFlow User'}
Time: ${new Date().toLocaleString('en-KE', { dateStyle: 'full', timeStyle: 'short' })}

📊 FINANCIAL SNAPSHOT:
• Monthly Income: ${formatCurrency(profile.monthlyIncome, profile.currency)}
• Total Spent: ${formatCurrency(breakdown.totalExpenses, profile.currency)} (${spendPct}% of income)
• Necessary: ${formatCurrency(breakdown.necessaryTotal, profile.currency)}
• Unnecessary: ${formatCurrency(breakdown.unnecessaryTotal, profile.currency)}
• Savings Left: ${formatCurrency(breakdown.savingsLeft, profile.currency)}

💼 INVESTMENTS:
• Total Invested: ${formatCurrency(investmentSummary.totalInvested, profile.currency)}
• Projected Annual Return: ${formatCurrency(investmentSummary.projectedAnnualReturn, profile.currency)}

🗓 BILLS:
• Monthly Bills Total: ${formatCurrency(billsMonthlyTotal, profile.currency)}
• Currently Due/Overdue: ${formatCurrency(billsDue, profile.currency)}

⚖ NET WORTH:
• Total Assets: ${formatCurrency(netWorthSummary.totalAssets, profile.currency)}
• Total Liabilities: ${formatCurrency(netWorthSummary.totalLiabilities, profile.currency)}
• Net Worth: ${formatCurrency(netWorthSummary.netWorth, profile.currency)}

🛡 EMERGENCY FUND: ${efPct}% (${formatCurrency(efCurrent, profile.currency)} / ${formatCurrency(efTarget, profile.currency)})

🎯 ACTIVE GOALS:
${goals.filter((g) => !g.completed).map((g) =>
  `• ${g.name}: ${Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100))}% (${formatCurrency(g.savedAmount, profile.currency)} / ${formatCurrency(g.targetAmount, profile.currency)})`
).join('\n') || '• No active goals'}

Please assist urgently.`;

  useEffect(() => {
    setForm(contact);
    setEmailTo(contact.email || '');
    setWhatsappTo(contact.whatsapp || '');
  }, [contact]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(contactsStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedContact[];
        setSavedContacts(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      setSavedContacts([]);
    }
  }, [contactsStorageKey]);

  useEffect(() => {
    if (!emailMessage) setEmailMessage(buildSnapshot());
    if (!whatsappMessage) setWhatsappMessage(buildSnapshot());
  }, []);

  const buildEmergencyPrompt = (): string =>
    `Create a PesaFlow SOS emergency money plan from this snapshot. Return a concise action plan with these sections: 1) urgent risk, 2) next 24 hours, 3) bills/debt priority, 4) spending cuts, 5) what to tell my advisor. Use Kenyan context and be practical.\n\n${buildSnapshot()}`;

  const buildFallbackPlan = (): string => {
    const actions = [
      '1. Urgent risk: Review bills due, available savings, and emergency fund before making any non-essential payment.',
      `2. Next 24 hours: Pause unnecessary spending. Your current unnecessary spend is ${formatCurrency(breakdown.unnecessaryTotal, profile.currency)}.`,
      `3. Bills priority: Cover essentials first. Current due/overdue bills total ${formatCurrency(billsDue, profile.currency)}.`,
      `4. Emergency fund: You are at ${efPct}% of target. Avoid using it unless this is a true emergency.`,
      '5. Advisor message: Send the SOS snapshot, then ask for one repayment or budget decision to act on today.',
    ];
    if (spendPct >= 90) actions.unshift('Priority warning: spending is above 90% of income this month, so cash-flow control is urgent.');
    return actions.join('\n');
  };

  const openAiPlan = async () => {
    setActiveCompose('ai');
    setComposeNote('');
    await generateAIPlan();
  };

  const generateAIPlan = async () => {
    if (!userId) { setAiError('Missing user account for AI analysis.'); return; }
    setAiLoading(true);
    setAiError('');
    try {
      const result = await chatWithAdvisor({
        userId,
        message: buildEmergencyPrompt(),
        conversationHistory: [],
      });
      setAiPlan(result.data.reply);
    } catch {
      setAiPlan(buildFallbackPlan());
      setAiError('AI is unavailable. Showing a built-in emergency plan.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = () => {
    onSaveContact(form);
    const nextContact: SavedContact = {
      id: form.whatsapp || form.email || form.phone || form.name || `contact_${Date.now()}`,
      name: form.name.trim() || 'Trusted Contact',
      email: form.email.trim(),
      whatsapp: form.whatsapp.trim(),
      phone: form.phone.trim(),
      updatedAt: new Date().toISOString(),
    };
    const nextContacts = [nextContact, ...savedContacts.filter(c => c.id !== nextContact.id)].slice(0, 10);
    setSavedContacts(nextContacts);
    localStorage.setItem(contactsStorageKey, JSON.stringify(nextContacts));
    if (nextContact.whatsapp) {
      setWhatsappTo(nextContact.whatsapp);
      setSelectedContactId(nextContact.id);
    }
    if (nextContact.email) setEmailTo(nextContact.email);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const openEmailComposer = () => {
    setComposeNote('');
    setActiveCompose('email');
    emailComposerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => emailFieldRef.current?.focus(), 150);
  };

  const openWhatsappComposer = () => {
    setComposeNote('');
    setActiveCompose('whatsapp');
    whatsappComposerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => whatsappFieldRef.current?.focus(), 150);
  };

  const selectWhatsAppContact = (id: string) => {
    setSelectedContactId(id);
    const selected = savedContacts.find(c => c.id === id);
    if (!selected) return;
    setWhatsappTo(selected.whatsapp || selected.phone || '');
    setForm(prev => ({ ...prev, name: selected.name, email: selected.email, whatsapp: selected.whatsapp, phone: selected.phone }));
    setActiveCompose('whatsapp');
    window.setTimeout(() => whatsappFieldRef.current?.focus(), 150);
  };

  const sendCustomEmail = () => {
    const recipient = emailTo.trim();
    const subject = emailSubject.trim();
    const message = emailMessage.trim() || buildSnapshot();
    if (!recipient || !subject || !message) {
      setComposeNote('Enter an email address, subject, and message.');
      return;
    }
    setComposeNote('');
    window.open(`mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`);
    onRecordAlert('email', message);
  };

  const sendCustomWhatsApp = () => {
    const recipient = whatsappTo.replace(/\D/g, '');
    const message = whatsappMessage.trim() || buildSnapshot();
    if (!recipient || !message) {
      setComposeNote('Enter a WhatsApp number and message.');
      return;
    }
    setComposeNote('');
    window.open(`https://wa.me/${recipient}?text=${encodeURIComponent(message)}`);
    onRecordAlert('whatsapp', message);
  };

  const callNow = () => {
    if (!form.phone) return;
    window.open(`tel:${form.phone}`);
    onRecordAlert('phone', buildSnapshot());
  };

  return (
    <div style={S.container} className="animate-in">
      {/* Page header */}
      <div style={S.pageHeader}>
        <div>
          <h1 style={S.pageTitle}><Radio size={26} strokeWidth={2.2} style={{ verticalAlign: '-3px', marginRight: 8 }} /> Alerts &amp; SOS</h1>
          <p style={S.pageSub}>Configure your advisor contacts and send instant financial snapshots when you need help</p>
        </div>
      </div>

      {/* Contact config */}
      <div style={S.card}>
        <div style={{ ...S.cardTitle, display: 'inline-flex', alignItems: 'center', gap: 8 }}><UserCog size={20} strokeWidth={2.2} /> Advisor / Trusted Contact Setup</div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20, lineHeight: 1.6 }}>
          Set up your financial advisor or trusted person's contact details. When you trigger an SOS, they'll instantly receive your complete financial snapshot.
        </p>
        <div className="alerts-form-grid" style={{ marginBottom: 16 }}>
          <div style={S.field}>
            <label style={S.label}>Contact Name</label>
            <input style={S.input} value={form.name} placeholder="e.g. My Financial Advisor"
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div style={S.field}>
            <label style={S.label}>Email Address</label>
            <input style={S.input} type="email" value={form.email} placeholder="advisor@example.com"
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <div style={S.field}>
            <label style={S.label}>WhatsApp Number</label>
            <input style={S.input} value={form.whatsapp} placeholder="+254 7XX XXX XXX"
              onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))} />
          </div>
          <div style={S.field}>
            <label style={S.label}>Phone / Call Number</label>
            <input style={S.input} value={form.phone} placeholder="+254 7XX XXX XXX"
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button style={{ ...S.primaryBtn, display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={handleSave}>
            {saved
              ? <><Check size={16} strokeWidth={3} /> Saved!</>
              : <><Save size={16} strokeWidth={2.4} /> Save Contact</>}
          </button>
          {hasContact && (
            <span style={{ fontSize: 12, color: 'var(--green)', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Check size={14} strokeWidth={3} /> Contact configured — SOS alerts ready</span>
          )}
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>Contacts</div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.6 }}>
          Saved contacts you can reuse for WhatsApp and email messages. Pick one to fill the composer automatically.
        </p>
        {savedContacts.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No saved contacts yet. Save one above to build your contact list.</div>
        ) : (
          <div className="alerts-contacts-grid">
            {savedContacts.map((savedContact) => {
              const selected = selectedContactId === savedContact.id;
              return (
                <button
                  key={savedContact.id}
                  type="button"
                  onClick={() => selectWhatsAppContact(savedContact.id)}
                  style={{ ...S.contactCard, borderColor: selected ? 'var(--gold)' : 'var(--border)' }}
                >
                  <div style={S.contactName}>{savedContact.name}</div>
                  <div style={S.contactMeta}>{savedContact.whatsapp || savedContact.phone || 'No WhatsApp number'}</div>
                  <div style={S.contactActions}>
                    <span style={S.contactPill}>{savedContact.email ? 'Email ready' : 'No email'}</span>
                    <span style={S.contactPill}>{savedContact.whatsapp ? 'WhatsApp ready' : 'No WhatsApp'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* SOS action buttons */}
      <div style={S.card}>
        <div style={{ ...S.cardTitle, display: 'inline-flex', alignItems: 'center', gap: 8 }}><Siren size={20} strokeWidth={2.2} /> Send SOS Alert Now</div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20, lineHeight: 1.6 }}>
          Instantly send your complete financial snapshot to {contact.name || 'your advisor'}.
          They'll receive your income, expenses, bills, net worth, goals, and emergency fund status.
        </p>

        <div className="sos-grid">
          {/* Email */}
          <button style={{ ...S.sosBtn, ...(canUseComposeTools ? S.sosEmail : S.sosDisabled) }}
            onClick={openEmailComposer} disabled={!canUseComposeTools}>
            <span style={S.sosIcon}><Mail size={28} strokeWidth={2} /></span>
            <div style={S.sosBtnTitle}>Send Email</div>
            <div style={S.sosBtnSub}>{canUseComposeTools ? 'Open the email composer' : 'Gold only'}</div>
          </button>

          {/* WhatsApp */}
          <button style={{ ...S.sosBtn, ...(canUseComposeTools ? S.sosWhatsapp : S.sosDisabled) }}
            onClick={openWhatsappComposer} disabled={!canUseComposeTools}>
            <span style={S.sosIcon}><MessageCircle size={28} strokeWidth={2} /></span>
            <div style={{ ...S.sosBtnTitle, color: contact.whatsapp ? 'var(--green)' : 'inherit' }}>WhatsApp</div>
            <div style={S.sosBtnSub}>{canUseComposeTools ? 'Open the WhatsApp composer' : 'Gold only'}</div>
          </button>

          {/* Phone */}
          <button style={{ ...S.sosBtn, ...(contact.phone ? S.sosPhone : S.sosDisabled) }}
            onClick={callNow} disabled={!contact.phone}>
            <span style={S.sosIcon}><Phone size={28} strokeWidth={2} /></span>
            <div style={{ ...S.sosBtnTitle, color: contact.phone ? 'var(--blue)' : 'inherit' }}>Call Now</div>
            <div style={S.sosBtnSub}>{contact.phone || 'No phone configured'}</div>
          </button>

          {/* AI Emergency Plan */}
          <button style={{ ...S.sosBtn, borderColor: 'var(--border-acc)', background: activeCompose === 'ai' ? 'var(--gold-dim)' : 'transparent', cursor: aiLoading ? 'wait' : 'pointer', boxShadow: activeCompose === 'ai' ? '0 0 0 1px var(--border-acc) inset' : 'none' }}
            onClick={openAiPlan} disabled={aiLoading} aria-pressed={activeCompose === 'ai'}>
            <span style={S.sosIcon}><Sparkles size={28} strokeWidth={2} /></span>
            <div style={{ ...S.sosBtnTitle, color: 'var(--gold)' }}>{aiLoading ? 'Thinking...' : 'AI Plan'}</div>
            <div style={S.sosBtnSub}>Emergency action steps</div>
          </button>

          {/* AI Chat */}
          <button style={{ ...S.sosBtn, borderColor: 'var(--border-acc)', background: 'var(--bg-card)', cursor: 'pointer' }}
            onClick={onNavigateToAdvisor}>
            <span style={S.sosIcon}><Bot size={28} strokeWidth={2} /></span>
            <div style={{ ...S.sosBtnTitle, color: 'var(--gold)' }}>AI Chat</div>
            <div style={S.sosBtnSub}>Ask follow-up questions</div>
          </button>
        </div>
      </div>

      {canUseComposeTools && (
        <div style={S.card}>
          <div style={S.cardTitle}>Gold communication tools</div>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20, lineHeight: 1.6 }}>
            Send a custom email or WhatsApp message in addition to the SOS snapshot. Use this when you need a short note, a manual update, or a message that is not the full financial report.
          </p>
          <div className="alerts-compose-grid">
            {activeCompose !== 'whatsapp' && (
              <div style={S.composeCard} ref={emailComposerRef}>
                <div style={S.composeHeading}>Email composer</div>
                <div style={S.field}>
                  <label style={S.label}>To</label>
                  <input ref={emailFieldRef} style={S.input} type="email" value={emailTo} placeholder="advisor@example.com" onChange={(e) => setEmailTo(e.target.value)} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Subject</label>
                  <input style={S.input} value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Message</label>
                  <textarea
                    style={S.textarea}
                    rows={6}
                    value={emailMessage}
                    placeholder="Write a short message for your advisor..."
                    onChange={(e) => setEmailMessage(e.target.value)}
                  />
                </div>
                <button style={S.primaryBtn} onClick={sendCustomEmail}>Send Email</button>
              </div>
            )}

            {activeCompose !== 'email' && (
              <div style={S.composeCard} ref={whatsappComposerRef}>
                <div style={S.composeHeading}>WhatsApp composer</div>
                <div style={S.field}>
                  <label style={S.label}>Pick Contact</label>
                  <select style={S.input} value={selectedContactId} onChange={(e) => selectWhatsAppContact(e.target.value)}>
                    <option value="">Choose from saved contacts</option>
                    {savedContacts.map((savedContact) => (
                      <option key={savedContact.id} value={savedContact.id}>{savedContact.name}</option>
                    ))}
                  </select>
                </div>
                <div style={S.field}>
                  <label style={S.label}>Phone Number</label>
                  <input ref={whatsappFieldRef} style={S.input} value={whatsappTo} placeholder="+254 7XX XXX XXX" onChange={(e) => setWhatsappTo(e.target.value)} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Message</label>
                  <textarea
                    style={S.textarea}
                    rows={6}
                    value={whatsappMessage}
                    placeholder="Write a short WhatsApp message..."
                    onChange={(e) => setWhatsappMessage(e.target.value)}
                  />
                </div>
                <button style={S.secondaryBtn} onClick={sendCustomWhatsApp}>Send WhatsApp</button>
              </div>
            )}
          </div>
          {composeNote && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--red)' }}>{composeNote}</div>}
        </div>
      )}

      {/* AI emergency plan */}
      {activeCompose === 'ai' && (aiPlan || aiError || aiLoading) && (
        <div style={{ ...S.card, borderColor: 'var(--border-acc)', background: 'var(--gold-dim)' }}>
          <div style={{ ...S.cardTitle, display: 'inline-flex', alignItems: 'center', gap: 8 }}><Sparkles size={20} strokeWidth={2.2} /> AI Emergency Plan</div>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>
            Generated from your current SOS snapshot. Use this before sending the alert or when talking to your advisor.
          </p>
          {aiLoading && <div style={{ color: 'var(--text-2)', fontSize: 13 }}>Analyzing your financial snapshot...</div>}
          {aiError && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{aiError}</div>}
          {aiPlan && <div style={S.aiPlanBox}>{aiPlan.split('\n').map((line, i) => <div key={i} style={{ marginBottom: line.trim() ? 7 : 4 }}>{line}</div>)}</div>}
        </div>
      )}

      {/* Alert log */}
      {log.length > 0 && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ ...S.cardTitle, display: 'inline-flex', alignItems: 'center', gap: 8 }}><ScrollText size={20} strokeWidth={2.2} /> Alert History</div>
            <button onClick={onClearLog}
              style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--red-b)', borderRadius: 8, color: 'var(--red)', fontSize: 12, fontFamily: 'Karla, sans-serif', cursor: 'pointer' }}>
              Clear History
            </button>
          </div>
          {log.slice(0, 20).map((entry, i) => (
            <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--text-2)' }}>
                {entry.channel === 'email'
                  ? <Mail size={20} strokeWidth={2} />
                  : entry.channel === 'whatsapp'
                    ? <MessageCircle size={20} strokeWidth={2} />
                    : <Phone size={20} strokeWidth={2} />}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text-1)', textTransform: 'capitalize' }}>Alert via {entry.channel}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                  {new Date(entry.timestamp).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--green)', background: 'var(--green-dim)', padding: '3px 10px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}>Sent <Check size={12} strokeWidth={3} /></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 20 },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 },
  pageTitle: { fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 700, color: 'var(--gold-l)', margin: 0 },
  pageSub: { fontSize: 13, color: 'var(--text-2)', marginTop: 4 },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 26px' },
  cardTitle: { fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 600, color: 'var(--text-1)', marginBottom: 0 },
  composeCard: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 },
  composeHeading: { fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 700, color: 'var(--text-1)' },
  contactCard: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 },
  contactName: { fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 700, color: 'var(--text-1)' },
  contactMeta: { fontSize: 12, color: 'var(--text-3)' },
  contactActions: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  contactPill: { fontSize: 11, color: 'var(--text-2)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 8px' },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  input: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 9, padding: '11px 14px', color: 'var(--text-1)', fontSize: 13, fontFamily: 'Karla, sans-serif', outline: 'none', transition: '0.15s' },
  textarea: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 9, padding: '11px 14px', color: 'var(--text-1)', fontSize: 13, fontFamily: 'Karla, sans-serif', outline: 'none', transition: '0.15s', resize: 'vertical', minHeight: 120, boxSizing: 'border-box' },
  primaryBtn: { padding: '11px 22px', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', borderRadius: 10, fontWeight: 700, fontSize: 14, fontFamily: 'Karla, sans-serif', border: 'none', cursor: 'pointer' },
  secondaryBtn: { padding: '11px 22px', background: 'var(--bg-card)', color: 'var(--text-1)', borderRadius: 10, fontWeight: 700, fontSize: 14, fontFamily: 'Karla, sans-serif', border: '1px solid var(--border-acc)', cursor: 'pointer' },
  sosBtn: { padding: '22px 16px', borderRadius: 14, border: '1px solid', cursor: 'pointer', textAlign: 'center', transition: '0.15s', background: 'transparent', minHeight: 44 },
  sosEmail: { borderColor: 'var(--border-acc)', background: 'var(--gold-dim)' },
  sosWhatsapp: { borderColor: 'var(--green-b)', background: 'var(--green-dim)' },
  sosPhone: { borderColor: 'var(--border-s)', background: 'var(--blue-dim)' },
  sosDisabled: { borderColor: 'var(--border)', background: 'var(--bg-surface)', opacity: 0.4 },
  sosIcon: { display: 'block', fontSize: 28, marginBottom: 10 },
  sosBtnTitle: { fontSize: 14, fontWeight: 700, color: 'var(--gold)', fontFamily: 'Cormorant Garamond, serif', marginBottom: 4 },
  sosBtnSub: { fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  previewBox: { background: 'var(--bg-page)', borderRadius: 10, padding: '16px 18px', border: '1px solid var(--border)', maxHeight: 320, overflowY: 'auto' },
  previewText: { fontFamily: 'monospace', fontSize: 11, color: 'var(--text-2)', lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 },
  aiPlanBox: { background: 'var(--bg-card)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border-acc)', color: 'var(--text-1)', fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap' },
};
