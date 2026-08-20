import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // Auto-adopt updates: when a newly-installed service worker takes control after a
  // deploy, reload once so the page runs the fresh build immediately instead of the
  // previously-cached one. Guard on a prior controller so a brand-new first visit
  // (no old SW) doesn't reload, and on `reloaded` so we never loop.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => reg.update())
      .catch((error) => console.error('PesaFlow service worker registration failed', error));
  });
}
