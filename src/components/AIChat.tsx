import React, { useState, useRef, useEffect } from 'react';
import { Wallet, BarChart3, TrendingUp, Scale, Siren, AlertTriangle, Send, MoreHorizontal } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { addDoc, collection, query, orderBy, limit, getDocs, doc, setDoc } from 'firebase/firestore';
import { db, functions } from '../lib/firebase';
import type {
  ChatMessage, FinancialProfile, MonthlyBreakdown, InvestmentSummary,
  Bill, Goal, Habit,
} from '../types';
import { formatCurrency, generateId } from '../utils/expenses';
import { generateFreeAdvisorReply } from '../utils/freeAdvisorAgent';

interface AIChatProps {
  userId: string;
  profile: FinancialProfile;
  breakdown: MonthlyBreakdown;
  investmentSummary: InvestmentSummary;
  userName?: string;
  bills?: Bill[];
  billsMonthlyTotal?: number;
  goals?: Goal[];
  netWorthSummary?: { totalAssets: number; totalLiabilities: number; netWorth: number };
  habits?: Habit[];
  efCurrent?: number;
  efTarget?: number;
  onNavigateToAlerts?: () => void;
}

const QUICK_PROMPTS = [
  'How healthy is my spending this month?',
  'Am I on track with my goals?',
  'Give me a monthly savings plan',
];

type CallableFn = (data: {
  userId: string;
  message: string;
  conversationHistory: Array<{ role: string; content: string }>;
}) => Promise<{ data: { reply: string; userMsgId?: string; aiMsgId?: string } }>;

const chatWithAdvisor = httpsCallable(functions, 'chatWithAdvisor') as unknown as CallableFn;

const logChatError = async (payload: { userId: string; stage: string; message: string; code?: string; prompt?: string }) => {
  try {
    await addDoc(collection(db, 'chatErrors'), {
      ...payload,
      createdAt: new Date().toISOString(),
      resolved: false,
    });
  } catch {
    // Best effort only. Users should still get the local fallback.
  }
};


