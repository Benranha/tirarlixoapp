self.addEventListener("push", (event) => {
  let dados = { title: "Tirar o Lixo", body: "", url: "/" };
  try { dados = { ...dados, ...event.data.json() }; } catch {}
  event.waitUntil(
    self.registration.showNotification(dados.title, {
      body: dados.body, icon: "/icon-192.png", badge: "/icon-192.png",
      tag: "lixo", renotify: true, data: { url: dados.url }, vibrate: [200, 100, 200],
    })
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/"));
});
