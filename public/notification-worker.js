// Dominus Notification Worker — handles scheduled daily-summary notifications.
// Registered manually at /notification-worker.js (separate from the PWA cache SW).

let alarmTime = null;       // "HH:MM" string set via postMessage
let lastNotifDate = null;   // ISO date string of last fired notification

self.addEventListener("message", (event) => {
  if (event.data?.type === "SET_ALARM") {
    alarmTime = event.data.time;
    lastNotifDate = event.data.lastNotifDate ?? null;
  }
  if (event.data?.type === "NOTIF_SENT") {
    lastNotifDate = event.data.date;
  }
  if (event.data?.type === "SHOW_SUMMARY") {
    const { pendingTasks, pendingHabits, date } = event.data;
    const lines = [];
    if (pendingTasks > 0) lines.push(`📋 ${pendingTasks} tarefa${pendingTasks !== 1 ? "s" : ""} para hoje`);
    if (pendingHabits > 0) lines.push(`🔥 ${pendingHabits} hábito${pendingHabits !== 1 ? "s" : ""} por completar`);
    const body = lines.length ? lines.join("  •  ") : "Tudo em dia, guerreiro! 🏆";

    self.registration.showNotification("☀️ Resumo Diário — Dominus", {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "daily-summary",
      renotify: true,
      data: { url: "/" },
    });

    self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then((clients) => {
      clients.forEach((c) => c.postMessage({ type: "NOTIF_SENT", date }));
    });
  }
});

// Check every 60 seconds if it's time to fire
setInterval(() => {
  if (!alarmTime) return;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const today = now.toISOString().split("T")[0];

  if (`${hh}:${mm}` === alarmTime && lastNotifDate !== today) {
    lastNotifDate = today;
    self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then((clients) => {
      if (clients.length === 0) {
        // App is closed — generic nudge
        self.registration.showNotification("☀️ Resumo Diário — Dominus", {
          body: "Abra o app para ver suas tarefas e hábitos de hoje.",
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: "daily-summary",
          renotify: true,
        });
        return;
      }
      // App is open — ask for rich summary
      clients.forEach((c) => c.postMessage({ type: "REQUEST_SUMMARY" }));
    });
  }
}, 60_000);

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow("/");
    })
  );
});
