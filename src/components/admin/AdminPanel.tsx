import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, CreditCard, Settings, ReceiptText, LifeBuoy, BarChart3, ClipboardList, SlidersHorizontal, MessageSquareWarning, Mail, MoreHorizontal, FileText } from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { AdminLogin } from './AdminLogin';
import { AdminOverview } from './views/AdminOverview';
import { AdminSupportOverview } from './views/AdminSupportOverview';
import { AdminUsers } from './views/AdminUsers';
import { AdminSubscriptions } from './views/AdminSubscriptions';
import { AdminPayments } from './views/AdminPayments';
import { AdminSettings } from './views/AdminSettings';
import { AdminSupportCases } from './views/AdminSupportCases';
import { AdminSupportInbox } from './views/AdminSupportInbox';
import { AdminReports } from './views/AdminReports';
import { AdminAuditLogs } from './views/AdminAuditLogs';
import { AdminAppSettings } from './views/AdminAppSettings';
import { AdminChatHealth } from './views/AdminChatHealth';
import { AdminNewsletter } from './views/AdminNewsletter';
import { AdminBlog } from './views/AdminBlog';

type AdminView = 'overview' | 'users' | 'payments' | 'subscriptions' | 'supportInbox' | 'support' | 'reports' | 'chatHealth' | 'audit' | 'config' | 'settings' | 'newsletter' | 'blog';

const NAV: { view: AdminView; label: string; icon: React.ReactNode; roles: string[] }[] = [
  { view: 'overview',      label: 'Overview',      icon: <LayoutDashboard size={20} />, roles: ['super_admin', 'support', 'finance'] },
  { view: 'users',         label: 'Users',         icon: <Users size={20} />,           roles: ['super_admin', 'support'] },
  { view: 'payments',      label: 'Payments',      icon: <ReceiptText size={20} />,     roles: ['super_admin', 'finance'] },
  { view: 'subscriptions', label: 'Subscriptions', icon: <CreditCard size={20} />,      roles: ['super_admin', 'finance'] },
  { view: 'supportInbox',  label: 'Support Chats', icon: <LifeBuoy size={20} />,        roles: ['super_admin', 'support'] },
  { view: 'support',       label: 'Support Cases', icon: <LifeBuoy size={20} />,        roles: ['super_admin', 'support'] },
  { view: 'reports',       label: 'Reports',       icon: <BarChart3 size={20} />,       roles: ['super_admin', 'finance'] },
  { view: 'newsletter',    label: 'Newsletter',    icon: <Mail size={20} />,            roles: ['super_admin'] },
  { view: 'blog',          label: 'Blog',          icon: <FileText size={20} />,        roles: ['super_admin'] },
  { view: 'chatHealth',    label: 'Chat Health',   icon: <MessageSquareWarning size={20} />, roles: ['super_admin'] },
  { view: 'audit',         label: 'Audit Logs',    icon: <ClipboardList size={20} />,   roles: ['super_admin'] },
  { view: 'config',        label: 'App Config',    icon: <SlidersHorizontal size={20} />, roles: ['super_admin'] },
  { view: 'settings',      label: 'Settings',      icon: <Settings size={20} />,        roles: ['super_admin'] },
];

// Order tabs get priority for the mobile bottom bar; the rest fall into "More".
const MOBILE_PRIORITY: AdminView[] = ['overview', 'users', 'payments', 'supportInbox', 'newsletter', 'blog', 'subscriptions', 'support', 'reports', 'chatHealth', 'audit', 'config', 'settings'];

