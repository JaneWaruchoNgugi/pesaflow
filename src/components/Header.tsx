import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    BarChart3, Bell, Bot, ChevronDown, ChevronLeft, ChevronRight, CreditCard,
    Download, Home, Info, Landmark, LineChart, Lock, LogOut, Moon, PiggyBank,
    Shield, Sun, TrendingUp, UserCircle, WalletCards, X
} from 'lucide-react';
import type { AppView } from '../types';
import type { SubscriptionTier } from '../types';
import {type Theme, ThemeContext, useTheme} from "../hooks/NavItems.ts";
import { PLAN_LOCKED_VIEWS } from '../lib/planAccess';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        try {
            const stored = localStorage.getItem('fw-theme');
            if (stored === 'light' || stored === 'dark') return stored;
            return 'light';
        } catch {
            return 'light';
        }
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        try {
            localStorage.setItem('fw-theme', theme);
        } catch { /* empty */ }
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme(t => (t === 'dark' ? 'light' : 'dark'));
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

/* ══════════════════════════════════════════════════════════
   NAV ITEMS
══════════════════════════════════════════════════════════ */
interface NavItem {
  id: AppView;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  group: 'main' | 'plan' | 'intel';
}

const NAV_ITEMS: NavItem[] = [
    { id: 'advisor',     label: 'Advisor',    icon:Home ,          group: 'main' },
    { id: 'dashboard',   label: 'Overview',   icon: Info,         group: 'main' },
  { id: 'expenses',    label: 'Expenses',   icon: WalletCards,  group: 'main' },
  { id: 'investments', label: 'Invest',     icon: LineChart,    group: 'main' },
  { id: 'goals',       label: 'Investments', icon: TrendingUp,  group: 'plan' },
  { id: 'bills',       label: 'Bills',      icon: CreditCard,   group: 'plan' },
  { id: 'networth',    label: 'Net Worth',  icon: Landmark,     group: 'plan' },
  { id: 'emergency',   label: 'Emergency',  icon: Shield,       group: 'plan' },
  { id: 'insights',    label: 'Insights',   icon: BarChart3,    group: 'intel' },
  { id: 'chat',        label: 'AI Chat',    icon: Bot,          group: 'intel' },
  { id: 'alerts',      label: 'Alerts',     icon: Bell,         group: 'intel' },
  { id: 'profile',     label: 'Profile',    icon: UserCircle,   group: 'intel' },
  { id: 'upgrade',     label: 'Upgrade',    icon: PiggyBank,    group: 'intel' },
];

// Bottom bar primary tabs (mobile)
const FREE_MOBILE: AppView[] = [ 'advisor', 'expenses', 'goals', 'bills','dashboard'];
const PAID_MOBILE: AppView[] = ['advisor', 'investments', 'chat', 'expenses', 'goals'];
// MORE_ITEMS is commented out because the More sheet is currently disabled
// const MORE_ITEMS = NAV_ITEMS.filter(n => !PAID_MOBILE.includes(n.id));

const SCORE_COLOR: Record<string, string> = {
  excellent: 'var(--score-excellent)',
  good:      'var(--score-good)',
  fair:      'var(--score-fair)',
  poor:      'var(--score-poor)',
  critical:  'var(--score-critical)',
};

