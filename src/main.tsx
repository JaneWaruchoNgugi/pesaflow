import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { BlogApp } from './components/blog/BlogApp.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { seedDemoIfNeeded } from './lib/demoData'

try { seedDemoIfNeeded(); } catch { /* non-fatal: empty app still works */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public blog — rendered OUTSIDE the app's AuthGate */}
          <Route path="/blog/*" element={<BlogApp />} />
          {/* Existing app — unchanged, stays at root to protect Google-auth redirects */}
          <Route path="/*" element={<App />} />
        </Routes>
      </BrowserRouter>
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
