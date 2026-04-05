import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { supabase } from "@/integrations/supabase/client";
import {
  mapTaskFromDB,
  mapHabitFromDB,
  mapAddictionFromDB,
  mapTransactionFromDB,
  mapNoteFromDB,
  mapSessionFromDB,
} from "@/lib/dbMappers";
import type {
  Task,
  Habit,
  Addiction,
  Transaction,
  FocusSession,
  Note,
  Plan,
} from "@/store/useAppStore";

type RealtimePayload<T> = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T;
  old: Partial<T> & { id?: string };
};

/**
 * RealtimeSync — renders nothing, keeps Zustand store in sync with DB
 * changes originating from other tabs or devices.
 */
export function RealtimeSync() {
  const { user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;

    // ── Tasks ────────────────────────────────────────────────────────────────
    const taskChannel = supabase
      .channel(`tasks:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${userId}` },
        (payload) => {
          const p = payload as unknown as RealtimePayload<Record<string, unknown>>;
          useAppStore.setState((s) => {
            if (p.eventType === "INSERT") {
              const incoming = mapTaskFromDB(p.new);
              // skip if already present (optimistic insert from same tab)
              if (s.tasks.find((t) => t.id === incoming.id)) return s;
              return { tasks: [...s.tasks, incoming] };
            }
            if (p.eventType === "UPDATE") {
              const updated = mapTaskFromDB(p.new);
              return { tasks: s.tasks.map((t) => (t.id === updated.id ? updated : t)) };
            }
            if (p.eventType === "DELETE") {
              return { tasks: s.tasks.filter((t) => t.id !== p.old.id) };
            }
            return s;
          });
        }
      )
      .subscribe();

    // ── Habits ───────────────────────────────────────────────────────────────
    const habitChannel = supabase
      .channel(`habits:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "habits", filter: `user_id=eq.${userId}` },
        (payload) => {
          const p = payload as unknown as RealtimePayload<Record<string, unknown>>;
          useAppStore.setState((s) => {
            if (p.eventType === "INSERT") {
              const incoming = mapHabitFromDB(p.new);
              if (s.habits.find((h) => h.id === incoming.id)) return s;
              return { habits: [...s.habits, incoming] };
            }
            if (p.eventType === "UPDATE") {
              const updated = mapHabitFromDB(p.new);
              return { habits: s.habits.map((h) => (h.id === updated.id ? updated : h)) };
            }
            if (p.eventType === "DELETE") {
              return { habits: s.habits.filter((h) => h.id !== p.old.id) };
            }
            return s;
          });
        }
      )
      .subscribe();

    // ── Addictions ───────────────────────────────────────────────────────────
    const addictionChannel = supabase
      .channel(`addictions:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "addictions", filter: `user_id=eq.${userId}` },
        (payload) => {
          const p = payload as unknown as RealtimePayload<Record<string, unknown>>;
          useAppStore.setState((s) => {
            if (p.eventType === "INSERT") {
              const incoming = mapAddictionFromDB(p.new);
              if (s.addictions.find((a) => a.id === incoming.id)) return s;
              return { addictions: [...s.addictions, incoming] };
            }
            if (p.eventType === "UPDATE") {
              const updated = mapAddictionFromDB(p.new);
              return { addictions: s.addictions.map((a) => (a.id === updated.id ? updated : a)) };
            }
            if (p.eventType === "DELETE") {
              return { addictions: s.addictions.filter((a) => a.id !== p.old.id) };
            }
            return s;
          });
        }
      )
      .subscribe();

    // ── Transactions ─────────────────────────────────────────────────────────
    const txChannel = supabase
      .channel(`transactions:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${userId}` },
        (payload) => {
          const p = payload as unknown as RealtimePayload<Record<string, unknown>>;
          useAppStore.setState((s) => {
            if (p.eventType === "INSERT") {
              const incoming = mapTransactionFromDB(p.new);
              if (s.transactions.find((t) => t.id === incoming.id)) return s;
              return { transactions: [incoming, ...s.transactions] };
            }
            if (p.eventType === "UPDATE") {
              const updated = mapTransactionFromDB(p.new);
              return { transactions: s.transactions.map((t) => (t.id === updated.id ? updated : t)) };
            }
            if (p.eventType === "DELETE") {
              return { transactions: s.transactions.filter((t) => t.id !== p.old.id) };
            }
            return s;
          });
        }
      )
      .subscribe();

    // ── Notes ────────────────────────────────────────────────────────────────
    const notesChannel = supabase
      .channel(`notes:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes", filter: `user_id=eq.${userId}` },
        (payload) => {
          const p = payload as unknown as RealtimePayload<Record<string, unknown>>;
          useAppStore.setState((s) => {
            if (p.eventType === "INSERT") {
              const incoming = mapNoteFromDB(p.new);
              if (s.notes.find((n) => n.id === incoming.id)) return s;
              return { notes: [incoming, ...s.notes] };
            }
            if (p.eventType === "UPDATE") {
              const updated = mapNoteFromDB(p.new);
              return { notes: s.notes.map((n) => (n.id === updated.id ? updated : n)) };
            }
            if (p.eventType === "DELETE") {
              return { notes: s.notes.filter((n) => n.id !== p.old.id) };
            }
            return s;
          });
        }
      )
      .subscribe();

    // ── Focus Sessions ───────────────────────────────────────────────────────
    const focusChannel = supabase
      .channel(`focus_sessions:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "focus_sessions", filter: `user_id=eq.${userId}` },
        (payload) => {
          const p = payload as unknown as RealtimePayload<Record<string, unknown>>;
          useAppStore.setState((s) => {
            if (p.eventType === "INSERT") {
              const incoming = mapSessionFromDB(p.new);
              if (s.focusSessions.find((f) => f.id === incoming.id)) return s;
              return { focusSessions: [incoming, ...s.focusSessions] };
            }
            if (p.eventType === "DELETE") {
              return { focusSessions: s.focusSessions.filter((f) => f.id !== p.old.id) };
            }
            return s;
          });
        }
      )
      .subscribe();

    // ── Profile (XP / level / streak from another device) ───────────────────
    const profileChannel = supabase
      .channel(`profiles:${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          useAppStore.setState((s) => ({
            user: {
              ...s.user,
              xp: (row.xp as number) ?? s.user.xp,
              level: (row.level as number) ?? s.user.level,
              streak: (row.streak as number) ?? s.user.streak,
              disciplineScore: (row.discipline_score as number) ?? s.user.disciplineScore,
              plan: ((row.plan as Plan) ?? s.user.plan),
              name: (row.name as string) || s.user.name,
            },
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(taskChannel);
      supabase.removeChannel(habitChannel);
      supabase.removeChannel(addictionChannel);
      supabase.removeChannel(txChannel);
      supabase.removeChannel(notesChannel);
      supabase.removeChannel(focusChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [userId]);

  return null;
}
