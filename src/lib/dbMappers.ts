import { Task, Habit, Addiction, Transaction, FocusSession, Note } from "@/store/useAppStore";

// ── Tasks ────────────────────────────────────────────────────────────────────
export function mapTaskFromDB(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? undefined,
    priority: row.priority as Task["priority"],
    category: row.category as string,
    completed: row.completed as boolean,
    dueDate: (row.due_date as string) ?? undefined,
    subtasks: (row.subtasks as Task["subtasks"]) ?? [],
    createdAt: row.created_at as string,
  };
}

export function mapTaskToDB(task: Task, userId: string) {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    description: task.description ?? null,
    priority: task.priority,
    category: task.category,
    completed: task.completed,
    due_date: task.dueDate ?? null,
    subtasks: task.subtasks,
  };
}

// ── Habits ───────────────────────────────────────────────────────────────────
export function mapHabitFromDB(row: Record<string, unknown>): Habit {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? undefined,
    icon: row.icon as string,
    color: row.color as string,
    completedDates: (row.completed_dates as string[]) ?? [],
    streak: row.streak as number,
    weeklyGoal: row.weekly_goal as number,
    createdAt: row.created_at as string,
  };
}

export function mapHabitToDB(habit: Habit, userId: string) {
  return {
    id: habit.id,
    user_id: userId,
    title: habit.title,
    description: habit.description ?? null,
    icon: habit.icon,
    color: habit.color,
    completed_dates: habit.completedDates,
    streak: habit.streak,
    weekly_goal: habit.weeklyGoal,
  };
}

// ── Addictions ───────────────────────────────────────────────────────────────
export function mapAddictionFromDB(row: Record<string, unknown>): Addiction {
  return {
    id: row.id as string,
    title: row.title as string,
    icon: row.icon as string,
    type: (row.type as string) ?? "outros",
    difficulty: (row.difficulty as string) ?? "médio",
    goalDays: (row.goal_days as number) ?? 30,
    startDate: (row.start_date as string) ?? undefined,
    motivation: (row.motivation as string) ?? undefined,
    cleanStreak: row.clean_streak as number,
    lastRelapse: (row.last_relapse as string) ?? undefined,
    relapseHistory: (row.relapse_history as string[]) ?? [],
    createdAt: row.created_at as string,
  };
}

export function mapAddictionToDB(addiction: Addiction, userId: string) {
  return {
    id: addiction.id,
    user_id: userId,
    title: addiction.title,
    icon: addiction.icon,
    type: addiction.type,
    difficulty: addiction.difficulty,
    goal_days: addiction.goalDays,
    start_date: addiction.startDate ?? null,
    motivation: addiction.motivation ?? null,
    clean_streak: addiction.cleanStreak,
    last_relapse: addiction.lastRelapse ?? null,
    relapse_history: addiction.relapseHistory,
  };
}

export function mapRelapseFromDB(row: Record<string, unknown>): import("@/store/useAppStore").AddictionRelapse {
  return {
    id: row.id as string,
    addictionId: row.addiction_id as string,
    userId: row.user_id as string,
    relapsedAt: row.relapsed_at as string,
    cause: (row.cause as string) ?? undefined,
    reflection: (row.reflection as string) ?? undefined,
    streakAtRelapse: (row.streak_at_relapse as number) ?? 0,
  };
}

// ── Transactions ─────────────────────────────────────────────────────────────
export function mapTransactionFromDB(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    title: row.title as string,
    amount: Number(row.amount),
    type: row.type as Transaction["type"],
    category: row.category as string,
    date: row.date as string,
  };
}

export function mapTransactionToDB(t: Transaction, userId: string) {
  return {
    id: t.id,
    user_id: userId,
    title: t.title,
    amount: t.amount,
    type: t.type,
    category: t.category,
    date: t.date,
  };
}

// ── Notes ─────────────────────────────────────────────────────────────────────
export function mapNoteFromDB(row: Record<string, unknown>): Note {
  return {
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapNoteToDB(note: Note, userId: string) {
  return {
    id: note.id,
    user_id: userId,
    title: note.title,
    content: note.content,
  };
}

// ── Focus Sessions ────────────────────────────────────────────────────────────
export function mapSessionFromDB(row: Record<string, unknown>): FocusSession {
  return {
    id: row.id as string,
    duration: row.duration as number,
    completedAt: row.completed_at as string,
  };
}