export const AdminPanel: React.FC = () => {
  const { admin, logout, login, loading, error } = useAdminAuth();
  const [view, setView] = useState<AdminView>('overview');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  if (!admin) return <AdminLogin login={login} loading={loading} error={error} />;

  const allowedNav = NAV.filter(n => n.roles.includes(admin.role));

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: '100vh', background: 'var(--bg-page)', fontFamily: 'DM Sans, sans-serif' }}>

      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside style={sidebar}>
          <div style={{ padding: '24px 20px 16px' }}>
            <div style={{ fontSize: 16, fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, color: 'var(--gold)' }}>PesaFlow Admin</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{admin.role.replace('_', ' ')}</div>
          </div>
          <nav style={{ flex: 1, padding: '0 10px' }}>
            {allowedNav.map(n => (
              <button key={n.view} onClick={() => setView(n.view)} style={{
                ...navBtn,
                background: view === n.view ? 'var(--sidebar-active)' : 'transparent',
                color: view === n.view ? 'var(--gold)' : 'var(--text-2)',
                borderLeft: view === n.view ? '3px solid var(--gold)' : '3px solid transparent',
              }}>
                <span style={{ marginRight: 10, display: 'flex' }}>{n.icon}</span>{n.label}
              </button>
            ))}
          </nav>
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{admin.email}</div>
            <button onClick={logout} style={logoutBtn}>Sign Out</button>
          </div>
        </aside>
      )}

      {/* Main content */}
      <main style={{ flex: 1, padding: isMobile ? '20px 16px 80px' : '32px 28px', overflowY: 'auto' }}>
        {/* Mobile header */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 15, fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, color: 'var(--gold)' }}>PesaFlow Admin</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{admin.role.replace('_', ' ')}</div>
            </div>
            <button onClick={logout} style={{ ...logoutBtn, width: 'auto', padding: '6px 12px' }}>Sign Out</button>
          </div>
        )}

        {view === 'overview'      && (admin.role === 'support' ? <AdminSupportOverview /> : <AdminOverview />)}
        {view === 'users'         && <AdminUsers canEdit={admin.role === 'super_admin'} admin={admin} />}
        {view === 'payments'      && <AdminPayments />}
        {view === 'subscriptions' && <AdminSubscriptions />}
        {view === 'supportInbox'  && <AdminSupportInbox admin={admin} />}
        {view === 'support'       && <AdminSupportCases admin={admin} />}
        {view === 'reports'       && <AdminReports />}
        {view === 'newsletter'    && <AdminNewsletter />}
        {view === 'blog'          && <AdminBlog />}
        {view === 'chatHealth'    && <AdminChatHealth />}
        {view === 'audit'         && <AdminAuditLogs />}
        {view === 'config'        && <AdminAppSettings admin={admin} />}
        {view === 'settings'      && <AdminSettings admin={admin} />}
      </main>

      {/* Mobile Bottom Nav — main tabs + "More" sheet for the rest */}
      {isMobile && (() => {
        const ordered = MOBILE_PRIORITY.map(v => allowedNav.find(n => n.view === v)).filter(Boolean) as typeof allowedNav;
        const hasMore = ordered.length > 5;
        const primary = hasMore ? ordered.slice(0, 4) : ordered.slice(0, 5);
        const overflow = hasMore ? ordered.slice(4) : [];
        const inOverflow = overflow.some(n => n.view === view);
        return (
          <>
            {moreOpen && (
              <>
                <div style={sheetScrim} onClick={() => setMoreOpen(false)} />
                <div style={moreSheet}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 6px 10px' }}>More</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                    {overflow.map(n => (
                      <button key={n.view} onClick={() => { setView(n.view); setMoreOpen(false); }} style={{
                        ...sheetItem,
                        background: view === n.view ? 'var(--sidebar-active)' : 'transparent',
                        color: view === n.view ? 'var(--gold)' : 'var(--text-2)',
                      }}>
                        {n.icon}
                        <span style={{ fontSize: 10.5, textAlign: 'center', lineHeight: 1.2 }}>{n.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <nav style={bottomNav}>
              {primary.map(n => (
                <button key={n.view} onClick={() => { setView(n.view); setMoreOpen(false); }} style={{
                  ...bottomTab,
                  color: view === n.view ? 'var(--gold)' : 'var(--text-3)',
                }}>
                  {n.icon}
                  <span style={{ fontSize: 10, fontWeight: view === n.view ? 700 : 400 }}>{n.label}</span>
                  {view === n.view && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 24, height: 2, background: 'var(--gold)', borderRadius: 2 }} />}
                </button>
              ))}
              {hasMore && (
                <button onClick={() => setMoreOpen(o => !o)} style={{ ...bottomTab, color: (moreOpen || inOverflow) ? 'var(--gold)' : 'var(--text-3)' }}>
                  <MoreHorizontal size={20} />
                  <span style={{ fontSize: 10, fontWeight: (moreOpen || inOverflow) ? 700 : 400 }}>More</span>
                  {inOverflow && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 24, height: 2, background: 'var(--gold)', borderRadius: 2 }} />}
                </button>
              )}
            </nav>
          </>
        );
      })()}
    </div>
  );
};

const sidebar: React.CSSProperties = {
  width: 220, background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)',
  display: 'flex', flexDirection: 'column', flexShrink: 0,
};
const navBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', width: '100%', padding: '10px 12px',
  borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
  fontFamily: 'DM Sans, sans-serif', marginBottom: 2, textAlign: 'left',
};
const logoutBtn: React.CSSProperties = {
  width: '100%', padding: '8px', borderRadius: 7, border: '1px solid var(--border-s)',
  background: 'transparent', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer',
};
const bottomNav: React.CSSProperties = {
  position: 'fixed', bottom: 0, left: 0, right: 0,
  background: 'var(--sidebar-bg)', borderTop: '1px solid var(--sidebar-border)',
  display: 'flex', height: 60, zIndex: 50,
};
const bottomTab: React.CSSProperties = {
  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', gap: 2, border: 'none', background: 'transparent',
  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', position: 'relative',
};
const sheetScrim: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 55,
};
const moreSheet: React.CSSProperties = {
  position: 'fixed', left: 0, right: 0, bottom: 60, zIndex: 60,
  background: 'var(--sidebar-bg)', borderTop: '1px solid var(--sidebar-border)',
  padding: '14px 14px calc(14px + env(safe-area-inset-bottom, 0px))',
  boxShadow: '0 -12px 30px rgba(0,0,0,0.25)', borderRadius: '16px 16px 0 0',
};
const sheetItem: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: 6, padding: '12px 6px', borderRadius: 10, border: 'none', cursor: 'pointer',
  fontFamily: 'DM Sans, sans-serif', minHeight: 68,
};
