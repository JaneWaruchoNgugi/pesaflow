import React from 'react';
import { TriangleAlert } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Something went wrong.',
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('FinWise render error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.icon}><TriangleAlert size={22} strokeWidth={2.4} /></div>
          <h1 style={styles.title}>Something went wrong</h1>
          <p style={styles.text}>The app hit an unexpected error. Refresh the page and try again.</p>
          {this.state.message && <pre style={styles.detail}>{this.state.message}</pre>}
          <button style={styles.button} onClick={() => window.location.reload()}>Refresh</button>
        </div>
      </div>
    );
  }
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, background: 'var(--bg-page, #f8fafc)', fontFamily: 'DM Sans, sans-serif' },
  card: { width: 'min(420px, 100%)', background: 'var(--bg-card, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 14, padding: 24, boxShadow: 'var(--shadow-card, 0 12px 32px rgba(15,23,42,.08))', textAlign: 'center' },
  icon: { width: 42, height: 42, borderRadius: 12, margin: '0 auto 12px', display: 'grid', placeItems: 'center', background: 'var(--red-dim, #fee2e2)', color: 'var(--red, #dc2626)', fontWeight: 900 },
  title: { margin: 0, fontFamily: 'Cormorant Garamond, serif', fontSize: 28, color: 'var(--text-1, #111827)' },
  text: { margin: '8px 0 0', color: 'var(--text-2, #4b5563)', fontSize: 14, lineHeight: 1.6 },
  detail: { margin: '14px 0 0', padding: 10, maxHeight: 120, overflow: 'auto', textAlign: 'left', whiteSpace: 'pre-wrap', borderRadius: 8, background: 'var(--bg-surface, #f3f4f6)', color: 'var(--text-3, #64748b)', fontSize: 12 },
  button: { marginTop: 16, border: 0, borderRadius: 10, padding: '11px 18px', background: 'var(--btn-gradient, linear-gradient(135deg,#f59e0b,#d97706))', color: '#fff', fontWeight: 800, cursor: 'pointer' },
};
