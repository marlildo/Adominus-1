import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { supabase } from "@/integrations/supabase/client";
import { Plus, AlertTriangle, Shield, Trash2, ChevronDown, ChevronUp, Calendar, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import type { AddictionRelapse } from "@/store/useAppStore";

const TIPOS = [
  { value: "redes_sociais", label: "📱 Redes Sociais" },
  { value: "alcool", label: "🍺 Álcool" },
  { value: "jogos", label: "🎮 Jogos" },
  { value: "apostas", label: "🎲 Apostas" },
  { value: "tabaco", label: "🚬 Tabaco" },
  { value: "comida", label: "🍔 Comida" },
  { value: "cafeina", label: "☕ Cafeína" },
  { value: "series", label: "📺 Séries/TV" },
  { value: "drogas", label: "💊 Drogas" },
  { value: "outros", label: "⚡ Outros" },
];

const DIFICULDADES = [
  { value: "fácil", label: "Fácil" },
  { value: "médio", label: "Médio" },
  { value: "difícil", label: "Difícil" },
  { value: "extremo", label: "Extremo" },
];

const DIFICULDADE_COLOR: Record<string, string> = {
  fácil: "#646464",
  médio: "#EB5002",
  difícil: "#F16001",
  extremo: "#C10801",
};

function RelapseHistoryModal({ addictionId, title, open, onClose }: {
  addictionId: string; title: string; open: boolean; onClose: () => void;
}) {
  const [relapses, setRelapses] = useState<AddictionRelapse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (supabase as any)
      .from("addiction_relapses").select("*").eq("addiction_id", addictionId)
      .order("relapsed_at", { ascending: false })
      .then(({ data }: { data: Record<string, unknown>[] | null }) => {
        if (data) {
          setRelapses(data.map((r) => ({
            id: r.id as string, addictionId: r.addiction_id as string, userId: r.user_id as string,
            relapsedAt: r.relapsed_at as string, cause: r.cause as string | undefined,
            reflection: r.reflection as string | undefined, streakAtRelapse: r.streak_at_relapse as number,
          })));
        }
        setLoading(false);
      });
  }, [open, addictionId]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <Calendar className="w-4 h-4 text-destructive" />
            Histórico de Recaídas — {title}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Carregando...</div>
        ) : relapses.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-3xl mb-2">🏆</p>
            <p className="text-sm text-muted-foreground">Nenhuma recaída registrada. Continue assim!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {relapses.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl p-3.5 space-y-2 border border-border/60 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-destructive">
                    {new Date(r.relapsedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Streak perdida: <strong>{r.streakAtRelapse}d</strong>
                  </span>
                </div>
                {r.cause && <p className="text-xs text-foreground">{r.cause}</p>}
                {r.reflection && <p className="text-xs text-muted-foreground italic">"{r.reflection}"</p>}
              </motion.div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RelapseModal({ addiction, open, onClose }: {
  addiction: ReturnType<typeof useAppStore.getState>["addictions"][0]; open: boolean; onClose: () => void;
}) {
  const { recordRelapse } = useAppStore();
  const [cause, setCause] = useState("");
  const [reflection, setReflection] = useState("");

  const handleConfirm = () => {
    recordRelapse(addiction.id, cause.trim() || undefined, reflection.trim() || undefined);
    setCause(""); setReflection(""); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive text-sm font-semibold">
            <AlertTriangle className="w-4 h-4" /> Registrar Recaída
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            É normal ter dificuldades. O importante é aprender e continuar. Você está prestes a perder{" "}
            <strong className="text-foreground">{addiction.cleanStreak} dias</strong> de progresso.
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">O que causou a recaída?</label>
            <Input placeholder="Ex: Estresse, tédio, gatilho específico..." value={cause} onChange={(e) => setCause(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Reflexão (opcional)</label>
            <Textarea placeholder="O que você aprendeu? Como evitar no futuro?" value={reflection} onChange={(e) => setReflection(e.target.value)} className="min-h-[76px] resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button variant="destructive" className="flex-1" onClick={handleConfirm}>Confirmar Recaída</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddictionCard({ addiction }: { addiction: ReturnType<typeof useAppStore.getState>["addictions"][0] }) {
  const { deleteAddiction } = useAppStore();
  const [showRelapse, setShowRelapse] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const tipoLabel = TIPOS.find((t) => t.value === addiction.type)?.label ?? addiction.type;
  const goalProgress = Math.min((addiction.cleanStreak / addiction.goalDays) * 100, 100);
  const relapseCount = addiction.relapseHistory.length;
  const diffColor = DIFICULDADE_COLOR[addiction.difficulty] ?? "hsl(var(--muted-foreground))";

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const labels = ["D", "S", "T", "Q", "Q", "S", "S"];
    return { label: labels[d.getDay()], relapsed: addiction.relapseHistory.includes(dateStr), isToday: i === 6 };
  });

  return (
    <>
      <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ y: -2, boxShadow: "0 8px 28px hsl(var(--primary) / 0.10)" }}
        transition={{ duration: 0.25 }}
        className="apple-section overflow-hidden">

        {/* Header row */}
        <div className="flex items-start justify-between p-4 pb-3"
          style={{ borderBottom: "0.5px solid hsl(var(--border) / 0.6)" }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: "hsl(var(--muted))" }}>
              {tipoLabel.split(" ")[0]}
            </div>
            <div>
              <p className="font-semibold text-foreground tracking-tight">{addiction.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{tipoLabel.split(" ").slice(1).join(" ")}</span>
                <span className="text-xs font-semibold" style={{ color: diffColor }}>· {addiction.difficulty}</span>
              </div>
            </div>
          </div>
          <motion.button
            onClick={() => setConfirmDelete(true)}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.88 }}
            className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground">
            <Trash2 className="w-3.5 h-3.5" />
          </motion.button>
        </div>

        <div className="p-4 space-y-4">
          {/* Streak hero */}
          <div className="text-center py-4 rounded-2xl"
            style={{ background: "rgba(235,80,2 / 0.05)", border: "0.5px solid rgba(235,80,2 / 0.18)" }}>
            <div className="text-4xl font-black text-foreground tabular-nums">{addiction.cleanStreak}</div>
            <div className="text-sm text-muted-foreground mt-0.5">dias sem {addiction.title.toLowerCase()}</div>
            <div className="text-xs font-semibold mt-1 text-[#EB5002]">
              {addiction.cleanStreak >= addiction.goalDays ? "🏆 Meta atingida!"
                : addiction.cleanStreak >= 30 ? "🔥 Incrível!"
                : addiction.cleanStreak >= 7 ? "💪 Continue!"
                : "⚡ Você consegue!"}
            </div>
          </div>

          {/* Goal progress */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Target className="w-3 h-3" /> Meta: {addiction.goalDays} dias
              </span>
              <span className="text-xs font-semibold text-foreground">{Math.round(goalProgress)}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden bg-muted">
              <motion.div className="h-full rounded-full bg-[#EB5002]" initial={{ width: 0 }}
                animate={{ width: `${goalProgress}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
            </div>
          </div>

          {/* Last 7 days — weekly strip */}
          <div className="grid grid-cols-7 gap-1.5">
            {last7.map((day, i) => (
              <div key={i} className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl"
                style={
                  day.relapsed
                    ? { background: "hsl(var(--destructive)/0.12)", border: "1px solid hsl(var(--destructive)/0.35)", color: "hsl(var(--destructive))" }
                    : day.isToday
                    ? { background: "rgba(235,80,2/0.15)", border: "1px solid rgba(235,80,2/0.35)", color: "rgba(235,80,2)" }
                    : { background: "hsl(var(--muted)/0.7)", border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))" }
                }>
                <span className="text-[9px] font-bold">{`D${i + 1}`}</span>
                {day.relapsed ? (
                  <div className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center"
                    style={{ borderColor: "hsl(var(--destructive)/0.6)" }}>
                    <span className="text-[8px] font-black leading-none">✗</span>
                  </div>
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity={day.isToday ? "0.8" : "0.4"} strokeWidth="1.5" />
                    {(day.isToday || !day.relapsed) && addiction.cleanStreak > 0 && (
                      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    )}
                  </svg>
                )}
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="flex gap-2">
            <div className="flex-1 rounded-xl p-2.5 text-center" style={{ background: "hsl(var(--muted) / 0.5)", border: "0.5px solid hsl(var(--border) / 0.5)" }}>
              <div className="text-base font-black text-foreground">{relapseCount}</div>
              <div className="text-[10px] text-muted-foreground">recaídas</div>
            </div>
            <div className="flex-1 rounded-xl p-2.5 text-center" style={{ background: "hsl(var(--muted) / 0.5)", border: "0.5px solid hsl(var(--border) / 0.5)" }}>
              <div className="text-base font-black text-foreground">{Math.max(0, addiction.goalDays - addiction.cleanStreak)}</div>
              <div className="text-[10px] text-muted-foreground">dias restantes</div>
            </div>
            {addiction.motivation && (
              <button onClick={() => setExpanded((v) => !v)}
                className="flex-1 rounded-xl p-2.5 text-center flex flex-col items-center gap-0.5 transition-colors hover:bg-muted"
                style={{ background: "hsl(var(--muted) / 0.5)", border: "0.5px solid hsl(var(--border) / 0.5)" }}>
                <span className="text-base">💬</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  Motivo {expanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                </span>
              </button>
            )}
          </div>

          {/* Motivation expand */}
          <AnimatePresence>
            {expanded && addiction.motivation && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="rounded-xl p-3" style={{ background: "hsl(var(--primary) / 0.05)", border: "0.5px solid hsl(var(--primary) / 0.18)" }}>
                  <p className="text-xs text-foreground italic">"{addiction.motivation}"</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-2 pt-1" style={{ borderTop: "0.5px solid hsl(var(--border) / 0.5)" }}>
            <button onClick={() => setShowHistory(true)}
              className="flex-1 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              style={{ border: "0.5px solid hsl(var(--border))", background: "hsl(var(--muted) / 0.3)" }}>
              <Calendar className="w-3.5 h-3.5" /> Ver Histórico
            </button>
            <button onClick={() => setShowRelapse(true)}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 text-destructive hover:bg-destructive/5 transition-colors"
              style={{ border: "0.5px solid hsl(var(--destructive) / 0.3)" }}>
              <AlertTriangle className="w-3.5 h-3.5" /> Recaída
            </button>
          </div>
        </div>
      </motion.div>

      <RelapseModal addiction={addiction} open={showRelapse} onClose={() => setShowRelapse(false)} />
      <RelapseHistoryModal addictionId={addiction.id} title={addiction.title} open={showHistory} onClose={() => setShowHistory(false)} />
      <DeleteConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir vício"
        description={`Tem certeza que deseja excluir "${addiction.title}"? Todo o histórico de streak e recaídas será perdido.`}
        onConfirm={() => deleteAddiction(addiction.id)}
      />
    </>
  );
}

function AddAddictionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addAddiction } = useAppStore();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("outros");
  const [difficulty, setDifficulty] = useState("médio");
  const [goalDays, setGoalDays] = useState(30);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [motivation, setMotivation] = useState("");

  const handleAdd = () => {
    if (!title.trim()) return;
    addAddiction({
      title: title.trim(), icon: TIPOS.find((t) => t.value === type)?.label.split(" ")[0] ?? "⚡",
      type, difficulty, goalDays, startDate, motivation: motivation.trim() || undefined,
    });
    setTitle(""); setType("outros"); setDifficulty("médio"); setGoalDays(30);
    setStartDate(new Date().toISOString().split("T")[0]); setMotivation(""); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <Shield className="w-4 h-4 text-primary" /> Novo Controle de Vício
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nome do Vício <span className="text-destructive">*</span></label>
            <Input placeholder="Ex: Instagram, TikTok, etc." value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Dificuldade</label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DIFICULDADES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Target className="w-3.5 h-3.5" /> Meta (dias)</label>
              <Input type="number" min={1} max={365} value={goalDays} onChange={(e) => setGoalDays(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Data de Início</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-primary" /> Sua Motivação</label>
            <Textarea placeholder="Por que você quer superar isso?" value={motivation} onChange={(e) => setMotivation(e.target.value)} className="min-h-[72px] resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" onClick={handleAdd} disabled={!title.trim()}>Criar Controle</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Vicios() {
  const { addictions, addDemoAddiction } = useAppStore();
  const [open, setOpen] = useState(false);
  const totalCleanDays = addictions.reduce((s, a) => s + a.cleanStreak, 0);
  const totalRelapses = addictions.reduce((s, a) => s + a.relapseHistory.length, 0);

  const handleLoadDemo = () => {
    const today = new Date();
    const dateStr = (offset: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - offset);
      return d.toISOString().split("T")[0];
    };
    addDemoAddiction({
      title: "Instagram",
      icon: "📱",
      type: "redes_sociais",
      difficulty: "difícil",
      goalDays: 30,
      startDate: dateStr(9),
      motivation: "Quero ser mais produtivo e ter mais foco no trabalho",
      cleanStreak: 5,
      relapseHistory: [dateStr(3)],
      relapses: [],
    });
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 pb-8 max-w-4xl mx-auto w-full">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="premium-card p-5 card-accent-top relative overflow-hidden flex items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
          style={{ background: "radial-gradient(circle at 80% 20%, hsl(var(--primary) / 0.12) 0%, transparent 65%)" }} />
        <div className="flex items-center gap-3 relative z-10">
           <div className="w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0 bg-primary">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-[22px] font-black text-foreground tracking-tight hero-label">Controle de Vícios</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              <span className="font-semibold text-[#EB5002]">{totalCleanDays}</span> dias limpos no total
            </p>
          </div>
        </div>
        <motion.button whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.96 }}
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-primary-foreground ripple-btn relative z-10"
          style={{ background: "hsl(var(--primary))", boxShadow: "var(--shadow-btn)" }}>
          <Plus className="w-4 h-4" /> Novo
        </motion.button>
      </motion.div>

      {/* Stats banner */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
        className="apple-section p-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(235,80,2 / 0.1)", border: "0.5px solid rgba(235,80,2 / 0.25)" }}>
            <Shield className="w-5 h-5 text-[#EB5002]" />
          </div>
          <div className="flex-1 grid grid-cols-3 gap-4 text-center">
            {[
              { value: addictions.length, label: "controles", color: "text-foreground" },
              { value: totalCleanDays, label: "dias limpos", color: "text-[#EB5002]" },
              { value: totalRelapses, label: "recaídas", color: "text-destructive" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.07 }}
              >
                <motion.div
                  key={s.value}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={cn("text-xl font-black", s.color)}
                >{s.value}</motion.div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3 pt-3" style={{ borderTop: "0.5px solid hsl(var(--border) / 0.5)" }}>
          Cada dia limpo vale +20 XP. Recaídas penalizam -20 XP. Mantenha o controle e evolua!
        </p>
      </motion.div>

      {/* Cards */}
      <AnimatePresence mode="popLayout">
        <div className="grid sm:grid-cols-2 gap-4">
          {addictions.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
            >
              <AddictionCard addiction={a} />
            </motion.div>
          ))}
          {addictions.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="col-span-2 text-center py-16 rounded-2xl border border-dashed border-border/60 space-y-4">
              <p className="text-4xl">🛡️</p>
              <div>
                <p className="text-base font-semibold text-foreground mb-1">Nenhum controle ativo</p>
                <p className="text-sm text-muted-foreground">Adicione um vício para começar a monitorar seu progresso</p>
              </div>
              <button onClick={handleLoadDemo}
                className="mx-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                style={{ border: "0.5px solid hsl(var(--border))", background: "hsl(var(--muted)/0.4)" }}>
                <Zap className="w-3.5 h-3.5 text-primary" /> Carregar Exemplo
              </button>
            </motion.div>
          )}
        </div>
      </AnimatePresence>

      <AddAddictionModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
