import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { useNutritionData } from "@/hooks/useNutritionData";
import {
  IconTasks, IconHabits, IconFocusTree, IconFinance, IconNutrition, IconMeditation,
} from "@/components/icons/AdominusIcons";

/* ── Count-up hook ── */
function useCountUp(target: number, duration = 1000, delay = 0) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const t = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const e = 1 - Math.pow(2, -10 * p);
        setCount(Math.round(e * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [target, duration, delay]);
  return count;
}

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
};

/* ── Stat card icon SVGs (inline, filled) ── */
const StatIcon = ({ type }: { type: string }) => {
  const icons: Record<string, React.ReactNode> = {
    tasks: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="#F9F9F9">
        <path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm4.95 7.05l-5.5 5.5a1 1 0 01-1.414 0l-2.5-2.5a1 1 0 111.414-1.414L8.75 10.43l4.793-4.793a1 1 0 011.414 1.414z" />
      </svg>
    ),
    habits: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="#F9F9F9">
        <path d="M10 0l2.5 6.5L19 7.5l-5 4.5 1.5 7L10 15.5 4.5 19l1.5-7-5-4.5 6.5-1L10 0z" />
      </svg>
    ),
    focus: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="#F9F9F9">
        <path d="M11.5 0L4 11h5l-1.5 9L16 9h-5L11.5 0z" />
      </svg>
    ),
    xp: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="#F9F9F9">
        <path d="M11.5 0L4 11h5l-1.5 9L16 9h-5L11.5 0z" />
      </svg>
    ),
  };
  return <>{icons[type]}</>;
};

