// public/sw-push.js
//
// Service worker dédié aux notifications push web sur la carte client
// (/r/[slug], voir handleActivateNotifications) — séparé de sw-scan.js qui
// gère le mode hors-ligne de l'écran de scan employé, un rôle différent.
// Enregistré à la racine ("/") pour pouvoir recevoir un push à tout moment,
// même si le client a fermé l'onglet de sa carte.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Fidélions", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Fidélions";
  const options = {
    body: data.body || "",
    icon: "/logo.png",
    badge: "/favicon-32x32.png",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
