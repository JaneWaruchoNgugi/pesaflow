import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { seedDemoIfNeeded } from './lib/demoData'

// Guests see a populated app on first paint: seed demo data (once) before render,
// so the data hooks initialise from it. No-ops for signed-in/returning users.
try { seedDemoIfNeeded(); } catch { /* non-fatal: empty app still works */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
// Service worker intentionally NOT registered — it repeatedly served stale cached
// builds and masked deploys during debugging. We still ship a self-destroying
// /sw.js so any device that previously installed one purges it and reloads fresh.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations?.()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => { /* best effort */ });
}