const STAT_CARDS = [
  { type: "tasks", label: "TAREFAS HOJE", to: "/tarefas" },
  { type: "habits", label: "HÁBITOS", to: "/habitos" },
  { type: "focus", label: "FOCO (MIN)", to: "/focus-tree" },
  { type: "xp", label: "XP HOJE", to: "/conquistas" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, tasks, habits, transactions, focusSessions, completeTask } = useAppStore();
  const { meals, water } = useNutritionData();

  const today = new Date().toISOString().split("T")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const todayTasks = tasks.filter((t) => !t.completed).slice(0, 5);
  const completedTasksToday = tasks.filter((t) => t.completed).length;
  const focusToday = focusSessions.filter((s) => s.completedAt.startsWith(today)).length;
  const focusMinutes = focusSessions.filter((s) => s.completedAt.startsWith(today)).reduce((s, f) => s + f.duration, 0);
  const habitsCompletedToday = habits.filter((h) => h.completedDates.includes(today)).length;
  const habitsTotal = habits.length;

  const missions = [
    { id: "m1", label: "Completar 3 tarefas", done: completedTasksToday >= 3 },
    { id: "m2", label: "Manter hábitos", done: habitsCompletedToday >= habitsTotal && habitsTotal > 0 },
    { id: "m3", label: "Fazer 1 sessão de foco", done: focusToday >= 1 },
    { id: "m4", label: "Fazer algo desconfortável", done: false },
  ];
  const missionsDone = missions.filter((m) => m.done).length;
  const missionPct = Math.round((missionsDone / missions.length) * 100);

  const weeklyData = DAYS.map((dia, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().split("T")[0];
    const count =
      habits.reduce((acc, h) => acc + (h.completedDates.includes(ds) ? 1 : 0), 0) +
      tasks.filter((t) => t.completed && t.createdAt.startsWith(ds)).length;
    return { dia, value: count };
  });

  const totalReceita = transactions.filter((t) => t.type === "receita").reduce((s, t) => s + t.amount, 0);
  const totalDespesa = transactions.filter((t) => t.type === "despesa").reduce((s, t) => s + t.amount, 0);
  const saldo = totalReceita - totalDespesa;

  const totalCalories = meals.reduce((s, m) => s + m.calories, 0);
  const treesToday = focusSessions.filter((s) => s.completedAt.startsWith(today)).length;

  const streakCount = useCountUp(user.streak, 800, 100);

  const statValues = [completedTasksToday, habitsCompletedToday, focusMinutes, user.xp];
  const statMaxes = [Math.max(tasks.length, 1), Math.max(habitsTotal, 1), 120, 1000];

  const [justDone, setJustDone] = useState<string | null>(null);

  return (
    <motion.div
      className="p-6 lg:p-8 pb-24 max-w-[1200px] mx-auto space-y-5"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* ═══ HERO BANNER ═══ */}
      <motion.div
        variants={fadeUp}
        className="relative overflow-hidden"
        style={{
          width: "100%",
          borderRadius: 14,
          background: "#1A1A1A",
          border: "1px solid #333333",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Accent bar on left */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: 3, borderRadius: "14px 0 0 14px",
          background: "var(--gradient-accent)",
        }} />

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingLeft: 8 }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 400, color: "#646464" }}>
            {greeting},
          </span>
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, color: "#F0F0F0", letterSpacing: "-0.02em", lineHeight: 1 }}>
            {user.name || "Guerreiro"}
          </span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#646464", marginTop: 2 }}>
            Disciplina forja guerreiros.
          </span>
        </div>

        {/* Right column — badges */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{
            height: 28, padding: "0 10px", borderRadius: 8,
            background: "rgba(232,80,2,0.12)", border: "1px solid rgba(232,80,2,0.25)",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <svg width="10" height="10" viewBox="0 0 20 20" fill="#E85002">
              <path d="M11.5 0L4 11h5l-1.5 9L16 9h-5L11.5 0z" />
            </svg>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: "#E85002" }}>
              {streakCount} dias
            </span>
          </div>
          <div style={{
            height: 28, padding: "0 10px", borderRadius: 8,
            background: "#333333", border: "1px solid #333333",
            display: "flex", alignItems: "center",
          }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: "#D9C1AB" }}>
              Nível {user.level}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ═══ STAT CARDS (4 cards) ═══ */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAT_CARDS.map((card, i) => (
          <motion.div
            key={card.label}
            onClick={() => navigate(card.to)}
            className="cursor-pointer group"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              transition: "all 150ms",
            }}
            whileHover={{ backgroundColor: "var(--bg-card-hover)" }}
            whileTap={{ scale: 0.97 }}
          >
            {/* Top row: icon + value */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <StatIcon type={card.type} />
              </div>
              <span style={{
                fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700,
                color: "var(--text-primary)",
              }} className="tabular-nums">
                {statValues[i]}
              </span>
            </div>

            {/* Label */}
            <span style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 500,
              textTransform: "uppercase", letterSpacing: "0.07em",
              color: "var(--text-tertiary)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              maxWidth: "100%",
            }}>
              {card.label}
            </span>

            {/* Progress bar */}
            <div style={{ height: 3, borderRadius: 2, background: "var(--border)" }}>
              <motion.div
                style={{
                  height: "100%", borderRadius: 2, background: "var(--accent)",
                }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((statValues[i] / statMaxes[i]) * 100, 100)}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.2 + i * 0.1 }}
              />
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ═══ MODULE GRID (6 cards, 3 cols) ═══ */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { Icon: IconTasks, label: "Tarefas", sub: `${completedTasksToday} concluídas`, to: "/tarefas" },
          { Icon: IconHabits, label: "Hábitos", sub: `${habitsCompletedToday}/${habitsTotal} hoje`, to: "/habitos" },
          { Icon: IconFocusTree, label: "Modo Foco", sub: `${treesToday} sessões`, to: "/focus-tree" },
          { Icon: IconFinance, label: "Finanças", sub: `R$${Math.abs(saldo).toLocaleString("pt-BR")}`, to: "/finance-assistant" },
          { Icon: IconNutrition, label: "Nutrição", sub: `${totalCalories} kcal`, to: "/nutrition" },
          { Icon: IconMeditation, label: "Meditação", sub: "Sessões", to: "/meditacao" },
        ].map((mod) => (
          <motion.div
            key={mod.label}
            onClick={() => navigate(mod.to)}
            className="cursor-pointer group"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "18px 16px",
              transition: "all 150ms",
            }}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            <mod.Icon size={40} />
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600,
              color: "var(--text-primary)", marginTop: 12,
            }}>
              {mod.label}
            </p>
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 400,
              color: "var(--text-tertiary)", marginTop: 3,
            }}>
              {mod.sub}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* ═══ MAIN GRID ═══ */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Weekly Chart — 2 cols */}
        <div className="lg:col-span-2" style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 14, padding: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="var(--accent)">
                <rect x="1" y="12" width="4" height="8" rx="1" />
                <rect x="8" y="7" width="4" height="13" rx="1" />
                <rect x="15" y="2" width="4" height="18" rx="1" />
              </svg>
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                Atividade Semanal
              </span>
            </div>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "var(--text-tertiary)" }}>
              Últimos 7 dias
            </span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weeklyData} barSize={18} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="dia"
                tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontWeight: 500 }}
                axisLine={false} tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "var(--bg-card-hover)", radius: 6 }}
                contentStyle={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--accent)",
                  borderRadius: 10,
                  fontSize: 12,
                  color: "var(--text-primary)",
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {weeklyData.map((_, i) => (
                  <Cell key={i} fill={i === weeklyData.length - 1 ? "#E85002" : "var(--bg-card-hover)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Missions — 1 col */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 14, padding: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="var(--accent)">
                <circle cx="10" cy="10" r="9" stroke="var(--accent)" strokeWidth="2" fill="none" />
                <circle cx="10" cy="10" r="4" />
              </svg>
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                Missão Diária
              </span>
            </div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, color: "var(--accent)" }} className="tabular-nums">
              {missionPct}%
            </span>
          </div>

          <div style={{ height: 4, borderRadius: 2, background: "var(--border)", marginBottom: 16 }}>
            <motion.div
              style={{ height: "100%", borderRadius: 2, background: "var(--gradient-accent)" }}
              initial={{ width: 0 }}
              animate={{ width: `${missionPct}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            />
          </div>

          <div className="space-y-0.5">
            {missions.map((m) => (
              <button
                key={m.id}
                onClick={() => { setJustDone(m.id); setTimeout(() => setJustDone(null), 600); }}
                className="w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-[10px] transition-colors text-sm"
                style={{ color: m.done ? "var(--text-tertiary)" : "var(--text-primary)" }}
              >
                <AnimatePresence mode="wait">
                  {m.done || justDone === m.id ? (
                    <motion.div key="done" initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="var(--accent)">
                        <path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm4.95 7.05l-5.5 5.5a1 1 0 01-1.414 0l-2.5-2.5a1 1 0 111.414-1.414L8.75 10.43l4.793-4.793a1 1 0 011.414 1.414z" />
                      </svg>
                    </motion.div>
                  ) : (
                    <motion.div key="empty" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="var(--border)" strokeWidth="2">
                        <circle cx="10" cy="10" r="9" />
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>
                <span className={cn("flex-1 text-[13px] font-medium", m.done && "line-through")}>
                  {m.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ═══ BOTTOM GRID ═══ */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Pending Tasks */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 14, padding: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="var(--accent)">
                <path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm4.95 7.05l-5.5 5.5a1 1 0 01-1.414 0l-2.5-2.5a1 1 0 111.414-1.414L8.75 10.43l4.793-4.793a1 1 0 011.414 1.414z" />
              </svg>
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                Pendentes
              </span>
            </div>
            <button onClick={() => navigate("/tarefas")} style={{ color: "var(--accent)" }} className="hover:opacity-70 transition-opacity">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="space-y-1">
            {todayTasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-2xl mb-2">🎉</p>
                <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Nenhuma pendente</p>
              </div>
            ) : (
              todayTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => completeTask(task.id)}
                  className="w-full flex items-center gap-3 text-left py-2.5 px-3 rounded-[10px] transition-colors"
                  style={{ color: "var(--text-primary)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-card-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background: task.priority === "urgente" ? "#C10801" :
                        task.priority === "alta" ? "#E85002" : "var(--text-tertiary)"
                    }} />
                  <span className="text-[13px] truncate flex-1">{task.title}</span>
                  <span className="text-[10px] capitalize font-medium" style={{ color: "var(--text-tertiary)" }}>{task.priority}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 14, padding: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="var(--accent)">
              <path d="M11.5 0L4 11h5l-1.5 9L16 9h-5L11.5 0z" />
            </svg>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
              Ações Rápidas
            </span>
          </div>
          <div className="space-y-1">
            {[
              { label: "Nova Tarefa", Icon: IconTasks, to: "/tarefas" },
              { label: "Iniciar Foco", Icon: IconFocusTree, to: "/focus-tree" },
              { label: "Registrar Hábito", Icon: IconHabits, to: "/habitos" },
              { label: "Finanças", Icon: IconFinance, to: "/finance-assistant" },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.to)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left transition-colors group"
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-card-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <action.Icon size={32} />
                <span className="text-[14px] font-medium flex-1" style={{ color: "var(--text-primary)" }}>{action.label}</span>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="var(--text-tertiary)" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                  className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <path d="M7 4l6 6-6 6" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
