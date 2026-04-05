import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";

/**
 * useAlerts — fires once per session after data loads.
 * Shows in-app toast warnings for:
 *  • Overdue tasks (dueDate < today, not completed)
 *  • Habit streaks at risk (has a streak > 0, not yet completed today)
 */
export function AlertsWatcher() {
  const { user } = useAuth();
  const tasks = useAppStore((s) => s.tasks);
  const habits = useAppStore((s) => s.habits);
  const fired = useRef(false);

  useEffect(() => {
    // Only run once per session and only when authenticated + data is loaded
    if (!user || fired.current) return;
    // Wait until at least one query has had time to resolve
    if (tasks.length === 0 && habits.length === 0) return;

    fired.current = true;

    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

    // ── Overdue tasks ────────────────────────────────────────────────────────
    const overdue = tasks.filter((t) => {
      if (t.completed || !t.dueDate) return false;
      return t.dueDate < today;
    });

    // ── Habits at risk (streak > 0, not done today) ──────────────────────────
    // Show after 18:00 local time so morning users aren't spammed
    const hour = now.getHours();
    const streakAtRisk = habits.filter((h) => {
      const doneToday = h.completedDates.includes(today);
      return h.streak > 0 && !doneToday && hour >= 18;
    });

    // Also show anytime for habits with streaks ≥ 7 (high-value streaks)
    const highValueAtRisk = habits.filter((h) => {
      const doneToday = h.completedDates.includes(today);
      return h.streak >= 7 && !doneToday;
    });

    // Merge without duplicates
    const atRiskIds = new Set([...streakAtRisk, ...highValueAtRisk].map((h) => h.id));
    const atRisk = habits.filter((h) => atRiskIds.has(h.id));

    // Small delay so the UI has fully rendered before toasts appear
    const timer = setTimeout(() => {
      // ── Overdue tasks toasts ───────────────────────────────────────────────
      if (overdue.length === 1) {
        toast.warning(`⚠️ Tarefa atrasada: "${overdue[0].title}"`, {
          description: `Prazo: ${formatDate(overdue[0].dueDate!)}`,
          duration: 6000,
          action: { label: "Ver Tarefas", onClick: () => (window.location.hash = "#/tarefas") },
        });
      } else if (overdue.length > 1) {
        toast.warning(`⚠️ ${overdue.length} tarefas atrasadas`, {
          description: overdue
            .slice(0, 3)
            .map((t) => `• ${t.title}`)
            .join("\n") + (overdue.length > 3 ? `\n+${overdue.length - 3} mais` : ""),
          duration: 7000,
          action: { label: "Ver Tarefas", onClick: () => (window.location.hash = "#/tarefas") },
        });
      }

      // ── Habit streak toasts ────────────────────────────────────────────────
      if (atRisk.length === 1) {
        toast.warning(`🔥 Streak em risco: "${atRisk[0].title}"`, {
          description: `Seu streak de ${atRisk[0].streak} dia${atRisk[0].streak !== 1 ? "s" : ""} vai quebrar hoje!`,
          duration: 6000,
          action: { label: "Ver Hábitos", onClick: () => (window.location.hash = "#/habitos") },
        });
      } else if (atRisk.length > 1) {
        toast.warning(`🔥 ${atRisk.length} streaks em risco hoje!`, {
          description: atRisk
            .slice(0, 3)
            .map((h) => `• ${h.title} — ${h.streak} dia${h.streak !== 1 ? "s" : ""}`)
            .join("\n") + (atRisk.length > 3 ? `\n+${atRisk.length - 3} mais` : ""),
          duration: 7000,
          action: { label: "Ver Hábitos", onClick: () => (window.location.hash = "#/habitos") },
        });
      }
    }, 1500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, tasks.length, habits.length]);

  return null;
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
