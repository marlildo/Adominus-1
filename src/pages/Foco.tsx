import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { Play, Pause, RotateCcw, Check, Zap, Trophy, Plus, X, Smartphone, TrendingUp, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { triggerConfetti } from "@/components/XPEffects";

const MODES = [
  { id: "pomodoro",   label: "Pomodoro",      duration: 25 * 60, icon: "🍅", color: "hsl(var(--primary))" },
  { id: "shortbreak", label: "Pausa Curta",   duration:  5 * 60, icon: "☕", color: "#EB5002" },
  { id: "longbreak",  label: "Pausa Longa",   duration: 15 * 60, icon: "🌿", color: "hsl(var(--muted-foreground))" },
  { id: "custom",     label: "Personalizado", duration:       0, icon: "⚙️", color: "#EB5002" },
];

const AMBIENT_SOUNDS = [
  { id: "none",   label: "Silêncio", icon: "🔇" },
  { id: "rain",   label: "Chuva",    icon: "🌧️" },
  { id: "forest", label: "Floresta", icon: "🌲" },
  { id: "ocean",  label: "Oceano",   icon: "🌊" },
  { id: "fire",   label: "Lareira",  icon: "🔥" },
];

function pad(n: number) { return String(n).padStart(2, "0"); }

/* ── Web Audio bell synthesizer ── */
function playBellSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, delay: number, dur: number, gain: number) => {
      const osc   = ctx.createOscillator();
      const gainN = ctx.createGain();
      osc.connect(gainN);
      gainN.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gainN.gain.setValueAtTime(0, ctx.currentTime + delay);
      gainN.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01);
      gainN.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + dur);
    };
    // Three ascending bell tones
    playTone(523.25, 0.0,  1.4, 0.35); // C5
    playTone(659.25, 0.25, 1.2, 0.28); // E5
    playTone(783.99, 0.5,  1.6, 0.32); // G5
    playTone(1046.5, 0.75, 1.8, 0.22); // C6
    setTimeout(() => ctx.close(), 3000);
  } catch (e) {
    console.warn("Bell sound unavailable:", e);
  }
}

/* ── Pulsing ring layers ── */
function PulseRings({ color, active }: { color: string; active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 1, opacity: 0.55 - i * 0.15 }}
              animate={{ scale: 1.18 + i * 0.14, opacity: 0 }}
              transition={{ duration: 1.8, delay: i * 0.55, repeat: Infinity, ease: "easeOut" }}
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ border: `${2.5 - i * 0.5}px solid ${color}`, boxShadow: `0 0 ${18 + i * 12}px ${color}60` }}
            />
          ))}
        </>
      )}
    </AnimatePresence>
  );
}

