import { useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import {
  Plus, Trash2, CheckCircle, Flame, Target, Zap, TrendingUp,
  ChevronLeft, ChevronRight, MoreHorizontal, BarChart3, Repeat } from "lucide-react";
import { triggerConfetti } from "@/components/XPEffects";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell } from
"recharts";
import type { Habit } from "@/store/useAppStore";

const MONTH_NAMES = [
"Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
"Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const DIFFICULTY_TAGS = ["Fácil", "Médio", "Difícil"];
const CATEGORY_TAGS = ["Fitness", "Saúde", "Estudo", "Bem-estar", "Trabalho", "Nutrição", "Mental"];
const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/* ─── XP Particle ─────────────────────────────────────────────────────────── */
function XPParticle({ active }: {active: boolean;}) {
  return (
    <AnimatePresence>
      {active &&
      <motion.div
        initial={{ opacity: 1, y: 0, scale: 1 }}
        animate={{ opacity: 0, y: -52, scale: 1.3 }}
        exit={{}}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="absolute top-3 right-14 pointer-events-none z-30 font-bold text-xs text-[#EB5002]">
        +5 XP</motion.div>
      }
    </AnimatePresence>);

}

/* ─── Equalizer-style Evolution Chart ─────────────────────────────────────── */
function EvolutionChart({ habits }: {habits: Habit[];}) {
  const { theme } = useAppStore();
  const gridColor = theme === 'light' ? 'hsl(0 0% 95%)' : 'hsl(0 0% 13%)';
  const data = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 8 }, (_, i) => {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (7 - i) * 7 - today.getDay());
      const days = Array.from({ length: 7 }, (_, d) => {
        const dd = new Date(weekStart);
        dd.setDate(weekStart.getDate() + d);
        return dd.toISOString().split("T")[0];
      });
      const total = habits.length * 7;
      const done = habits.reduce((s, h) =>
      s + days.filter((d) => h.completedDates.includes(d)).length, 0);
      const pct = total > 0 ? Math.round(done / total * 100) : 0;
      return { label: `S${i + 1}`, pct };
    });
  }, [habits]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl px-3 py-2 text-xs font-semibold bg-card border border-border shadow-lg">
        <p className="mb-0.5 text-muted-foreground">{label}</p>
        <p className="text-primary">{payload[0].value}% completo</p>
      </div>);

  };

  /* Custom white dot */
  const CustomDot = (props: any) => {
    const { cx, cy } = props;
    return (
      <circle cx={cx} cy={cy} r={5} fill="white"
      stroke="hsl(var(--primary) / 0.6)" strokeWidth={1.5} />);

  };
  const CustomActiveDot = (props: any) => {
    const { cx, cy } = props;
    return (
      <circle cx={cx} cy={cy} r={7} fill="white"
      stroke="hsl(var(--primary))" strokeWidth={2}
      style={{ filter: "drop-shadow(0 0 6px hsla(20,100%,47%,0.6))" }} />);

  };

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="eqOrange" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="1 0"
          stroke={gridColor}
          vertical={true}
          horizontal={true} />
        
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }}
          axisLine={false} tickLine={false} />
        
        <YAxis
          tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          axisLine={false} tickLine={false}
          ticks={[0, 25, 50, 75, 100]} />
        
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "hsl(var(--primary) / 0.3)", strokeWidth: 1, strokeDasharray: "4 2" }} />
        <Area
          type="monotoneX"
          dataKey="pct"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#eqOrange)"
          dot={<CustomDot />}
          activeDot={<CustomActiveDot />} />
        
      </AreaChart>
    </ResponsiveContainer>);

}

