import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { triggerConfetti } from "@/components/XPEffects";
import {
  TreePine, Coins, Zap, Clock, CheckCircle2, Sprout,
  Volume2, VolumeX, ChevronLeft, ChevronRight, XCircle, AlertTriangle, Trash2,
} from "lucide-react";

// ── Ambient Sound Hook ────────────────────────────────────────────────────────
function useAmbientSound() {
  const [isMuted, setIsMuted] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);
  const chirpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActiveRef = useRef(false);

  const stopAmbient = useCallback(() => {
    isActiveRef.current = false;
    if (chirpTimerRef.current) clearTimeout(chirpTimerRef.current);
    nodesRef.current.forEach((n) => {
      try { (n as OscillatorNode).stop?.(); } catch {}
    });
    nodesRef.current = [];
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
    masterGainRef.current = null;
  }, []);

  const scheduleChirp = useCallback((ctx: AudioContext, master: GainNode) => {
    if (!isActiveRef.current) return;
    const delay = 3000 + Math.random() * 6000;
    chirpTimerRef.current = setTimeout(() => {
      if (!isActiveRef.current || ctx.state === "closed") return;
      const freqs = [900 + Math.random() * 400, 1100 + Math.random() * 500];
      freqs.forEach((freq, i) => {
        setTimeout(() => {
          if (!isActiveRef.current || ctx.state === "closed") return;
          const osc = ctx.createOscillator();
          const env = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          env.gain.setValueAtTime(0, ctx.currentTime);
          env.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.04);
          env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
          osc.connect(env);
          env.connect(master);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.2);
          nodesRef.current.push(osc);
        }, i * 80);
      });
      scheduleChirp(ctx, master);
    }, delay);
  }, []);

  const startAmbient = useCallback(() => {
    stopAmbient();
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      ctxRef.current = ctx;
      isActiveRef.current = true;

      const master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);
      masterGainRef.current = master;

      const bufferSize = ctx.sampleRate * 4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 280;
      lowpass.Q.value = 0.5;

      const windGain = ctx.createGain();
      windGain.gain.value = 0;

      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.08;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.06;
      lfo.connect(lfoGain);
      lfoGain.connect(windGain.gain);
      windGain.gain.setValueAtTime(0.05, ctx.currentTime);

      noiseSource.connect(lowpass);
      lowpass.connect(windGain);
      windGain.connect(master);
      noiseSource.start();
      lfo.start();
      nodesRef.current.push(noiseSource, lfo);

      const drone = ctx.createOscillator();
      drone.type = "sine";
      drone.frequency.value = 80;
      const droneGain = ctx.createGain();
      droneGain.gain.value = 0.018;
      drone.connect(droneGain);
      droneGain.connect(master);
      drone.start();
      nodesRef.current.push(drone);

      scheduleChirp(ctx, master);
    } catch {
      // AudioContext unavailable — fail silently
    }
  }, [stopAmbient, scheduleChirp]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (masterGainRef.current && ctxRef.current) {
        masterGainRef.current.gain.cancelScheduledValues(ctxRef.current.currentTime);
        masterGainRef.current.gain.linearRampToValueAtTime(
          next ? 0 : 1,
          ctxRef.current.currentTime + 0.3
        );
      }
      return next;
    });
  }, []);

  useEffect(() => () => { stopAmbient(); }, [stopAmbient]);

  return { isMuted, toggleMute, startAmbient, stopAmbient };
}

// ── Types ─────────────────────────────────────────────────────────────────────
type FocusState = "IDLE" | "FOCUSING" | "FAILED" | "COMPLETED";
type TreeStage = "seed" | "sprout" | "young" | "complete" | "interrupted" | "dead" | "idle";

/** A saved tree (only planted on full completion) */
interface ForestTree {
  id: string;
  duration: number;
  stage: "complete";
  completedAt: string;
  sessionDate: string;
}

type FailureReason = "manual" | "left_app" | "page_close";

/** A session record tracked in state (not persisted to forest_trees) */
interface SessionRecord {
  id: string;
  target: number;       // minutes — the selected goal
  real: number;         // seconds actually focused (exact, no rounding)
  status: "concluída" | "interrompida" | "falhou";
  date: string;
}

/** Format seconds as "X min Y seg", "X min", or "Y seg" */
function formatFocusTime(secs: number): string {
  if (secs <= 0) return "0 seg";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `${s} seg`;
  if (s === 0) return `${m} min`;
  return `${m} min ${s} seg`;
}

const DURATIONS = [
  { label: "15 min", value: 15, icon: "⚡" },
  { label: "25 min", value: 25, icon: "🍅" },
  { label: "45 min", value: 45, icon: "🔥" },
  { label: "60 min", value: 60, icon: "👑" },
  { label: "90 min", value: 90, icon: "⚔️" },
];

const STAGE_CONFIG: Record<
  TreeStage,
  { emoji: string; label: string; color: string; description: string }
> = {
  idle:        { emoji: "🌱", label: "Pronto",          color: "hsl(var(--primary))", description: "Escolha um tempo e plante sua árvore" },
  seed:        { emoji: "🌱", label: "Semente",          color: "hsl(var(--primary))", description: "Sua semente foi plantada..." },
  sprout:      { emoji: "🌿", label: "Broto",            color: "hsl(var(--primary))", description: "Algo está crescendo!" },
  young:       { emoji: "🌳", label: "Árvore jovem",     color: "#EB5002", description: "Sua árvore está crescendo forte!" },
  complete:    { emoji: "🌲", label: "Árvore completa",  color: "#EB5002", description: "Árvore completamente crescida!" },
  interrupted: { emoji: "🪨", label: "Interrompida",     color: "#646464",  description: "Sessão interrompida. O tempo foi registrado." },
  dead:        { emoji: "🥀", label: "Árvore morreu",    color: "hsl(var(--primary))",   description: "Você saiu do app. A árvore morreu." },
};

const TREE_EMOJIS = ["🌲", "🌳", "🌴", "🍀", "🌿", "🌾", "🎋", "🎍"];
function getTreeEmoji(index: number) { return TREE_EMOJIS[index % TREE_EMOJIS.length]; }
function pad(n: number) { return String(n).padStart(2, "0"); }

