// Self-destroying service worker.
//
// Earlier versions cached the app shell and repeatedly served stale code to
// returning devices after deploys, which made auth fixes look like they "did
// nothing". This worker unregisters itself, clears all caches, and reloads any
// controlled pages so every device is guaranteed to run the latest network build.
// `main.tsx` no longer registers a service worker, so nothing re-installs this.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => client.navigate(client.url));
  })());
});
