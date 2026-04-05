import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";
import {
  mapTaskFromDB, mapTaskToDB,
  mapHabitFromDB, mapHabitToDB,
  mapAddictionFromDB, mapAddictionToDB,
  mapTransactionFromDB, mapTransactionToDB,
  mapNoteFromDB, mapNoteToDB,
  mapSessionFromDB,
} from "@/lib/dbMappers";

export type Theme = "dark" | "light";
export type Plan = "free" | "pro";
export type Rank = "Iniciante" | "Soldado" | "Guerreiro" | "Cavaleiro" | "Comandante" | "Lenda";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  rank: Rank;
  streak: number;
  disciplineScore: number;
  plan: Plan;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: "baixa" | "média" | "alta" | "urgente";
  category: string;
  completed: boolean;
  dueDate?: string;
  subtasks: { id: string; title: string; completed: boolean }[];
  createdAt: string;
}

export interface Habit {
  id: string;
  title: string;
  description?: string;
  icon: string;
  color: string;
  completedDates: string[];
  streak: number;
  weeklyGoal: number;
  createdAt: string;
}

export interface AddictionRelapse {
  id: string;
  addictionId: string;
  userId: string;
  relapsedAt: string;
  cause?: string;
  reflection?: string;
  streakAtRelapse: number;
}

export interface Addiction {
  id: string;
  title: string;
  icon: string;
  type: string;
  difficulty: string;
  goalDays: number;
  startDate?: string;
  motivation?: string;
  cleanStreak: number;
  lastRelapse?: string;
  relapseHistory: string[];
  relapses?: AddictionRelapse[];
  createdAt: string;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: "receita" | "despesa";
  category: string;
  date: string;
}

export interface FocusSession {
  id: string;
  duration: number;
  completedAt: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  xpReward: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface WarMission {
  id: string;
  label: string;
  done: boolean;
}

export interface HellDay {
  day: number;
  label: string;
  tasks: string[];
  completed: boolean;
}

export interface WarModeState {
  active: boolean;
  missions: WarMission[];
  hellWeek: HellDay[];
  lastMissionReset: string; // date string YYYY-MM-DD
}

export interface ScreenTimeEntry {
  id: string;
  app: string;
  minutes: number;
  date: string; // YYYY-MM-DD
}

function getRank(level: number): Rank {
  if (level <= 5) return "Iniciante";
  if (level <= 10) return "Soldado";
  if (level <= 20) return "Guerreiro";
  if (level <= 35) return "Cavaleiro";
  if (level <= 50) return "Comandante";
  return "Lenda";
}

// ── Helper: fire-and-forget DB write ────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbWrite(query: any, ctx: string) {
  Promise.resolve(query).then(({ error }: { error: unknown }) => {
    if (error) console.error(`[DB] ${ctx}:`, error);
  });
}

interface AppStore {
  theme: Theme;
  currentUserId: string | null;
  user: User;

  // Focus session navigation guard
  focusSessionActive: boolean;
  pendingNavTarget: string | null;
  setFocusSessionActive: (active: boolean) => void;
  setPendingNavTarget: (path: string | null) => void;
  tasks: Task[];
  habits: Habit[];
  addictions: Addiction[];
  transactions: Transaction[];
  focusSessions: FocusSession[];
  achievements: Achievement[];
  notes: Note[];
  warMode: WarModeState;
  screenTimeEntries: ScreenTimeEntry[];
  sidebarOpen: boolean;
  xpFloating: { id: string; amount: number; x: number; y: number }[];
  showLevelUp: boolean;

  // Auth / DB sync
  setCurrentUserId: (id: string | null) => void;
  clearUserData: () => void;
  loadFromDB: (userId: string, email?: string) => Promise<void>;

  // UI
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
  addXP: (amount: number, x?: number, y?: number) => void;
  dismissLevelUp: () => void;

  // Tasks
  addTask: (task: Omit<Task, "id" | "createdAt">) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => void;

  // Habits
  addHabit: (habit: Omit<Habit, "id" | "createdAt" | "completedDates" | "streak">) => void;
  toggleHabitToday: (id: string) => void;
  deleteHabit: (id: string) => void;