/* ─── Weekly Bar Chart ─────────────────────────────────────────────────────── */
function WeeklyBarsChart({ habits }: {habits: Habit[];}) {
  const today = new Date();
  const data = useMemo(() =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - 6 + i);
    const dateStr = d.toISOString().split("T")[0];
    const done = habits.filter((h) => h.completedDates.includes(dateStr)).length;
    const isToday = i === 6;
    return { label: DAY_LABELS[d.getDay()], done, total: habits.length, isToday };
  }), [habits]);

  return (
    <ResponsiveContainer width="100%" height={80}>
      <BarChart data={data} margin={{ top: 4, right: 0, left: -28, bottom: 0 }} barCategoryGap="30%">
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
        <YAxis hide domain={[0, Math.max(habits.length, 1)]} />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted) / 0.4)", radius: 6 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="rounded-xl px-3 py-2 text-xs"
              style={{ background: "hsl(var(--card))", border: "0.5px solid hsl(var(--border))", boxShadow: "var(--shadow-card)" }}>
                <span className="font-bold text-foreground">{d.done}/{d.total}</span>
                <span className="text-muted-foreground ml-1">hábitos</span>
              </div>);

          }} />
        
        <Bar dataKey="done" radius={[6, 6, 4, 4]} maxBarSize={28}>
          {data.map((entry, i) =>
          <Cell key={i}
          fill={entry.done === 0 ?
          "#333333" :
          entry.isToday ?
          "#EB5002" :
          "#F16001"
          }
          opacity={entry.done === 0 ? 0.4 : 1} />

          )}
        </Bar>
      </BarChart>
    </ResponsiveContainer>);

}

/* ─── Weekly Strip Grid ────────────────────────────────────────────────────── */
function WeeklyStripGrid({ habit, onToggleDay

}: {habit: Habit;onToggleDay: (d: string) => void;}) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Build current week Mon→Sun starting from Sunday
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const isFuture = dateStr > todayStr;
    const isToday = dateStr === todayStr;
    const isDone = habit.completedDates.includes(dateStr);
    return { label: `D${i + 1}`, dateStr, isFuture, isToday, isDone };
  });

  const weekDone = weekDays.filter((d) => d.isDone).length;
  const weekPct = Math.round(weekDone / 7 * 100);
  const progressColor =
  weekPct >= 50 ? "#EB5002" :
  weekPct >= 25 ? "#F16001" : "#C10801";

  const monthDone = habit.completedDates.filter((d) => {
    const [y, m] = d.split("-").map(Number);
    return y === today.getFullYear() && m - 1 === today.getMonth();
  }).length;

  const monthPct = today.getDate() > 0 ? Math.round(monthDone / today.getDate() * 100) : 0;

  return (
    <div>
      {/* 7-day strip */}
      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map(({ label, dateStr, isFuture, isToday, isDone }) =>
        <motion.button
          key={dateStr}
          disabled={isFuture}
          onClick={() => !isFuture && onToggleDay(dateStr)}
          whileTap={!isFuture ? { scale: 0.85 } : {}}
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-semibold transition-all",
            isFuture && "cursor-default opacity-40",
            isToday && !isDone && "ring-1 ring-foreground/20"
          )}
          style={
          isDone ?
          { background: "rgba(235,80,2,0.15)", color: "#EB5002", border: "1px solid rgba(235,80,2,0.35)" } :
          isFuture ?
          { background: "#1A1A1A", color: "#646464", border: "1px solid #333333" } :
          { background: "#1A1A1A", color: "#646464", border: "1px solid #333333" }
          }>
          
            <span className={cn("text-[9px] font-bold", isDone ? "text-[#EB5002]" : "text-[#646464]")}>
              {label}
            </span>
            {isDone ?
          <CheckCircle className="w-3.5 h-3.5 text-[#EB5002]" /> :

          <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/40" />
          }
          </motion.button>
        )}
      </div>

      {/* Week progress bar */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Progresso da semana</span>
          <span className="text-[10px] font-bold" style={{ color: progressColor }}>{weekDone}/7 dias</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden bg-muted">
          <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${weekPct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }} style={{ background: progressColor }} />
        </div>
      </div>

      {/* Chips */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(235,80,2,0.1)", border: "1px solid rgba(235,80,2,0.2)" }}>
          <TrendingUp className="w-3 h-3 text-[#EB5002]" />
          <span className="text-[10px] font-semibold text-[#EB5002]">{monthPct}% mês</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(235,80,2,0.08)", border: "1px solid rgba(235,80,2,0.15)" }}>
          <Flame className="w-3 h-3 text-[#F16001]" />
          <span className="text-[10px] font-semibold text-[#F16001]">{habit.streak} streak</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "#1A1A1A", border: "1px solid #333333" }}>
          <Zap className="w-3 h-3 text-[#D9C1AB]" />
          <span className="text-[10px] font-semibold text-[#D9C1AB]">+{monthDone * 5} XP</span>
        </div>
      </div>
    </div>);

}

