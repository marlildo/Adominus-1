import { useMemo } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, Legend } from "recharts";
import { CheckCircle2, Flame, Zap, Wallet, TrendingUp, TrendingDown, Target, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subDays, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ElitePageWrapper, ElitePageHeader, EliteCard, staggerContainer, fadeUp } from "@/components/ElitePageLayout";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

const tooltipStyle = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 10,
    fontSize: 11,
    boxShadow: "0 8px 20px rgba(0,0,0,0.12)"
  },
  labelStyle: { color: "hsl(var(--foreground))", fontWeight: 600 },
  cursor: { fill: "hsl(var(--muted))", opacity: 0.5 }
};

function SummaryCard({
  icon, label, value, sub, trend, iconClass







}: {icon: React.ReactNode;label: string;value: string | number;sub?: string;trend?: "up" | "down" | "neutral";iconClass: string;}) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -3 }}
      className="premium-card rounded-2xl p-5">
      
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconClass)}>
          {icon}
        </div>
        {trend === "up" && <TrendingUp className="w-4 h-4 text-[#EB5002]" />}
        {trend === "down" && <TrendingDown className="w-4 h-4 text-destructive" />}
        {trend === "neutral" && <TrendingUp className="w-4 h-4 text-muted-foreground opacity-40" />}
      </div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </motion.div>);

}

