self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { return; }
  event.waitUntil(self.registration.showNotification(data.title || 'Sistema de ventas', {
    body: data.body || '', tag: data.tag, data: { url: data.url || '/' },
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin);
  if (url.origin !== self.location.origin) return;
  event.waitUntil(clients.openWindow(url.href));
});
