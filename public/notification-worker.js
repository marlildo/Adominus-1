// ADOMINUS Notification Worker — lembretes inteligentes de hábitos, tarefas e foco.

let alarmTime    = null;  // "HH:MM" resumo diário
let lastNotifDate = null; // ISO date do último envio

// Horários fixos de lembretes (HH:MM)
const HABIT_REMINDER_TIME  = "08:00"; // manhã — lembrete de hábitos
const TASK_REMINDER_TIME   = "13:00"; // tarde  — tarefas pendentes
const FOCUS_REMINDER_TIME  = "19:00"; // noite  — sugestão de foco

const sentToday = { habit: null, task: null, focus: null, summary: null };

function todayStr() { return new Date().toISOString().split("T")[0]; }
function currentHHMM() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
}

function showNotif(title, body, tag, url = "/") {
  return self.registration.showNotification(title, {
    body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png",
    tag, renotify: true, data: { url },
  });
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "SET_ALARM") {
    alarmTime = event.data.time;
    lastNotifDate = event.data.lastNotifDate ?? null;
  }
  if (event.data?.type === "NOTIF_SENT") { lastNotifDate = event.data.date; }
  if (event.data?.type === "SHOW_SUMMARY") {
    const { pendingTasks, pendingHabits, date } = event.data;
    const lines = [];
    if (pendingTasks  > 0) lines.push(`📋 ${pendingTasks} tarefa${pendingTasks  !== 1 ? "s" : ""} pendente${pendingTasks  !== 1 ? "s" : ""}`);
    if (pendingHabits > 0) lines.push(`🔥 ${pendingHabits} hábito${pendingHabits !== 1 ? "s" : ""} por completar`);
    const body = lines.length ? lines.join("  •  ") : "Tudo em dia, guerreiro! 🏆";
    showNotif("☀️ Resumo Diário — ADOMINUS", body, "daily-summary");
    self.clients.matchAll({ includeUncontrolled: true, type: "window" })
      .then((clients) => clients.forEach((c) => c.postMessage({ type: "NOTIF_SENT", date })));
  }
});

// Verifica a cada 60 s se é hora de disparar algum lembrete
setInterval(() => {
  const hhmm = currentHHMM();
  const today = todayStr();

  // 🌅 Lembrete de hábitos — 08:00
  if (hhmm === HABIT_REMINDER_TIME && sentToday.habit !== today) {
    sentToday.habit = today;
    showNotif("🔥 Hora dos seus hábitos!", "Comece o dia forte, guerreiro. Seus hábitos aguardam.", "habit-reminder", "/habitos");
  }

  // 📋 Lembrete de tarefas — 13:00
  if (hhmm === TASK_REMINDER_TIME && sentToday.task !== today) {
    sentToday.task = today;
    self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then((clients) => {
      if (clients.length === 0) {
        showNotif("📋 Tarefas pendentes!", "Você tem tarefas para hoje. Abra o ADOMINUS e conquiste.", "task-reminder", "/tarefas");
      } else {
        clients.forEach((c) => c.postMessage({ type: "REQUEST_SUMMARY" }));
      }
    });
  }

  // 🌳 Sugestão de foco — 19:00
  if (hhmm === FOCUS_REMINDER_TIME && sentToday.focus !== today) {
    sentToday.focus = today;
    showNotif("🌳 Sessão de foco!", "Dedique 25 minutos ao que importa. Plante sua árvore hoje.", "focus-reminder", "/focus-tree");
  }

  // ⏰ Resumo diário — horário configurado pelo usuário
  if (alarmTime && hhmm === alarmTime && lastNotifDate !== today) {
    lastNotifDate = today;
    self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then((clients) => {
      if (clients.length === 0) {
        showNotif("☀️ Resumo Diário — ADOMINUS", "Abra o app para ver seu progresso de hoje.", "daily-summary");
      } else {
        clients.forEach((c) => c.postMessage({ type: "REQUEST_SUMMARY" }));
      }
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