  // Addictions
  addAddiction: (addiction: Omit<Addiction, "id" | "createdAt" | "cleanStreak" | "relapseHistory" | "relapses">) => void;
  addDemoAddiction: (addiction: Omit<Addiction, "id" | "createdAt">) => void;
  recordRelapse: (id: string, cause?: string, reflection?: string) => void;
  deleteAddiction: (id: string) => void;

  // Transactions
  addTransaction: (t: Omit<Transaction, "id">) => void;
  deleteTransaction: (id: string) => void;

  // Focus
  addFocusSession: (duration: number) => void;

  // Notes
  addNote: (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;

  // War Mode
  activateWarMode: () => void;
  toggleWarMission: (id: string) => void;
  toggleHellDay: (day: number) => void;

  // Screen Time
  addScreenTimeEntry: (entry: Omit<ScreenTimeEntry, "id">) => void;
  deleteScreenTimeEntry: (id: string) => void;

  // Blocked Apps
  blockedApps: string[];
  addBlockedApp: (app: string) => void;
  removeBlockedApp: (app: string) => void;

  // Settings
  updateProfile: (updates: Partial<Pick<User, "name" | "avatar">>) => void;
  setPlan: (plan: Plan) => void;
}

const INITIAL_USER: User = {
  id: "",
  name: "Guerreiro",
  email: "",
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  rank: "Iniciante",
  streak: 0,
  disciplineScore: 0,
  plan: "free",
};

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: "ach1", title: "Primeiro Passo", description: "Complete sua primeira tarefa", icon: "⚔️", unlocked: false, xpReward: 50 },
  { id: "ach2", title: "7 Dias de Fogo", description: "Mantenha um streak de 7 dias", icon: "🔥", unlocked: false, xpReward: 100 },
  { id: "ach3", title: "Foco Total", description: "Complete 30 dias de foco", icon: "🎯", unlocked: false, xpReward: 200 },
  { id: "ach4", title: "Centurião", description: "Complete 100 tarefas", icon: "🏆", unlocked: false, xpReward: 300 },
  { id: "ach5", title: "10 Níveis", description: "Alcance o nível 10", icon: "⭐", unlocked: false, xpReward: 150 },
  { id: "ach6", title: "Abstinência Total", description: "1 mês sem recaída", icon: "🛡️", unlocked: false, xpReward: 250 },
  { id: "ach7", title: "Guerreiro das Finanças", description: "Registre 50 transações", icon: "💰", unlocked: false, xpReward: 100 },
  { id: "ach8", title: "Mestre dos Hábitos", description: "Mantenha 5 hábitos por 30 dias", icon: "👑", unlocked: false, xpReward: 500 },
];

const HELL_WEEK_INITIAL: HellDay[] = [
  { day: 1, label: "Dia 1 — Ignição", tasks: ["Acordar cedo", "Completar 5 tarefas"], completed: false },
  { day: 2, label: "Dia 2 — Resistência", tasks: ["2 sessões de foco", "Manter todos os hábitos"], completed: false },
  { day: 3, label: "Dia 3 — Pressão", tasks: ["Completar 7 tarefas", "Sem redes sociais"], completed: false },
  { day: 4, label: "Dia 4 — Domínio", tasks: ["10 tarefas", "2 sessões de foco"], completed: false },
  { day: 5, label: "Dia 5 — Fortaleza", tasks: ["Tarefa mais difícil primeiro", "3 hábitos críticos"], completed: false },
  { day: 6, label: "Dia 6 — Elite", tasks: ["Máximo de produtividade", "Revisão semanal completa"], completed: false },
  { day: 7, label: "Dia 7 — Lenda", tasks: ["Desafio máximo", "Reflexão e planejamento"], completed: false },
];

const INITIAL_WAR_MODE: WarModeState = {
  active: false,
  missions: [
    { id: "m1", label: "Completar 5 tarefas", done: false },
    { id: "m2", label: "Fazer 2 sessões de foco", done: false },
    { id: "m3", label: "Manter todos os hábitos", done: false },
    { id: "m4", label: "Fazer algo desconfortável", done: false },
  ],
  hellWeek: HELL_WEEK_INITIAL,
  lastMissionReset: "",
};

