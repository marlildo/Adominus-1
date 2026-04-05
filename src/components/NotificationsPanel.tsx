import { useMemo, useState } from "react";

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
import {
  Bell, CheckCircle2, Flame, AlertTriangle, X, ExternalLink,
  Trophy, Star, Zap, Clock, Target, TrendingUp, Moon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";

type NotifType = "overdue" | "streak" | "achievement" | "xp" | "habit_reminder" | "daily_summary";

type AlertItem = {
  id: string;
  type: NotifType;
  title: string;
  description: string;
  route: string;
  time?: string;
};

const TYPE_CONFIG: Record<NotifType, {
  icon: React.ElementType;
  color: string;
  label: string;
  bg: string;
}> = {
  overdue:        { icon: AlertTriangle, color: "#E85002",   label: "Tarefas Atrasadas", bg: "rgba(232,80,2,0.1)"   },
  streak:         { icon: Flame,         color: "#E85002",   label: "Streaks em Risco",  bg: "rgba(232,80,2,0.1)"   },
  achievement:    { icon: Trophy,        color: "#E85002",   label: "Conquistas",        bg: "rgba(232,80,2,0.1)"   },
  xp:             { icon: Star,          color: "#E85002",   label: "XP & Nível",        bg: "rgba(232,80,2,0.1)"  },
  habit_reminder: { icon: Target,        color: "#E85002",  label: "Hábitos",           bg: "rgba(232,80,2,0.1)"  },
  daily_summary:  { icon: TrendingUp,    color: "#E85002",  label: "Resumo Diário",     bg: "rgba(232,80,2,0.1)"  },
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } }
};
const cardVariant = {
  hidden: { opacity: 0, x: 28, scale: 0.97 },
  show: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 380, damping: 30 } },
  exit: { opacity: 0, x: 28, scale: 0.95, transition: { duration: 0.18 } }
};