/* ══════════════════════════════════════════════════════════
   PROPS
══════════════════════════════════════════════════════════ */
interface HeaderProps {
  activeView:          AppView;
  onNavigate:          (view: AppView) => void;
  score:               number;
  scoreLevel:          string;
  userName?:           string;
  onLock?:             () => void;
  onLogout?:           () => void;
  onExportExpenses?:   () => void;
  onExportInvestments?:() => void;
  onExportNetWorth?:   () => void;
  userTier?:           SubscriptionTier;
  subscriptionNotice?: string | null;
  onOpenUpgrade?:      () => void;
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export const Header: React.FC<HeaderProps> = ({
                                                activeView,
                                                onNavigate,
                                                score,
                                                scoreLevel,
                                                userName,
                                                onLock,
                                                onLogout,
                                                onExportExpenses,
                                                onExportInvestments,
                                                onExportNetWorth,
                                                userTier = 'free',
                                                subscriptionNotice = null,
                                                onOpenUpgrade,
                                              }) => {
  const { theme, toggleTheme } = useTheme();
  const scoreColor = SCORE_COLOR[scoreLevel] ?? 'var(--text-3)';

  const [collapsed, setCollapsed] = useState(false);
  const [mobileSide, setMobileSide] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Memoized nav groups — hide locked views for current tier
  const lockedViews = PLAN_LOCKED_VIEWS[userTier] ?? [];
  const isVisible = (id: AppView) => !lockedViews.includes(id);

  const { mainItems, planItems, intelItems } = useMemo(() => ({
    mainItems:  NAV_ITEMS.filter(n => n.group === 'main' && n.id !== 'upgrade' && isVisible(n.id)),
    planItems:  NAV_ITEMS.filter(n => n.group === 'plan' && n.id !== 'upgrade' && isVisible(n.id)),
    intelItems: NAV_ITEMS.filter(n => n.group === 'intel' && (n.id !== 'upgrade' || userTier === 'free' || userTier === 'silver') && isVisible(n.id)),
  }), [userTier, lockedViews]);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Click outside for user menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lock body scroll when sidebars are open
  useEffect(() => {
    document.body.style.overflow = mobileSide || moreOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileSide, moreOpen]);

  const go = useCallback((id: AppView) => {
    onNavigate(id);
    setMobileSide(false);
    setMoreOpen(false);
  }, [onNavigate]);

  /* Score ring helper – now uses dynamic circumference */
  const scoreRing = useCallback((size: number) => {
    const r = size * 0.36;
    const circumference = 2 * Math.PI * r;
    const fill = (score / 100) * circumference;
    return (
        <div
            style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}
            role="img"
            aria-label={`Financial health score: ${score}`}
        >
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
            <circle
                cx={size/2}
                cy={size/2}
                r={r}
                fill="none"
                stroke="var(--border-s)"
                strokeWidth={size * 0.088}
            />
            <circle
                cx={size/2}
                cy={size/2}
                r={r}
                fill="none"
                stroke={scoreColor}
                strokeWidth={size * 0.088}
                strokeLinecap="round"
                style={{
                  strokeDasharray: `${fill} ${circumference}`,
                  filter: `drop-shadow(0 0 ${size*0.1}px ${scoreColor}80)`,
                  transition: 'stroke-dasharray .8s ease',
                }}
            />
          </svg>
          <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: size * 0.25,
                fontWeight: 700,
                color: scoreColor,
              }}
          >
            {score}
          </div>
        </div>
    );
  }, [score, scoreColor]);

  return (
      <>
        {/* Mobile sidebar backdrop */}
        <div
            className={`fw-sb-back${mobileSide ? ' fw-sb-back--open' : ''}`}
            onClick={() => setMobileSide(false)}
            aria-hidden="true"
        />

        {/* Sidebar */}
        <aside
            className={[
              'fw-sidebar',
              collapsed && 'collapsed',
              mobileSide && 'mobile-open',
            ].filter(Boolean).join(' ')}
            aria-label="Main navigation"
        >
          {/* Logo row */}
          <div className="fw-sidebar-hd fw-sidebar-hd-root">
            <button className="fw-logo-btn" onClick={() => go('dashboard')} aria-label="Go to dashboard">
              <div className="fw-logo-mark">
                <span className="fw-logo-sym">P</span>
              </div>
              <div className="fw-reveal fw-logo-text">
                <div className="fw-logo-name">PesaFlow</div>
                <div className="fw-logo-tag">TRACK YOUR MONEY. GROW YOUR WEALTH. SLEEP BETTER.</div>
              </div>
            </button>
            <button
                className="fw-collapse-btn"
                onClick={() => {
                  if (mobileSide) setMobileSide(false);
                  else setCollapsed(c => !c);
                }}
                aria-label={mobileSide ? 'Close sidebar' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <span className="fw-collapse-icon" style={{ display: 'inline-flex' }}>
                {mobileSide ? <X size={16} strokeWidth={2.4} /> : (collapsed ? <ChevronRight size={16} strokeWidth={2.4} /> : <ChevronLeft size={16} strokeWidth={2.4} />)}
              </span>
            </button>
          </div>

          {/* Navigation groups */}
          <div className="fw-sidebar-scroll">
            {[
              { title: 'Main', items: mainItems },
              { title: 'Planning', items: planItems },
              { title: 'Intelligence', items: intelItems },
            ].map(group => (
                <div key={group.title} style={{ padding: '0 10px 4px' }}>
                  <div className="fw-sec-lbl fw-reveal">{group.title}</div>
                  {group.items.map((item: NavItem) => {
                    const isActive = activeView === item.id;
                    const isUpgrade = item.id === 'upgrade';
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            className={`fw-navbtn${isActive ? ' fw-navbtn--active' : ''}`}
                            onClick={() => go(item.id)}
                            title={item.label}
                            aria-current={isActive ? 'page' : undefined}
                            style={isUpgrade ? {
                              margin: '8px 0 0',
                              background: isActive ? 'linear-gradient(135deg, var(--gold-l), var(--gold))' : 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.08))',
                              border: '1px solid var(--border-acc)',
                              borderRadius: 10,
                              color: 'var(--gold)',
                            } : undefined}
                        >
                          {isActive && !isUpgrade && <span className="fw-navbtn-pip" aria-hidden="true" />}
                          <span className="fw-navbtn-icon" aria-hidden="true"><Icon size={19} strokeWidth={2.2} /></span>
                          <span className="fw-reveal fw-navbtn-label" style={isUpgrade ? { fontWeight: 700 } : undefined}>{item.label}</span>
                          {item.id === 'chat' && (
                              <span className="fw-reveal fw-ai-chip" aria-label="AI feature">AI</span>
                          )}
                          {isUpgrade && (
                              <span className="fw-reveal" style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold)', background: 'var(--gold-dim)', borderRadius: 4, padding: '2px 6px', marginLeft: 'auto' }}>PRO</span>
                          )}
                        </button>
                    );
                  })}
                </div>
            ))}
          </div>

          {/* Footer */}
          <div className="fw-sidebar-footer">
            {/* Score pill */}
            <div className="fw-score-pill">
              {scoreRing(36)}
              <div className="fw-reveal fw-score-info">
                <div className="fw-score-num" style={{ color: scoreColor }}>{score}</div>
                <div className="fw-score-sub">Financial Health</div>
              </div>
              <span
                  className="fw-reveal fw-score-badge"
                  style={{
                    color: scoreColor,
                    background: `${scoreColor}18`,
                    border: `1px solid ${scoreColor}28`,
                  }}
              >
              {scoreLevel}
            </span>
            </div>
            {/* Theme toggle */}
            <button className="fw-theme-btn" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              <span className="fw-theme-emoji" style={{ display: 'inline-flex' }} aria-hidden="true">{theme === 'dark' ? <Moon size={15} strokeWidth={2.2} /> : <Sun size={15} strokeWidth={2.2} />}</span>
              <span className="fw-reveal fw-theme-label">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
              <div className={`fw-reveal fw-track${theme === 'light' ? ' fw-track--on' : ''}`} aria-hidden="true">
                <div className="fw-thumb" />
              </div>
            </button>
          </div>
        </aside>

        {/* Topbar */}
        <div className={`fw-topbar${scrolled ? ' scrolled' : ''}`}>
          <div className="fw-topbar-inner">
            {/* Hamburger */}
            <button
                className="fw-ham"
                onClick={() => setMobileSide(o => !o)}
                aria-label="Toggle menu"
                aria-expanded={mobileSide}
            >
              <span /><span /><span />
            </button>

            {/* Page title */}
            <span className="fw-page-title">
            {NAV_ITEMS.find(n => n.id === activeView)?.label ?? 'PesaFlow'}
          </span>

            <div style={{ flex: 1 }} />

            {/* Theme button (mobile) */}
            <button
                className="fw-tbar-theme-btn"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={16} strokeWidth={2.2} /> : <Moon size={16} strokeWidth={2.2} />}
            </button>

            {/* Subscription notice */}
            <button
                className={`fw-notice-btn${subscriptionNotice ? ' has-notice' : ''}`}
                onClick={onOpenUpgrade}
                title={subscriptionNotice || 'Subscription notifications'}
                aria-label={subscriptionNotice || 'Subscription notifications'}
            >
              <Bell size={16} strokeWidth={2.2} />
              {subscriptionNotice && <span className="fw-notice-dot" />}
            </button>

            {/* Learn link — opens the public Financial Learning Hub */}
            <a
              href="/blog"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700,
                color: 'var(--gold)', textDecoration: 'none', padding: '6px 12px',
                border: '1px solid var(--border-acc)', borderRadius: 999,
              }}
              title="Financial Learning Hub"
            >
              Learn
            </a>

            {/* Score ring (topbar) */}
            <div className="fw-tbar-score" style={{ color: scoreColor }}>
              {scoreRing(24)}
              <div className="fw-tbar-score-text">
                <div className="fw-tbar-score-num">{score}</div>
                <div className="fw-tbar-score-lbl">Score</div>
              </div>
            </div>

            {/* User menu */}
            <div style={{ position: 'relative' }} ref={menuRef}>
              <button
                  className="fw-user-btn"
                  onClick={() => setUserMenu(o => !o)}
                  aria-label="User menu"
                  aria-expanded={userMenu}
              >
                <div className="fw-avatar">
                  {userName ? userName[0].toUpperCase() : 'U'}
                </div>
                {userName && <span className="fw-user-name">{userName}</span>}
                <span className="fw-user-caret" style={{ display: 'inline-flex' }} aria-hidden="true"><ChevronDown size={14} strokeWidth={2.4} /></span>
              </button>

              {userMenu && (
                  <div className="fw-dropdown" role="menu">
                    {userName && (
                        <div className="fw-dropdown-head" role="presentation">
                          <div className="fw-dropdown-name">{userName}</div>
                          <div className="fw-dropdown-sub">PesaFlow Profile</div>
                        </div>
                    )}
                    <button className="fw-dropdown-item" onClick={onExportExpenses} role="menuitem"><Download size={15} strokeWidth={2.2} /> Export Expenses</button>
                    <button className="fw-dropdown-item" onClick={onExportInvestments} role="menuitem"><Download size={15} strokeWidth={2.2} /> Export Investments</button>
                    <button className="fw-dropdown-item" onClick={onExportNetWorth} role="menuitem"><Download size={15} strokeWidth={2.2} /> Export Net Worth</button>
                    <div className="fw-dropdown-sep" role="separator" />
                    <button className="fw-dropdown-item fw-dropdown-item--danger" onClick={onLock} role="menuitem"><Lock size={15} strokeWidth={2.2} /> Lock App</button>
                    <button className="fw-dropdown-item fw-dropdown-item--danger" onClick={() => onLogout?.()} role="menuitem"><LogOut size={15} strokeWidth={2.2} /> Log Out</button>
                  </div>
              )}
            </div>
          </div>
        </div>


        {/* ══════════ MOBILE BOTTOM NAV ════════════════════════ */}
      <nav className="fw-bottom-nav">
        <div className="fw-bottom-nav-inner">
          {(userTier === 'free' ? FREE_MOBILE : PAID_MOBILE).map(id => {
            const item = NAV_ITEMS.find(n => n.id === id)!;
            const Icon = item.icon;

            const isCenter = userTier === 'free' ? id === 'goals' : id === 'chat';
            return (
              <button
                key={id}
                className={`fw-tab${activeView === id ? ' active' : ''}${isCenter ? ' fw-tab--center' : ''}`}
                onClick={() => go(id)}
              >
                <div className="fw-tab-bubble"><Icon size={18} strokeWidth={2.2} /></div>
                <span>{id === 'chat' ? 'AI Coach' : (id === 'investments' || id === 'goals') ? 'Invest' : item.label}</span>
              </button>
            );
          })}
          {/*<button*/}
          {/*  className={`fw-tab${moreActive ? ' active' : ''}`}*/}
          {/*  onClick={() => setMoreOpen(true)}*/}
          {/*>*/}
          {/*  <div className="fw-tab-bubble">*/}
          {/*    {moreActive ? MORE_ITEMS.find(n => n.id === activeView)?.icon ?? '⋯' : '⋯'}*/}
          {/*  </div>*/}
          {/*  <span>More</span>*/}
          {/*</button>*/}
        </div>
      </nav>

      {/* ══════════ MORE SHEET ═══════════════════════════════ */}
      {/*<div className={`fw-backdrop${moreOpen ? ' open' : ''}`} onClick={() => setMoreOpen(false)} />*/}
      {/*<div className={`fw-sheet${moreOpen ? ' open' : ''}`}>*/}
      {/*  <div className="fw-sheet-handle"><div className="fw-sheet-bar" /></div>*/}
      {/*  <div className="fw-sheet-header">*/}
      {/*    <span className="fw-sheet-title">More</span>*/}
      {/*    <button className="fw-sheet-close" onClick={() => setMoreOpen(false)}>✕</button>*/}
      {/*  </div>*/}
      {/*  <div className="fw-sheet-grid">*/}
      {/*    {MORE_ITEMS.map(item => (*/}
      {/*      <button*/}
      {/*        key={item.id}*/}
      {/*        className={`fw-sheet-item${activeView === item.id ? ' active' : ''}`}*/}
      {/*        onClick={() => go(item.id)}*/}
      {/*      >*/}
      {/*        <span className="fw-sheet-emoji">{item.icon}</span>*/}
      {/*        <span className="fw-sheet-lbl">{item.label}</span>*/}
      {/*      </button>*/}
      {/*    ))}*/}
      {/*  </div>*/}
      {/*  <div className="fw-sheet-actions">*/}
      {/*    <button className="fw-sheet-act fw-sheet-act-gold" onClick={() => { onExportExpenses?.(); setMoreOpen(false); }}>⬇ Export Data</button>*/}
      {/*    <button className="fw-sheet-act fw-sheet-act-red"  onClick={() => { onLock?.(); setMoreOpen(false); }}>🔒 Lock App</button>*/}
      {/*  </div>*/}
      {/*</div>*/}

      {/* ══════════ SCOPED CSS ═══════════════════════════════ */}
      <style>{`
        /* Mobile backdrop */
        .fw-sb-back { position:fixed; inset:0; z-index:190; background:rgba(0,0,0,0); transition:background .25s; pointer-events:none; }
        .fw-sb-back--open { background:rgba(0,0,0,.52); pointer-events:auto; }

        /* Sidebar header */
        .fw-sidebar-hd-root { display:flex; align-items:center; justify-content:space-between; padding:20px 18px 16px; flex-shrink:0; border-bottom:1px solid var(--sidebar-border); margin-bottom:6px; gap:8px; }

        /* Logo */
        .fw-logo-btn { display:flex; align-items:center; gap:10px; background:transparent; border:none; cursor:pointer; min-width:0; padding:0; }
        .fw-logo-mark { width:34px; height:34px; border-radius:10px; flex-shrink:0; background:linear-gradient(145deg,var(--gold),var(--gold-l)); display:flex; align-items:center; justify-content:center; box-shadow:0 2px 10px var(--gold-glow),inset 0 1px 0 rgba(255,255,255,.25); transition:transform .2s,box-shadow .2s; }
        .fw-logo-btn:hover .fw-logo-mark { transform:translateY(-1px) rotate(-4deg); box-shadow:0 5px 18px var(--gold-glow); }
        .fw-logo-sym  { font-family:'Cormorant Garamond',serif; font-size:19px; font-weight:800; color:#0A1628; line-height:1; }
        .fw-logo-text { min-width:0; }
        .fw-logo-name { font-family:'Cormorant Garamond',serif; font-size:17px; font-weight:700; color:var(--text-1); white-space:nowrap; line-height:1.1; }
        .fw-logo-tag  { font-size:8.5px; font-weight:700; color:var(--text-3); letter-spacing:.13em; text-transform:uppercase; }

        /* Collapse btn */
        .fw-collapse-btn { width:28px; height:28px; border-radius:8px; flex-shrink:0; background:var(--sidebar-hover); border:1px solid var(--border); color:var(--text-3); font-size:14px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .15s; }
        .fw-collapse-btn:hover { color:var(--gold); border-color:var(--border-acc); background:var(--gold-dim); }
        .fw-collapse-icon { display:inline-block; transition:none; }

        /* Sidebar scroll */
        .fw-sidebar-scroll { flex:1; overflow-y:auto; overflow-x:hidden; scrollbar-width:none; padding-bottom:8px; }
        .fw-sidebar-scroll::-webkit-scrollbar { display:none; }

        /* Section label */
        .fw-sec-lbl { font-size:9.5px; font-weight:700; letter-spacing:.13em; text-transform:uppercase; color:var(--text-3); padding:10px 6px 5px; overflow:hidden; white-space:nowrap; transition:opacity .15s; }

        /* Nav button */
        .fw-navbtn { display:flex; align-items:center; gap:10px; padding:10px 12px; margin:1px 0; border-radius:10px; border:1px solid transparent; background:transparent; cursor:pointer; width:100%; text-align:left; position:relative; overflow:hidden; transition:all .15s; -webkit-tap-highlight-color:transparent; }
        .fw-navbtn:hover { background:var(--sidebar-hover); border-color:var(--border); }
        .fw-navbtn--active { background:var(--sidebar-active); border-color:var(--sidebar-ab); }
        .fw-navbtn-pip { position:absolute; left:0; top:22%; bottom:22%; width:3px; border-radius:0 3px 3px 0; background:linear-gradient(to bottom,var(--gold),var(--gold-l)); }
        .fw-navbtn-icon  { font-size:17px; width:20px; text-align:center; flex-shrink:0; transition:transform .15s; }
        .fw-navbtn:hover .fw-navbtn-icon { transform:scale(1.12); }
        .fw-navbtn-label { font-size:13.5px; font-weight:500; color:var(--text-2); white-space:nowrap; transition:color .15s; }
        .fw-navbtn--active .fw-navbtn-label { color:var(--gold); font-weight:600; }
        .fw-navbtn--active .fw-navbtn-icon { filter:drop-shadow(0 0 3px var(--gold-glow)); }
        .fw-ai-chip { margin-left:auto; padding:1px 6px; border-radius:4px; font-size:8px; font-weight:700; letter-spacing:.06em; background:var(--gold-dim); color:var(--gold); border:1px solid var(--border-acc); flex-shrink:0; }

        /* Sidebar footer */
        .fw-sidebar-footer { padding:10px; border-top:1px solid var(--sidebar-border); flex-shrink:0; display:flex; flex-direction:column; gap:6px; }
        .fw-score-pill { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:12px; background:var(--bg-surface); border:1px solid var(--border); overflow:hidden; }
        .fw-score-info { flex:1; min-width:0; }
        .fw-score-num  { font-family:'Cormorant Garamond',serif; font-size:20px; font-weight:700; line-height:1; }
        .fw-score-sub  { font-size:9px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--text-3); margin-top:1px; }
        .fw-score-badge { font-size:9px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; padding:3px 8px; border-radius:20px; flex-shrink:0; white-space:nowrap; }
        .fw-theme-btn  { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:10px; background:var(--bg-surface); border:1px solid var(--border); cursor:pointer; width:100%; transition:border-color .15s; }
        .fw-theme-btn:hover { border-color:var(--border-acc); }
        .fw-theme-emoji { font-size:15px; flex-shrink:0; }
        .fw-theme-label { font-size:12px; font-weight:500; color:var(--text-2); white-space:nowrap; flex:1; text-align:left; }
        .fw-track { width:34px; height:19px; border-radius:10px; background:var(--border-s); position:relative; transition:background .2s; margin-left:auto; flex-shrink:0; }
        .fw-track--on { background:var(--gold); }
        .fw-thumb { position:absolute; top:2.5px; left:2.5px; width:14px; height:14px; border-radius:50%; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,.25); transition:left .2s cubic-bezier(.4,0,.2,1); }
        .fw-track--on .fw-thumb { left:calc(100% - 16.5px); }

        /* Topbar */
        .fw-ham { display:flex; flex-direction:column; justify-content:center; align-items:center; gap:4px; width:36px; height:36px; border-radius:9px; background:var(--bg-surface); border:1px solid var(--border); cursor:pointer; transition:all .15s; flex-shrink:0; }
        .fw-ham span { display:block; width:16px; height:2px; border-radius:1px; background:var(--text-2); transition:background .15s; }
        .fw-ham:hover span { background:var(--gold); }
        .fw-ham:hover { border-color:var(--border-acc); }
        .fw-page-title { font-family:'Cormorant Garamond',serif; font-size:19px; font-weight:600; color:var(--text-1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .fw-tbar-theme-btn { width:34px; height:34px; border-radius:9px; background:var(--bg-surface); border:1px solid var(--border); font-size:16px; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; transition:border-color .15s; }
        .fw-tbar-theme-btn:hover { border-color:var(--border-acc); }
        .fw-tbar-score { display:flex; align-items:center; gap:7px; padding:5px 11px; border-radius:30px; border:1px solid var(--border); background:var(--bg-surface); flex-shrink:0; }
        .fw-tbar-score-text { display:flex; flex-direction:column; }
        .fw-tbar-score-num { font-family:'Cormorant Garamond',serif; font-size:16px; font-weight:700; line-height:1; }
        .fw-tbar-score-lbl { font-size:8.5px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--text-3); }

        /* User */
        .fw-user-btn { display:flex; align-items:center; gap:7px; padding:4px 10px; border-radius:9px; background:transparent; border:1px solid var(--border); color:var(--text-2); cursor:pointer; transition:all .15s; flex-shrink:0; }
        .fw-user-btn:hover { background:var(--bg-surface); border-color:var(--border-s); }
        .fw-avatar { width:26px; height:26px; border-radius:7px; background:var(--gold-dim); border:1px solid var(--border-acc); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:var(--gold); font-family:'Cormorant Garamond',serif; }
        .fw-user-name { font-size:13px; font-weight:500; max-width:88px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .fw-user-caret { font-size:9px; color:var(--text-3); }

        /* Dropdown */
        .fw-dropdown { position:absolute; top:calc(100% + 8px); right:0; background:var(--bg-elevated,var(--bg-card)); border:1px solid var(--border); border-radius:14px; padding:6px; min-width:200px; box-shadow:var(--shadow-lg); z-index:400; animation:popIn .15s ease; }
        .fw-dropdown-head  { padding:8px 12px 12px; border-bottom:1px solid var(--border); margin-bottom:4px; }
        .fw-dropdown-name  { font-size:13px; font-weight:600; color:var(--text-1); }
        .fw-dropdown-sub   { font-size:11px; color:var(--text-3); margin-top:2px; }
        .fw-dropdown-item  { display:flex; align-items:center; gap:10px; width:100%; padding:9px 12px; border-radius:8px; background:transparent; border:none; color:var(--text-2); font-family:'DM Sans',sans-serif; font-size:13px; cursor:pointer; transition:all .12s; text-align:left; }
        .fw-dropdown-item:hover { background:var(--bg-surface); color:var(--text-1); }
        .fw-dropdown-item--danger:hover { color:var(--red); background:var(--red-dim); }
        .fw-dropdown-sep   { height:1px; background:var(--border); margin:4px 0; }
      `}</style>
    </>
  );
};