export default function RevisaoSemanal() {
  const { tasks, habits, transactions, user } = useAppStore();

  // Build last-7-days array (today = index 6)
  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date,
        iso: format(date, "yyyy-MM-dd"),
        label: format(date, "EEE", { locale: ptBR }),
        labelFull: format(date, "dd/MM", { locale: ptBR })
      };
    });
  }, []);

  // ── Tasks per day (completed = task createdAt within day AND completed=true)
  const tasksData = useMemo(() =>
  last7Days.map(({ iso, label }) => ({
    dia: label,
    concluídas: tasks.filter(
      (t) => t.completed && t.createdAt?.startsWith(iso)
    ).length,
    criadas: tasks.filter((t) => t.createdAt?.startsWith(iso)).length
  })),
  [last7Days, tasks]
  );

  // ── Habit consistency % per day
  const habitsData = useMemo(() =>
  last7Days.map(({ iso, label }) => {
    const total = habits.length;
    const done = habits.filter((h) => h.completedDates.includes(iso)).length;
    const pct = total > 0 ? Math.round(done / total * 100) : 0;
    return { dia: label, consistência: pct, concluídos: done, total };
  }),
  [last7Days, habits]
  );

  // ── XP earned per day (approximation via tasks completed + habits done)
  // Each completed task = 10 XP, each habit = 5 XP
  const xpData = useMemo(() =>
  last7Days.map(({ iso, label }) => {
    const taskXP = tasks.filter(
      (t) => t.completed && t.createdAt?.startsWith(iso)
    ).length * 10;
    const habitXP = habits.
    filter((h) => h.completedDates.includes(iso)).
    length * 5;
    return { dia: label, xp: taskXP + habitXP };
  }),
  [last7Days, tasks, habits]
  );

  // ── Finance per day
  const financeData = useMemo(() =>
  last7Days.map(({ iso, label, labelFull }) => {
    const dayTx = transactions.filter((t) => t.date?.startsWith(iso));
    const receita = dayTx.filter((t) => t.type === "receita").reduce((s, t) => s + t.amount, 0);
    const despesa = dayTx.filter((t) => t.type === "despesa").reduce((s, t) => s + t.amount, 0);
    return { dia: labelFull, receita, despesa };
  }),
  [last7Days, transactions]
  );

  // ── Summary numbers
  const totalTasksDone = useMemo(() =>
  tasks.filter((t) => {
    if (!t.completed || !t.createdAt) return false;
    const d = parseISO(t.createdAt);
    return isWithinInterval(d, {
      start: startOfDay(subDays(new Date(), 6)),
      end: endOfDay(new Date())
    });
  }).length,
  [tasks]
  );

  const avgHabitConsistency = useMemo(() => {
    const vals = habitsData.map((d) => d.consistência);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }, [habitsData]);

  const totalXPEarned = useMemo(() =>
  xpData.reduce((s, d) => s + d.xp, 0),
  [xpData]
  );

  const weekReceita = useMemo(() =>
  financeData.reduce((s, d) => s + d.receita, 0),
  [financeData]
  );

  const weekDespesa = useMemo(() =>
  financeData.reduce((s, d) => s + d.despesa, 0),
  [financeData]
  );

  const saldo = weekReceita - weekDespesa;

  return (
    <ElitePageWrapper>
      <ElitePageHeader
        icon={<BarChart2 className="w-6 h-6" />}
        title="Revisão Semanal"
        subtitle={`${format(subDays(new Date(), 6), "dd/MM", { locale: ptBR })} – ${format(new Date(), "dd/MM/yyyy", { locale: ptBR })} · ${user.name} 💪`}
        iconColor="#EB5002"
      />

      {/* Summary Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 shadow-2xl">
        
        <SummaryCard
          icon={<CheckCircle2 className="w-5 h-5 text-white" />}
          label="Tarefas Concluídas"
          value={totalTasksDone}
          sub="na última semana"
          trend={totalTasksDone > 5 ? "up" : totalTasksDone > 0 ? "neutral" : "down"}
          iconClass="gradient-primary" />
        
        <SummaryCard
          icon={<Flame className="w-5 h-5 text-white" />}
          label="Consistência Média"
          value={`${avgHabitConsistency}%`}
          sub="hábitos completados"
          trend={avgHabitConsistency >= 70 ? "up" : avgHabitConsistency >= 40 ? "neutral" : "down"}
          iconClass="gradient-green" />
        
        <SummaryCard
          icon={<Zap className="w-5 h-5 text-white" />}
          label="XP Conquistado"
          value={`${totalXPEarned} XP`}
          sub="tarefas + hábitos"
          trend={totalXPEarned > 0 ? "up" : "neutral"}
          iconClass="gradient-gold" />
        
        <SummaryCard
          icon={<Wallet className="w-5 h-5 text-white" />}
          label="Saldo da Semana"
          value={`R$ ${saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          sub={saldo >= 0 ? "no positivo ✓" : "despesas maiores"}
          trend={saldo > 0 ? "up" : saldo < 0 ? "down" : "neutral"}
          iconClass={saldo >= 0 ? "gradient-green" : "gradient-danger"} />
        
      </motion.div>

      {/* Charts Row 1 */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid lg:grid-cols-2 gap-4 shadow-2xl">
        
        {/* Tasks per day */}
        <motion.div variants={itemVariants} className="premium-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Tarefas por Dia
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Criadas vs. concluídas</p>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={tasksData} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(v) => <span style={{ color: "hsl(var(--muted-foreground))" }}>{v}</span>} />
              
              <Bar dataKey="criadas" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} name="criadas" />
              <Bar dataKey="concluídas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="concluídas" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Habit consistency */}
        <motion.div variants={itemVariants} className="premium-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#EB5002]" />
            Consistência dos Hábitos
          </h3>
          <p className="text-xs text-muted-foreground mb-4">% de hábitos completados por dia</p>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={habitsData}>
              <defs>
                <linearGradient id="habitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: number) => [`${v}%`, "consistência"]} />
              
              <Line
                type="monotone"
                dataKey="consistência"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ fill: "hsl(var(--primary))", r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "hsl(var(--primary))", strokeWidth: 0 }} />
              
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </motion.div>

      {/* Charts Row 2 */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid lg:grid-cols-2 gap-4 shadow-2xl">
        
        {/* XP area chart */}
        <motion.div variants={itemVariants} className="premium-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent" />
            XP Ganho por Dia
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Calculado por tarefas + hábitos completados</p>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={xpData}>
              <defs>
                <linearGradient id="xpWeekGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EB5002" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#EB5002" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} XP`, "xp ganho"]} />
              <Area
                type="monotone"
                dataKey="xp"
                stroke="#EB5002"
                strokeWidth={2.5}
                fill="url(#xpWeekGrad)"
                dot={{ fill: "#EB5002", r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#EB5002", strokeWidth: 0 }} />
              
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Finance bar chart */}
        <motion.div variants={itemVariants} className="premium-card rounded-2xl p-5">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4 text-accent" />
              Movimentações Financeiras
            </h3>
            <span className={cn(
              "text-xs font-bold px-2 py-0.5 rounded-lg",
              saldo >= 0 ?
              "bg-[#EB5002]/10 text-[#EB5002]" :
              "bg-destructive/10 text-destructive"
            )}>
              {saldo >= 0 ? "+" : ""}R$ {saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Receitas vs. despesas por dia</p>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={financeData} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, ""]} />
              
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(v) => <span style={{ color: "hsl(var(--muted-foreground))" }}>{v}</span>} />
              
              <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="receita" />
              <Bar dataKey="despesa" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="despesa" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </motion.div>

      {/* Habit breakdown table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="premium-card rounded-2xl p-5 shadow-2xl">
        
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Flame className="w-4 h-4 text-[#EB5002]" />
          Detalhamento por Hábito
        </h3>
        {habits.length === 0 ?
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum hábito cadastrado ainda.</p> :

        <div className="space-y-3">
            {habits.map((habit) => {
            const doneCount = last7Days.filter(({ iso }) => habit.completedDates.includes(iso)).length;
            const pct = Math.round(doneCount / 7 * 100);
            return (
              <div key={habit.id} className="flex items-center gap-3">
                  <span className="text-lg w-7 text-center">{habit.icon || "📌"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground truncate">{habit.title}</span>
                      <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                        {doneCount}/7 dias · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: habit.color || "hsl(var(--primary))" }} />
                    
                    </div>
                  </div>
                </div>);

          })}
          </div>
        }
      </motion.div>
    </ElitePageWrapper>
  );
}