export function NotificationsPanel() {
  const tasks = useAppStore((s) => s.tasks);
  const habits = useAppStore((s) => s.habits);
  const user = useAppStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const alerts = useMemo<AlertItem[]>(() => {
    const today = new Date().toISOString().split("T")[0];
    const hour = new Date().getHours();
    const items: AlertItem[] = [];

    // Overdue tasks
    tasks
      .filter((t) => !t.completed && t.dueDate && t.dueDate < today)
      .forEach((t) => {
        items.push({
          id: `overdue-${t.id}`,
          type: "overdue",
          title: t.title,
          description: `Prazo vencido: ${formatDate(t.dueDate!)}`,
          route: "/tarefas",
          time: "Atrasado",
        });
      });

    // Habits with streak at risk
    habits
      .filter((h) => {
        const doneToday = h.completedDates.includes(today);
        if (doneToday) return false;
        return (h.streak > 0 && hour >= 18) || h.streak >= 7;
      })
      .forEach((h) => {
        items.push({
          id: `streak-${h.id}`,
          type: "streak",
          title: h.title,
          description: `${h.streak} dia${h.streak !== 1 ? "s" : ""} de streak em risco!`,
          route: "/habitos",
          time: "Hoje",
        });
      });

    // Habits pending today reminder (after 12:00)
    if (hour >= 12) {
      habits
        .filter((h) => !h.completedDates.includes(today) && h.streak === 0)
        .slice(0, 3)
        .forEach((h) => {
          if (!items.find(i => i.id === `streak-${h.id}`)) {
            items.push({
              id: `habit-${h.id}`,
              type: "habit_reminder",
              title: h.title,
              description: "Ainda não foi concluído hoje",
              route: "/habitos",
              time: "Hoje",
            });
          }
        });
    }

    // XP milestone hint
    if (user.xp > 0 && user.xp % 100 < 20) {
      items.push({
        id: "xp-milestone",
        type: "xp",
        title: `${user.xp} XP acumulados`,
        description: `Faltam ${user.xpToNextLevel - user.xp} XP para o nível ${user.level + 1}`,
        route: "/",
        time: "Agora",
      });
    }

    // Daily summary (after 19:00)
    if (hour >= 19) {
      const pending = tasks.filter((t) => !t.completed && t.dueDate === today).length;
      if (pending > 0) {
        items.push({
          id: "daily-summary",
          type: "daily_summary",
          title: "Resumo do dia",
          description: `${pending} tarefa${pending !== 1 ? "s" : ""} ainda pendente${pending !== 1 ? "s" : ""} hoje`,
          route: "/tarefas",
          time: "Esta noite",
        });
      }
    }

    return items;
  }, [tasks, habits, user]);

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id));
  const count = visibleAlerts.length;

  function dismiss(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
  }

  function dismissAll() {
    setDismissed(new Set(alerts.map((a) => a.id)));
  }

  function handleNavigate(route: string) {
    navigate(route);
    setOpen(false);
  }

  // Group by type sections
  const sections: NotifType[] = ["overdue", "streak", "habit_reminder", "daily_summary", "xp", "achievement"];

  return (
    <>
      {/* Bell trigger button */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        whileHover={{ scale: 1.08 }}
        onClick={() => setOpen(true)}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
        style={{
          background: count > 0 ? "hsl(var(--primary) / 0.12)" : "hsl(var(--card))",
          border: count > 0 ? "1px solid hsl(var(--primary) / 0.35)" : "1px solid hsl(var(--border))",
          boxShadow: count > 0 ? "0 0 14px hsl(var(--primary) / 0.2)" : "none",
        }}
        title="Notificações"
      >
        <motion.div
          animate={count > 0 ? { rotate: [0, -8, 8, -8, 8, 0] } : {}}
          transition={{ repeat: Infinity, repeatDelay: 4, duration: 0.5 }}
        >
          <Bell className="w-4 h-4" style={{ color: count > 0 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }} />
        </motion.div>

        <AnimatePresence>
          {count > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black"
              style={{
                background: "hsl(var(--primary))",
                color: "white",
                boxShadow: "0 0 8px hsl(var(--primary) / 0.7), 0 0 20px hsl(var(--primary) / 0.3)",
              }}
            >
              {count > 9 ? "9+" : count}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[3px]"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sliding panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ x: "100%", opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 36, mass: 0.9 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-[360px] z-50 flex flex-col"
            style={{
              background: "hsl(var(--background))",
              borderLeft: "1px solid hsl(var(--primary) / 0.2)",
              boxShadow: "-8px 0 60px rgba(0,0,0,0.7), -2px 0 20px hsl(var(--primary) / 0.08)",
            }}
          >
            {/* Atmospheric orb */}
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.07) 0%, transparent 70%)", filter: "blur(30px)" }} />

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
              style={{ borderBottom: "1px solid hsl(var(--primary) / 0.15)", background: "hsl(0 0% 4%)" }}>

              <motion.div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "hsl(var(--primary) / 0.12)", border: "1px solid hsl(var(--primary) / 0.3)", boxShadow: "0 0 14px hsl(var(--primary) / 0.2)" }}
                animate={{ boxShadow: ["0 0 14px hsl(var(--primary) / 0.2)", "0 0 22px hsl(var(--primary) / 0.35)", "0 0 14px hsl(var(--primary) / 0.2)"] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Bell className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
              </motion.div>

              <div className="flex-1">
                <h2 className="text-[15px] font-black text-foreground tracking-tight">Notificações</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {count > 0 ? `${count} alerta${count !== 1 ? "s" : ""} ativo${count !== 1 ? "s" : ""}` : "Tudo em dia"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {count > 0 && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={dismissAll}
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                    style={{ background: "hsl(var(--muted)/0.5)", border: "1px solid hsl(var(--border))" }}
                  >
                    Limpar tudo
                  </motion.button>
                )}
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  style={{ background: "hsl(var(--muted)/0.4)", border: "1px solid hsl(var(--border))" }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* Count bar */}
            {count > 0 && (
              <motion.div
                className="flex gap-2 px-5 py-3 flex-shrink-0 flex-wrap"
                style={{ borderBottom: "1px solid hsl(var(--border)/0.3)" }}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {sections.map((type) => {
                  const cfg = TYPE_CONFIG[type];
                  const n = visibleAlerts.filter((a) => a.type === type).length;
                  if (n === 0) return null;
                  const Icon = cfg.icon;
                  return (
                    <span key={type} className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.color}30`, color: cfg.color }}>
                      <Icon className="w-3 h-3" />
                      {n}
                    </span>
                  );
                })}
              </motion.div>
            )}

            {/* Notifications list */}
            <div className="flex-1 overflow-y-auto py-3">
              <AnimatePresence initial={false}>
                {visibleAlerts.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, scale: 0.94, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                    className="flex flex-col items-center justify-center gap-4 py-20 px-8 text-center"
                  >
                    <motion.div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ background: "rgba(232,80,2,0.1)", border: "1px solid rgba(232,80,2,0.25)", boxShadow: "0 0 24px rgba(232,80,2,0.12)" }}
                      animate={{ boxShadow: ["0 0 16px rgba(232,80,2,0.1)", "0 0 28px rgba(232,80,2,0.22)", "0 0 16px rgba(232,80,2,0.1)"] }}
                      transition={{ repeat: Infinity, duration: 2.5 }}
                    >
                      <CheckCircle2 className="w-7 h-7 text-primary" />
                    </motion.div>
                    <div>
                      <p className="text-[15px] font-black text-foreground">Tudo em dia!</p>
                      <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                        Nenhum alerta no momento.<br />Continue assim, guerreiro!
                      </p>
                    </div>
                    <motion.div
                      className="flex gap-1.5 mt-1"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      {["#E85002", "#E85002", "#E85002"].map((c, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
                      ))}
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="show"
                    className="space-y-1 px-3"
                  >
                    {sections.map((type) => {
                      const group = visibleAlerts.filter((a) => a.type === type);
                      if (group.length === 0) return null;
                      const cfg = TYPE_CONFIG[type];
                      const SectionIcon = cfg.icon;
                      return (
                        <div key={type} className="mb-3">
                          {/* Section label */}
                          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
                            <div className="w-5 h-5 rounded-lg flex items-center justify-center"
                              style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
                              <SectionIcon className="w-3 h-3" style={{ color: cfg.color }} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest"
                              style={{ color: cfg.color }}>
                              {cfg.label}
                            </span>
                            <div className="flex-1 h-px" style={{ background: `${cfg.color}20` }} />
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: cfg.bg, color: cfg.color }}>
                              {group.length}
                            </span>
                          </div>

                          {/* Cards */}
                          {group.map((alert, i) => (
                            <motion.div
                              key={alert.id}
                              variants={cardVariant}
                              layout
                              className="relative overflow-hidden rounded-xl mb-1.5 group cursor-pointer"
                              style={{
                                background: "hsl(0 0% 6%)",
                                border: `1px solid ${cfg.color}20`,
                              }}
                              whileHover={{
                                borderColor: `${cfg.color}50`,
                                boxShadow: `0 0 20px ${cfg.color}15, 0 4px 20px rgba(0,0,0,0.4)`,
                                y: -1
                              }}
                              onClick={() => handleNavigate(alert.route)}
                            >
                              {/* Left accent bar */}
                              <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
                                style={{ background: `linear-gradient(180deg, ${cfg.color}, ${cfg.color}40)` }} />

                              {/* Inner glow */}
                              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                style={{ background: `radial-gradient(ellipse at 20% 50%, ${cfg.color}08 0%, transparent 65%)` }} />

                              <div className="pl-4 pr-3 py-3 flex items-start gap-3">
                                {/* Icon */}
                                <motion.div
                                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                  style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}
                                  whileHover={{ scale: 1.1 }}
                                  transition={{ type: "spring", stiffness: 400 }}
                                >
                                  <SectionIcon className="w-4 h-4" style={{ color: cfg.color }} />
                                </motion.div>

                                {/* Text */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-bold text-foreground leading-tight truncate">{alert.title}</p>
                                  <p className="text-[11px] mt-0.5 leading-tight" style={{ color: cfg.color }}>
                                    {alert.description}
                                  </p>
                                  {alert.time && (
                                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1.5">
                                      <Clock className="w-2.5 h-2.5" />
                                      {alert.time}
                                    </span>
                                  )}
                                </div>

                                {/* Dismiss */}
                                <motion.button
                                  whileTap={{ scale: 0.85 }}
                                  onClick={(e) => { e.stopPropagation(); dismiss(alert.id); }}
                                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all"
                                  style={{ background: "hsl(var(--muted)/0.6)", border: "1px solid hsl(var(--border))" }}
                                >
                                  <X className="w-3 h-3 text-muted-foreground" />
                                </motion.button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-5 py-4"
              style={{ borderTop: "1px solid hsl(var(--border)/0.4)", background: "hsl(0 0% 4%)" }}>
              <p className="text-[10px] text-muted-foreground text-center opacity-50">
                Toque em um alerta para ir direto à seção
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
