import { useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/store/useAppStore";

const STORAGE_KEY = "dominus_notif_time";
const LAST_SENT_KEY = "dominus_notif_last_sent";

let notifWorkerReg: ServiceWorkerRegistration | null = null;

/** Register the dedicated notification worker. */
async function registerNotifWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/notification-worker.js", { scope: "/" });
    notifWorkerReg = reg;
    return reg;
  } catch (e) {
    console.warn("[NotifWorker] Registration failed:", e);
    return null;
  }
}

async function postToNotifWorker(msg: Record<string, unknown>) {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = notifWorkerReg ?? (await navigator.serviceWorker.getRegistration("/notification-worker.js"));
    reg?.active?.postMessage(msg);
  } catch (e) {
    console.warn("[NotifWorker] postMessage failed:", e);
  }
}

/** Request Notification permission from the user. Returns the resulting status. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  return Notification.requestPermission();
}

/** Returns the stored daily summary time (HH:MM) or null. */
export function getStoredAlarmTime(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

/** Saves alarm time and syncs to the notification worker. */
export async function setAlarmTime(time: string | null) {
  if (time) {
    localStorage.setItem(STORAGE_KEY, time);
    const lastNotifDate = localStorage.getItem(LAST_SENT_KEY) ?? null;
    await postToNotifWorker({ type: "SET_ALARM", time, lastNotifDate });
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * NotificationScheduler — renders nothing.
 * • Registers the notification worker on mount.
 * • Syncs stored alarm time after registration.
 * • Listens for REQUEST_SUMMARY and replies with live store data.
 * • Falls back to an in-app sonner toast when OS permission is denied/unavailable.
 */
export function NotificationScheduler() {
  const tasks = useAppStore((s) => s.tasks);
  const habits = useAppStore((s) => s.habits);
  const lastInAppSent = useRef<string | null>(localStorage.getItem(LAST_SENT_KEY));

  const sendSummary = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    const pendingTasks = tasks.filter((t) => !t.completed && t.dueDate === today).length;
    const pendingHabits = habits.filter((h) => !h.completedDates.includes(today)).length;
    postToNotifWorker({ type: "SHOW_SUMMARY", pendingTasks, pendingHabits, date: today });
  }, [tasks, habits]);

  // In-app toast fallback — polls every 60 s when OS notifications are unavailable
  const showInAppSummary = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    const pendingTasks = tasks.filter((t) => !t.completed && t.dueDate === today).length;
    const pendingHabits = habits.filter((h) => !h.completedDates.includes(today)).length;

    const lines: string[] = [];
    if (pendingTasks > 0) lines.push(`📋 ${pendingTasks} tarefa${pendingTasks !== 1 ? "s" : ""} para hoje`);
    if (pendingHabits > 0) lines.push(`🔥 ${pendingHabits} hábito${pendingHabits !== 1 ? "s" : ""} por completar`);
    const body = lines.length ? lines.join("  •  ") : "Tudo em dia, guerreiro! 🏆";

    toast("☀️ Resumo Diário", {
      description: body,
      duration: 10000,
      action: { label: "Ver app", onClick: () => (window.location.hash = "#/") },
    });

    lastInAppSent.current = today;
    localStorage.setItem(LAST_SENT_KEY, today);
  }, [tasks, habits]);

  // Listen for messages from the notification worker
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "REQUEST_SUMMARY") sendSummary();
      if (event.data?.type === "NOTIF_SENT") {
        lastInAppSent.current = event.data.date;
        localStorage.setItem(LAST_SENT_KEY, event.data.date);
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [sendSummary]);

  // In-app fallback interval — only fires when OS notifications are blocked/unavailable
  useEffect(() => {
    const interval = setInterval(() => {
      const osGranted = typeof Notification !== "undefined" && Notification.permission === "granted";
      if (osGranted) return; // OS notifications handle it

      const storedTime = getStoredAlarmTime();
      if (!storedTime) return;

      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const today = now.toISOString().split("T")[0];

      if (`${hh}:${mm}` === storedTime && lastInAppSent.current !== today) {
        showInAppSummary();
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [showInAppSummary]);

  // Register worker and re-sync stored alarm on mount
  useEffect(() => {
    registerNotifWorker().then(() => {
      const stored = getStoredAlarmTime();
      if (stored) {
        const lastNotifDate = localStorage.getItem(LAST_SENT_KEY) ?? null;
        postToNotifWorker({ type: "SET_ALARM", time: stored, lastNotifDate });
      }
    });
  }, []);

  return null;
}