function TickFlash({ tick, color }: { tick: number; color: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tick}
        initial={{ opacity: 0.35 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle at center, ${color}22 0%, transparent 70%)` }}
      />
    </AnimatePresence>
  );
}

/* ── XP count-up animation ── */
function XPCountUp({ target, color }: { target: number; color: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 1200;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(2, -10 * p);
      setCount(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target]);
  return (
    <span className="tabular-nums font-black" style={{ color }}>
      +{count} XP
    </span>
  );
}

/* ── Session Complete Modal ── */
function SessionCompleteModal({
  open, onClose, duration, sessionCount, accentColor,
}: {
  open: boolean;
  onClose: () => void;
  duration: number;
  sessionCount: number;
  accentColor: string;
}) {
  // Trigger confetti bursts when modal opens
  useEffect(() => {
    if (!open) return;
    const shots = [
      { x: window.innerWidth * 0.25, y: window.innerHeight * 0.4 },
      { x: window.innerWidth * 0.5,  y: window.innerHeight * 0.35 },
      { x: window.innerWidth * 0.75, y: window.innerHeight * 0.4 },
    ];
    shots.forEach((s, i) => {
      setTimeout(() => triggerConfetti(s.x, s.y, accentColor), i * 180);
    });
    // Second wave
    setTimeout(() => {
      triggerConfetti(window.innerWidth * 0.35, window.innerHeight * 0.5, "#EB5002");
      triggerConfetti(window.innerWidth * 0.65, window.innerHeight * 0.5, "hsl(var(--muted-foreground))");
    }, 600);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/55 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.75, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.88, y: 10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="relative overflow-hidden rounded-3xl p-8 mx-4 max-w-sm w-full text-center"
            style={{
              background: "hsl(var(--card))",
              border: `1px solid ${accentColor}40`,
              boxShadow: `0 0 60px ${accentColor}35, 0 30px 60px rgba(0,0,0,0.45)`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated shimmer border */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{
                background: `conic-gradient(from 0deg, transparent 65%, ${accentColor}55 75%, transparent 85%)`,
              }}
            />

            {/* Trophy icon */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.1 }}
              className="flex items-center justify-center w-20 h-20 rounded-full mx-auto mb-4 relative"
              style={{ background: `${accentColor}20`, border: `2px solid ${accentColor}40` }}
            >
              {/* Glow pulse behind icon */}
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full"
                style={{ background: `radial-gradient(circle, ${accentColor}40, transparent 70%)` }}
              />
              <motion.span
                animate={{ rotate: [0, 8, -8, 0] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                style={{ fontSize: 36 }}
              >
                🏆
              </motion.span>
            </motion.div>

            {/* Texts */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                Sessão Concluída!
              </p>
              <h2 className="text-2xl font-black text-foreground mb-1">
                Missão Cumprida ⚔️
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                {duration} min de foco puro. Continue assim, Guerreiro!
              </p>
            </motion.div>

            {/* XP Badge */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 350, damping: 16, delay: 0.35 }}
              className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl mb-5"
              style={{
                background: "hsl(var(--primary))",
                boxShadow: "0 0 24px rgba(232,80,2,0.55), 0 6px 16px rgba(0,0,0,0.25)",
              }}
            >
              <motion.span
                animate={{ rotate: [0, 20, -20, 0] }}
                transition={{ duration: 0.6, delay: 0.5 }}
                style={{ fontSize: 20 }}
              >
                ⭐
              </motion.span>
              <span className="text-white text-lg font-black">
                <XPCountUp target={15} color="white" />
              </span>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="flex gap-3 justify-center mb-6"
            >
              {[
                { label: "Duração", value: `${duration}m`, icon: "⏱️" },
                { label: "Sessões hoje", value: `${sessionCount}`, icon: "🍅" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex-1 rounded-xl p-3"
                  style={{ background: "hsl(var(--muted))" }}
                >
                  <div className="text-base mb-0.5">{s.icon}</div>
                  <div className="text-lg font-black text-foreground">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </motion.div>

            {/* CTA Button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={onClose}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`,
                boxShadow: `0 4px 16px ${accentColor}55`,
              }}
            >
              Continuar Jornada 🚀
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Foco() {
  const { addFocusSession, focusSessions, screenTimeEntries, addScreenTimeEntry, deleteScreenTimeEntry } = useAppStore();
  const [mode, setMode]                   = useState("pomodoro");
  const [customMinutes, setCustomMinutes] = useState(30);
  const [isRunning, setIsRunning]         = useState(false);
  const [timeLeft, setTimeLeft]           = useState(25 * 60);
  const [ambientSound, setAmbientSound]   = useState("none");
  const [sessionsToday, setSessionsToday] = useState(0);
  const [tick, setTick]                   = useState(0);
  const [showComplete, setShowComplete]   = useState(false);
  const [lastDuration, setLastDuration]   = useState(25);
  const [showAddApp, setShowAddApp]       = useState(false);
  const [newAppName, setNewAppName]       = useState("");
  const [newAppMinutes, setNewAppMinutes] = useState(30);
  const [selectedAppPreset, setSelectedAppPreset] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentMode   = MODES.find((m) => m.id === mode)!;
  const accentColor   = currentMode.color;
  const totalDuration = mode === "custom" ? customMinutes * 60 : currentMode.duration;
  const progress      = totalDuration > 0 ? (totalDuration - timeLeft) / totalDuration : 0;
  const R             = 88;
  const circumference = 2 * Math.PI * R;
  const isFocus       = mode !== "shortbreak" && mode !== "longbreak";

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSessionsToday(focusSessions.filter((s) => s.completedAt.startsWith(today)).length);
  }, [focusSessions]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            if (isFocus) {
              const mins = Math.round(totalDuration / 60);
              setLastDuration(mins);
              addFocusSession(mins);
              // Bell + modal with slight delay for bell to register
              playBellSound();
              setTimeout(() => setShowComplete(true), 400);
            }
            return 0;
          }
          setTick((v) => v + 1);
          return t - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, isFocus, totalDuration]);

  const handleModeChange = (m: string) => {
    setMode(m);
    setIsRunning(false);
    const dur = MODES.find((x) => x.id === m)?.duration ?? customMinutes * 60;
    setTimeLeft(m === "custom" ? customMinutes * 60 : dur);
  };

  const reset = () => { setIsRunning(false); setTimeLeft(totalDuration); };

  const today = new Date().toISOString().split("T")[0];

  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const label = ["D","S","T","Q","Q","S","S"][d.getDay()];
    const focusMins = focusSessions.filter((s) => s.completedAt.startsWith(dateStr)).reduce((acc, s) => acc + s.duration, 0);
    const distractionMins = screenTimeEntries.filter((e) => e.date === dateStr).reduce((acc, e) => acc + e.minutes, 0);
    return { label, "Foco (min)": focusMins, "Distrações (min)": distractionMins };
  });

  const todayScreenTime = screenTimeEntries.filter(e => e.date === today);
  const todayDistractionMins = todayScreenTime.reduce((acc, e) => acc + e.minutes, 0);
  const todayFocusMins = focusSessions.filter(s => s.completedAt.startsWith(today)).reduce((acc, s) => acc + s.duration, 0);
  const potentialXP = Math.round(todayDistractionMins / 25) * 15;

  const APP_PRESETS = [
    { name: "Instagram", icon: "📸" },
    { name: "TikTok", icon: "🎵" },
    { name: "YouTube", icon: "▶️" },
    { name: "Twitter/X", icon: "🐦" },
    { name: "WhatsApp", icon: "💬" },
    { name: "Netflix", icon: "🎬" },
    { name: "Facebook", icon: "👥" },
    { name: "Outro", icon: "📱" },
  ];

  const handleAddScreenTime = () => {
    const name = selectedAppPreset && selectedAppPreset !== "Outro" ? selectedAppPreset : newAppName.trim();
    if (!name || newAppMinutes <= 0) return;
    addScreenTimeEntry({ app: name, minutes: newAppMinutes, date: today });
    setNewAppName("");
    setNewAppMinutes(30);
    setSelectedAppPreset("");
    setShowAddApp(false);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* ── Screen Time Dashboard ── */}
      <div>
        <h2 className="text-xl font-black text-foreground">Tempo de Tela</h2>
        <p className="text-sm text-muted-foreground">
          {sessionsToday} sessões de foco hoje · {focusSessions.length} no total
        </p>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Foco Hoje", value: todayFocusMins >= 60 ? `${Math.floor(todayFocusMins/60)}h ${todayFocusMins%60}m` : `${todayFocusMins}m`, icon: "🎯", color: "#EB5002" },
          { label: "Distração Hoje", value: todayDistractionMins >= 60 ? `${Math.floor(todayDistractionMins/60)}h ${todayDistractionMins%60}m` : `${todayDistractionMins}m`, icon: "📱", color: "hsl(var(--primary))" },
          { label: "XP Potencial", value: `+${potentialXP}`, icon: "⚡", color: "#EB5002" },
        ].map((s) => (
          <div key={s.label} className="glass-card rounded-2xl p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-lg font-black text-foreground tabular-nums">{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Insight message */}
      {todayDistractionMins > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-4 border border-accent/20"
          style={{ background: "hsl(var(--accent) / 0.05)" }}
        >
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Insight de Produtividade</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Você passou <span className="text-foreground font-medium">{todayDistractionMins >= 60 ? `${Math.floor(todayDistractionMins/60)}h ${todayDistractionMins%60}min` : `${todayDistractionMins}min`}</span> em apps distrativos hoje.
                {" "}{potentialXP > 0 && <>Se focasse esse tempo, ganharia <span className="text-accent font-bold">+{potentialXP} XP</span>.</>}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── App Usage Tracker ── */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-bold text-foreground">Uso de Apps Hoje</h3>
            <button
              onClick={() => setShowAddApp(!showAddApp)}
              className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-3 h-3" /> Registrar
            </button>
          </div>

          {/* Add form */}
          <AnimatePresence>
            {showAddApp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-muted/30 rounded-xl p-4 space-y-3 border border-border/50">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Selecionar app:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {APP_PRESETS.map(a => (
                        <button
                          key={a.name}
                          onClick={() => setSelectedAppPreset(a.name)}
                          className={cn(
                            "px-2.5 py-1.5 rounded-lg text-xs transition-all",
                            selectedAppPreset === a.name
                              ? "bg-primary/20 text-primary border border-primary/30"
                              : "bg-muted text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {a.icon} {a.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  {(selectedAppPreset === "Outro" || !selectedAppPreset) && (
                    <input
                      type="text"
                      placeholder="Nome do app..."
                      value={newAppName}
                      onChange={e => setNewAppName(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Tempo usado:</label>
                    <input
                      type="number" min={1} max={720} value={newAppMinutes}
                      onChange={e => setNewAppMinutes(+e.target.value)}
                      className="w-16 bg-background border border-border rounded-lg px-2 py-1 text-sm text-center font-bold focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                    <button
                      onClick={handleAddScreenTime}
                      className="ml-auto px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* App list */}
          {todayScreenTime.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">📱</p>
              <p className="text-sm text-muted-foreground">Nenhum app registrado hoje.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Registre seu uso para insights de produtividade.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...todayScreenTime].sort((a, b) => b.minutes - a.minutes).map((entry) => {
                const maxMins = Math.max(...todayScreenTime.map(e => e.minutes));
                const pct = Math.round((entry.minutes / maxMins) * 100);
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-sm flex-shrink-0">
                      {APP_PRESETS.find(a => a.name === entry.app)?.icon ?? "📱"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground">{entry.app}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {entry.minutes >= 60 ? `${Math.floor(entry.minutes/60)}h ${entry.minutes%60}m` : `${entry.minutes}m`}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ background: "hsl(var(--primary))" }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => deleteScreenTimeEntry(entry.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Timer Card ── */}
        <div className="glass-card rounded-2xl p-6 premium-shadow shadow-2xl">
          {/* Mode selector */}
          <div className="flex gap-1.5 p-1 bg-muted rounded-xl mb-6 flex-wrap">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => handleModeChange(m.id)}
                className={cn(
                  "flex-1 text-xs font-medium py-2 px-2 rounded-lg transition-all min-w-0",
                  mode === m.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="hidden sm:inline">{m.icon} </span>{m.label}
              </button>
            ))}
          </div>

          {mode === "custom" && (
            <div className="mb-4 flex items-center gap-3">
              <label className="text-sm text-muted-foreground">Duração:</label>
              <input
                type="number" min={1} max={120} value={customMinutes}
                onChange={(e) => { const v = +e.target.value; setCustomMinutes(v); setTimeLeft(v * 60); }}
                className="w-16 bg-muted rounded-lg px-2 py-1 text-center text-sm font-bold border border-border"
              />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          )}

          {/* ── Circular Timer ── */}
          <div className="flex flex-col items-center gap-6">
            <div className="relative" style={{ width: 200, height: 200 }}>
              <AnimatePresence>
                {isRunning && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{ boxShadow: `0 0 40px ${accentColor}45, 0 0 80px ${accentColor}20` }}
                  />
                )}
              </AnimatePresence>

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative" style={{ width: 196, height: 196 }}>
                  <PulseRings color={accentColor} active={isRunning} />
                </div>
              </div>

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative" style={{ width: 176, height: 176 }}>
                  <TickFlash tick={tick} color={accentColor} />
                </div>
              </div>

              <svg width="200" height="200" className="-rotate-90 absolute inset-0">
                <circle cx="100" cy="100" r={R} stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
                <motion.circle
                  cx="100" cy="100" r={R}
                  stroke={accentColor}
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - circumference * progress}
                  style={{ filter: isRunning ? `drop-shadow(0 0 6px ${accentColor}90)` : "none" }}
                  transition={{ duration: 1, ease: "linear" }}
                />
                {isRunning && progress > 0 && (
                  <motion.circle
                    cx={100 + R * Math.cos(-Math.PI / 2 + 2 * Math.PI * progress)}
                    cy={100 + R * Math.sin(-Math.PI / 2 + 2 * Math.PI * progress)}
                    r="5"
                    fill={accentColor}
                    style={{ filter: `drop-shadow(0 0 5px ${accentColor})` }}
                    transition={{ duration: 1, ease: "linear" }}
                  />
                )}
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                  key={timeLeft}
                  initial={{ scale: isRunning ? 1.06 : 1 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="text-4xl font-black tabular-nums"
                  style={{ color: isRunning ? accentColor : "hsl(var(--foreground))" }}
                >
                  {pad(Math.floor(timeLeft / 60))}:{pad(timeLeft % 60)}
                </motion.span>
                <motion.span
                  className="text-xs text-muted-foreground mt-1"
                  animate={{ opacity: isRunning ? [1, 0.5, 1] : 1 }}
                  transition={{ duration: 2, repeat: isRunning ? Infinity : 0 }}
                >
                  {currentMode.icon} {currentMode.label}
                </motion.span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={reset}
                className="w-11 h-11 rounded-full bg-muted flex items-center justify-center"
              >
                <RotateCcw className="w-4 h-4 text-muted-foreground" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
                onClick={() => setIsRunning(!isRunning)}
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                  boxShadow: isRunning
                    ? `0 0 24px ${accentColor}80, 0 4px 16px rgba(0,0,0,0.3)`
                    : `0 4px 16px rgba(0,0,0,0.2)`,
                  transition: "box-shadow 0.4s ease",
                }}
              >
                <AnimatePresence mode="wait">
                  {isRunning ? (
                    <motion.div key="pause" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.15 }}>
                      <Pause className="w-6 h-6 text-white" />
                    </motion.div>
                  ) : (
                    <motion.div key="play" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.15 }}>
                      <Play className="w-6 h-6 text-white ml-0.5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (isRunning) {
                    const mins = Math.round((totalDuration - timeLeft) / 60);
                    if (mins > 0) {
                      setLastDuration(mins);
                      addFocusSession(mins);
                      playBellSound();
                      setTimeout(() => setShowComplete(true), 400);
                    }
                    reset();
                  }
                }}
                className="w-11 h-11 rounded-full bg-[#EB5002]/20 flex items-center justify-center"
              >
                <Check className="w-4 h-4 text-[#EB5002]" />
              </motion.button>
            </div>

            {/* Running status pill */}
            <AnimatePresence>
              {isRunning && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold"
                  style={{
                    background: `${accentColor}18`,
                    border: `1px solid ${accentColor}40`,
                    color: accentColor,
                  }}
                >
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: accentColor }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  Sessão em andamento
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Ambient Sounds */}
          <div className="mt-6">
            <p className="text-xs text-muted-foreground mb-2">Sons Ambiente</p>
            <div className="flex gap-1.5 flex-wrap">
              {AMBIENT_SOUNDS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setAmbientSound(s.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all",
                    ambientSound === s.id
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="space-y-4 shadow-2xl">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Hoje",  value: sessionsToday,                                                              icon: "🍅" },
              { label: "Total", value: focusSessions.length,                                                       icon: "⚡" },
              { label: "Horas", value: Math.round(focusSessions.reduce((s, f) => s + f.duration, 0) / 60),        icon: "⏱️" },
            ].map((s) => (
              <div key={s.label} className="glass-card rounded-2xl p-4 premium-shadow text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-xl font-black text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="glass-card rounded-2xl p-5 premium-shadow">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-bold text-foreground">Foco vs Distrações — Semana</h3>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={weeklyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                  formatter={(val: number, name: string) => [`${val}m`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }} />
                <Bar dataKey="Foco (min)" fill="#EB5002" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Distrações (min)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-2xl p-4 premium-shadow border border-accent/20 bg-accent/5">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Dica do Guerreiro</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete uma sessão Pomodoro e ganhe +15 XP. Foco total gera resultados extraordinários.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Session Complete Modal ── */}
      <SessionCompleteModal
        open={showComplete}
        onClose={() => { setShowComplete(false); reset(); }}
        duration={lastDuration}
        sessionCount={sessionsToday + 1}
        accentColor={accentColor}
      />
    </div>
  );
}
