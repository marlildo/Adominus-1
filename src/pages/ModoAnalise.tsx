import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { Plus, Trash2, Edit2, Check, X, TrendingUp, Brain, Award, BarChart2, Clock, MousePointerClick, Zap, Save, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Activity {
  id: string;
  app: string;
  category: string;
  hours: number;
  minutes: number;
  totalMinutes: number;
  accessCount: number;
  utility: string;
  date: string;
}

interface DailyReport {
  date: string;
  productivityScore: number;
  totalMinutes: number;
  dominusScore: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = ["Trabalho", "Estudo", "Entretenimento", "Redes Sociais", "Produtividade", "Outro"];
const UTILITIES = ["Muito produtivo", "Produtivo", "Neutro", "Distração", "Muito prejudicial"];

const UTILITY_WEIGHTS: Record<string, number> = {
  "Muito produtivo": 2,
  "Produtivo": 1,
  "Neutro": 0,
  "Distração": -1,
  "Muito prejudicial": -2
};

const UTILITY_COLORS: Record<string, string> = {
  "Muito produtivo": "hsl(var(--primary))",
  "Produtivo": "hsl(var(--primary) / 0.7)",
  "Neutro": "#EB5002",
  "Distração": "hsl(var(--accent))",
  "Muito prejudicial": "hsl(var(--destructive))"
};

const CATEGORY_COLORS = [
"hsl(var(--primary))",
"#EB5002",
"hsl(var(--accent))",
"hsl(var(--destructive))",
"#EB5002",
"hsl(var(--muted-foreground))"];


const DOMINUS_LEVELS = [
{ min: 0, max: 30, label: "Disciplina Baixa", color: "hsl(var(--destructive))" },
{ min: 30, max: 60, label: "Em Evolução", color: "hsl(var(--accent))" },
{ min: 60, max: 80, label: "Forte Disciplina", color: "#EB5002" },
{ min: 80, max: 101, label: "Modo Adominus", color: "hsl(var(--primary))" }];


const MOTIVATIONAL_MESSAGES: Record<string, string[]> = {
  low: [
  "Seu foco precisa melhorar. Pequenas mudanças fazem grande diferença.",
  "Todo grande guerreiro já foi um iniciante. Comece agora, mude o amanhã.",
  "A disciplina não é um talento, é uma escolha. Escolha melhor amanhã."],

  evolving: [
  "Você está evoluindo. Continue consistente.",
  "O progresso é visível. Mantenha o ritmo e supere seus limites.",
  "Cada dia melhor que o anterior. Isso é o caminho Adominus."],

  strong: [
  "Forte disciplina digital hoje. Continue nesse nível.",
  "Sua consistência está construindo um futuro diferente. Orgulho Adominus.",
  "Você está no caminho certo. A disciplina é sua arma mais poderosa."],

  dominus: [
  "Excelente disciplina digital hoje. Modo Adominus ativado.",
  "Isso é excelência. Você domina seu tempo e sua mente.",
  "⚔ MODO ADOMINUS — Você é a prova de que disciplina é a chave para tudo."]

};

const TODAY = new Date().toISOString().split("T")[0];

// ─── Analytics helpers ───────────────────────────────────────────────────────

function calcProductivityScore(activities: Activity[]): number {
  if (!activities.length) return 0;
  const prodMins = activities.
  filter((a) => a.utility === "Muito produtivo" || a.utility === "Produtivo").
  reduce((s, a) => s + a.totalMinutes, 0);
  const total = activities.reduce((s, a) => s + a.totalMinutes, 0);
  return total === 0 ? 0 : Math.round(prodMins / total * 100);
}

function calcDominusScore(activities: Activity[]): number {
  if (!activities.length) return 0;
  const total = activities.reduce((s, a) => s + a.totalMinutes, 0);
  if (total === 0) return 0;
  const weightedSum = activities.reduce((s, a) => {
    const w = UTILITY_WEIGHTS[a.utility] ?? 0;
    return s + w * a.totalMinutes;
  }, 0);
  // Normalize: max possible is 2*total, min is -2*total → map to 0-100
  const normalized = (weightedSum / (2 * total) + 1) / 2 * 100;
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

function getDominusLevel(score: number) {
  return DOMINUS_LEVELS.find((l) => score >= l.min && score < l.max) ?? DOMINUS_LEVELS[3];
}

function getMotivationalMessage(score: number): string {
  const bucket =
  score < 30 ? "low" :
  score < 60 ? "evolving" :
  score < 80 ? "strong" : "dominus";
  const msgs = MOTIVATIONAL_MESSAGES[bucket];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}min`;
}

// ─── Tooltip style ────────────────────────────────────────────────────────────

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  color: "hsl(var(--foreground))",
  fontSize: "12px"
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionCard({ children, className = "" }: {children: React.ReactNode;className?: string;}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`premium-card p-6 relative overflow-hidden ${className}`}
      style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl"
        style={{ background: "hsl(var(--primary) / 0.3)" }} />
      {children}
    </motion.div>);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ModoAnalise() {
  // ── State ──
  const [activities, setActivities] = useState<Activity[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<DailyReport[]>([]);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    app: "",
    category: "",
    hours: "",
    minutes: "",
    accessCount: "",
    utility: ""
  });

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<Activity>>({});

  // ── Persist to localStorage ──
  useEffect(() => {
    const saved = localStorage.getItem("dominus-analise-activities");
    if (saved) {
      try {
        const parsed: Activity[] = JSON.parse(saved);
        setActivities(parsed.filter((a) => a.date === TODAY));
      } catch {/* ignore */}
    }
    const savedReports = localStorage.getItem("dominus-analise-reports");
    if (savedReports) {
      try {setWeeklyReports(JSON.parse(savedReports));} catch {/* ignore */}
    }
  }, []);

  const persistActivities = (acts: Activity[]) => {
    // Keep all non-today activities from storage + today's
    const saved = localStorage.getItem("dominus-analise-activities");
    let all: Activity[] = [];
    try {all = saved ? JSON.parse(saved) : [];} catch {all = [];}
    const notToday = all.filter((a) => a.date !== TODAY);
    localStorage.setItem("dominus-analise-activities", JSON.stringify([...notToday, ...acts]));
    setActivities(acts);
  };

  // ── Computed analytics ──
  const todayActivities = activities.filter((a) => a.date === TODAY);
  const totalMinutes = todayActivities.reduce((s, a) => s + a.totalMinutes, 0);
  const totalAccesses = todayActivities.reduce((s, a) => s + a.accessCount, 0);
  const productivityScore = calcProductivityScore(todayActivities);
  const dominusScore = calcDominusScore(todayActivities);
  const dominusLevel = getDominusLevel(dominusScore);

  const prodMinutes = todayActivities.
  filter((a) => a.utility === "Muito produtivo" || a.utility === "Produtivo").
  reduce((s, a) => s + a.totalMinutes, 0);
  const distractionMinutes = todayActivities.
  filter((a) => a.utility === "Distração" || a.utility === "Muito prejudicial").
  reduce((s, a) => s + a.totalMinutes, 0);

  // Category distribution for pie chart
  const categoryData = CATEGORIES.map((cat) => ({
    name: cat,
    value: todayActivities.filter((a) => a.category === cat).reduce((s, a) => s + a.totalMinutes, 0)
  })).filter((d) => d.value > 0);

  // Top 5 apps for bar chart
  const appData = Object.entries(
    todayActivities.reduce<Record<string, number>>((acc, a) => {
      acc[a.app] = (acc[a.app] || 0) + a.totalMinutes;
      return acc;
    }, {})
  ).
  sort((a, b) => b[1] - a[1]).
  slice(0, 5).
  map(([name, value]) => ({ name, value }));

  // Most used category
  const mostUsedCategory = categoryData.length ?
  categoryData.sort((a, b) => b.value - a.value)[0].name :
  "—";
  const mostUsedApp = appData.length ? appData[0].name : "—";

  // Weekly chart data (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const weeklyChartData = last7Days.map((date) => {
    const report = weeklyReports.find((r) => r.date === date);
    return {
      dia: date.slice(5).replace("-", "/"),
      produtividade: report?.productivityScore ?? 0,
      dominus: report?.dominusScore ?? 0
    };
  });

  // ── Handlers ──
  const handleAddActivity = () => {
    if (!form.app.trim()) {toast.error("Informe o nome do site ou app.");return;}
    if (!form.category) {toast.error("Selecione uma categoria.");return;}
    if (!form.utility) {toast.error("Selecione o nível de utilidade.");return;}

    const hours = parseInt(form.hours || "0", 10);
    const minutes = parseInt(form.minutes || "0", 10);
    if (hours === 0 && minutes === 0) {toast.error("Informe o tempo gasto.");return;}

    const newActivity: Activity = {
      id: crypto.randomUUID(),
      app: form.app.trim(),
      category: form.category,
      hours,
      minutes,
      totalMinutes: hours * 60 + minutes,
      accessCount: parseInt(form.accessCount || "1", 10),
      utility: form.utility,
      date: TODAY
    };

    const updated = [...activities, newActivity];
    persistActivities(updated);
    setForm({ app: "", category: "", hours: "", minutes: "", accessCount: "", utility: "" });
    setReportGenerated(false);
    toast.success("Atividade adicionada!");
  };

  const handleDelete = (id: string) => {
    const updated = activities.filter((a) => a.id !== id);
    persistActivities(updated);
    setReportGenerated(false);
    toast.success("Atividade removida.");
  };

  const handleEditStart = (activity: Activity) => {
    setEditingId(activity.id);
    setEditForm({ ...activity });
  };

  const handleEditSave = () => {
    if (!editingId) return;
    const h = parseInt(String(editForm.hours || 0), 10);
    const m = parseInt(String(editForm.minutes || 0), 10);
    const updated = activities.map((a) =>
    a.id === editingId ?
    { ...a, ...editForm, hours: h, minutes: m, totalMinutes: h * 60 + m } :
    a
    );
    persistActivities(updated);
    setEditingId(null);
    setReportGenerated(false);
    toast.success("Atividade atualizada.");
  };

  const handleGenerateReport = useCallback(async () => {
    if (!todayActivities.length) {
      toast.error("Adicione pelo menos uma atividade para gerar o relatório.");
      return;
    }

    setReportGenerated(true);
    setAiLoading(true);
    setAiAnalysis("");

    // Save daily report
    const report: DailyReport = {
      date: TODAY,
      productivityScore,
      totalMinutes,
      dominusScore
    };
    const updatedReports = [...weeklyReports.filter((r) => r.date !== TODAY), report].slice(-30);
    setWeeklyReports(updatedReports);
    localStorage.setItem("dominus-analise-reports", JSON.stringify(updatedReports));

    // Build AI prompt
    const activitySummary = todayActivities.map((a) =>
    `- ${a.app} (${a.category}): ${formatMinutes(a.totalMinutes)}, ${a.accessCount} acesso(s), utilidade: ${a.utility}`
    ).join("\n");

    const prompt = `IDENTIDADE DO SISTEMA: O nome deste sistema é "Adominus" (não "Dominus"). Use SEMPRE "Adominus" em todos os títulos, seções e referências do relatório. Nunca escreva apenas "Dominus".

Analise o comportamento digital do usuário hoje e gere um relatório completo em português brasileiro.

DADOS DO DIA:
${activitySummary}

RESUMO:
- Tempo total: ${formatMinutes(totalMinutes)}
- Acessos totais: ${totalAccesses}
- Categoria mais usada: ${mostUsedCategory}
- App mais acessado: ${mostUsedApp}
- Tempo produtivo: ${formatMinutes(prodMinutes)} (${totalMinutes > 0 ? Math.round(prodMinutes / totalMinutes * 100) : 0}%)
- Tempo distração: ${formatMinutes(distractionMinutes)} (${totalMinutes > 0 ? Math.round(distractionMinutes / totalMinutes * 100) : 0}%)
- Pontuação Adominus: ${dominusScore}/100 (${dominusLevel.label})

Gere um relatório estruturado com:
1. ### 📊 RELATÓRIO DE DESEMPENHO ADOMINUS (use exatamente este título)
2. Uma análise do padrão de comportamento identificado
3. Alertas específicos sobre distrações ou pontos de melhoria
4. Uma seção "Recomendação Adominus" com ações concretas para amanhã
5. Uma frase motivacional final com "⚔ MODO ADOMINUS"

Seja direto, estratégico e motivador. Máximo 250 palavras.`;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dominus-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({ messages: [{ role: "user", content: prompt }] })
        }
      );

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        toast.error(err.error || "Erro ao gerar análise.");
        setAiLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const chunk = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (chunk) setAiAnalysis((prev) => prev + chunk);
          } catch {/* partial */}
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao conectar com Adominus AI.");
    } finally {
      setAiLoading(false);
    }
  }, [todayActivities, productivityScore, totalMinutes, dominusScore, weeklyReports, totalAccesses, mostUsedCategory, mostUsedApp, prodMinutes, distractionMinutes, dominusLevel]);

  // ── Render ──
  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="px-6 pt-6 pb-2">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="premium-card p-5 relative overflow-hidden">
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <ScanSearch className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">Análise de Comportamento</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Analise seu comportamento digital e receba relatório de progresso.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-6 mt-6 space-y-6 max-w-6xl">

        {/* ── SECTION 1: Add Activity ── */}
        <SectionCard>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
              <Plus className="w-4 h-4" style={{ color: "hsl(var(--primary-foreground))" }} />
            </div>
            <h2 className="text-base font-bold text-foreground">Adicionar Atividade</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* App name */}
            <div className="lg:col-span-1 space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Nome do site ou aplicativo</Label>
              <Input
                placeholder="ex: YouTube, Instagram..."
                value={form.app}
                onChange={(e) => setForm((f) => ({ ...f, app: e.target.value }))}
                className="h-9 bg-muted/40 border-border text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleAddActivity()} />
              
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger className="h-9 bg-muted/40 border-border text-sm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Utility */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Nível de utilidade</Label>
              <Select value={form.utility} onValueChange={(v) => setForm((f) => ({ ...f, utility: v }))}>
                <SelectTrigger className="h-9 bg-muted/40 border-border text-sm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {UTILITIES.map((u) =>
                  <SelectItem key={u} value={u}>
                      <span style={{ color: UTILITY_COLORS[u] }}>{u}</span>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Time */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Tempo gasto</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type="number" min="0" max="23" placeholder="0"
                    value={form.hours}
                    onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
                    className="h-9 bg-muted/40 border-border text-sm pr-10" />
                  
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">h</span>
                </div>
                <div className="relative flex-1">
                  <Input
                    type="number" min="0" max="59" placeholder="0"
                    value={form.minutes}
                    onChange={(e) => setForm((f) => ({ ...f, minutes: e.target.value }))}
                    className="h-9 bg-muted/40 border-border text-sm pr-10" />
                  
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">min</span>
                </div>
              </div>
            </div>

            {/* Access count */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Quantas vezes acessou</Label>
              <Input
                type="number" min="1" placeholder="1"
                value={form.accessCount}
                onChange={(e) => setForm((f) => ({ ...f, accessCount: e.target.value }))}
                className="h-9 bg-muted/40 border-border text-sm" />
              
            </div>

            {/* Submit */}
            <div className="flex items-end">
              <Button
                onClick={handleAddActivity}
                className="w-full h-9 text-sm font-semibold rounded-xl gradient-primary"
                style={{ color: "hsl(var(--primary-foreground))" }}>
                
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar atividade
              </Button>
            </div>
          </div>
        </SectionCard>

        {/* ── SECTION 2: Activity Table ── */}
        <SectionCard>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#EB5002]/20 flex items-center justify-center">
                <BarChart2 className="w-4 h-4 text-[#EB5002]" />
              </div>
              <h2 className="text-base font-bold text-foreground">Atividades do Dia</h2>
            </div>
            <span className="text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
              {todayActivities.length} {todayActivities.length === 1 ? "registro" : "registros"}
            </span>
          </div>

          {todayActivities.length === 0 ?
          <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center mb-3">
                <Clock className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Nenhuma atividade registrada hoje</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Adicione atividades acima para começar a análise</p>
            </div> :

          <div className="overflow-x-auto rounded-xl border border-border/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Site/App</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Categoria</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Tempo Total</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Acessos</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Utilidade</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {todayActivities.map((activity) =>
                  <motion.tr
                    key={activity.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors">
                    
                        {editingId === activity.id ?
                    <>
                            <td className="px-4 py-2">
                              <Input value={editForm.app || ""} onChange={(e) => setEditForm((f) => ({ ...f, app: e.target.value }))} className="h-7 text-xs bg-muted/40 border-border" />
                            </td>
                            <td className="px-4 py-2">
                              <Select value={editForm.category} onValueChange={(v) => setEditForm((f) => ({ ...f, category: v }))}>
                                <SelectTrigger className="h-7 text-xs bg-muted/40 border-border w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex gap-1">
                                <Input type="number" value={editForm.hours ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, hours: +e.target.value }))} className="h-7 text-xs bg-muted/40 border-border w-12" />
                                <span className="text-xs text-muted-foreground self-center">h</span>
                                <Input type="number" value={editForm.minutes ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, minutes: +e.target.value }))} className="h-7 text-xs bg-muted/40 border-border w-14" />
                                <span className="text-xs text-muted-foreground self-center">min</span>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <Input type="number" value={editForm.accessCount ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, accessCount: +e.target.value }))} className="h-7 text-xs bg-muted/40 border-border w-16" />
                            </td>
                            <td className="px-4 py-2">
                              <Select value={editForm.utility} onValueChange={(v) => setEditForm((f) => ({ ...f, utility: v }))}>
                                <SelectTrigger className="h-7 text-xs bg-muted/40 border-border w-36">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {UTILITIES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={handleEditSave} className="p-1.5 rounded-lg hover:bg-primary/20 text-primary transition-colors">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground transition-colors">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </> :

                    <>
                            <td className="px-4 py-3 font-medium text-foreground">{activity.app}</td>
                            <td className="px-4 py-3">
                              <span className="text-xs bg-muted/60 px-2 py-0.5 rounded-full text-muted-foreground">{activity.category}</span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{formatMinutes(activity.totalMinutes)}</td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <MousePointerClick className="w-3 h-3" />
                                {activity.accessCount}x
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{
                            color: UTILITY_COLORS[activity.utility],
                            background: `${UTILITY_COLORS[activity.utility]}18`
                          }}>
                          
                                {activity.utility}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => handleEditStart(activity)} className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDelete(activity.id)} className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </>
                    }
                      </motion.tr>
                  )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          }

          {todayActivities.length > 0 &&
          <div className="mt-4 flex justify-end">
              <Button
              onClick={handleGenerateReport}
              disabled={aiLoading}
              className="h-9 px-5 text-sm font-semibold rounded-xl gradient-primary"
              style={{ color: "hsl(var(--primary-foreground))" }}>
              
                {aiLoading ?
              <><div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin mr-2" />Gerando...</> :

              <><Save className="w-3.5 h-3.5 mr-2" />Gerar Relatório do Dia</>
              }
              </Button>
            </div>
          }
        </SectionCard>

        {/* ── Sections 3-7 only show after report is generated ── */}
        <AnimatePresence>
          {reportGenerated && todayActivities.length > 0 &&
          <>
              {/* ── SECTION 3 + 4: Stats + Charts ── */}
              <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6">
              
                {/* Stats row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                { label: "Tempo Total", value: formatMinutes(totalMinutes), icon: Clock, color: "#EB5002" },
                { label: "Total de Acessos", value: String(totalAccesses), icon: MousePointerClick, color: "hsl(var(--primary))" },
                { label: "Categoria Líder", value: mostUsedCategory, icon: BarChart2, color: "hsl(var(--accent))" },
                { label: "App Mais Usado", value: mostUsedApp, icon: Zap, color: "hsl(var(--chart-5))" }].
                map((stat) =>
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl border border-border bg-card p-4"
                  style={{ boxShadow: "var(--shadow-card)" }}>
                  
                      <div className="flex items-center gap-2 mb-2">
                        <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                        <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
                      </div>
                      <p className="text-lg font-bold text-foreground truncate">{stat.value}</p>
                    </motion.div>
                )}
                </div>

                {/* Productivity vs Distraction */}
                <SectionCard>
                  <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Produtividade vs Distração
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Produtivo</span>
                        <span className="font-semibold" style={{ color: "hsl(var(--primary))" }}>
                          {formatMinutes(prodMinutes)} — {totalMinutes > 0 ? Math.round(prodMinutes / totalMinutes * 100) : 0}%
                        </span>
                      </div>
                      <div className="h-3 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
                        <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${totalMinutes > 0 ? prodMinutes / totalMinutes * 100 : 0}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: "hsl(var(--primary))" }} />
                      
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Distração</span>
                        <span className="font-semibold" style={{ color: "hsl(var(--destructive))" }}>
                          {formatMinutes(distractionMinutes)} — {totalMinutes > 0 ? Math.round(distractionMinutes / totalMinutes * 100) : 0}%
                        </span>
                      </div>
                      <div className="h-3 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
                        <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${totalMinutes > 0 ? distractionMinutes / totalMinutes * 100 : 0}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
                        className="h-full rounded-full"
                        style={{ background: "hsl(var(--destructive))" }} />
                      
                      </div>
                    </div>
                    {/* Productivity meter */}
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground font-medium">Produtividade do Dia</span>
                        <span className="font-bold text-foreground">{productivityScore}%</span>
                      </div>
                      <div className="h-4 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
                        <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${productivityScore}%` }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                        className="h-full rounded-full"
                        style={{
                          background: productivityScore >= 60 ?
                          "hsl(var(--primary))" :
                          productivityScore >= 30 ?
                          "hsl(var(--accent))" :
                          "hsl(var(--destructive))"
                        }} />
                      
                      </div>
                    </div>
                  </div>
                </SectionCard>

                {/* Charts row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Pie chart */}
                  <SectionCard>
                    <h3 className="text-sm font-bold text-foreground mb-4">Distribuição por Categoria</h3>
                    {categoryData.length > 0 ?
                  <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value">
                          
                              {categoryData.map((_, i) =>
                          <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                          )}
                            </Pie>
                            <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(v: number) => [formatMinutes(v), "Tempo"]} />
                        
                          </PieChart>
                        </ResponsiveContainer>
                      </div> :

                  <p className="text-xs text-muted-foreground">Sem dados para exibir.</p>
                  }
                    <div className="flex flex-wrap gap-2 mt-2">
                      {categoryData.map((d, i) =>
                    <span key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                          {d.name}
                        </span>
                    )}
                    </div>
                  </SectionCard>

                  {/* Bar chart */}
                  <SectionCard>
                    <h3 className="text-sm font-bold text-foreground mb-4">Top 5 Apps/Sites</h3>
                    {appData.length > 0 ?
                  <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={appData} layout="vertical" margin={{ left: 8, right: 16 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                            <XAxis
                          type="number"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(v) => formatMinutes(v)}
                          axisLine={false}
                          tickLine={false} />
                        
                            <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                          width={80}
                          axisLine={false}
                          tickLine={false} />
                        
                            <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(v: number) => [formatMinutes(v), "Tempo"]} />
                        
                            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div> :

                  <p className="text-xs text-muted-foreground">Sem dados para exibir.</p>
                  }
                  </SectionCard>
                </div>

                {/* ── SECTION 5: Análise Dominus ── */}
                <SectionCard>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                      <Brain className="w-4 h-4" style={{ color: "hsl(var(--primary-foreground))" }} />
                    </div>
                    <h2 className="text-base font-bold text-foreground">Análise Adominus</h2>
                    {aiLoading &&
                  <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin ml-auto" />
                  }
                  </div>

                  <div
                  className="rounded-xl p-4 min-h-[100px]"
                  style={{
                    background: "hsl(var(--muted) / 0.4)",
                    border: "1px solid hsl(var(--primary) / 0.15)"
                  }}>
                  
                    {aiAnalysis ?
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{aiAnalysis}</p> :
                  aiLoading ?
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        Adominus está analisando seus dados...
                      </div> :

                  <p className="text-sm text-muted-foreground/60 italic">A análise aparecerá aqui após gerar o relatório.</p>
                  }
                  </div>
                </SectionCard>

                {/* ── SECTION 7: Gamification ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SectionCard>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
                        <Award className="w-4 h-4 text-accent" />
                      </div>
                      <h2 className="text-base font-bold text-foreground">Pontuação Adominus</h2>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Score circle */}
                      <div className="relative w-24 h-24 flex-shrink-0">
                        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                          <circle cx="48" cy="48" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                          <motion.circle
                          cx="48" cy="48" r="40" fill="none"
                          stroke={dominusLevel.color}
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - dominusScore / 100) }}
                          transition={{ duration: 1.2, ease: "easeOut" }} />
                        
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-black text-foreground">{dominusScore}</span>
                          <span className="text-[9px] text-muted-foreground font-medium">/ 100</span>
                        </div>
                      </div>

                      <div>
                        <p className="text-lg font-bold" style={{ color: dominusLevel.color }}>{dominusLevel.label}</p>
                        <div className="mt-2 space-y-1">
                          {DOMINUS_LEVELS.map((l) =>
                        <div key={l.label} className="flex items-center gap-2 text-xs">
                              <span className="w-2 h-2 rounded-full" style={{ background: l.color, opacity: dominusLevel.label === l.label ? 1 : 0.35 }} />
                              <span style={{ color: dominusLevel.label === l.label ? l.color : "hsl(var(--muted-foreground))", fontWeight: dominusLevel.label === l.label ? 600 : 400 }}>
                                {l.min}–{l.max === 101 ? 100 : l.max} — {l.label}
                              </span>
                            </div>
                        )}
                        </div>
                      </div>
                    </div>

                    {/* Motivational message */}
                    {!aiLoading &&
                  <div
                    className="mt-4 rounded-xl px-4 py-3 text-sm font-medium"
                    style={{
                      background: `${dominusLevel.color}18`,
                      border: `1px solid ${dominusLevel.color}30`,
                      color: dominusLevel.color
                    }}>
                    
                        {getMotivationalMessage(dominusScore)}
                      </div>
                  }
                  </SectionCard>

                  {/* ── SECTION 6: Weekly Progress ── */}
                  <SectionCard>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-[#EB5002]/20 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-[#EB5002]" />
                      </div>
                      <h2 className="text-base font-bold text-foreground">Evolução Semanal</h2>
                    </div>

                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={weeklyChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis
                          dataKey="dia"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={false}
                          tickLine={false} />
                        
                          <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={false}
                          tickLine={false} />
                        
                          <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(v: number, name: string) => [
                          `${v}%`,
                          name === "produtividade" ? "Produtividade" : "Pontuação Adominus"]
                          } />
                        
                          <Line
                          type="monotone"
                          dataKey="produtividade"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ r: 3, fill: "hsl(var(--primary))" }}
                          activeDot={{ r: 5 }} />
                        
                          <Line
                          type="monotone"
                          dataKey="dominus"
                          stroke="#EB5002"
                          strokeWidth={2}
                          strokeDasharray="4 2"
                          dot={{ r: 3, fill: "#EB5002" }}
                          activeDot={{ r: 5 }} />
                        
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="w-4 h-0.5 rounded bg-primary inline-block" />Produtividade
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="w-4 h-0.5 rounded bg-secondary inline-block" />Pontuação Adominus
                      </span>
                    </div>
                  </SectionCard>
                </div>
              </motion.div>
            </>
          }
        </AnimatePresence>
      </div>
    </div>);

}