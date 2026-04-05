import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import {
  ScreenTimePlugin,
  msToHumanTime,
  msToHours,
  type AppUsageInfo,
  type UsageStatsResult,
  type WeeklyStatsResult,
} from "@/plugins/ScreenTimePlugin";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Shield, Smartphone, Lock, Unlock, TrendingUp, AlertCircle, Clock, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ── App icon map ──────────────────────────────────────────────────────────────
const APP_ICONS: Record<string, string> = {
  Instagram:    "📸",
  YouTube:      "▶️",
  WhatsApp:     "💬",
  TikTok:       "🎵",
  Facebook:     "👥",
  "Twitter / X":"🐦",
  Netflix:      "🎬",
  Spotify:      "🎧",
  Telegram:     "✈️",
  default:      "📱",
};

function appIcon(name: string) {
  return APP_ICONS[name] ?? APP_ICONS.default;
}

// ── Circular progress ─────────────────────────────────────────────────────────
function CircularProgress({
  value, max, size = 140, stroke = 10, color = "hsl(var(--primary))",
  children,
}: {
  value: number; max: number; size?: number; stroke?: number;
  color?: string; children?: React.ReactNode;
}) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circ * (1 - pct);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        {children}
      </div>
    </div>
  );
}

// ── Permission gate ───────────────────────────────────────────────────────────
function PermissionGate({ onGranted }: { onGranted: () => void }) {
  const [requesting, setRequesting] = useState(false);

  const handleRequest = async () => {
    setRequesting(true);
    await ScreenTimePlugin.requestPermission();
    // Check again after a short delay
    setTimeout(async () => {
      const { granted } = await ScreenTimePlugin.checkPermission();
      if (granted) onGranted();
      setRequesting(false);
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center"
    >
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{ background: "hsl(var(--primary) / 0.12)", border: "1px solid hsl(var(--primary) / 0.3)" }}
      >
        <Smartphone className="w-10 h-10" style={{ color: "hsl(var(--primary))" }} />
      </div>

      <h2 className="text-2xl font-black text-foreground mb-3">Permissão Necessária</h2>
      <p className="text-muted-foreground text-sm max-w-sm leading-relaxed mb-6">
        O Adominus precisa acessar o uso de aplicativos para analisar seu tempo de
        tela e ajudar você a manter o foco.
      </p>

      {/* Permission cards */}
      <div className="w-full max-w-sm space-y-3 mb-8">
        {[
          {
            icon: "📊",
            title: "PACKAGE_USAGE_STATS",
            desc: "Lê quanto tempo você passa em cada app para gerar relatórios de uso.",
          },
          {
            icon: "♿",
            title: "BIND_ACCESSIBILITY_SERVICE",
            desc: "Detecta quando um app bloqueado é aberto e exibe o overlay do Modo Disciplina.",
          },
        ].map((p) => (
          <div
            key={p.title}
            className="flex items-start gap-3 rounded-2xl p-4 text-left"
            style={{ background: "hsl(var(--muted) / 0.5)", border: "1px solid hsl(var(--border))" }}
          >
            <span className="text-2xl flex-shrink-0 mt-0.5">{p.icon}</span>
            <div>
              <p className="text-xs font-bold text-foreground font-mono">{p.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleRequest}
        disabled={requesting}
        className="w-full max-w-sm py-4 rounded-2xl font-bold text-sm transition-all active:scale-95"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
          color: "hsl(var(--primary-foreground))",
          boxShadow: "0 4px 20px hsl(var(--primary) / 0.4)",
        }}
      >
        {requesting ? "Aguardando..." : "Conceder Permissão"}
      </button>

      <p className="text-xs text-muted-foreground mt-4 max-w-xs">
        Suas informações ficam apenas no dispositivo. O Adominus nunca envia dados para servidores externos.
      </p>
    </motion.div>
  );
}

// ── Modo Disciplina overlay ───────────────────────────────────────────────────
function ModoDisciplinaOverlay({
  appName, onBack, onUnlockTemp,
}: {
  appName: string;
  onBack: () => void;
  onUnlockTemp: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center text-center px-6"
      style={{ background: "hsl(var(--background) / 0.97)" }}
    >
      <motion.div
        initial={{ scale: 0.7, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 20 }}
        className="flex flex-col items-center max-w-sm"
      >
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: "hsl(var(--destructive) / 0.12)", border: "2px solid hsl(var(--destructive) / 0.4)" }}
        >
          <span className="text-5xl">⚔️</span>
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.2em] mb-2"
          style={{ color: "hsl(var(--destructive))" }}>
          Modo Disciplina Ativo
        </p>
        <h2 className="text-2xl font-black text-foreground mb-3">{appName}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          Este aplicativo está bloqueado para manter seu foco.
          Você está no caminho certo — não deixe a distração ganhar.
        </p>

        <div className="w-full space-y-3">
          <button
            onClick={onBack}
            className="w-full py-4 rounded-2xl font-bold text-sm transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
              color: "hsl(var(--primary-foreground))",
              boxShadow: "0 4px 20px hsl(var(--primary) / 0.35)",
            }}
          >
            ⬅ Voltar ao foco
          </button>
          <button
            onClick={onUnlockTemp}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-95"
            style={{
              background: "hsl(var(--muted))",
              color: "hsl(var(--muted-foreground))",
              border: "1px solid hsl(var(--border))",
            }}
          >
            <Unlock className="inline w-4 h-4 mr-1.5" />
            Desbloquear por 5 minutos
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Custom tooltip for chart ──────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs font-semibold shadow-lg"
      style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}
    >
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p>{msToHumanTime(payload[0].value * 3_600_000)}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TempoTela() {
  const { focusSessions, screenTimeEntries, blockedApps, addBlockedApp, removeBlockedApp } = useAppStore();

  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState<UsageStatsResult | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyStatsResult | null>(null);
  const [showDisciplinaFor, setShowDisciplinaFor] = useState<string | null>(null);
  const [tempUnlocked, setTempUnlocked] = useState<Record<string, boolean>>({});
  const [activeSection, setActiveSection] = useState<"stats" | "blocker" | "resumo">("stats");

  const today = new Date().toISOString().split("T")[0];
  const todayFocusMins = focusSessions
    .filter((s) => s.completedAt.startsWith(today))
    .reduce((a, s) => a + s.duration, 0);
  const todayFocusSessions = focusSessions.filter((s) => s.completedAt.startsWith(today)).length;

  const loadData = useCallback(async () => {
    setLoading(true);
    const [usage, weekly] = await Promise.all([
      ScreenTimePlugin.getUsageStats(),
      ScreenTimePlugin.getWeeklyStats(),
    ]);
    setUsageData(usage);
    setWeeklyData(weekly);
    setLoading(false);
  }, []);

  useEffect(() => {
    ScreenTimePlugin.checkPermission().then(({ granted }) => {
      setPermissionGranted(granted);
      if (granted) loadData();
      else setLoading(false);
    });
  }, [loadData]);

  const handleTestBlock = (appName: string) => {
    if (!tempUnlocked[appName]) setShowDisciplinaFor(appName);
  };

  const handleTempUnlock = (appName: string) => {
    setTempUnlocked((prev) => ({ ...prev, [appName]: true }));
    setShowDisciplinaFor(null);
    setTimeout(() => {
      setTempUnlocked((prev) => ({ ...prev, [appName]: false }));
    }, 5 * 60_000);
  };

  const toggleBlock = (pkg: string) => {
    if (blockedApps.includes(pkg)) {
      removeBlockedApp(pkg);
    } else {
      addBlockedApp(pkg);
      // Test the overlay
      const app = usageData?.apps.find((a) => a.packageName === pkg);
      if (app) setTimeout(() => setShowDisciplinaFor(app.appName), 300);
    }
    // Sync to native
    const newList = blockedApps.includes(pkg)
      ? blockedApps.filter((x) => x !== pkg)
      : [...blockedApps, pkg];
    ScreenTimePlugin.setBlockedApps(newList);
  };

  // ── Derived values ──────────────────────────────────────────────────────────
  const totalMs = usageData?.totalScreenTimeMs ?? 0;
  const maxDailyMs = 6 * 3_600_000; // 6h reference
  const topByTime = [...(usageData?.apps ?? [])].sort((a, b) => b.totalTimeMs - a.totalTimeMs).slice(0, 7);
  const topByLaunches = [...(usageData?.apps ?? [])].sort((a, b) => b.launchCount - a.launchCount).slice(0, 7);

  const chartData = weeklyData?.days.map((d) => ({
    label: d.label,
    horas: msToHours(d.totalMs),
    ms: d.totalMs,
  })) ?? [];

  const blockedAvoided = blockedApps.length * 4; // simulated count for web

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!loading && !permissionGranted) {
    return <PermissionGate onGranted={() => { setPermissionGranted(true); loadData(); }} />;
  }

  return (
    <>
      {/* Modo Disciplina overlay */}
      <AnimatePresence>
        {showDisciplinaFor && (
          <ModoDisciplinaOverlay
            appName={showDisciplinaFor}
            onBack={() => setShowDisciplinaFor(null)}
            onUnlockTemp={() => handleTempUnlock(showDisciplinaFor)}
          />
        )}
      </AnimatePresence>

      <div className="p-4 lg:p-6 space-y-6 pb-20">
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">Tempo de Tela</h1>
            <p className="text-sm text-muted-foreground">Monitoramento Android · {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
            style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}
          >
            <RefreshCw className={cn("w-4 h-4 text-muted-foreground", loading && "animate-spin")} />
          </button>
        </div>

        {/* ── Tab pills ── */}
        <div
          className="flex gap-1 p-1 rounded-2xl"
          style={{ background: "hsl(var(--muted) / 0.6)" }}
        >
          {(["stats", "blocker", "resumo"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSection(tab)}
              className={cn(
                "flex-1 py-2 rounded-xl text-xs font-semibold transition-all",
                activeSection === tab
                  ? "text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
              style={activeSection === tab ? { background: "hsl(var(--card))" } : {}}
            >
              {tab === "stats" ? "📊 Estatísticas" : tab === "blocker" ? "🛡️ Bloqueador" : "📋 Resumo"}
            </button>
          ))}
        </div>

        {/* ═══════════════ STATS TAB ═══════════════ */}
        <AnimatePresence mode="wait">
          {activeSection === "stats" && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-5"
            >
              {/* Tempo de Tela Hoje */}
              <div
                className="rounded-3xl p-6"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", boxShadow: "var(--shadow-card)" }}
              >
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                  Tempo de Tela Hoje
                </p>
                <div className="flex items-center gap-6">
                  <CircularProgress
                    value={totalMs}
                    max={maxDailyMs}
                    size={130}
                    stroke={9}
                    color="hsl(var(--primary))"
                  >
                    <span className="text-xl font-black text-foreground leading-none">
                      {msToHumanTime(totalMs).split(" ")[0]}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {msToHumanTime(totalMs).split(" ").slice(1).join(" ") || ""}
                    </span>
                  </CircularProgress>
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-3xl font-black text-foreground">{msToHumanTime(totalMs)}</p>
                      <p className="text-xs text-muted-foreground">tempo total de tela</p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(var(--primary))" }} />
                        <span className="text-muted-foreground">Foco hoje:</span>
                        <span className="font-semibold text-foreground">
                          {todayFocusMins >= 60 ? `${Math.floor(todayFocusMins / 60)}h ${todayFocusMins % 60}min` : `${todayFocusMins}min`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(var(--destructive))" }} />
                        <span className="text-muted-foreground">Distração:</span>
                        <span className="font-semibold text-foreground">{msToHumanTime(totalMs)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bar visualization */}
                <div className="mt-5">
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((totalMs / maxDailyMs) * 100, 100)}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--destructive)))" }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] text-muted-foreground">0h</span>
                    <span className="text-[10px] text-muted-foreground">6h (limite saudável)</span>
                  </div>
                </div>
              </div>

              {/* Apps mais usados */}
              <div
                className="rounded-3xl p-5"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-foreground">Apps mais usados</p>
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="space-y-3">
                  {topByTime.map((app, i) => {
                    const pct = totalMs > 0 ? app.totalTimeMs / totalMs : 0;
                    return (
                      <motion.div
                        key={app.packageName}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3"
                      >
                        <span className="text-xl flex-shrink-0">{appIcon(app.appName)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-foreground truncate">{app.appName}</span>
                            <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color: "hsl(var(--primary))" }}>
                              {msToHumanTime(app.totalTimeMs)}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct * 100}%` }}
                              transition={{ duration: 0.8, delay: i * 0.05 }}
                              className="h-full rounded-full"
                              style={{ background: "hsl(var(--primary))" }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Apps mais acessados */}
              <div
                className="rounded-3xl p-5"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-foreground">Apps mais acessados</p>
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="space-y-2.5">
                  {topByLaunches.map((app, i) => (
                    <motion.div
                      key={app.packageName}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between py-2.5 px-3 rounded-xl"
                      style={{ background: "hsl(var(--muted) / 0.5)" }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{appIcon(app.appName)}</span>
                        <span className="text-xs font-medium text-foreground">{app.appName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-foreground tabular-nums">{app.launchCount}</span>
                        <span className="text-[10px] text-muted-foreground">vezes</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Análise Semanal */}
              <div
                className="rounded-3xl p-5"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              >
                <p className="text-sm font-bold text-foreground mb-4">Análise Semanal</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                      axisLine={false} tickLine={false}
                      tickFormatter={(v) => `${v}h`}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.4)", radius: 6 }} />
                    <Bar dataKey="horas" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, i) => {
                        const isToday = i === chartData.length - 1;
                        return (
                          <Cell
                            key={`cell-${i}`}
                            fill={isToday ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.35)"}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  Barra destacada = hoje. Toque nas barras para ver detalhes.
                </p>
              </div>
            </motion.div>
          )}

          {/* ═══════════════ BLOCKER TAB ═══════════════ */}
          {activeSection === "blocker" && (
            <motion.div
              key="blocker"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-5"
            >
              {/* Header info */}
              <div
                className="rounded-3xl p-5 flex gap-4 items-start"
                style={{ background: "hsl(var(--primary) / 0.08)", border: "1px solid hsl(var(--primary) / 0.2)" }}
              >
                <Shield className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: "hsl(var(--primary))" }} />
                <div>
                  <p className="text-sm font-bold text-foreground mb-1">Bloqueador de Apps</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Selecione os apps que deseja bloquear. Quando ativado, o{" "}
                    <strong className="text-foreground">Modo Disciplina</strong> exibirá um overlay ao abrir
                    qualquer app da lista. Bloquear requer o serviço de acessibilidade no Android.
                  </p>
                </div>
              </div>

              {/* Android native notice */}
              <div
                className="rounded-2xl p-4 flex gap-3 items-start"
                style={{ background: "hsl(var(--muted) / 0.5)", border: "1px solid hsl(var(--border))" }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  O bloqueio real funciona no APK Android (via AccessibilityService). No browser,
                  você pode simular o overlay clicando em "Testar" em qualquer app bloqueado.
                </p>
              </div>

              {/* App list */}
              <div
                className="rounded-3xl p-5"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              >
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                  Apps disponíveis
                </p>
                <div className="space-y-2">
                  {(usageData?.apps ?? []).map((app) => {
                    const isBlocked = blockedApps.includes(app.packageName);
                    const isTemp = tempUnlocked[app.appName];
                    return (
                      <motion.div
                        key={app.packageName}
                        layout
                        className="flex items-center justify-between py-3 px-3 rounded-2xl transition-all"
                        style={{
                          background: isBlocked
                            ? "hsl(var(--destructive) / 0.06)"
                            : "hsl(var(--muted) / 0.4)",
                          border: `1px solid ${isBlocked ? "hsl(var(--destructive) / 0.25)" : "transparent"}`,
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{appIcon(app.appName)}</span>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{app.appName}</p>
                            <p className="text-[10px] text-muted-foreground">{msToHumanTime(app.totalTimeMs)} hoje</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Test button (web only) */}
                          {isBlocked && !isTemp && (
                            <button
                              onClick={() => handleTestBlock(app.appName)}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all active:scale-95"
                              style={{
                                background: "hsl(var(--muted))",
                                color: "hsl(var(--muted-foreground))",
                              }}
                            >
                              Testar
                            </button>
                          )}
                          {isTemp && (
                            <span className="text-[10px] text-primary font-semibold">5min livre</span>
                          )}

                          {/* Toggle */}
                          <button
                            onClick={() => toggleBlock(app.packageName)}
                            className={cn(
                              "w-11 h-6 rounded-full transition-all relative flex-shrink-0",
                              isBlocked ? "" : ""
                            )}
                            style={{
                              background: isBlocked
                                ? "hsl(var(--destructive))"
                                : "hsl(var(--muted))",
                            }}
                          >
                            <motion.div
                              layout
                              className="absolute top-0.5 w-5 h-5 rounded-full"
                              animate={{ left: isBlocked ? "calc(100% - 22px)" : "2px" }}
                              transition={{ type: "spring", stiffness: 400, damping: 25 }}
                              style={{ background: "white" }}
                            />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Currently blocked */}
              {blockedApps.length > 0 && (
                <div
                  className="rounded-3xl p-5"
                  style={{ background: "hsl(var(--destructive) / 0.06)", border: "1px solid hsl(var(--destructive) / 0.2)" }}
                >
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "hsl(var(--destructive))" }}>
                    🔒 Apps bloqueados ({blockedApps.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {blockedApps.map((pkg) => {
                      const app = usageData?.apps.find((a) => a.packageName === pkg);
                      return (
                        <div
                          key={pkg}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                          style={{ background: "hsl(var(--destructive) / 0.12)", color: "hsl(var(--destructive))" }}
                        >
                          {app ? appIcon(app.appName) : "📱"} {app?.appName ?? pkg}
                          <button onClick={() => removeBlockedApp(pkg)} className="ml-1 opacity-60 hover:opacity-100">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════════ RESUMO TAB ═══════════════ */}
          {activeSection === "resumo" && (
            <motion.div
              key="resumo"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-5"
            >
              {/* Resumo do Dia hero */}
              <div
                className="rounded-3xl p-6 relative overflow-hidden"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "radial-gradient(ellipse at top right, hsl(var(--primary) / 0.08), transparent 60%)",
                  }}
                />
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-5">
                  Resumo do Dia
                </p>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    {
                      icon: "📱",
                      label: "Tempo de Tela",
                      value: msToHumanTime(totalMs),
                      sub: "tempo total hoje",
                      color: "hsl(var(--primary))",
                    },
                    {
                      icon: "🎯",
                      label: "Sessões de Foco",
                      value: `${todayFocusSessions}`,
                      sub: `${todayFocusMins >= 60 ? `${Math.floor(todayFocusMins / 60)}h ${todayFocusMins % 60}min` : `${todayFocusMins}min`} focados`,
                      color: "hsl(var(--primary))",
                    },
                    {
                      icon: "🛡️",
                      label: "Apps bloqueados evitados",
                      value: `${blockedAvoided}`,
                      sub: `${blockedApps.length} apps na lista`,
                      color: "hsl(var(--destructive))",
                    },
                  ].map((s) => (
                    <motion.div
                      key={s.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-4 p-4 rounded-2xl"
                      style={{ background: "hsl(var(--muted) / 0.5)" }}
                    >
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
                        style={{ background: `${s.color.replace("hsl(", "hsl(").replace(")", " / 0.12)")}` }}
                      >
                        {s.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] text-muted-foreground">{s.label}</p>
                        <p className="text-2xl font-black text-foreground tabular-nums">{s.value}</p>
                        <p className="text-[10px] text-muted-foreground">{s.sub}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Score disciplina */}
              <div
                className="rounded-3xl p-5"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              >
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                  Avaliação de Disciplina
                </p>
                {(() => {
                  const focusPct = Math.min((todayFocusMins / 120) * 100, 100); // 2h ref
                  const screenPct = Math.max(100 - (totalMs / maxDailyMs) * 100, 0);
                  const score = Math.round((focusPct + screenPct) / 2);
                  const grade =
                    score >= 80 ? { label: "Guerreiro de Elite 🏆", color: "hsl(var(--primary))" }
                    : score >= 60 ? { label: "No Caminho Certo ⚡", color: "hsl(var(--primary))" }
                    : score >= 40 ? { label: "Precisa Melhorar 🎯", color: "hsl(var(--secondary))" }
                    : { label: "Dia Difícil — Tente Amanhã 💪", color: "hsl(var(--destructive))" };

                  return (
                    <div className="flex items-center gap-5">
                      <CircularProgress
                        value={score}
                        max={100}
                        size={100}
                        stroke={8}
                        color={grade.color}
                      >
                        <span className="text-2xl font-black text-foreground">{score}</span>
                      </CircularProgress>
                      <div>
                        <p className="text-lg font-black text-foreground">{grade.label}</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          Baseado no tempo de foco vs. tempo de tela de hoje.
                        </p>
                        <div className="flex items-center gap-1.5 mt-2.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--primary))" }} />
                          <span className="text-[10px] text-muted-foreground">Foco {Math.round(focusPct)}%</span>
                          <div className="w-2 h-2 rounded-full ml-1" style={{ background: "hsl(var(--primary))" }} />
                          <span className="text-[10px] text-muted-foreground">Tela {Math.round(100 - screenPct)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Integração com Focus Mode */}
              <div
                className="rounded-3xl p-5"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
                  <p className="text-sm font-bold text-foreground">Integração com Modo Foco</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  Quando você iniciar uma sessão Pomodoro, os{" "}
                  <strong className="text-foreground">{blockedApps.length} apps bloqueados</strong> serão
                  automaticamente protegidos pelo Modo Disciplina durante toda a sessão.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: "🍅", label: "Pomodoro", sub: "25min foco" },
                    { icon: "☕", label: "Pausa Curta", sub: "5min descanso" },
                    { icon: "🌿", label: "Pausa Longa", sub: "15min descanso" },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="rounded-2xl p-3 text-center"
                      style={{ background: "hsl(var(--muted) / 0.5)" }}
                    >
                      <span className="text-xl">{m.icon}</span>
                      <p className="text-[10px] font-semibold text-foreground mt-1">{m.label}</p>
                      <p className="text-[9px] text-muted-foreground">{m.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