/* ─── Habit Card ───────────────────────────────────────────────────────────── */
function HabitCard({ habit, index }: {habit: Habit;index: number;}) {
  const { toggleHabitToday, deleteHabit } = useAppStore();
  const [justDone, setJustDone] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const todayStr = new Date().toISOString().split("T")[0];
  const isDoneToday = habit.completedDates.includes(todayStr);
  const category = (habit as any).category || "Fitness";
  const difficulty = (habit as any).difficulty || "Médio";
  const difficultyColor =
  difficulty === "Fácil" ? "#646464" :
  difficulty === "Médio" ? "#EB5002" : "#C10801";

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const pastCount = today.getDate();
  const monthDone = habit.completedDates.filter((d) => {
    const [y, m] = d.split("-").map(Number);
    return y === year && m - 1 === month;
  }).length;
  const completionPct = pastCount > 0 ? Math.round(monthDone / pastCount * 100) : 0;

  const handleToggleDay = (dateStr: string) => {
    const isCurrentlyDone = habit.completedDates.includes(dateStr);
    if (dateStr === todayStr) {
      toggleHabitToday(habit.id);
      if (!isCurrentlyDone) {
        setJustDone(true);
        setTimeout(() => setJustDone(false), 1100);
        const rect = btnRef.current?.getBoundingClientRect();
        triggerConfetti(rect ? rect.left + rect.width / 2 : window.innerWidth / 2, rect ? rect.top + rect.height / 2 : window.innerHeight / 2, habit.color || "hsl(var(--primary))");
      }
    } else {
      const { habits: allHabits } = useAppStore.getState();
      const h = allHabits.find((x) => x.id === habit.id);
      if (!h) return;
      const done = h.completedDates.includes(dateStr);
      const newDates = done ? h.completedDates.filter((d) => d !== dateStr) : [...h.completedDates, dateStr];
      useAppStore.setState((s) => ({ habits: s.habits.map((x) => x.id === habit.id ? { ...x, completedDates: newDates } : x) }));
      if (!done) useAppStore.getState().addXP(5);
    }
  };

  return (
    <>
      <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -2, boxShadow: "0 8px 28px hsl(var(--primary) / 0.12)" }}
      transition={{ duration: 0.28, delay: index * 0.04 }}
      className="premium-card relative overflow-hidden">
        <XPParticle active={justDone} />

        <AnimatePresence>
          {justDone &&
          <motion.div initial={{ opacity: 0.45 }} animate={{ opacity: 0 }} transition={{ duration: 1 }}
          className="absolute inset-0 pointer-events-none z-10 rounded-2xl"
          style={{ background: "radial-gradient(ellipse at center, rgba(235,80,2,0.2), transparent 70%)" }} />
          }
        </AnimatePresence>

        <div className="flex items-start justify-between gap-3 p-4 pb-3"
        style={{ borderBottom: "0.5px solid hsl(var(--border) / 0.55)" }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: "rgba(235,80,2,0.1)", border: "0.5px solid rgba(235,80,2,0.25)" }}>
              {habit.icon}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate text-foreground tracking-tight">{habit.title}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold"
                style={{ background: "hsl(var(--primary)/0.08)", color: "hsl(var(--primary))", border: "0.5px solid hsl(var(--primary)/0.2)" }}>
                  {category}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold"
                style={{ background: `${difficultyColor}14`, color: difficultyColor, border: `0.5px solid ${difficultyColor}30` }}>
                  {difficulty}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
              <div className="text-sm font-bold text-[#EB5002]">{completionPct}%</div>
              <div className="flex items-center gap-0.5 justify-end mt-0.5">
                <Zap className="w-2.5 h-2.5 text-[#646464]" />
                <span className="text-[9px] text-muted-foreground">+{monthDone * 5} XP</span>
              </div>
            </div>

            <motion.button ref={btnRef} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }}
            onClick={() => handleToggleDay(todayStr)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all"
            style={isDoneToday ?
            { background: "rgba(235,80,2,0.12)", color: "#EB5002", border: "0.5px solid rgba(235,80,2,0.4)", boxShadow: "0 0 10px rgba(235,80,2,0.2)" } :
            { background: "#1A1A1A", color: "#646464", border: "0.5px solid #333333" }
            }>
              {isDoneToday ? <CheckCircle className="w-3 h-3" /> : <Target className="w-3 h-3" />}
              {isDoneToday ? "Feito" : "Marcar"}
            </motion.button>

            <div className="relative">
              <button onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-muted">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
              <AnimatePresence>
                {menuOpen &&
                <motion.div initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -4 }} transition={{ duration: 0.12 }}
                className="absolute right-0 top-9 z-30 apple-section overflow-hidden" style={{ minWidth: 130 }}
                onMouseLeave={() => setMenuOpen(false)}>
                    <button onClick={() => { setMenuOpen(false); setConfirmOpen(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-destructive hover:bg-destructive/8 transition-all">
                      <Trash2 className="w-3 h-3" /> Excluir hábito
                    </button>
                  </motion.div>
                }
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="p-4">
          <WeeklyStripGrid habit={habit} onToggleDay={handleToggleDay} />
        </div>
      </motion.div>

      <DeleteConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Excluir hábito"
        description={`Tem certeza que deseja excluir "${habit.title}"? Todo o histórico e streak serão perdidos.`}
        onConfirm={() => deleteHabit(habit.id)}
      />
    </>
  );
}