export const AIChat: React.FC<AIChatProps> = ({
  userId,
  profile, breakdown, investmentSummary, userName,
  bills = [],
  billsMonthlyTotal = 0,
  goals = [],
  netWorthSummary = { totalAssets: 0, totalLiabilities: 0, netWorth: 0 },
  habits = [],
  efCurrent = 0,
  efTarget = 0,
  onNavigateToAlerts,
}) => {
  const welcomeMsg: ChatMessage = {
    id: 'welcome',
    role: 'assistant',
    content: `Habari${userName ? `, ${userName}` : ''}! I'm your PesaFlow financial advisor. I answer money questions using your PesaFlow data: spending, bills, goals, net worth, emergency fund, investments, and habits.\n\nAsk me about your budget, savings plan, bills, debt, investments, or emergency fund.`,
    timestamp: new Date().toISOString(),
  };

  const [messages, setMessages]     = useState<ChatMessage[]>([welcomeMsg]);
  const [historyLoaded, setLoaded]  = useState(false);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // Load persistent chat history from Firestore on mount
  useEffect(() => {
    if (!userId) { setLoaded(true); return; }
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'users', userId, 'chat'), orderBy('timestamp', 'asc'), limit(50))
        );
        if (!snap.empty) {
          setMessages(snap.docs.map(d => d.data() as ChatMessage));
        }
      } catch (err: any) {
        await logChatError({ userId, stage: 'load_history', message: err?.message || 'Failed to load chat history', code: err?.code });
      } finally {
        setLoaded(true);
      }
    })();
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading || !historyLoaded) return;
    setError(null);

    const userMsg: ChatMessage = {
      id: generateId(), role: 'user',
      content: text.trim(), timestamp: new Date().toISOString(),
    };
    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      const result = await chatWithAdvisor({
        userId,
        message: text.trim(),
        conversationHistory,
      });

      const aiMsg: ChatMessage = {
        id: result.data.aiMsgId || generateId(),
        role: 'assistant',
        content: result.data.reply,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const reply = generateFreeAdvisorReply(text.trim(), {
        profile,
        breakdown,
        investmentSummary,
        bills,
        billsMonthlyTotal,
        goals,
        netWorthSummary,
        habits,
        efCurrent,
        efTarget,
      });

      const fallbackMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `${reply}

Claude is unavailable right now, so I used the built-in PesaFlow advisor instead.`,
        timestamp: new Date().toISOString(),
      };

      if (userId) {
        await Promise.all([
          setDoc(doc(db, 'users', userId, 'chat', userMsg.id), userMsg),
          setDoc(doc(db, 'users', userId, 'chat', fallbackMsg.id), fallbackMsg),
        ]);
      }

      await logChatError({ userId, stage: 'advisor_response', message: err?.message || 'Claude is unavailable. Used local advisor fallback.', code: err?.code, prompt: text.trim() });
      setMessages(prev => [...prev, fallbackMsg]);
      setError(err?.message || 'Claude is unavailable. Used local advisor fallback.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

  const renderContent = (text: string) =>
    text.split('\n').map((line, i) => {
      if (line.startsWith('- ') || line.startsWith('• '))
        return <div key={i} style={S.bullet}>• {line.replace(/^[•\-] /, '')}</div>;
      if (line.startsWith('**') && line.endsWith('**'))
        return <div key={i} style={S.boldLine}>{line.slice(2, -2)}</div>;
      if (line === '') return <div key={i} style={{ height: 6 }} />;
      const boldLine = line.replace(/\*\*(.+?)\*\*/g, '$1');
      return <div key={i}>{boldLine || line}</div>;
    });

  return (
    <div style={S.container} className="animate-in">

      {/* Header */}
      <div style={S.chatHeader}>
        <div style={S.aiAvatar}>P</div>
        <div>
          <div style={S.aiName}>PesaFlow AI Advisor</div>
          <div style={S.aiStatus}>
            <span style={S.statusDot} />Claude financial agent · Uses your PesaFlow data
          </div>
        </div>
        <div style={S.contextBadges}>
          <span style={S.badge}><Wallet size={12} strokeWidth={2.2} /> {formatCurrency(profile.monthlyIncome, profile.currency)}/mo</span>
          <span style={S.badge}><BarChart3 size={12} strokeWidth={2.2} /> {formatCurrency(breakdown.totalExpenses, profile.currency)} spent</span>
          <span style={S.badge}><TrendingUp size={12} strokeWidth={2.2} /> {formatCurrency(investmentSummary.totalInvested, profile.currency)} invested</span>
          <span style={S.badge}><Scale size={12} strokeWidth={2.2} /> {formatCurrency(netWorthSummary.netWorth, profile.currency)} NW</span>
        </div>
        {onNavigateToAlerts && (
          <button onClick={onNavigateToAlerts}
            style={{ padding: '7px 14px', background: 'var(--red-dim)', border: '1px solid var(--red-b)', borderRadius: 8, color: 'var(--red)', fontSize: 12, fontFamily: 'Karla, sans-serif', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Siren size={14} strokeWidth={2.4} /> SOS
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={S.messagesPane}>
        {!historyLoaded && (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13, padding: 24 }}>
            Loading conversation history...
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} style={{ ...S.msgRow, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && <div style={S.aiBubbleAvatar}>P</div>}
            <div style={{ ...S.bubble, ...(msg.role === 'user' ? S.userBubble : S.aiBubble) }}>
              <div style={S.bubbleContent}>{renderContent(msg.content)}</div>
              <div style={S.bubbleTime}>{formatTime(msg.timestamp)}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ ...S.msgRow, justifyContent: 'flex-start' }}>
            <div style={S.aiBubbleAvatar}>P</div>
            <div style={{ ...S.bubble, ...S.aiBubble }}>
              <div style={S.typingDots}>
                {[0, 0.2, 0.4].map((d, i) => (
                  <span key={i} style={{ ...S.dot, animationDelay: `${d}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && <div style={S.errorMsg}><AlertTriangle size={14} strokeWidth={2.2} /> {error}</div>}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts — show when only welcome message is present */}
      {messages.length <= 1 && historyLoaded && (
        <div style={S.quickPromptsWrap}>
          <div style={S.quickLabel}>Quick questions</div>
          <div style={S.quickPrompts}>
            {QUICK_PROMPTS.map((p) => (
              <button key={p} className="fw-quick-btn" style={S.quickBtn} onClick={() => sendMessage(p)}>{p}</button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={S.inputArea}>
        <textarea
          ref={inputRef} className="fw-chat-textarea"
          style={S.textarea}
          placeholder="Ask about your budget, bills, savings, debt, or investments..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2} disabled={loading || !historyLoaded}
        />
        <button
          style={{ ...S.sendBtn, opacity: !input.trim() || loading || !historyLoaded ? 0.4 : 1 }}
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading || !historyLoaded}
        >
          {loading ? <MoreHorizontal size={22} strokeWidth={2.4} /> : <Send size={20} strokeWidth={2.2} />}
        </button>
      </div>
      <div style={S.inputHint}>Enter to send · Shift+Enter for new line</div>

      <style>{`
        @keyframes blink { 0%,80%,100% { opacity: 0.2; } 40% { opacity: 1; } }
      `}</style>
    </div>
  );
};

const DOT_BASE: React.CSSProperties = {
  width: 7, height: 7, borderRadius: '50%', background: 'var(--text-3)',
  display: 'inline-block', animationName: 'blink',
  animationDuration: '1.4s', animationTimingFunction: 'ease', animationIterationCount: 'infinite',
};

const S: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 14, height: 'calc(100dvh - 160px)', minHeight: 480 },
  chatHeader: { background: 'var(--bg-card)', border: '1px solid var(--border-acc)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  aiAvatar: { width: 42, height: 42, borderRadius: 11, background: 'linear-gradient(145deg, var(--gold), var(--gold-l))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: 21, fontWeight: 800, color: '#0A1628', flexShrink: 0 },
  aiName: { fontFamily: 'Cormorant Garamond, serif', fontSize: 17, fontWeight: 600, color: 'var(--gold-l)' },
  aiStatus: { fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green-dim)', display: 'inline-block' },
  contextBadges: { display: 'flex', gap: 7, flexWrap: 'wrap', marginLeft: 'auto' },
  badge: { fontSize: 11, color: 'var(--text-3)', background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '3px 9px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 },
  messagesPane: { flex: 1, overflowY: 'auto', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 },
  msgRow: { display: 'flex', alignItems: 'flex-start', gap: 9 },
  aiBubbleAvatar: { width: 28, height: 28, borderRadius: 7, background: 'var(--gold-dim)', border: '1px solid var(--border-acc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: 13, fontWeight: 700, color: 'var(--gold)', flexShrink: 0, marginTop: 2 },
  bubble: { maxWidth: '76%', borderRadius: 13, padding: '11px 15px' },
  aiBubble: { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: 14, lineHeight: 1.65, borderTopLeftRadius: 4 },
  userBubble: { background: 'var(--gold-dim)', border: '1px solid var(--border-acc)', color: 'var(--text-1)', fontSize: 14, lineHeight: 1.65, borderTopRightRadius: 4 },
  bubbleContent: { display: 'flex', flexDirection: 'column', gap: 2 },
  bubbleTime: { fontSize: 10, color: 'var(--text-3)', marginTop: 5, textAlign: 'right' },
  bullet: { paddingLeft: 4, marginTop: 2 },
  boldLine: { fontWeight: 600, color: 'var(--text-1)', marginTop: 4 },
  typingDots: { display: 'flex', gap: 5, padding: '3px 0', alignItems: 'center' },
  dot: { ...DOT_BASE },
  errorMsg: { fontSize: 13, color: 'var(--red)', background: 'var(--red-dim)', border: '1px solid var(--red-b)', padding: '9px 13px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 },
  quickPromptsWrap: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 16px' },
  quickLabel: { fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 9 },
  quickPrompts: { display: 'flex', flexWrap: 'wrap', gap: 7 },
  quickBtn: { padding: '6px 13px', background: 'var(--gold-dim)', border: '1px solid var(--border-acc)', borderRadius: 20, color: 'var(--gold)', fontSize: 12, fontFamily: 'Karla, sans-serif', cursor: 'pointer' },
  inputArea: { display: 'flex', gap: 10, alignItems: 'flex-end' },
  textarea: { flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border-acc)', borderRadius: 11, padding: '12px 15px', color: 'var(--text-1)', fontSize: 16, fontFamily: 'Karla, sans-serif', resize: 'none', lineHeight: 1.5, minHeight: 48 },
  sendBtn: { width: 48, height: 48, borderRadius: 11, background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', fontSize: 21, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none', cursor: 'pointer', transition: '0.15s' },
  inputHint: { fontSize: 10, color: 'var(--text-3)', textAlign: 'center', marginTop: -6 },
};