// ── Weekly Heatmap ─────────────────────────────────────────────────────────────
const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getIntensity(minutes: number) {
  if (minutes === 0)
    return { emoji: "", bg: "hsl(var(--muted) / 0.4)", border: "hsl(var(--border) / 0.4)", glow: "none", size: 0 };
  if (minutes < 15)
    return { emoji: "🌱", bg: "hsl(var(--primary) / 0.08)", border: "hsl(var(--primary) / 0.25)", glow: "none", size: 20 };
  if (minutes < 30)
    return { emoji: "🌿", bg: "hsl(var(--primary) / 0.14)", border: "hsl(var(--primary) / 0.35)", glow: "none", size: 22 };
  if (minutes < 60)
    return { emoji: "🌳", bg: "rgba(235,80,2,0.22)", border: "rgba(235,80,2,0.5)", glow: "0 0 12px rgba(235,80,2,0.25)", size: 24 };
  return { emoji: "🌲", bg: "rgba(235,80,2,0.3)", border: "rgba(235,80,2,0.65)", glow: "0 0 18px rgba(235,80,2,0.4)", size: 26 };
}

function WeeklyHeatmap({ forestTrees }: { forestTrees: ForestTree[] }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { date: d.toISOString().split("T")[0], dayIndex: d.getDay() };
  });
  const todayStr = new Date().toISOString().split("T")[0];
  const minutesByDate: Record<string, number> = {};
  for (const tree of forestTrees) {
    minutesByDate[tree.sessionDate] = (minutesByDate[tree.sessionDate] ?? 0) + tree.duration;
  }

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span style={{ fontSize: 16 }}>🌿</span>
        <h3 className="text-sm font-bold text-foreground">Calendário da Floresta</h3>
        <span className="ml-auto text-xs text-muted-foreground">últimos 7 dias</span>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map(({ date, dayIndex }) => {
          const minutes = minutesByDate[date] ?? 0;
          const intensity = getIntensity(minutes);
          const isToday = date === todayStr;
          return (
            <motion.div key={date} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: days.findIndex((d) => d.date === date) * 0.05 }}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-full aspect-square rounded-xl flex items-center justify-center relative"
                style={{
                  background: intensity.bg,
                  border: `1.5px solid ${isToday ? "hsl(var(--primary) / 0.7)" : intensity.border}`,
                  boxShadow: isToday ? `0 0 0 2px hsl(var(--primary) / 0.2), ${intensity.glow}` : intensity.glow,
                  minHeight: 44,
                }}
              >
                {intensity.emoji
                  ? <span style={{ fontSize: intensity.size, lineHeight: 1 }}>{intensity.emoji}</span>
                  : <span style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", opacity: 0.4 }}>·</span>}
                {isToday && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wide px-1 rounded-sm"
                    style={{ background: "hsl(var(--primary))", color: "white", lineHeight: "14px" }}>
                    hoje
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold"
                style={{ color: isToday ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
                {DAY_LABELS[dayIndex]}
              </span>
              <span className="text-[9px] tabular-nums" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.7 }}>
                {minutes > 0 ? `${minutes}m` : "—"}
              </span>
            </motion.div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-4 pt-3" style={{ borderTop: "1px solid hsl(var(--border) / 0.4)" }}>
        <span className="text-[10px] text-muted-foreground font-medium">Intensidade:</span>
        {[{ emoji: "🌱", label: "<15m" }, { emoji: "🌿", label: "15–29m" }, { emoji: "🌳", label: "30–59m" }, { emoji: "🌲", label: "60m+" }].map(({ emoji, label }) => (
          <div key={label} className="flex items-center gap-1">
            <span style={{ fontSize: 12 }}>{emoji}</span>
            <span className="text-[9px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Monthly Calendar ──────────────────────────────────────────────────────────
const MONTH_NAMES_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function MonthlyCalendar({ forestTrees }: { forestTrees: ForestTree[] }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const todayStr = today.toISOString().split("T")[0];

  const minutesByDate: Record<string, number> = {};
  for (const tree of forestTrees) {
    minutesByDate[tree.sessionDate] = (minutesByDate[tree.sessionDate] ?? 0) + tree.duration;
  }

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span style={{ fontSize: 16 }}>📅</span>
        <h3 className="text-sm font-bold text-foreground">Calendário Mensal</h3>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={prevMonth} className="p-1 rounded-lg transition-colors hover:bg-muted" aria-label="Mês anterior">
            <ChevronLeft size={14} className="text-muted-foreground" />
          </button>
          <span className="text-xs font-semibold text-foreground min-w-[96px] text-center">
            {MONTH_NAMES_PT[viewMonth]} {viewYear}
          </span>
          <button onClick={nextMonth} className="p-1 rounded-lg transition-colors hover:bg-muted" aria-label="Próximo mês">
            <ChevronRight size={14} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-0.5">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const minutes = minutesByDate[dateStr] ?? 0;
          const intensity = getIntensity(minutes);
          const isToday = dateStr === todayStr;
          return (
            <motion.div key={dateStr} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: Math.min(idx * 0.008, 0.3) }}
              title={minutes > 0 ? `${minutes}m de foco` : undefined}
              className="flex flex-col items-center gap-0.5"
            >
              <div className="w-full aspect-square rounded-lg flex items-center justify-center relative"
                style={{
                  background: intensity.bg,
                  border: `1.5px solid ${isToday ? "hsl(var(--primary) / 0.8)" : intensity.border}`,
                  boxShadow: isToday ? `0 0 0 2px hsl(var(--primary) / 0.18), ${intensity.glow}` : intensity.glow,
                  minHeight: 32,
                }}
              >
                {intensity.emoji
                  ? <span style={{ fontSize: intensity.size * 0.7, lineHeight: 1 }}>{intensity.emoji}</span>
                  : <span className="text-[10px] font-medium"
                      style={{ color: isToday ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))", opacity: isToday ? 1 : 0.5 }}>
                      {day}
                    </span>}
              </div>
              {intensity.emoji ? (
                <span className="text-[8px] tabular-nums" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.65 }}>{day}</span>
              ) : null}
            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-4 pt-3" style={{ borderTop: "1px solid hsl(var(--border) / 0.4)" }}>
        <span className="text-[10px] text-muted-foreground font-medium">Intensidade:</span>
        {[{ emoji: "🌱", label: "<15m" }, { emoji: "🌿", label: "15–29m" }, { emoji: "🌳", label: "30–59m" }, { emoji: "🌲", label: "60m+" }].map(({ emoji, label }) => (
          <div key={label} className="flex items-center gap-1">
            <span style={{ fontSize: 11 }}>{emoji}</span>
            <span className="text-[9px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tree Visual ───────────────────────────────────────────────────────────────
function TreeVisual({
  stage,
  progress,
  accumulatedSecs,
  targetSecs,
}: {
  stage: TreeStage;
  progress: number;
  accumulatedSecs: number;
  targetSecs: number;
}) {
  const config = STAGE_CONFIG[stage];
  const isAlive = stage !== "interrupted" && stage !== "dead" && stage !== "idle";
  const isInterrupted = stage === "interrupted";
  const isDead = stage === "dead";

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div key={stage} initial={{ scale: 0.6, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }} className="relative">
        {isAlive && (
          <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full blur-xl"
            style={{ background: `${config.color}40`, zIndex: 0 }} />
        )}
        {isDead && (
          <motion.div animate={{ opacity: [0.2, 0.45, 0.2] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full blur-xl"
            style={{ background: "hsl(var(--primary) / 0.3)", zIndex: 0 }} />
        )}
        <motion.span
          animate={isAlive ? { y: [0, -6, 0] } : isInterrupted ? { rotate: [0, -5, 5, 0] } : isDead ? { rotate: [0, -8, 8, -4, 0], scale: [1, 0.92, 1] } : {}}
          transition={isInterrupted ? { duration: 0.5, ease: "easeOut" } : isDead ? { duration: 0.7, ease: "easeOut" } : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ fontSize: 80, lineHeight: 1, display: "block", position: "relative", zIndex: 1 }}
        >
          {config.emoji}
        </motion.span>
      </motion.div>

      <motion.div key={config.label} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <p className="text-lg font-black" style={{ color: config.color }}>{config.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
      </motion.div>

      {/* Progress bar for active session */}
      {stage !== "idle" && stage !== "interrupted" && stage !== "dead" && (
        <div className="w-full max-w-[220px] h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
          <motion.div className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${config.color}, ${config.color}bb)` }}
            initial={{ width: "0%" }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }} />
        </div>
      )}

      {/* Accumulated progress bar — shown in idle state when there's carry-over */}
      {stage === "idle" && accumulatedSecs > 0 && (
        <div className="w-full max-w-[220px]">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>⏳ Tempo acumulado</span>
            <span>{formatFocusTime(accumulatedSecs)} / {Math.floor(targetSecs / 60)}m</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
            <motion.div className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #C10801, #EB5002)" }}
              initial={{ width: "0%" }}
              animate={{ width: `${Math.min((accumulatedSecs / targetSecs) * 100, 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Completion Modal ──────────────────────────────────────────────────────────
function CompletionModal({
  open, onClose, duration, treesTotal,
}: {
  open: boolean; onClose: () => void; duration: number; treesTotal: number;
}) {
  useEffect(() => {
    if (!open) return;
    const shots = [
      { x: window.innerWidth * 0.25, y: window.innerHeight * 0.4 },
      { x: window.innerWidth * 0.5,  y: window.innerHeight * 0.35 },
      { x: window.innerWidth * 0.75, y: window.innerHeight * 0.4 },
    ];
    shots.forEach((s, i) => { setTimeout(() => triggerConfetti(s.x, s.y, "hsl(var(--primary))"), i * 180); });
    setTimeout(() => {
      triggerConfetti(window.innerWidth * 0.35, window.innerHeight * 0.5, "hsl(var(--primary))");
      triggerConfetti(window.innerWidth * 0.65, window.innerHeight * 0.5, "hsl(var(--primary))");
    }, 600);
  }, [open]);

  if (!open) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-md"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.7, y: 40, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="relative overflow-hidden rounded-3xl p-8 mx-4 max-w-sm w-full text-center"
        style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--primary) / 0.4)",
          boxShadow: "0 0 60px hsl(var(--primary) / 0.25), 0 30px 60px rgba(0,0,0,0.45)",
        }}
        onClick={(e) => e.stopPropagation()}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{ background: "conic-gradient(from 0deg, transparent 65%, hsl(var(--primary) / 0.4) 75%, transparent 85%)" }} />

        <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.1 }}
          className="flex items-center justify-center w-20 h-20 rounded-full mx-auto mb-4"
          style={{ background: "hsl(var(--primary) / 0.15)", border: "2px solid hsl(var(--primary) / 0.35)" }}>
          <span style={{ fontSize: 40 }}>🌲</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Sessão Concluída!
          </p>
          <h2 className="text-2xl font-black text-foreground mb-1">Árvore Plantada! 🌲</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Parabéns. Uma nova árvore foi plantada.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="flex gap-3 justify-center mb-5">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
            style={{ background: "linear-gradient(135deg, #C10801 0%, #F16001 50%, #EB5002 100%)", boxShadow: "0 0 20px hsl(var(--primary) / 0.4)" }}>
            <Zap className="w-4 h-4 text-white" />
            <span className="text-white font-black">+15 XP</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
            style={{ background: "linear-gradient(135deg, #C10801 0%, #F16001 50%, #EB5002 100%)", boxShadow: "0 0 20px hsl(var(--primary) / 0.4)" }}>
            <Coins className="w-4 h-4 text-white" />
            <span className="text-white font-black">+5 moedas</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="flex gap-3 justify-center mb-6">
          {[
            { label: "Duração", value: `${duration}m`, icon: "⏱️" },
            { label: "Árvores no total", value: `${treesTotal}`, icon: "🌲" },
          ].map((s) => (
            <div key={s.label} className="flex-1 rounded-xl p-3" style={{ background: "hsl(var(--muted))" }}>
              <div className="text-base mb-0.5">{s.icon}</div>
              <div className="text-lg font-black text-foreground">{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </motion.div>

        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onClose}
          className="w-full py-3 rounded-xl font-semibold text-sm"
          style={{ background: "linear-gradient(135deg, #C10801 0%, #F16001 50%, #EB5002 100%)", color: "white", boxShadow: "0 4px 16px hsl(var(--primary) / 0.45)" }}>
          Ver Minha Floresta 🌳
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ── Interrupted Modal ─────────────────────────────────────────────────────────
function InterruptedModal({
  open, onClose, realSecs, targetMins, accumulatedSecs, reason,
}: {
  open: boolean; onClose: () => void; realSecs: number; targetMins: number;
  accumulatedSecs: number; reason?: FailureReason;
}) {
  const targetSecs = targetMins * 60;
  const isLeftApp = reason === "left_app" || reason === "page_close";

  if (!open) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/65 backdrop-blur-md"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.7, y: 40, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="relative overflow-hidden rounded-3xl p-8 mx-4 max-w-sm w-full text-center"
        style={{
          background: "hsl(var(--card))",
          border: `1px solid ${isLeftApp ? "rgba(235,80,2,0.4)" : "rgba(100,100,100,0.3)"}`,
          boxShadow: isLeftApp ? "0 0 48px rgba(235,80,2,0.2)" : "0 0 40px rgba(100,100,100,0.1)",
        }}
        onClick={(e) => e.stopPropagation()}>

        {isLeftApp && (
          <motion.div className="absolute inset-0 pointer-events-none rounded-3xl"
            animate={{ opacity: [0, 0.12, 0] }}
            transition={{ duration: 2, repeat: 2, ease: "easeInOut" }}
            style={{ background: "radial-gradient(circle at center, hsl(var(--primary) / 0.3) 0%, transparent 70%)" }} />
        )}

        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 16, delay: 0.1 }}
          style={{ fontSize: 60, display: "block", marginBottom: 16 }}>
          {isLeftApp ? "🥀" : "🪨"}
        </motion.span>

        <h2 className="text-xl font-black text-foreground mb-1">
          {isLeftApp ? "Você saiu do aplicativo" : "Sessão interrompida"}
        </h2>
        <p className="text-muted-foreground text-sm mb-5">
          {isLeftApp
            ? "Você saiu do aplicativo durante o foco. A árvore morreu."
            : "Sessão interrompida. Continue tentando."}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { label: "Tempo real focado", value: formatFocusTime(realSecs), icon: "⏱️", color: "hsl(var(--primary))" },
            { label: "Meta da sessão", value: `${targetMins}m`, icon: "🎯", color: "hsl(var(--primary))" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-3" style={{ background: "hsl(var(--muted))" }}>
              <div className="text-lg mb-0.5">{s.icon}</div>
              <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Accumulated progress */}
        {!isLeftApp && (
          <div className="mb-5 text-left rounded-xl p-3" style={{ background: "hsl(var(--muted))" }}>
            <div className="flex justify-between text-xs font-semibold text-foreground mb-2">
              <span>⏳ Foco acumulado</span>
              <span>{formatFocusTime(accumulatedSecs)} / {targetMins}m</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--background))" }}>
              <motion.div className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #C10801, #EB5002)" }}
                initial={{ width: "0%" }}
                animate={{ width: `${Math.min((accumulatedSecs / targetSecs) * 100, 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Continue focando para completar {targetMins}m e plantar uma árvore.
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs mb-5"
          style={{
            background: isLeftApp ? "hsl(var(--primary) / 0.08)" : "hsl(var(--primary) / 0.08)",
            border: `1px solid ${isLeftApp ? "hsl(var(--primary) / 0.25)" : "hsl(var(--primary) / 0.2)"}`,
            color: isLeftApp ? "hsl(var(--primary))" : "hsl(var(--primary))",
          }}>
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            {isLeftApp
              ? <>Árvore plantada: <strong>NÃO</strong> · Você saiu durante o foco</>
              : <>Sessão concluída: <strong>NÃO</strong> · Árvore plantada: <strong>NÃO</strong></>}
          </span>
        </div>

        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onClose}
          className="w-full py-3 rounded-xl font-semibold text-sm"
          style={{ background: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}>
          {isLeftApp ? "Entendido" : "Tentar Novamente"}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ── Reset Progress Modal ──────────────────────────────────────────────────────
function ResetProgressModal({
  open, onClose, onConfirm,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.82, y: 32, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="relative overflow-hidden rounded-3xl p-8 mx-4 max-w-sm w-full text-center"
        style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--primary) / 0.35)",
          boxShadow: "0 0 48px hsl(var(--primary) / 0.18), 0 24px 48px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}>

        {/* Icon */}
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.08 }}
          className="flex items-center justify-center w-16 h-16 rounded-2xl mx-auto mb-5"
          style={{ background: "hsl(var(--primary) / 0.12)", border: "1.5px solid hsl(var(--primary) / 0.3)" }}>
          <Trash2 className="w-7 h-7" style={{ color: "hsl(var(--primary))" }} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <h2 className="text-lg font-black text-foreground mb-2">
            Tem certeza que deseja zerar sua floresta?
          </h2>
          <p className="text-sm text-muted-foreground mb-4 text-left">
            Isso apagará todo o progresso do Focus Tree, incluindo:
          </p>

          <div className="text-left rounded-xl px-4 py-3 mb-5 space-y-1.5"
            style={{ background: "hsl(var(--primary) / 0.07)", border: "1px solid hsl(var(--primary) / 0.18)" }}>
            {[
              "Árvores plantadas",
              "Tempo de foco acumulado",
              "Histórico de sessões",
              "Relatórios de foco",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-xs" style={{ color: "hsl(var(--primary))" }}>
                <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: "hsl(var(--primary))" }} />
                {item}
              </div>
            ))}
          </div>

          <p className="text-xs font-semibold mb-6" style={{ color: "hsl(var(--primary))" }}>
            ⚠️ Essa ação não pode ser desfeita.
          </p>
        </motion.div>

        <div className="flex gap-3">
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose}
            className="flex-1 py-3 rounded-xl font-semibold text-sm"
            style={{ background: "hsl(var(--muted))", color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border))" }}>
            Cancelar
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onConfirm}
            className="flex-1 py-3 rounded-xl font-bold text-sm"
            style={{
              background: "linear-gradient(135deg, #C10801 0%, #F16001 50%, #EB5002 100%)",
              color: "white",
              boxShadow: "0 4px 16px hsl(var(--primary) / 0.4)",
            }}>
            Zerar Tudo
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Navigation Guard Modal ────────────────────────────────────────────────────
function NavigationGuardModal({
  open, onConfirm, onCancel,
}: {
  open: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9995] flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.82, y: 32, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="relative overflow-hidden rounded-3xl p-8 mx-4 max-w-sm w-full text-center"
        style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--primary) / 0.45)",
          boxShadow: "0 0 48px hsl(var(--primary) / 0.18), 0 24px 48px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pulsing glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-3xl"
          animate={{ opacity: [0, 0.1, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ background: "radial-gradient(circle at center, hsl(var(--primary) / 0.35) 0%, transparent 70%)" }}
        />

        {/* Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.08 }}
          className="flex items-center justify-center w-16 h-16 rounded-2xl mx-auto mb-5"
          style={{ background: "hsl(var(--primary) / 0.12)", border: "1.5px solid hsl(var(--primary) / 0.35)" }}
        >
          <span style={{ fontSize: 32 }}>🌱</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-lg font-black text-foreground mb-2">
            Você está saindo do modo de foco
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            Se você sair agora, perderá o foco e sua árvore morrerá.
          </p>

          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs mb-6"
            style={{
              background: "hsl(var(--primary) / 0.07)",
              border: "1px solid hsl(var(--primary) / 0.22)",
              color: "hsl(var(--primary))",
            }}>
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>A sessão será encerrada e a árvore não será plantada.</span>
          </div>
        </motion.div>

        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl font-semibold text-sm"
            style={{
              background: "hsl(var(--muted))",
              color: "hsl(var(--foreground))",
              border: "1px solid hsl(var(--border))",
            }}
          >
            Cancelar
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl font-bold text-sm"
            style={{
              background: "linear-gradient(135deg, #C10801 0%, #F16001 50%, #EB5002 100%)",
              color: "white",
              boxShadow: "0 4px 16px hsl(var(--primary) / 0.4)",
            }}
          >
            Sair e perder o foco
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Session Log ───────────────────────────────────────────────────────────────
function SessionLog({ sessions }: { sessions: SessionRecord[] }) {
  if (sessions.length === 0) return null;

  const statusConfig = {
    "concluída":    { emoji: "🌲", label: "Sessão concluída",   bg: "hsl(var(--primary) / 0.08)", border: "hsl(var(--primary) / 0.2)", color: "hsl(var(--primary))" },
    "interrompida": { emoji: "🪨", label: "Sessão interrompida", bg: "rgba(100,100,100,0.08)",  border: "rgba(100,100,100,0.2)",  color: "#646464" },
    "falhou":       { emoji: "🥀", label: "Árvore morreu",       bg: "hsl(var(--primary) / 0.08)",   border: "hsl(var(--primary) / 0.25)",  color: "hsl(var(--primary))" },
  };

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-bold text-foreground">Registro de Sessões</h3>
        <span className="ml-auto text-xs text-muted-foreground">{sessions.length} hoje</span>
      </div>
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
        {[...sessions].reverse().map((s, i) => {
          const cfg = statusConfig[s.status];
          return (
            <motion.div key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
              <span style={{ fontSize: 18 }}>{cfg.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground">{cfg.label}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Meta: {s.target}m · Tempo real: {formatFocusTime(s.real)}
                </div>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${cfg.color} / 0.15`, color: cfg.color,
                  backgroundColor: s.status === "concluída" ? "rgba(235,80,2,0.15)" : s.status === "falhou" ? "rgba(193,8,1,0.15)" : "rgba(100,100,100,0.15)" }}>
                {s.status}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FocusTree() {
  const { addXP, addFocusSession, currentUserId, focusSessionActive, setFocusSessionActive, pendingNavTarget, setPendingNavTarget } = useAppStore();
  const navigate = useNavigate();

  const [selectedDuration, setSelectedDuration] = useState(25);
  const [stage, setStage] = useState<TreeStage>("idle");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [focusState, setFocusState] = useState<FocusState>("IDLE");
  const isRunning = focusState === "FOCUSING";
  const [showComplete, setShowComplete] = useState(false);
  const [showInterrupted, setShowInterrupted] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showResetSuccess, setShowResetSuccess] = useState(false);
  const [forestTrees, setForestTrees] = useState<ForestTree[]>([]);
  const [loadingForest, setLoadingForest] = useState(true);

  // Accumulated focus seconds toward the next tree (carry-over from interrupted sessions)
  const [accumulatedSecs, setAccumulatedSecs] = useState(0);

  // Data for modals
  const [lastInterruptedReal, setLastInterruptedReal] = useState(0); // seconds
  const [failureReason, setFailureReason] = useState<FailureReason>("manual");

  // Today's session log
  const [sessionLog, setSessionLog] = useState<SessionRecord[]>([]);

  const { isMuted, toggleMute, startAmbient, stopAmbient } = useAmbientSound();

  // ── Timestamp-based timer refs ──────────────────────────────────────────────
  // Stores the absolute timestamp when the current session started
  const sessionStartTimestampRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tracks when the page became hidden (to compute real focused time on failure)
  const hiddenTimestampRef = useRef<number | null>(null);
  // Grace period timer: fires only if user stays away (app switch), not screen lock
  const leaveGraceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalDuration = selectedDuration * 60;
  const progress = totalDuration > 0 ? (totalDuration - timeLeft) / totalDuration : 0;

  const computeStage = useCallback((p: number): TreeStage => {
    if (p < 0.25) return "seed";
    if (p < 0.5)  return "sprout";
    if (p < 1)    return "young";
    return "complete";
  }, []);

  // ── localStorage helpers ──────────────────────────────────────────────────
  const LS_KEY = "focustree_active_session";
  const saveSessionToStorage = useCallback((startTs: number, targetSecs: number, duration: number) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ startTs, targetSecs, selectedDuration: duration }));
    } catch {}
  }, []);
  const clearSessionFromStorage = useCallback(() => {
    try { localStorage.removeItem(LS_KEY); } catch {}
  }, []);

  // ── Load forest from DB ───────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId) return;
    setLoadingForest(true);
    supabase
      .from("forest_trees" as never)
      .select("*")
      .eq("user_id", currentUserId)
      .order("completed_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setForestTrees(
            (data as Record<string, unknown>[]).map((r) => ({
              id: r.id as string,
              duration: r.duration as number,
              stage: "complete" as const,
              completedAt: r.completed_at as string,
              sessionDate: r.session_date as string,
            }))
          );
        }
        setLoadingForest(false);
      });
  }, [currentUserId]);

  // ── Internal helpers ───────────────────────────────────────────────────────
  // Returns exact elapsed seconds from the absolute start timestamp
  const getRealSecs = useCallback((): number => {
    if (sessionStartTimestampRef.current !== null) {
      return Math.floor((Date.now() - sessionStartTimestampRef.current) / 1000);
    }
    return 0;
  }, []);

  const plantTree = useCallback(async (durationMinutes: number) => {
    addFocusSession(durationMinutes);
    addXP(15);
    const today = new Date().toISOString().split("T")[0];
    const newTree: ForestTree = {
      id: crypto.randomUUID(),
      duration: durationMinutes,
      stage: "complete",
      completedAt: new Date().toISOString(),
      sessionDate: today,
    };
    setForestTrees((prev) => [newTree, ...prev]);
    if (currentUserId) {
      await supabase.from("forest_trees" as never).insert({
        id: newTree.id,
        user_id: currentUserId,
        duration: newTree.duration,
        stage: newTree.stage,
        completed_at: newTree.completedAt,
        session_date: newTree.sessionDate,
      } as never);
    }
  }, [addFocusSession, addXP, currentUserId]);

  const handleSessionComplete = useCallback(async (durationForTree?: number) => {
    // Guard: only complete if session is legitimately FOCUSING
    if (focusStateRef.current !== "FOCUSING") return;
    setFocusState("COMPLETED");
    const dur = durationForTree ?? selectedDuration;
    clearSessionFromStorage();
    sessionStartTimestampRef.current = null;
    await plantTree(dur);
    setAccumulatedSecs(0);
    setSessionLog((prev) => [...prev, {
      id: crypto.randomUUID(),
      target: dur,
      real: dur * 60,
      status: "concluída",
      date: new Date().toISOString(),
    }]);
    stopAmbient();
    setTimeout(() => setShowComplete(true), 400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDuration, clearSessionFromStorage, plantTree, stopAmbient]);

  const handleCancelInternal = useCallback((realSecs: number, reason: FailureReason = "manual") => {
    clearSessionFromStorage();
    sessionStartTimestampRef.current = null;
    const isLeftApp = reason === "left_app" || reason === "page_close";
    setFocusState(isLeftApp ? "FAILED" : "IDLE");
    const newAccumulatedSecs = isLeftApp ? accumulatedSecs : accumulatedSecs + realSecs;
    setLastInterruptedReal(realSecs);
    setFailureReason(reason);
    setSessionLog((prev) => [...prev, {
      id: crypto.randomUUID(),
      target: selectedDuration,
      real: realSecs,
      status: isLeftApp ? "falhou" : "interrompida",
      date: new Date().toISOString(),
    }]);
    setAccumulatedSecs(newAccumulatedSecs);
    setStage(isLeftApp ? "dead" : "interrupted");
    setShowInterrupted(true);
    stopAmbient();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accumulatedSecs, selectedDuration, clearSessionFromStorage, stopAmbient]);

  // Always-fresh refs to avoid stale closures inside the visibilitychange effect
  const handleCancelInternalRef = useRef(handleCancelInternal);
  const handleSessionCompleteRef = useRef(handleSessionComplete);
  // focusStateRef mirrors focusState so event listeners always read the latest value
  const focusStateRef = useRef<FocusState>("IDLE");
  useEffect(() => {
    handleCancelInternalRef.current = handleCancelInternal;
    handleSessionCompleteRef.current = handleSessionComplete;
    focusStateRef.current = focusState;
  });

  // ── Mount effect — restore session from localStorage ──────────────────────
  useEffect(() => {
    try {
      // Check if session was interrupted by a page exit (hard close / refresh)
      const interrupted = localStorage.getItem("focustree_interrupted_on_exit");
      if (interrupted) {
        localStorage.removeItem("focustree_interrupted_on_exit");
        const { realSecs, target, reason: storedReason } = JSON.parse(interrupted) as { realSecs: number; target: number; date: string; reason?: FailureReason };
        const reason: FailureReason = storedReason ?? "page_close";
        const isLeftApp = reason === "left_app" || reason === "page_close";
        setSelectedDuration(target);
        setTimeLeft(target * 60);
        setStage(isLeftApp ? "dead" : "interrupted");
        setLastInterruptedReal(realSecs);
        setFailureReason(reason);
        if (!isLeftApp) setAccumulatedSecs((prev) => prev + realSecs);
        setSessionLog((prev) => [...prev, {
          id: crypto.randomUUID(),
          target,
          real: realSecs,
          status: isLeftApp ? "falhou" : "interrompida",
          date: new Date().toISOString(),
        }]);
        setTimeout(() => setShowInterrupted(true), 300);
        return;
      }

      // Restore active session — recalculate elapsed so screen-lock / background is handled
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { startTs: number; targetSecs: number; selectedDuration: number };
        const elapsed = Math.floor((Date.now() - saved.startTs) / 1000);
        if (elapsed >= saved.targetSecs) {
          // Session completed while screen was off → auto-complete
          clearSessionFromStorage();
          setSelectedDuration(saved.selectedDuration);
          setTimeLeft(0);
          setStage("complete");
          sessionStartTimestampRef.current = saved.startTs;
          handleSessionComplete();
        } else {
          // Resume in-progress session
          const remaining = saved.targetSecs - elapsed;
          sessionStartTimestampRef.current = saved.startTs;
          setSelectedDuration(saved.selectedDuration);
          setTimeLeft(remaining);
          setStage(computeStage(elapsed / saved.targetSecs));
          setFocusState("FOCUSING");
        }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Timer tick — timestamp-based, survives screen off ────────────────────
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      if (sessionStartTimestampRef.current === null) return;
      const elapsed = Math.floor((Date.now() - sessionStartTimestampRef.current) / 1000);
      const newTimeLeft = Math.max(0, totalDuration - elapsed);
      if (newTimeLeft <= 0) {
        clearInterval(intervalRef.current!);
        setStage("complete");
        setTimeLeft(0);
        handleSessionCompleteRef.current();
      } else {
        setTimeLeft(newTimeLeft);
        setStage(computeStage(elapsed / totalDuration));
      }
    }, 500); // 500ms tick gives smooth display without excessive CPU
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, totalDuration, computeStage]);

  // ── Sync focusState → store focusSessionActive (drives Sidebar guard) ────
  useEffect(() => {
    setFocusSessionActive(focusState === "FOCUSING");
    return () => { if (focusState === "FOCUSING") setFocusSessionActive(false); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusState]);

  // ── Visibility change — grace period para distinguir tela desligada de saída ──
  // REGRAS:
  //   • hidden → inicia contador de 15 s. Tela desligada = usuário volta rápido.
  //     Se ainda oculto após 15 s → assume saída do app → falha.
  //   • visible (dentro dos 15 s) → cancela o contador, ressincroniza pelo
  //     timestamp absoluto.
  //     - Tempo já esgotado (sessão completada durante screen-off) → completa ✅
  //     - Tempo restante → continua de onde parou ✅
  //   • beforeunload / pagehide tratam fechamento/navegação imediatos (abaixo).
  //
  // LIMITAÇÃO DO NAVEGADOR: APIs web não distinguem bloqueio de tela de troca de
  // app — ambos disparam visibilitychange:hidden. O período de graça de 15 s é o
  // melhor compromisso possível: bloqueios rápidos sobrevivem, saídas prolongadas
  // falham.
  const LEAVE_GRACE_MS = 15_000; // 15 segundos de tolerância

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        // Guard: só age se houver sessão ativa
        if (focusStateRef.current !== "FOCUSING") return;
        hiddenTimestampRef.current = Date.now();

        // Inicia o contador de graça — se o usuário não retornar a tempo, falha
        if (leaveGraceRef.current) clearTimeout(leaveGraceRef.current);
        leaveGraceRef.current = setTimeout(() => {
          // Ainda oculto após o período de graça → saiu do app → falha
          if (focusStateRef.current !== "FOCUSING") return;
          clearInterval(intervalRef.current!);
          setFocusState("FAILED");
          const startTs = sessionStartTimestampRef.current;
          const hiddenAt = hiddenTimestampRef.current ?? Date.now();
          const realSecs = startTs !== null ? Math.max(0, Math.floor((hiddenAt - startTs) / 1000)) : 0;
          handleCancelInternalRef.current(realSecs, "left_app");
        }, LEAVE_GRACE_MS);

      } else {
        // Retornou ao foreground dentro do período de graça — cancela a falha
        if (leaveGraceRef.current) {
          clearTimeout(leaveGraceRef.current);
          leaveGraceRef.current = null;
        }
        hiddenTimestampRef.current = null;

        // Ressincroniza o display com base no timestamp real (screen-off survived)
        if (focusStateRef.current === "FOCUSING" && sessionStartTimestampRef.current !== null) {
          const elapsed = Math.floor((Date.now() - sessionStartTimestampRef.current) / 1000);
          const newTimeLeft = Math.max(0, totalDuration - elapsed);
          if (newTimeLeft <= 0) {
            clearInterval(intervalRef.current!);
            setStage("complete");
            setTimeLeft(0);
            handleSessionCompleteRef.current();
          } else {
            setTimeLeft(newTimeLeft);
          }
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (leaveGraceRef.current) clearTimeout(leaveGraceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalDuration]);

  // ── beforeunload + pagehide — guards for page close ──────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isRunning) return;
      const realSecs = getRealSecs();
      clearSessionFromStorage();
      sessionStartTimestampRef.current = null;
      try {
        localStorage.setItem("focustree_interrupted_on_exit", JSON.stringify({
          realSecs,
          target: selectedDuration,
          reason: "page_close",
          date: new Date().toISOString(),
        }));
      } catch {}
      e.preventDefault();
      e.returnValue = "Você tem uma sessão de foco ativa. Sair irá interromper sua árvore.";
    };

    // pagehide fires on actual navigation/close
    const handlePageHide = (e: PageTransitionEvent) => {
      if (!isRunning) return;
      if (!e.persisted) {
        const realSecs = getRealSecs();
        try {
          localStorage.setItem("focustree_interrupted_on_exit", JSON.stringify({
            realSecs,
            target: selectedDuration,
            reason: "page_close",
            date: new Date().toISOString(),
          }));
        } catch {}
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, selectedDuration]);

  // ── Public handlers ────────────────────────────────────────────────────────
  const handleStart = () => {
    hiddenTimestampRef.current = null; // reset — nova sessão começa limpa
    if (leaveGraceRef.current) { clearTimeout(leaveGraceRef.current); leaveGraceRef.current = null; }
    const startTs = Date.now();
    const targetSecs = selectedDuration * 60;
    sessionStartTimestampRef.current = startTs;
    saveSessionToStorage(startTs, targetSecs, selectedDuration);
    setTimeLeft(targetSecs);
    setStage("seed");
    setFocusState("FOCUSING");
    startAmbient();
  };

  const handleCancel = () => {
    if (leaveGraceRef.current) { clearTimeout(leaveGraceRef.current); leaveGraceRef.current = null; }
    clearInterval(intervalRef.current!);
    setFocusState("IDLE");
    const realSecs = getRealSecs();
    handleCancelInternal(realSecs);
  };

  const handleReset = () => {
    clearSessionFromStorage();
    sessionStartTimestampRef.current = null;
    setStage("idle");
    setTimeLeft(selectedDuration * 60);
    setFocusState("IDLE");
    stopAmbient();
  };

  const handleResetAll = async () => {
    if (isRunning) {
      clearInterval(intervalRef.current!);
      stopAmbient();
      setFocusState("IDLE");
    }
    clearSessionFromStorage();
    sessionStartTimestampRef.current = null;
    if (currentUserId) {
      await supabase.from("forest_trees" as never).delete().eq("user_id", currentUserId as never);
    }
    setForestTrees([]);
    setAccumulatedSecs(0);
    setSessionLog([]);
    setStage("idle");
    setTimeLeft(selectedDuration * 60);
    setShowResetConfirm(false);
    setShowResetSuccess(true);
    setTimeout(() => setShowResetSuccess(false), 4000);
  };

  const handleDurationChange = (min: number) => {
    if (isRunning) return;
    setSelectedDuration(min);
    setTimeLeft(min * 60);
    setStage("idle");
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const treesToday = forestTrees.filter((t) => t.sessionDate === today);
  const totalTrees = forestTrees.length;

  // Real focus time in seconds = completed trees today (in secs) + accumulated carry-over secs
  const completedSecsToday = treesToday.reduce((sum, t) => sum + t.duration * 60, 0);
  const realFocusSecsToday = completedSecsToday + accumulatedSecs;

  const completedSessionsToday = sessionLog.filter((s) => s.status === "concluída" && s.date.startsWith(today)).length;
  const interruptedSessionsToday = sessionLog.filter((s) => s.status === "interrompida" && s.date.startsWith(today)).length;

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-foreground">Modo Foco</h2>
          <p className="text-sm text-muted-foreground">
            Sessões de foco cronometradas. O timer continua em segundo plano.
          </p>
        </div>
        {!isRunning && (
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition-all"
            style={{
              border: "1.5px solid hsl(var(--primary) / 0.45)",
              color: "hsl(var(--primary))",
              background: "hsl(var(--primary) / 0.06)",
            }}>
            <Trash2 className="w-3.5 h-3.5" />
            Zerar Progresso
          </motion.button>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Timer Card ── */}
        <div className="glass-card rounded-2xl p-6 premium-shadow shadow-2xl flex flex-col gap-6">
          {/* Duration selector */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              Duração da sessão
            </p>
            <div className="grid grid-cols-4 gap-2">
              {DURATIONS.map((d) => (
                <button key={d.value} onClick={() => handleDurationChange(d.value)} disabled={isRunning}
                  className={cn(
                    "flex flex-col items-center gap-1 py-3 px-2 rounded-xl text-xs font-semibold transition-all",
                    selectedDuration === d.value ? "text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    isRunning && "opacity-40 cursor-not-allowed"
                  )}
                  style={selectedDuration === d.value
                    ? { background: "hsl(var(--card))", border: "1px solid hsl(var(--primary) / 0.5)", boxShadow: "0 0 12px hsl(var(--primary) / 0.15)" }
                    : { background: "hsl(var(--muted))", border: "1px solid transparent" }}>
                  <span className="text-base">{d.icon}</span>
                  <span>{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tree visual */}
          <div className="flex flex-col items-center justify-center py-8 rounded-2xl relative overflow-hidden"
            style={{ background: "hsl(var(--muted) / 0.4)", minHeight: 240 }}>
            {isRunning && (
              <motion.div animate={{ opacity: [0.15, 0.4, 0.15] }} transition={{ duration: 4, repeat: Infinity }}
                className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(circle at center, hsl(var(--primary) / 0.12) 0%, transparent 70%)" }} />
            )}

            <AnimatePresence>
              {isRunning && (
                <motion.button key="mute-btn" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={toggleMute}
                  title={isMuted ? "Ativar sons da floresta" : "Silenciar sons da floresta"}
                  className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: isMuted ? "hsl(var(--muted))" : "hsl(var(--primary) / 0.15)",
                    border: `1px solid ${isMuted ? "hsl(var(--border))" : "hsl(var(--primary) / 0.4)"}`,
                    color: isMuted ? "hsl(var(--muted-foreground))" : "hsl(var(--primary))",
                    backdropFilter: "blur(8px)",
                  }}>
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  <span>{isMuted ? "Mudo" : "Sons"}</span>
                </motion.button>
              )}
            </AnimatePresence>

            <TreeVisual
              stage={stage}
              progress={progress}
              accumulatedSecs={accumulatedSecs}
              targetSecs={selectedDuration * 60}
            />

            {stage !== "idle" && stage !== "interrupted" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="mt-6 tabular-nums font-black text-4xl tracking-tight"
                style={{ color: isRunning ? STAGE_CONFIG[stage].color : "hsl(var(--muted-foreground))" }}>
                {pad(mins)}:{pad(secs)}
              </motion.div>
            )}

            {stage === "idle" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="mt-4 tabular-nums font-black text-3xl tracking-tight text-muted-foreground">
                {pad(selectedDuration)}:00
              </motion.div>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            {!isRunning && stage !== "interrupted" && (
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleStart}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #C10801 0%, #F16001 50%, #EB5002 100%)", color: "white", boxShadow: "0 4px 20px hsl(var(--primary) / 0.4)" }}>
                <Sprout className="w-4 h-4" />
              {stage === "idle" ? (accumulatedSecs > 0 ? "Continuar Foco" : "Plantar Árvore") : "Continuar"}
              </motion.button>
            )}

            {isRunning && (
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleCancel}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
                <XCircle className="w-4 h-4" />
                Abandonar sessão
              </motion.button>
            )}

            {stage === "interrupted" || stage === "dead" ? (
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleReset}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm"
                style={{ background: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}>
                {stage === "dead" ? "Começar nova sessão" : "Tentar novamente"}
              </motion.button>
            ) : null}
          </div>

          {/* Accumulated progress hint */}
          {!isRunning && accumulatedSecs > 0 && stage === "idle" && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
              style={{ background: "hsl(var(--primary) / 0.1)", border: "1px solid hsl(var(--primary) / 0.25)", color: "hsl(var(--primary))" }}>
              <span>⏳</span>
              <span className="font-medium">
                {formatFocusTime(accumulatedSecs)} acumulados de {selectedDuration}m para a próxima árvore
              </span>
            </motion.div>
          )}

          {/* Warning during session */}
          {isRunning && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
              style={{ background: "hsl(var(--primary) / 0.1)", border: "1px solid hsl(var(--primary) / 0.25)", color: "hsl(var(--primary))" }}>
              <span>🔒</span>
              <span className="font-medium">Tela bloqueada? O timer continua normalmente.</span>
              <span className="mx-1.5 opacity-40">|</span>
              <span className="font-medium" style={{ color: "hsl(var(--primary))" }}>⚠️ Trocar aba ou minimizar o app encerrará a sessão imediatamente.</span>
            </motion.div>
          )}

          {/* (DEV button removed) */}
        </div>

        {/* ── Stats + Forest ── */}
        <div className="flex flex-col gap-6">
          {/* Focus Report */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Tempo real focado hoje", value: formatFocusTime(realFocusSecsToday), icon: Clock, color: "hsl(var(--primary))" },
              { label: "Árvores plantadas", value: `${totalTrees}`, icon: TreePine, color: "hsl(var(--primary))" },
              { label: "Sessões concluídas", value: `${completedSessionsToday}`, icon: CheckCircle2, color: "hsl(var(--primary))" },
              { label: "Sessões interrompidas", value: `${interruptedSessionsToday}`, icon: XCircle, color: "#646464" },
            ].map((s) => (
              <div key={s.label} className="glass-card rounded-2xl p-4 flex flex-col items-center gap-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.color}20` }}>
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <span className="text-xl font-black text-foreground tabular-nums">{s.value}</span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Session Log */}
          <SessionLog sessions={sessionLog} />

          {/* Forest grid */}
          <div className="glass-card rounded-2xl p-5 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <TreePine className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
              <h3 className="text-sm font-bold text-foreground">Minha Floresta</h3>
              <span className="ml-auto text-xs text-muted-foreground">{totalTrees} árvores</span>
            </div>

            {loadingForest ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : forestTrees.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 gap-3">
                <span style={{ fontSize: 48 }}>🌱</span>
                <p className="text-sm text-muted-foreground text-center">
                  Sua floresta está vazia.<br />Complete uma sessão para plantar sua primeira árvore!
                </p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-7 gap-2 max-h-[280px] overflow-y-auto pr-1">
                <AnimatePresence>
                  {forestTrees.map((tree, i) => (
                    <motion.div key={tree.id}
                      initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.5), type: "spring", stiffness: 280, damping: 18 }}
                      title={`${tree.duration}min — ${tree.sessionDate}`}
                      className="flex items-center justify-center w-9 h-9 rounded-xl cursor-default select-none"
                      style={{ background: "hsl(var(--primary) / 0.1)", border: "1px solid hsl(var(--primary) / 0.2)", fontSize: 20 }}>
                      {getTreeEmoji(i)}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Weekly Heatmap */}
          <WeeklyHeatmap forestTrees={forestTrees} />

          {/* Monthly Calendar */}
          <MonthlyCalendar forestTrees={forestTrees} />
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showComplete && (
          <CompletionModal
            open={showComplete}
            onClose={() => { setShowComplete(false); handleReset(); }}
            duration={selectedDuration}
            treesTotal={totalTrees}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showInterrupted && (
          <InterruptedModal
            open={showInterrupted}
            onClose={() => { setShowInterrupted(false); handleReset(); }}
            realSecs={lastInterruptedReal}
            targetMins={selectedDuration}
            accumulatedSecs={accumulatedSecs}
            reason={failureReason}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showResetConfirm && (
          <ResetProgressModal
            open={showResetConfirm}
            onClose={() => setShowResetConfirm(false)}
            onConfirm={handleResetAll}
          />
        )}
      </AnimatePresence>

      {/* Navigation guard — shown when Sidebar sets a pendingNavTarget while session is running */}
      <AnimatePresence>
        {pendingNavTarget !== null && (
          <NavigationGuardModal
            open
            onConfirm={() => {
              clearInterval(intervalRef.current!);
              setFocusState("IDLE");
              setFocusSessionActive(false);
              const realSecs = getRealSecs();
              const target = pendingNavTarget;
              setPendingNavTarget(null);
              handleCancelInternal(realSecs, "left_app");
              setTimeout(() => navigate(target), 50);
            }}
            onCancel={() => setPendingNavTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* Reset success banner */}
      <AnimatePresence>
        {showResetSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="fixed bottom-6 left-1/2 z-[9991] -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm rounded-2xl px-5 py-4 text-center"
            style={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--primary) / 0.35)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 0 24px hsl(var(--primary) / 0.15)",
            }}>
            <p className="font-bold text-sm text-foreground mb-0.5">
              🌱 Floresta reiniciada.
            </p>
            <p className="text-xs text-muted-foreground">
              Grandes disciplinas começam com novos começos. Plante sua próxima árvore.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