/* ─── Add Habit Dialog ─────────────────────────────────────────────────────── */


function AddHabitDialog() {
  const { addHabit } = useAppStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("⚡");
  const [weeklyGoal, setWeeklyGoal] = useState(5);
  const [category, setCategory] = useState("Fitness");
  const [difficulty, setDifficulty] = useState("Médio");
  const EMOJIS = ["⚡", "💪", "📚", "🧘", "🌅", "🏃", "💧", "🎯", "🎸", "🧠", "✍️", "🍎"];

  const handleAdd = () => {
    if (!title.trim()) return;
    addHabit({ title: title.trim(), icon, color: "#EB5002", weeklyGoal, description: "", ...({ category, difficulty } as any) } as any);
    setTitle("");setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-primary-foreground"
        style={{ background: "hsl(var(--primary))", boxShadow: "var(--shadow-btn)" }}>
          <Plus className="w-4 h-4" /> Novo Hábito
        </motion.button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border/60">
        <DialogHeader>
          <DialogTitle className="text-foreground font-semibold">Novo Hábito</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Input placeholder="Nome do hábito..." value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          <div>
            <label className="text-xs mb-2 block font-medium text-muted-foreground">Ícone</label>
            <div className="grid grid-cols-6 gap-2">
              {EMOJIS.map((e) =>
              <motion.button key={e} whileTap={{ scale: 0.88 }} onClick={() => setIcon(e)}
              className={cn("text-xl p-2 rounded-xl border transition-all",
              icon === e ? "border-primary/40 bg-primary/8" : "bg-muted/50 border-border hover:border-border/80")}>
                  {e}
                </motion.button>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs mb-2 block font-medium text-muted-foreground">Categoria</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_TAGS.map((c) =>
              <button key={c} onClick={() => setCategory(c)}
              className={cn("px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
              category === c ? "bg-primary/12 text-primary border-primary/35" : "bg-muted text-muted-foreground border-border hover:border-primary/25")}>
                  {c}
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs mb-2 block font-medium text-muted-foreground">Dificuldade</label>
            <div className="flex gap-2">
              {DIFFICULTY_TAGS.map((d) => {
                const col = d === "Fácil" ? "#646464" : d === "Médio" ? "#EB5002" : "#C10801";
                return (
                  <button key={d} onClick={() => setDifficulty(d)}
                  className={cn("flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                  difficulty === d ? "" : "bg-muted text-muted-foreground border-border")}
                  style={difficulty === d ? { background: `${col}14`, color: col, borderColor: `${col}40` } : {}}>
                    {d}
                  </button>);

              })}
            </div>
          </div>
          <div>
            <label className="text-xs mb-1.5 block font-medium text-muted-foreground">
              Meta semanal: <span className="font-bold text-[#EB5002]">{weeklyGoal}x / semana</span>
            </label>
            <input type="range" min={1} max={7} value={weeklyGoal} onChange={(e) => setWeeklyGoal(+e.target.value)} className="w-full" style={{ accentColor: "#EB5002" }} />
          </div>
          <Button onClick={handleAdd} disabled={!title.trim()} className="w-full font-semibold">Criar Hábito (+5 XP/dia)</Button>
        </div>
      </DialogContent>
    </Dialog>);

}

/* ─── Main Page ────────────────────────────────────────────────────────────── */
export default function Habitos() {
  const { habits } = useAppStore();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const todayStr = now.toISOString().split("T")[0];

  const doneTodayCount = habits.filter((h) => h.completedDates.includes(todayStr)).length;
  const doneTodayPct = habits.length > 0 ? Math.round(doneTodayCount / habits.length * 100) : 0;
  const totalXP = habits.reduce((s, h) => {
    const n = h.completedDates.filter((d) => {const [y, m] = d.split("-").map(Number);return y === viewYear && m - 1 === viewMonth;}).length;
    return s + n * 5;
  }, 0);
  const totalStreak = habits.reduce((s, h) => s + h.streak, 0);
  const bestStreak = habits.reduce((best, h) => Math.max(best, h.streak), 0);

  const prevMonth = () => {if (viewMonth === 0) {setViewMonth(11);setViewYear((y) => y - 1);} else setViewMonth((m) => m - 1);};
  const nextMonth = () => {if (viewMonth === 11) {setViewMonth(0);setViewYear((y) => y + 1);} else setViewMonth((m) => m + 1);};
  const isCurrentMonth = viewMonth === now.getMonth() && viewYear === now.getFullYear();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-5 pb-10">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="premium-card p-5 card-accent-top relative overflow-hidden flex items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
          style={{ background: "radial-gradient(circle at 80% 20%, hsl(var(--primary) / 0.12) 0%, transparent 65%)" }} />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0 bg-primary">
            <Repeat className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-[22px] font-black text-foreground tracking-tight hero-label">Hábitos</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              <span className="font-semibold" style={{ color: "hsl(var(--primary))" }}>{habits.length}</span> hábitos · hoje{" "}
              <span className="font-semibold" style={{ color: "hsl(var(--primary))" }}>{doneTodayCount}/{habits.length}</span> completos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 relative z-10 ml-auto">
          <div className="flex items-center gap-1 px-2.5 py-1.5 apple-section rounded-xl">
            <button onClick={prevMonth} className="p-1 rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-muted">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium min-w-[116px] text-center text-foreground">{MONTH_NAMES[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} disabled={isCurrentMonth}
            className={cn("p-1 rounded-lg transition-all", isCurrentMonth ? "text-muted-foreground/30 cursor-not-allowed" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <AddHabitDialog />
        </div>
      </motion.div>

      {/* ── KPI Row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
        { label: "Hábitos Ativos", value: habits.length, sub: "em acompanhamento", icon: <Zap className="w-4 h-4" />, color: "#EB5002", bg: "rgba(235,80,2,0.07)", bd: "rgba(235,80,2,0.18)" },
        { label: "Hoje", value: `${doneTodayCount}/${habits.length}`, sub: `${doneTodayPct}% do dia`, icon: <CheckCircle className="w-4 h-4" />, color: "#EB5002", bg: "rgba(235,80,2,0.07)", bd: "rgba(235,80,2,0.18)" },
        { label: "XP este mês", value: `+${totalXP}`, sub: "pontos ganhos", icon: <Flame className="w-4 h-4" />, color: "#F16001", bg: "rgba(241,96,1,0.07)", bd: "rgba(241,96,1,0.18)" },
        { label: "Melhor Streak", value: `${bestStreak}d`, sub: `${totalStreak}d total`, icon: <TrendingUp className="w-4 h-4" />, color: "#D9C1AB", bg: "#1A1A1A", bd: "#333333" }].
        map((s, i) =>
        <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.06 }}
        className="rounded-2xl p-4 flex flex-col justify-between"
        style={{ background: s.bg, border: `0.5px solid ${s.bd}` }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{s.label}</span>
              <div style={{ color: s.color }}>{s.icon}</div>
            </div>
            <div>
              <div className="text-2xl font-black tabular-nums" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Charts Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Equalizer Evolution Chart */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
        className="lg:col-span-3 rounded-2xl overflow-hidden"
        style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Evolução de Consistência</p>
              <p className="text-xs mt-0.5 text-muted-foreground">Últimas 8 semanas</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(235,80,2,0.1)", border: "1px solid rgba(235,80,2,0.3)" }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#EB5002" }} />
              <span className="text-[10px] font-semibold text-[#EB5002]">Ao vivo</span>
            </div>
          </div>
          <div className="px-2 pb-4">
            {habits.length > 0 ?
            <EvolutionChart habits={habits} /> :
            <div className="h-[160px] flex items-center justify-center text-xs text-muted-foreground">
                  Adicione hábitos para ver a evolução
                </div>
            }
          </div>
        </motion.div>

        {/* Weekly bars + today ring */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
        className="lg:col-span-2 apple-section p-4 flex flex-col justify-between text-primary">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Esta Semana</p>
              <p className="text-xs text-muted-foreground mt-0.5">hábitos por dia</p>
            </div>
            {/* Today ring */}
            <div className="relative w-12 h-12 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
                <motion.circle cx="20" cy="20" r="16" fill="none"
                stroke="#EB5002" strokeWidth="4" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 16}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 16 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 16 * (1 - doneTodayPct / 100) }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.3 }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-black text-foreground">{doneTodayPct}%</span>
              </div>
            </div>
          </div>
          {habits.length > 0 ?
          <WeeklyBarsChart habits={habits} /> :
          <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>
          }
        </motion.div>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }}
      className="flex items-center gap-4 flex-wrap">
        {[
        { style: { background: "#EB5002" }, label: "Concluído" },
        { style: { background: "#C10801" }, label: "Não feito" },
        { style: { background: "#333333" }, label: "Futuro" },
        { style: { background: "#EB5002", boxShadow: "0 0 0 2px rgba(240,240,240,0.25)" }, label: "Hoje" }].
        map(({ style, label }) =>
        <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={style} />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        )}
      </motion.div>

      {/* ── Habit Cards Grid ────────────────────────────────────────────── */}
      <AnimatePresence mode="popLayout">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {habits.map((habit, i) =>
          <HabitCard key={habit.id} habit={habit} index={i} />
          )}
          {habits.length === 0 &&
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="col-span-2 text-center py-20 rounded-2xl border border-dashed border-[#EB5002]/20"
          style={{ background: "rgba(235,80,2,0.03)" }}>
              <p className="text-5xl mb-3">🌱</p>
              <p className="text-sm font-semibold text-muted-foreground">Nenhum hábito criado ainda</p>
              <p className="text-xs mt-1 text-muted-foreground/60">Cada dia concluído vale +5 XP</p>
            </motion.div>
          }
        </div>
      </AnimatePresence>
    </div>);

}