// Persist theme preference
function getInitialTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  try {
    const saved = localStorage.getItem("igris-theme") as Theme | null;
    const theme = saved === "light" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    return theme;
  } catch {
    return "dark";
  }
}
const initialTheme: Theme = getInitialTheme();

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      theme: initialTheme,
      currentUserId: null,
      user: INITIAL_USER,
      tasks: [],
      habits: [],
      addictions: [],
      transactions: [],
      focusSessions: [],
      achievements: INITIAL_ACHIEVEMENTS,
      notes: [],
      warMode: INITIAL_WAR_MODE,
      screenTimeEntries: [] as ScreenTimeEntry[],
      blockedApps: [] as string[],
      sidebarOpen: true,
      xpFloating: [],
      showLevelUp: false,
      focusSessionActive: false,
      pendingNavTarget: null,
      setFocusSessionActive: (active) => set({ focusSessionActive: active }),
      setPendingNavTarget: (path) => set({ pendingNavTarget: path }),

      // ── Auth / DB ──────────────────────────────────────────────────────────
      setCurrentUserId: (id) => set({ currentUserId: id }),

      clearUserData: () => {
        set({
          currentUserId: null,
          user: INITIAL_USER,
          tasks: [],
          habits: [],
          addictions: [],
          transactions: [],
          focusSessions: [],
          notes: [],
          screenTimeEntries: [],
          warMode: INITIAL_WAR_MODE,
          achievements: INITIAL_ACHIEVEMENTS,
          blockedApps: [],
          focusSessionActive: false,
          pendingNavTarget: null,
        });
        try { localStorage.removeItem("igris-store"); } catch { /* ignore */ }
      },

      loadFromDB: async (userId, email = "") => {
        try {
          const [tasksRes, habitsRes, addictionsRes, transactionsRes, notesRes, sessionsRes, profileRes] =
            await Promise.all([
              supabase.from("tasks").select("*").eq("user_id", userId).order("created_at"),
              supabase.from("habits").select("*").eq("user_id", userId).order("created_at"),
              supabase.from("addictions").select("*").eq("user_id", userId).order("created_at"),
              supabase.from("transactions").select("*").eq("user_id", userId).order("date", { ascending: false }),
              supabase.from("notes").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
              supabase.from("focus_sessions").select("*").eq("user_id", userId).order("completed_at", { ascending: false }),
              supabase.from("profiles").select("*").eq("id", userId).single(),
            ]);

          const profile = profileRes.data as Record<string, unknown> | null;
          const cur = get().user;

          set({
            currentUserId: userId,
            tasks: (tasksRes.data ?? []).map((r) => mapTaskFromDB(r as Record<string, unknown>)),
            habits: (habitsRes.data ?? []).map((r) => mapHabitFromDB(r as Record<string, unknown>)),
            addictions: (addictionsRes.data ?? []).map((r) => mapAddictionFromDB(r as Record<string, unknown>)),
            transactions: (transactionsRes.data ?? []).map((r) => mapTransactionFromDB(r as Record<string, unknown>)),
            notes: (notesRes.data ?? []).map((r) => mapNoteFromDB(r as Record<string, unknown>)),
            focusSessions: (sessionsRes.data ?? []).map((r) => mapSessionFromDB(r as Record<string, unknown>)),
            user: profile
              ? {
                  ...cur,
                  id: userId,
                  email,
                  name: (profile.name as string) || cur.name,
                  plan: (profile.plan as Plan) ?? "free",
                  xp: (profile.xp as number) ?? 0,
                  level: (profile.level as number) ?? 1,
                  xpToNextLevel: 100 * ((profile.level as number) ?? 1),
                  rank: getRank((profile.level as number) ?? 1),
                  streak: (profile.streak as number) ?? 0,
                  disciplineScore: (profile.discipline_score as number) ?? 0,
                }
              : { ...cur, id: userId, email },
          });
        } catch (err) {
          console.error("[DB] loadFromDB failed:", err);
        }
      },

      // ── Theme ──────────────────────────────────────────────────────────────
      setTheme: (theme) => {
        set({ theme });
        document.documentElement.classList.toggle("dark", theme === "dark");
        document.documentElement.classList.toggle("light", theme === "light");
        localStorage.setItem("igris-theme", theme);
      },
      toggleTheme: () => {
        const next: Theme = get().theme === "dark" ? "light" : "dark";
        set({ theme: next });
        document.documentElement.classList.toggle("dark", next === "dark");
        document.documentElement.classList.toggle("light", next === "light");
        localStorage.setItem("igris-theme", next);
      },
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      dismissLevelUp: () => set({ showLevelUp: false }),

      // ── XP ─────────────────────────────────────────────────────────────────
      addXP: (amount, x = window.innerWidth / 2, y = window.innerHeight / 2) => {
        const floatId = Math.random().toString(36).slice(2);
        set((s) => ({ xpFloating: [...s.xpFloating, { id: floatId, amount, x, y }] }));
        setTimeout(() => set((s) => ({ xpFloating: s.xpFloating.filter((f) => f.id !== floatId) })), 1600);

        set((s) => {
          const user = { ...s.user };
          user.xp += amount;
          let leveledUp = false;
          let needed = 100 * user.level;
          while (user.xp >= needed) {
            user.xp -= needed;
            user.level += 1;
            user.xpToNextLevel = 100 * user.level;
            user.rank = getRank(user.level);
            leveledUp = true;
            needed = 100 * user.level;
          }
          user.xpToNextLevel = 100 * user.level;
          return { user, showLevelUp: leveledUp || s.showLevelUp };
        });

        const uid = get().currentUserId;
        if (uid) {
          const { xp, level, streak, disciplineScore } = get().user;
          dbWrite(
            supabase.from("profiles").update({ xp, level, streak, discipline_score: disciplineScore }).eq("id", uid),
            "addXP"
          );
        }
      },

      // ── Tasks ──────────────────────────────────────────────────────────────
      addTask: (task) => {
        const id = crypto.randomUUID();
        const newTask: Task = { ...task, id, createdAt: new Date().toISOString() };
        set((s) => ({ tasks: [...s.tasks, newTask] }));
        const uid = get().currentUserId;
        if (uid) dbWrite(supabase.from("tasks").insert(mapTaskToDB(newTask, uid)), "addTask");
      },

      updateTask: (id, updates) => {
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) }));
        const uid = get().currentUserId;
        const task = get().tasks.find((t) => t.id === id);
        if (uid && task) dbWrite(supabase.from("tasks").update(mapTaskToDB(task, uid)).eq("id", id), "updateTask");
      },

      deleteTask: (id) => {
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
        const uid = get().currentUserId;
        if (uid) dbWrite(supabase.from("tasks").delete().eq("id", id).eq("user_id", uid), "deleteTask");
      },

      completeTask: (id) => {
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)) }));
        const task = get().tasks.find((t) => t.id === id);
        if (task && task.completed) get().addXP(10);
        const uid = get().currentUserId;
        if (uid && task) {
          dbWrite(supabase.from("tasks").update({ completed: task.completed }).eq("id", id).eq("user_id", uid), "completeTask");
        }
      },

      // ── Habits ────────────────────────────────────────────────────────────
      addHabit: (habit) => {
        const id = crypto.randomUUID();
        const newHabit: Habit = { ...habit, id, completedDates: [], streak: 0, createdAt: new Date().toISOString() };
        set((s) => ({ habits: [...s.habits, newHabit] }));
        const uid = get().currentUserId;
        if (uid) dbWrite(supabase.from("habits").insert(mapHabitToDB(newHabit, uid)), "addHabit");
      },

      toggleHabitToday: (id) => {
        const today = new Date().toISOString().split("T")[0];
        set((s) => ({
          habits: s.habits.map((h) => {
            if (h.id !== id) return h;
            const done = h.completedDates.includes(today);
            const dates = done ? h.completedDates.filter((d) => d !== today) : [...h.completedDates, today];
            return { ...h, completedDates: dates, streak: done ? Math.max(0, h.streak - 1) : h.streak + 1 };
          }),
        }));
        const habit = get().habits.find((h) => h.id === id);
        if (habit && habit.completedDates.includes(today)) get().addXP(5);
        const uid = get().currentUserId;
        if (uid && habit) {
          dbWrite(
            supabase.from("habits").update({
              completed_dates: habit.completedDates,
              streak: habit.streak,
            }).eq("id", id).eq("user_id", uid),
            "toggleHabitToday"
          );
        }
      },

      deleteHabit: (id) => {
        set((s) => ({ habits: s.habits.filter((h) => h.id !== id) }));
        const uid = get().currentUserId;
        if (uid) dbWrite(supabase.from("habits").delete().eq("id", id).eq("user_id", uid), "deleteHabit");
      },

      // ── Addictions ────────────────────────────────────────────────────────
      addAddiction: (addiction) => {
        const id = crypto.randomUUID();
        const newAddiction: Addiction = { ...addiction, id, cleanStreak: 0, relapseHistory: [], relapses: [], createdAt: new Date().toISOString() };
        set((s) => ({ addictions: [...s.addictions, newAddiction] }));
        const uid = get().currentUserId;
        if (uid) dbWrite(supabase.from("addictions").insert(mapAddictionToDB(newAddiction, uid)), "addAddiction");
      },

      addDemoAddiction: (addiction) => {
        const id = crypto.randomUUID();
        const newAddiction: Addiction = { ...addiction, id, createdAt: new Date().toISOString() };
        set((s) => ({ addictions: [...s.addictions, newAddiction] }));
        const uid = get().currentUserId;
        if (uid) {
          dbWrite(
            supabase.from("addictions").insert({
              ...mapAddictionToDB(newAddiction, uid),
              clean_streak: newAddiction.cleanStreak,
              relapse_history: newAddiction.relapseHistory,
            }),
            "addDemoAddiction"
          );
        }
      },

      recordRelapse: (id, cause, reflection) => {
        const now = new Date().toISOString();
        const dateStr = now.split("T")[0];
        const addiction = get().addictions.find((a) => a.id === id);
        const streakAtRelapse = addiction?.cleanStreak ?? 0;
        const relapseId = crypto.randomUUID();

        const newRelapse: AddictionRelapse = {
          id: relapseId,
          addictionId: id,
          userId: get().currentUserId ?? "",
          relapsedAt: now,
          cause,
          reflection,
          streakAtRelapse,
        };

        set((s) => ({
          addictions: s.addictions.map((a) =>
            a.id === id
              ? {
                  ...a,
                  cleanStreak: 0,
                  lastRelapse: now,
                  relapseHistory: [...a.relapseHistory, dateStr],
                  relapses: [...(a.relapses ?? []), newRelapse],
                }
              : a
          ),
        }));

        get().addXP(-20);

        const uid = get().currentUserId;
        const updatedAddiction = get().addictions.find((a) => a.id === id);
        if (uid && updatedAddiction) {
          dbWrite(
            supabase.from("addictions").update({
              clean_streak: 0,
              last_relapse: now,
              relapse_history: updatedAddiction.relapseHistory,
            }).eq("id", id).eq("user_id", uid),
            "recordRelapse"
          );
          dbWrite(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase as any).from("addiction_relapses").insert({
              id: relapseId,
              addiction_id: id,
              user_id: uid,
              relapsed_at: now,
              cause: cause ?? null,
              reflection: reflection ?? null,
              streak_at_relapse: streakAtRelapse,
            }),
            "recordRelapseDetail"
          );
        }
      },

      deleteAddiction: (id) => {
        set((s) => ({ addictions: s.addictions.filter((a) => a.id !== id) }));
        const uid = get().currentUserId;
        if (uid) dbWrite(supabase.from("addictions").delete().eq("id", id).eq("user_id", uid), "deleteAddiction");
      },

      // ── Transactions ──────────────────────────────────────────────────────
      addTransaction: (t) => {
        const id = crypto.randomUUID();
        const newTx: Transaction = { ...t, id };
        set((s) => ({ transactions: [...s.transactions, newTx] }));
        const uid = get().currentUserId;
        if (uid) dbWrite(supabase.from("transactions").insert(mapTransactionToDB(newTx, uid)), "addTransaction");
      },

      deleteTransaction: (id) => {
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
        const uid = get().currentUserId;
        if (uid) dbWrite(supabase.from("transactions").delete().eq("id", id).eq("user_id", uid), "deleteTransaction");
      },

      // ── Focus ─────────────────────────────────────────────────────────────
      addFocusSession: (duration) => {
        const id = crypto.randomUUID();
        const session: FocusSession = { id, duration, completedAt: new Date().toISOString() };
        set((s) => ({ focusSessions: [...s.focusSessions, session] }));
        get().addXP(15);
        const uid = get().currentUserId;
        if (uid) {
          dbWrite(
            supabase.from("focus_sessions").insert({ id, user_id: uid, duration, completed_at: session.completedAt }),
            "addFocusSession"
          );
        }
      },

      // ── Notes ─────────────────────────────────────────────────────────────
      addNote: (note) => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const newNote: Note = { ...note, id, createdAt: now, updatedAt: now };
        set((s) => ({ notes: [...s.notes, newNote] }));
        const uid = get().currentUserId;
        if (uid) dbWrite(supabase.from("notes").insert(mapNoteToDB(newNote, uid)), "addNote");
      },

      updateNote: (id, updates) => {
        const now = new Date().toISOString();
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, ...updates, updatedAt: now } : n)),
        }));
        const note = get().notes.find((n) => n.id === id);
        const uid = get().currentUserId;
        if (uid && note) {
          dbWrite(
            supabase.from("notes").update({ title: note.title, content: note.content }).eq("id", id).eq("user_id", uid),
            "updateNote"
          );
        }
      },

      deleteNote: (id) => {
        set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
        const uid = get().currentUserId;
        if (uid) dbWrite(supabase.from("notes").delete().eq("id", id).eq("user_id", uid), "deleteNote");
      },

      // ── Settings ──────────────────────────────────────────────────────────
      updateProfile: (updates) => {
        set((s) => ({ user: { ...s.user, ...updates } }));
        const uid = get().currentUserId;
        if (uid && updates.name !== undefined) {
          dbWrite(supabase.from("profiles").update({ name: updates.name }).eq("id", uid), "updateProfile");
        }
      },

      setPlan: (plan) => {
        set((s) => ({ user: { ...s.user, plan } }));
      },

      // ── War Mode ──────────────────────────────────────────────────────────
      activateWarMode: () => {
        set((s) => ({ warMode: { ...s.warMode, active: true } }));
      },

      toggleWarMission: (id) => {
        set((s) => ({
          warMode: {
            ...s.warMode,
            missions: s.warMode.missions.map((m) =>
              m.id === id ? { ...m, done: !m.done } : m
            ),
          },
        }));
      },

      toggleHellDay: (day) => {
        set((s) => ({
          warMode: {
            ...s.warMode,
            hellWeek: s.warMode.hellWeek.map((d) =>
              d.day === day ? { ...d, completed: !d.completed } : d
            ),
          },
        }));
      },

      // ── Screen Time ───────────────────────────────────────────────────────
      addScreenTimeEntry: (entry) => {
        const id = crypto.randomUUID();
        set((s) => ({ screenTimeEntries: [...s.screenTimeEntries, { ...entry, id }] }));
      },

      deleteScreenTimeEntry: (id) => {
        set((s) => ({ screenTimeEntries: s.screenTimeEntries.filter((e) => e.id !== id) }));
      },

      // ── Blocked Apps ──────────────────────────────────────────────────────
      addBlockedApp: (app) => {
        set((s) => ({ blockedApps: s.blockedApps.includes(app) ? s.blockedApps : [...s.blockedApps, app] }));
      },

      removeBlockedApp: (app) => {
        set((s) => ({ blockedApps: s.blockedApps.filter((a) => a !== app) }));
      },

    }),
    {
      name: "igris-store",
      partialize: (state) => ({
        theme: state.theme,
        user: state.user,
        achievements: state.achievements,
        sidebarOpen: state.sidebarOpen,
        warMode: state.warMode,
      screenTimeEntries: state.screenTimeEntries,
        blockedApps: state.blockedApps,
        // tasks/habits/addictions/transactions/notes/focusSessions are DB-sourced;
        // persisting them here as an offline cache only
        tasks: state.tasks,
        habits: state.habits,
        addictions: state.addictions,
        transactions: state.transactions,
        focusSessions: state.focusSessions,
        notes: state.notes,
      }),
    }
  )
);
