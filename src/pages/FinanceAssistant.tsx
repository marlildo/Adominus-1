import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, Plus, Trash2, Bell, ChevronLeft, ChevronRight,
  Target, TrendingUp, TrendingDown, X, Check, Sparkles,
  CreditCard, Home, Car, ShoppingCart, Coffee, Gamepad2, Repeat,
  FileText, Tag, Loader2, Send, Bot, BarChart2,
  Zap, DollarSign, PiggyBank, Shield, Activity,
  Calendar, Clock, ArrowUpRight, ArrowDownRight,
  Brain, LineChart, PieChartIcon, Award, Star,
  AlertTriangle, CheckCircle2, Info, Banknote,
  LayoutDashboard, MessageSquare, Settings2, Download,
  Flame, Package, Smartphone, Tv } from
"lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartTooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar,
  LineChart as ReLineChart, Line, Legend } from
"recharts";
import { useToast } from "@/hooks/use-toast";

// ── Constants ──────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
{ id: "food", label: "Alimentação", Icon: Coffee, color: "#E85002" },
{ id: "transport", label: "Transporte", Icon: Car, color: "#E85002" },
{ id: "housing", label: "Moradia", Icon: Home, color: "#E85002" },
{ id: "shopping", label: "Compras", Icon: ShoppingCart, color: "#E85002" },
{ id: "entertainment", label: "Lazer", Icon: Gamepad2, color: "#E85002" },
{ id: "subscriptions", label: "Assinaturas", Icon: Repeat, color: "#E85002" },
{ id: "bills", label: "Contas", Icon: FileText, color: "var(--bg-card)" },
{ id: "others", label: "Outros", Icon: Tag, color: "var(--bg-card)" }];


const INCOME_CATEGORIES = [
{ id: "salary", label: "Salário", Icon: DollarSign, color: "#E85002" },
{ id: "investments", label: "Investimentos", Icon: TrendingUp, color: "#E85002" },
{ id: "others", label: "Outros", Icon: PiggyBank, color: "var(--bg-card)" }];


const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTHS_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const fmt = (n: number) =>
`R$\u00A0${n.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const fmtShort = (n: number) => {
  if (n >= 1000000) return `R$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `R$${(n / 1000).toFixed(1)}k`;
  return `R$${n.toFixed(0)}`;
};

function getCategoryMeta(id: string) {
  return (
    EXPENSE_CATEGORIES.find((c) => c.id === id) ??
    INCOME_CATEGORIES.find((c) => c.id === id) ??
    EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]);

}

// ── Interfaces ────────────────────────────────────────────────────────────────

interface Commitment {
  id: string;title: string;amount: number;dueDay: number;category: string;reminder: boolean;
}
interface BudgetGoal {categoryId: string;limit: number;}
interface SavingsGoal {id: string;title: string;target: number;current: number;icon: string;color: string;}
type ChatMsg = {role: "user" | "assistant";content: string;};
type Tab = "dashboard" | "analytics" | "chat" | "goals" | "bills";

// ── Glass Card ────────────────────────────────────────────────────────────────

function GlassCard({ children, className, style, onClick
}: {children: React.ReactNode;className?: string;style?: React.CSSProperties;onClick?: () => void;}) {
  return (
    <div
      onClick={onClick}
      className={cn("rounded-2xl", className, onClick && "cursor-pointer")}
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        boxShadow: "0 2px 20px rgba(0,0,0,0.08)",
        ...style
      }}>
      {children}
    </div>);
}

// ── Metric Card ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, Icon, color, trend, trendVal
}: {label: string;value: string;sub?: string;Icon: React.ElementType;color: string;trend?: "up" | "down" | "neutral";trendVal?: string;}) {
  return (
    <GlassCard className="p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04] rounded-2xl pointer-events-none"
        style={{ background: `radial-gradient(circle at top right, ${color}, transparent 70%)` }} />
      <div className="flex items-start justify-between mb-2.5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        {trend && trendVal &&
          <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5",
            trend === "up" ? "bg-primary/10 text-primary" :
            trend === "down" ? "bg-[#C10801]/10 text-[#C10801]" :
            "text-muted-foreground bg-muted"
          )}>
            {trend === "up" ? <ArrowUpRight className="w-2.5 h-2.5" /> : trend === "down" ? <ArrowDownRight className="w-2.5 h-2.5" /> : null}
            {trendVal}
          </span>
        }
      </div>
      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-xl font-black text-foreground tabular-nums leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </GlassCard>);
}

// ── Health Score Gauge ────────────────────────────────────────────────────────

function HealthGauge({ score }: {score: number;}) {
  const clamp = Math.min(100, Math.max(0, score));
  const angle = clamp / 100 * 180 - 90; // -90 to 90 degrees
  const color = clamp >= 75 ? "#E85002" : clamp >= 50 ? "#E85002" : clamp >= 25 ? "#E85002" : "var(--text-tertiary)";
  const label = clamp >= 75 ? "Excelente" : clamp >= 50 ? "Bom" : clamp >= 25 ? "Regular" : "Crítico";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-20 overflow-hidden">
        <svg viewBox="0 0 160 80" className="w-full h-full">
          {/* Background arc */}
          <path d="M 10 80 A 70 70 0 0 1 150 80" fill="none" stroke="hsl(var(--muted))" strokeWidth="12" strokeLinecap="round" />
          {/* Color zones */}
          <path d="M 10 80 A 70 70 0 0 1 44 23" fill="none" stroke="var(--border)" strokeWidth="12" strokeLinecap="round" opacity="0.3" />
          <path d="M 44 23 A 70 70 0 0 1 80 10" fill="none" stroke="#E85002" strokeWidth="12" strokeLinecap="round" opacity="0.3" />
          <path d="M 80 10 A 70 70 0 0 1 116 23" fill="none" stroke="#E85002" strokeWidth="12" strokeLinecap="round" opacity="0.3" />
          <path d="M 116 23 A 70 70 0 0 1 150 80" fill="none" stroke="#E85002" strokeWidth="12" strokeLinecap="round" opacity="0.3" />
          {/* Needle */}
          <line
            x1="80" y1="80" x2="80" y2="20"
            stroke={color} strokeWidth="3" strokeLinecap="round"
            transform={`rotate(${angle}, 80, 80)`} />
          
          <circle cx="80" cy="80" r="6" fill={color} />
        </svg>
      </div>
      <div className="text-center -mt-2">
        <p className="text-3xl font-black" style={{ color }}>{clamp}</p>
        <p className="text-xs font-bold mt-0.5" style={{ color }}>{label}</p>
        <p className="text-xs text-muted-foreground">Saúde Financeira</p>
      </div>
    </div>);

}

// ── Spending Heatmap ──────────────────────────────────────────────────────────

function SpendingHeatmap({ transactions, month, year


}: {transactions: {date: string;amount: number;type: string;}[];month: number;year: number;}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const dailySpend = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((t) => {
      if (t.type === "despesa") {
        map[t.date] = (map[t.date] || 0) + t.amount;
      }
    });
    return map;
  }, [transactions]);

  const maxSpend = Math.max(...Object.values(dailySpend), 1);

  const getColor = (spend: number) => {
    if (!spend) return "hsl(var(--muted))";
    const ratio = spend / maxSpend;
    if (ratio > 0.75) return "#E85002";
    if (ratio > 0.5) return "#E85002";
    if (ratio > 0.25) return "#E85002";
    return "var(--text-tertiary)";
  };

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) =>
        <div key={i} className="text-center text-[10px] text-muted-foreground font-semibold">{d}</div>
        )}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {blanks.map((_, i) => <div key={`b${i}`} />)}
        {days.map((day) => {
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const spend = dailySpend[dateStr] || 0;
          const today = new Date().toISOString().split("T")[0];
          return (
            <div
              key={day}
              className="aspect-square rounded-md flex items-center justify-center text-[10px] font-bold relative group"
              style={{ background: getColor(spend), opacity: dateStr > today ? 0.3 : 1 }}
              title={spend ? `${day}: ${fmt(spend)}` : undefined}>
              
              <span className={cn("text-white", !spend && "text-muted-foreground")} style={{ color: spend ? "white" : undefined }}>
                {day}
              </span>
              {spend > 0 &&
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 bg-background border border-border rounded-lg px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                  {fmtShort(spend)}
                </div>
              }
            </div>);

        })}
      </div>
      <div className="flex items-center gap-2 mt-2 justify-end">
        {[
        { color: "#E85002", label: "Baixo" },
        { color: "#E85002", label: "Médio" },
        { color: "#E85002", label: "Alto" },
        { color: "#E85002", label: "Crítico" }].
        map(({ color, label }) =>
        <div key={label} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        )}
      </div>
    </div>);

}

// ── Transaction Modal ─────────────────────────────────────────────────────────

function TransactionModal({
  type, open, onClose, onSave, todayStr



}: {type: "despesa" | "receita";open: boolean;onClose: () => void;onSave: (data: {title: string;amount: number;category: string;type: "despesa" | "receita";date: string;}) => void;todayStr: string;}) {
  const [amount, setAmount] = useState("");
  const [selectedCat, setSelectedCat] = useState(type === "despesa" ? "food" : "salary");
  const [customTitle, setCustomTitle] = useState("");
  const cats = type === "despesa" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const isIncome = type === "receita";
  const accent = isIncome ? "#E85002" : "#E85002";

  const todayLabel = new Date(todayStr + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long"
  });
  const todayCapitalized = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);

  const handleSave = () => {
    const parsed = parseFloat(amount.replace(",", "."));
    if (!parsed || parsed <= 0) return;
    const cat = cats.find((c) => c.id === selectedCat) ?? cats[0];
    onSave({
      title: customTitle.trim() || cat.label,
      amount: parsed, category: selectedCat, type, date: todayStr
    });
    setAmount("");setCustomTitle("");
    setSelectedCat(type === "despesa" ? "food" : "salary");
    onClose();
  };

  return (
    <AnimatePresence>
      {open &&
      <motion.div className="fixed inset-0 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
          className="relative w-full max-w-lg rounded-t-3xl overflow-hidden"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}>
          
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><ChevronLeft className="w-5 h-5" /></button>
              <span className="text-base font-bold text-foreground">{isIncome ? "Nova receita" : "Nova despesa"}</span>
              <div className="w-5" />
            </div>
            <p className="text-center text-sm text-muted-foreground py-2 font-medium">📅 {todayCapitalized}</p>
            <div className="mx-4 mb-3 rounded-2xl flex items-center gap-3 px-4 py-4"
          style={{ background: accent, boxShadow: `0 6px 24px ${accent}55` }}>
              <div className="flex-shrink-0 bg-white/20 rounded-xl p-2"><Wallet className="w-5 h-5 text-white" /></div>
              <div className="flex-1 text-white text-2xl font-black">{amount || <span className="opacity-50">0</span>}</div>
              <span className="text-white/70 text-sm font-semibold">BRL</span>
              <button onClick={() => setAmount((a) => a.slice(0, -1))} className="bg-white/20 rounded-xl p-2">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="px-4 pb-2">
              <input
              className="w-full h-10 px-3 rounded-xl text-sm text-foreground outline-none"
              style={{ background: "hsl(var(--muted)/0.5)", border: "1px solid hsl(var(--border))" }}
              placeholder="Descrição (opcional)"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)} />
            
            </div>
            <div className="grid grid-cols-4 gap-2 px-4 pb-3">
              {cats.map(({ id, label, Icon, color }) =>
            <motion.button key={id} whileTap={{ scale: 0.93 }} onClick={() => setSelectedCat(id)}
            className={cn("flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl border transition-all text-[10px] font-semibold",
            selectedCat === id ? "border-2" : "border-border")}
            style={{
              background: selectedCat === id ? `${color}22` : "hsl(var(--card))",
              borderColor: selectedCat === id ? color : undefined,
              color: selectedCat === id ? color : "hsl(var(--muted-foreground))"
            }}>
                  <Icon className="w-5 h-5" style={{ color }} />{label}
                </motion.button>
            )}
            </div>
            <div className="grid grid-cols-3 gap-1 px-4 pb-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", 0, "⌫"].map((k) =>
            <button key={k}
            onClick={() => {
              const s = String(k);
              if (s === "⌫") setAmount((a) => a.slice(0, -1));else
              if (s === "." && amount.includes(".")) return;else
              setAmount((a) => a + s);
            }}
            className="h-11 rounded-xl text-base font-bold text-foreground transition-colors"
            style={{ background: "hsl(var(--muted)/0.4)" }}>
                  {k}
                </button>
            )}
            </div>
            <div className="px-4 pb-6 pt-2">
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave}
            disabled={!amount || parseFloat(amount) <= 0}
            className="w-full h-13 h-[52px] rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: accent, boxShadow: `0 6px 20px ${accent}55` }}>
                <Check className="w-5 h-5" /> Registrar
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      }
    </AnimatePresence>);

}

// ── AI Chat Panel ─────────────────────────────────────────────────────────────

function AIChatPanel({ financialContext, onAction


}: {financialContext: object;onAction: (action: {type: string;data: Record<string, unknown>;}) => void;}) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
  const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

  useEffect(() => {endRef.current?.scrollIntoView({ behavior: "smooth" });}, [messages]);

  const EXAMPLES = [
  "Quanto gastei hoje?", "Saldo do mês?", "Paguei 30 reais de gasolina",
  "Recebi 10 mil reais de salário", "Quais categorias eu mais gasto?",
  "Tenho saldo positivo?", "Paguei 100 reais no mercado",
  "Quanto gastei em alimentação?"];


  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMsg = { role: "user", content: text.trim() };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);setInput("");setLoading(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/finance-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: newHistory, financialContext })
      });
      if (!resp.ok) {toast({ title: "Erro no assistente", variant: "destructive" });setLoading(false);return;}
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "",assistantText = "";
      const push = (chunk: string) => {
        assistantText += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m);
          return [...prev, { role: "assistant", content: assistantText }];
        });
      };
      let done = false;
      while (!done) {
        const { done: sd, value } = await reader.read();
        if (sd) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ") || !line.trim()) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {done = true;break;}
          try {const p = JSON.parse(json);const c = p.choices?.[0]?.delta?.content;if (c) push(c);}
          catch {buf = line + "\n" + buf;break;}
        }
      }
      const actionMatch = assistantText.match(/<ACTION>(.+?)<\/ACTION>/s);
      if (actionMatch) {
        try {onAction(JSON.parse(actionMatch[1]));}
        catch {/* ignore */}
        setMessages((prev) => prev.map((m, i) => i === prev.length - 1 ?
        { ...m, content: m.content.replace(/<ACTION>.*?<\/ACTION>/s, "").trim() } : m));
      }
    } catch {toast({ title: "Erro de conexão", variant: "destructive" });} finally
    {setLoading(false);}
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 &&
        <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: "rgba(238,78,0,0.15)", border: "1px solid rgba(238,78,0,0.3)" }}>
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-bold text-foreground">Meu Assessor Financeiro 24h</p>
              <p className="text-xs text-muted-foreground mt-1">Pergunte, registre e analise suas finanças</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {EXAMPLES.map((ex) =>
            <button key={ex} onClick={() => send(ex)}
            className="text-left px-3 py-2.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                  {ex}
                </button>
            )}
            </div>
          </div>
        }
        {messages.map((m, i) =>
        <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "assistant" &&
          <div className="w-7 h-7 rounded-lg flex items-center justify-center mr-2 flex-shrink-0 mt-1"
          style={{ background: "hsl(var(--primary))" }}>
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
          }
            <div className={cn("max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
          m.role === "user" ? "rounded-br-sm text-white" : "rounded-bl-sm text-foreground")}
          style={{
            background: m.role === "user" ? "hsl(var(--primary))" : "hsl(var(--card))",
            border: m.role === "assistant" ? "1px solid hsl(var(--border))" : undefined
          }}>
              {m.content}
            </div>
          </div>
        )}
        {loading &&
        <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "hsl(var(--primary))" }}>
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) =>
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              )}
              </div>
            </div>
          </div>
        }
        <div ref={endRef} />
      </div>
      <div className="px-4 pb-4 pt-3 border-t border-border">
        <div className="flex gap-2 items-center">
          <input
            className="flex-1 h-11 px-4 rounded-2xl text-sm text-foreground outline-none"
            style={{ background: "hsl(var(--muted)/0.5)", border: "1px solid hsl(var(--border))" }}
            placeholder="Pergunte ou registre um gasto..."
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)} />
          
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => send(input)}
          disabled={!input.trim() || loading}
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #E85002, #E85002)" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </motion.button>
        </div>
      </div>
    </div>);

}

// ── Savings Goal Modal ────────────────────────────────────────────────────────

function SavingsGoalModal({ open, onClose, onSave


}: {open: boolean;onClose: () => void;onSave: (goal: Omit<SavingsGoal, "id">) => void;}) {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [icon, setIcon] = useState("🎯");
  const [color, setColor] = useState("#E85002");
  const ICONS = ["🎯", "✈️", "🏠", "🚗", "💎", "📱", "🎓", "💰", "🏋️", "🌍"];
  const COLORS = ["#E85002", "#E85002", "#E85002", "#E85002", "#E85002", "#E85002", "#E85002", "#E85002"];

  const handleSave = () => {
    if (!title.trim() || !target) return;
    onSave({ title: title.trim(), target: parseFloat(target) || 0, current: parseFloat(current) || 0, icon, color });
    setTitle("");setTarget("");setCurrent("");setIcon("🎯");setColor("#E85002");
    onClose();
  };

  return (
    <AnimatePresence>
      {open &&
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div className="relative w-full max-w-sm rounded-3xl p-6 z-10"
        style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-foreground">Nova Meta</h3>
              <button onClick={onClose} className="text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap mb-1">
                {ICONS.map((ic) =>
              <button key={ic} onClick={() => setIcon(ic)}
              className={cn("w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all",
              icon === ic ? "bg-primary/20 ring-2 ring-primary" : "bg-muted")}>{ic}</button>
              )}
              </div>
              <input className="w-full h-10 px-3 rounded-xl text-sm outline-none"
            style={{ background: "hsl(var(--muted)/0.5)", border: "1px solid hsl(var(--border))" }}
            placeholder="Nome da meta" value={title} onChange={(e) => setTitle(e.target.value)} />
              <input className="w-full h-10 px-3 rounded-xl text-sm outline-none"
            style={{ background: "hsl(var(--muted)/0.5)", border: "1px solid hsl(var(--border))" }}
            placeholder="Valor alvo (R$)" type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
              <input className="w-full h-10 px-3 rounded-xl text-sm outline-none"
            style={{ background: "hsl(var(--muted)/0.5)", border: "1px solid hsl(var(--border))" }}
            placeholder="Valor atual (R$)" type="number" value={current} onChange={(e) => setCurrent(e.target.value)} />
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) =>
              <button key={c} onClick={() => setColor(c)}
              className={cn("w-7 h-7 rounded-full transition-all", color === c ? "ring-2 ring-offset-2 ring-foreground scale-110" : "")}
              style={{ background: c }} />
              )}
              </div>
              <button onClick={handleSave} disabled={!title.trim() || !target}
            className="w-full h-11 rounded-xl text-white font-bold text-sm disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #E85002, #E85002)" }}>
                Criar Meta
              </button>
            </div>
          </motion.div>
        </motion.div>
      }
    </AnimatePresence>);

}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function FinanceAssistant() {
  const { transactions, addTransaction, deleteTransaction } = useAppStore();
  const { user } = useAuth();
  const { toast } = useToast();

  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [txModal, setTxModal] = useState<null | "despesa" | "receita">(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [smartInput, setSmartInput] = useState("");
  const [smartLoading, setSmartLoading] = useState(false);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    danger?: boolean;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });

  const openConfirm = (title: string, description: string, onConfirm: () => void, danger = true) =>
  setConfirmDialog({ open: true, title, description, onConfirm, danger });
  const closeConfirm = () => setConfirmDialog((p) => ({ ...p, open: false }));

  const todayStr = now.toISOString().split("T")[0];
  const startOfViewMonth = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
  const endOfViewMonth = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(new Date(viewYear, viewMonth + 1, 0).getDate()).padStart(2, "0")}`;

  const prevMonth = () => {
    if (viewMonth === 0) {setViewMonth(11);setViewYear((y) => y - 1);} else
    setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {setViewMonth(0);setViewYear((y) => y + 1);} else
    setViewMonth((m) => m + 1);
  };

  // ── DB ───────────────────────────────────────────────────────────────────────
  const [budgetGoals, setBudgetGoals] = useState<BudgetGoal[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);

  const fetchBudgetGoals = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("budget_goals").select("*").eq("user_id", user.id);
    if (data) setBudgetGoals(data.map((r) => ({ categoryId: r.category_id, limit: Number(r.limit_amount) })));
  }, [user]);

  const fetchCommitments = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("financial_commitments").select("*").eq("user_id", user.id).order("due_day");
    if (data) setCommitments(data.map((r) => ({
      id: r.id, title: r.title, amount: Number(r.amount),
      dueDay: r.due_day, category: r.category, reminder: r.reminder
    })));
  }, [user]);

  useEffect(() => {fetchBudgetGoals();fetchCommitments();}, [fetchBudgetGoals, fetchCommitments]);

  // ── Computed ─────────────────────────────────────────────────────────────────
  const monthTx = useMemo(
    () => transactions.filter((t) => t.date >= startOfViewMonth && t.date <= endOfViewMonth),
    [transactions, startOfViewMonth, endOfViewMonth]
  );

  const totalReceita = useMemo(() => monthTx.filter((t) => t.type === "receita").reduce((s, t) => s + t.amount, 0), [monthTx]);
  const totalDespesa = useMemo(() => monthTx.filter((t) => t.type === "despesa").reduce((s, t) => s + t.amount, 0), [monthTx]);
  const saldo = totalReceita - totalDespesa;
  const savingsRate = totalReceita > 0 ? saldo / totalReceita * 100 : 0;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const dayOfMonth = viewMonth === now.getMonth() && viewYear === now.getFullYear() ? now.getDate() : daysInMonth;
  const projectedExpense = dayOfMonth > 0 ? totalDespesa / dayOfMonth * daysInMonth : totalDespesa;
  const projectedBalance = totalReceita - projectedExpense;

  const catData = useMemo(() =>
  EXPENSE_CATEGORIES.map((cat) => ({
    id: cat.id, name: cat.label, color: cat.color,
    value: monthTx.filter((t) => t.type === "despesa" && t.category === cat.id).reduce((s, t) => s + t.amount, 0)
  })).filter((c) => c.value > 0),
  [monthTx]
  );

  // Monthly trend (last 6 months)
  const trendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const m = d.getMonth();const y = d.getFullYear();
      const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
      const end = `${y}-${String(m + 1).padStart(2, "0")}-31`;
      const tx = transactions.filter((t) => t.date >= start && t.date <= end);
      return {
        month: MONTHS[m],
        receita: tx.filter((t) => t.type === "receita").reduce((s, t) => s + t.amount, 0),
        despesa: tx.filter((t) => t.type === "despesa").reduce((s, t) => s + t.amount, 0)
      };
    });
  }, [transactions]);

  // Weekly spending (last 7 days)
  const weeklyData = useMemo(() => {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split("T")[0];
      const dayName = days[d.getDay()];
      return {
        day: dayName,
        gasto: transactions.filter((t) => t.date === dateStr && t.type === "despesa").reduce((s, t) => s + t.amount, 0)
      };
    });
  }, [transactions]);

  // Financial health score
  const healthScore = useMemo(() => {
    if (totalReceita === 0) return 50;
    let score = 50;
    // Savings rate: up to +30
    if (savingsRate >= 20) score += 30;else
    if (savingsRate >= 10) score += 20;else
    if (savingsRate >= 0) score += 10;else
    score -= 20;
    // Expense diversity: penalize single-category dominance
    if (catData.length > 0) {
      const topRatio = catData[0].value / totalDespesa;
      if (topRatio < 0.4) score += 15;else
      if (topRatio < 0.6) score += 5;else
      score -= 5;
    }
    // Number of transactions (activity): up to +5
    if (monthTx.length >= 10) score += 5;
    return Math.min(100, Math.max(0, Math.round(score)));
  }, [totalReceita, totalDespesa, savingsRate, catData, monthTx]);

  // AI Insights
  const aiInsights = useMemo(() => {
    const insights: {icon: React.ElementType;color: string;text: string;type: "info" | "warning" | "success";}[] = [];
    if (totalReceita === 0 && totalDespesa === 0) {
      insights.push({ icon: Info, color: "#E85002", text: "Registre suas transações para ver insights personalizados.", type: "info" });
      return insights;
    }
    if (savingsRate < 0) insights.push({ icon: AlertTriangle, color: "#E85002", text: `Você está gastando mais do que ganha este mês. Déficit de ${fmt(Math.abs(saldo))}.`, type: "warning" });else
    if (savingsRate >= 20) insights.push({ icon: CheckCircle2, color: "#E85002", text: `Excelente! Você está economizando ${savingsRate.toFixed(1)}% da sua renda este mês.`, type: "success" });else
    insights.push({ icon: Info, color: "#E85002", text: `Taxa de poupança atual: ${savingsRate.toFixed(1)}%. Meta recomendada: 20%+.`, type: "info" });
    if (catData.length > 0) {
      const top = catData.sort((a, b) => b.value - a.value)[0];
      const pct = totalDespesa > 0 ? (top.value / totalDespesa * 100).toFixed(0) : 0;
      insights.push({ icon: BarChart2, color: "#E85002", text: `Sua maior categoria de gasto é ${top.name} (${pct}% das despesas).`, type: "info" });
    }
    if (totalDespesa > 0 && totalReceita > 0) {
      const expRatio = totalDespesa / totalReceita * 100;
      if (expRatio > 80) insights.push({ icon: AlertTriangle, color: "#E85002", text: `Atenção: suas despesas representam ${expRatio.toFixed(0)}% da sua renda.`, type: "warning" });
    }
    const todaySpend = transactions.filter((t) => t.date === todayStr && t.type === "despesa").reduce((s, t) => s + t.amount, 0);
    if (todaySpend > 0) insights.push({ icon: Clock, color: "#E85002", text: `Você gastou ${fmt(todaySpend)} hoje.`, type: "info" });
    return insights;
  }, [totalReceita, totalDespesa, saldo, savingsRate, catData, transactions, todayStr]);

  // Upcoming commitments
  const upcomingCommitments = useMemo(() => {
    const today = now.getDate();
    return commitments.
    map((c) => ({ ...c, daysUntil: c.dueDay >= today ? c.dueDay - today : c.dueDay + daysInMonth - today })).
    sort((a, b) => a.daysUntil - b.daysUntil).
    slice(0, 5);
  }, [commitments, now, daysInMonth]);

  // AI context
  const financialContext = useMemo(() => ({
    totalReceita, totalDespesa, today: todayStr,
    todaySpent: transactions.filter((t) => t.date === todayStr && t.type === "despesa").reduce((s, t) => s + t.amount, 0),
    todayIncome: transactions.filter((t) => t.date === todayStr && t.type === "receita").reduce((s, t) => s + t.amount, 0),
    transactions: [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30).map((t) => ({
      title: t.title, amount: t.amount, type: t.type, category: t.category, date: t.date
    })),
    commitments: commitments.map((c) => ({ title: c.title, amount: c.amount, dueDay: c.dueDay, category: c.category })),
    budgetGoals: budgetGoals.map((g) => ({
      categoryId: g.categoryId, limit: g.limit,
      spent: monthTx.filter((t) => t.type === "despesa" && t.category === g.categoryId).reduce((s, t) => s + t.amount, 0)
    }))
  }), [totalReceita, totalDespesa, todayStr, transactions, commitments, budgetGoals, monthTx]);

  // AI Action handler
  const handleAIAction = async (action: {type: string;data: Record<string, unknown>;}) => {
    if (action.type === "register_transaction" && action.data) {
      const d = action.data as {title: string;amount: number;type: "despesa" | "receita";category: string;};
      addTransaction({ title: d.title, amount: Number(d.amount), type: d.type, category: d.category, date: todayStr });
      toast({ title: d.type === "receita" ? "✅ Receita registrada" : "✅ Despesa registrada" });
    } else if (action.type === "register_commitment" && action.data && user) {
      const d = action.data as {title: string;amount: number;dueDay: number;category: string;};
      await supabase.from("financial_commitments").insert({
        user_id: user.id, title: d.title, amount: Number(d.amount),
        due_day: d.dueDay || 1, category: d.category || "bills", reminder: true
      });
      await fetchCommitments();
      toast({ title: "✅ Compromisso registrado" });
    }
  };

  // Smart input handler
  const handleSmartInput = async () => {
    if (!smartInput.trim() || smartLoading) return;
    const text = smartInput.trim();
    setSmartInput("");setSmartLoading(true);
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
      const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/finance-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: [{ role: "user", content: text }], financialContext })
      });
      if (!resp.ok) {toast({ title: "Erro", variant: "destructive" });return;}
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "",fullText = "";
      let done = false;
      while (!done) {
        const { done: sd, value } = await reader.read();
        if (sd) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ") || !line.trim()) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {done = true;break;}
          try {const p = JSON.parse(json);const c = p.choices?.[0]?.delta?.content;if (c) fullText += c;}
          catch {buf = line + "\n" + buf;break;}
        }
      }
      const actionMatch = fullText.match(/<ACTION>(.+?)<\/ACTION>/s);
      if (actionMatch) {
        try {await handleAIAction(JSON.parse(actionMatch[1]));}
        catch {/* ignore */}
      } else {
        toast({ title: "Assistente", description: fullText.replace(/<ACTION>.*?<\/ACTION>/s, "").trim().slice(0, 200) });
      }
    } catch {toast({ title: "Erro de conexão", variant: "destructive" });} finally
    {setSmartLoading(false);}
  };

  const deleteCommitment = async (id: string) => {
    await supabase.from("financial_commitments").delete().eq("id", id);
    setCommitments((prev) => prev.filter((c) => c.id !== id));
  };

  const donutData = catData.length > 0 ?
  catData :
  [{ id: "empty", name: "Sem dados", color: "hsl(var(--muted))", value: 1 }];

  // ── Tabs ─────────────────────────────────────────────────────────────────────
  const TABS: {id: Tab;label: string;Icon: React.ElementType;}[] = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "analytics", label: "Análises", Icon: LineChart },
  { id: "chat", label: "Assistente", Icon: MessageSquare },
  { id: "goals", label: "Metas", Icon: Target },
  { id: "bills", label: "Contas", Icon: Bell }];


  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(var(--background))" }}>

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 pt-6 pb-4">
        
        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">
              Finanças
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Centro de controle financeiro
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Reset panel button */}
            <button
              onClick={() => openConfirm(
                "⚠️ Zerar painel financeiro",
                "Isso vai excluir TODAS as transações, compromissos e metas permanentemente. Esta ação não pode ser desfeita.",
                async () => {
                  if (!user) return;
                  await supabase.from("transactions").delete().eq("user_id", user.id);
                  await supabase.from("financial_commitments").delete().eq("user_id", user.id);
                  await supabase.from("budget_goals").delete().eq("user_id", user.id);
                  const { transactions: txList } = useAppStore.getState();
                  txList.forEach((t) => deleteTransaction(t.id));
                  setCommitments([]);
                  setBudgetGoals([]);
                  setSavingsGoals([]);
                  toast({ title: "✅ Painel zerado com sucesso! Comece do zero." });
                },
                true
              )}
              className="flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-bold transition-colors"
              style={{
                background: "rgba(238,78,0,0.1)",
                border: "1px solid rgba(238,78,0,0.3)",
                color: "#E85002"
              }}
              title="Zerar todo o painel financeiro">
              
              <Trash2 className="w-3 h-3" />
              Zerar
            </button>
            <button onClick={prevMonth}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-foreground min-w-[60px] text-center">
              {MONTHS_FULL[viewMonth].slice(0, 3)} {viewYear !== now.getFullYear() ? viewYear : ""}
            </span>
            <button onClick={nextMonth}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Tab Navigation ── */}
      <div className="px-5 mb-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max">
          {TABS.map(({ id, label, Icon }) =>
          <button key={id} onClick={() => setActiveTab(id)}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
            activeTab === id ?
            "text-white shadow-lg" :
            "text-muted-foreground"
          )}
          style={{
            background: activeTab === id ?
            "linear-gradient(135deg, #E85002, #E85002)" :
            "hsl(var(--card))",
            border: `1px solid ${activeTab === id ? "transparent" : "hsl(var(--border))"}`
          }}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          )}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto pb-32">
        <AnimatePresence mode="wait">

          {/* ── DASHBOARD TAB ── */}
          {activeTab === "dashboard" &&
          <motion.div key="dashboard"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          className="px-5 space-y-4">

              {/* ── Hero Balance Banner ── */}
              <div className="rounded-[14px] p-5 relative overflow-hidden"
                style={{
                  background: "#1A1A1A",
                  border: "1px solid #333333",
                }}>
                {/* Accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[14px]"
                  style={{ background: "linear-gradient(180deg, #C10801 0%, #E85002 100%)" }} />
                <div className="pl-3">
                  <p style={{ fontSize: 10, fontWeight: 600, color: "#646464", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                    Saldo do Mês
                  </p>
                  <p className="tabular-nums" style={{ fontSize: 36, fontWeight: 800, color: saldo >= 0 ? "#F0F0F0" : "#C10801", lineHeight: 1, marginBottom: 16 }}>
                    {fmtShort(saldo)}
                  </p>
                  <div className="flex gap-6">
                    <div>
                      <p style={{ fontSize: 10, color: "#646464", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Receita</p>
                      <p className="tabular-nums" style={{ fontSize: 13, fontWeight: 700, color: "#F0F0F0" }}>+{fmtShort(totalReceita)}</p>
                    </div>
                    <div style={{ width: 1, background: "#333333" }} />
                    <div>
                      <p style={{ fontSize: 10, color: "#646464", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Despesas</p>
                      <p className="tabular-nums" style={{ fontSize: 13, fontWeight: 700, color: "#C10801" }}>-{fmtShort(totalDespesa)}</p>
                    </div>
                    <div style={{ width: 1, background: "#333333" }} />
                    <div>
                      <p style={{ fontSize: 10, color: "#646464", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Poupança</p>
                      <p className="tabular-nums" style={{ fontSize: 13, fontWeight: 700, color: "#D9C1AB" }}>{savingsRate.toFixed(0)}%</p>
                    </div>
                  </div>
                  {/* Expense ratio bar */}
                  <div className="mt-4">
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "#333333" }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(100, totalReceita > 0 ? totalDespesa / totalReceita * 100 : 0)}%`,
                          background: totalDespesa > totalReceita ? "#C10801" : "#E85002"
                        }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <p style={{ fontSize: 9, color: "#646464" }}>0%</p>
                      <p style={{ fontSize: 9, color: "#646464" }}>Despesas / Receita</p>
                      <p style={{ fontSize: 9, color: "#646464" }}>100%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Metrics grid ── */}
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Taxa de Poupança" value={`${savingsRate.toFixed(1)}%`}
                  sub="do total recebido"
                  Icon={PiggyBank} color="#E85002"
                  trend={savingsRate >= 20 ? "up" : savingsRate >= 0 ? "neutral" : "down"}
                  trendVal={savingsRate >= 20 ? "meta ✓" : "meta: 20%"} />
                <MetricCard label="Projeção Fim do Mês" value={fmtShort(projectedBalance)}
                  sub={`Dia ${dayOfMonth}/${daysInMonth}`}
                  Icon={Activity} color={projectedBalance >= 0 ? "#E85002" : "#E85002"}
                  trend={projectedBalance >= 0 ? "up" : "down"}
                  trendVal={fmtShort(dayOfMonth > 0 ? totalDespesa / dayOfMonth : 0) + "/dia"} />
              </div>

              {/* ── AI Insights ── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">Análise Inteligente</h2>
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-auto">
                    {aiInsights.length} alertas
                  </span>
                </div>
                <div className="space-y-2">
                  {aiInsights.map((insight, i) => {
                    const Icon = insight.icon;
                    const borderColor = insight.type === "warning" ? "#E85002" : insight.type === "success" ? "#E85002" : "#E85002";
                    return (
                      <motion.div key={i}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}>
                        <GlassCard className="p-3.5 overflow-hidden relative"
                          style={{ borderLeft: `3px solid ${borderColor}` }}>
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: `${insight.color}15` }}>
                              <Icon className="w-3.5 h-3.5" style={{ color: insight.color }} />
                            </div>
                            <p className="text-xs text-foreground leading-relaxed flex-1 pt-0.5">{insight.text}</p>
                          </div>
                        </GlassCard>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* ── Category donut + list ── */}
              <GlassCard className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-bold text-foreground">Gastos por Categoria</h2>
                  </div>
                  {totalDespesa > 0 &&
                    <span className="text-xs font-bold tabular-nums" style={{ color: "#E85002" }}>
                      -{fmtShort(totalDespesa)}
                    </span>
                  }
                </div>
                {catData.length === 0 ? (
                  <div className="flex flex-col items-center py-6 gap-2">
                    <PieChartIcon className="w-8 h-8 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">Nenhum gasto registrado</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 relative">
                      <ResponsiveContainer width={110} height={110}>
                        <PieChart>
                          <Pie data={donutData} cx="50%" cy="50%" outerRadius={52} innerRadius={34}
                            dataKey="value" paddingAngle={catData.length > 1 ? 2 : 0} startAngle={90} endAngle={-270}>
                            {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center label */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-[9px] text-muted-foreground font-semibold text-center leading-tight">
                          {catData.length}<br/>cats
                        </p>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      {[...catData].sort((a, b) => b.value - a.value).slice(0, 5).map((cat) => {
                        const pct = totalDespesa > 0 ? cat.value / totalDespesa * 100 : 0;
                        return (
                          <div key={cat.id}>
                            <div className="flex justify-between text-[10px] mb-0.5">
                              <span className="text-muted-foreground font-medium">{cat.name}</span>
                              <span className="font-bold text-foreground tabular-nums">{pct.toFixed(0)}%</span>
                            </div>
                            <div className="h-1 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
                              <motion.div className="h-full rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6, delay: 0.1 }}
                                style={{ background: cat.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </GlassCard>

              {/* ── Health Score ── */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">Saúde Financeira</h2>
                  <span className="ml-auto text-xs font-black tabular-nums"
                    style={{ color: healthScore >= 75 ? "#E85002" : healthScore >= 50 ? "#E85002" : "#E85002" }}>
                    {healthScore}/100
                  </span>
                </div>
                <HealthGauge score={healthScore} />
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {[
                    { label: "Poupança", value: `${savingsRate.toFixed(0)}%`, ok: savingsRate >= 10 },
                    { label: "Equilíbrio", value: saldo >= 0 ? "OK" : "Neg", ok: saldo >= 0 },
                    { label: "Transações", value: monthTx.length.toString(), ok: monthTx.length >= 5 }
                  ].map(({ label, value, ok }) =>
                    <div key={label} className="text-center p-2 rounded-xl"
                      style={{ background: ok ? "rgba(238,78,0,0.1)" : "rgba(238,78,0,0.1)", border: `1px solid ${ok ? "rgba(238,78,0,0.2)" : "rgba(238,78,0,0.2)"}` }}>
                      <p className="text-base font-black" style={{ color: ok ? "#E85002" : "#E85002" }}>{value}</p>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* ── Recent Transactions ── */}
              <GlassCard className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-bold text-foreground">Últimas Transações</h2>
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {monthTx.length} este mês
                  </span>
                </div>
                {monthTx.length === 0 ? (
                  <div className="flex flex-col items-center py-8 gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ background: "rgba(238,78,0,0.08)", border: "1px solid rgba(238,78,0,0.15)" }}>
                      <Wallet className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">Nenhuma transação registrada.<br/>Use o botão + para adicionar.</p>
                  </div>
                ) : (
                  [...monthTx].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).map((tx) => {
                    const meta = getCategoryMeta(tx.category);
                    const Icon = meta.Icon;
                    return (
                      <div key={tx.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 group">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: tx.type === "receita" ? "rgba(238,78,0,0.1)" : `${meta.color}18` }}>
                          <Icon className="w-4 h-4" style={{ color: tx.type === "receita" ? "#E85002" : meta.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{tx.title}</p>
                          <p className="text-[10px] text-muted-foreground">{meta.label} · {tx.date}</p>
                        </div>
                        <span className="text-xs font-bold tabular-nums mr-1"
                          style={{ color: tx.type === "receita" ? "#E85002" : "#E85002" }}>
                          {tx.type === "receita" ? "+" : "-"}{fmtShort(tx.amount)}
                        </span>
                        <button
                          onClick={() => openConfirm(
                            "Excluir transação",
                            `Deseja excluir "${tx.title}" (${tx.type === "receita" ? "+" : "-"}${fmtShort(tx.amount)})?`,
                            () => { deleteTransaction(tx.id); toast({ title: "Transação excluída" }); }
                          )}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })
                )}
              </GlassCard>
            </motion.div>
          }

          {/* ── ANALYTICS TAB ── */}
          {activeTab === "analytics" &&
          <motion.div key="analytics"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          className="px-5 space-y-4">

              {/* Income vs Expenses Trend */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">Receita vs Despesas (6 meses)</h2>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E85002" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#E85002" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E85002" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#E85002" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <RechartTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 11 }}
                  formatter={(v: number) => fmt(v)} />
                    <Area type="monotone" dataKey="receita" name="Receita" stroke="#E85002" strokeWidth={2} fill="url(#colorReceita)" />
                    <Area type="monotone" dataKey="despesa" name="Despesas" stroke="#E85002" strokeWidth={2} fill="url(#colorDespesa)" />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </GlassCard>

              {/* Weekly spending behavior */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">Gastos por Dia (7 dias)</h2>
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${v}`} />
                    <RechartTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 11 }}
                  formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="gasto" name="Gasto" fill="#E85002" radius={[4, 4, 0, 0]}>
                      {weeklyData.map((entry, i) =>
                    <Cell key={i} fill={entry.gasto > 200 ? "#E85002" : entry.gasto > 100 ? "#E85002" : "#E85002"} />
                    )}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>

              {/* Cash flow */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">Fluxo de Caixa</h2>
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <ReLineChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <RechartTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 11 }}
                  formatter={(v: number, name: string) => [fmt(v), name === "receita" ? "Receita" : "Saldo"]} />
                    <Line type="monotone" dataKey="receita" name="Receita" stroke="#E85002" strokeWidth={2} dot={{ r: 3, fill: "#E85002" }} />
                    <Line type="monotone" dataKey="despesa" name="Despesas" stroke="#E85002" strokeWidth={2} dot={{ r: 3, fill: "#E85002" }} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  </ReLineChart>
                </ResponsiveContainer>
              </GlassCard>

              {/* Spending Heatmap */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">Mapa de Calor de Gastos</h2>
                </div>
                <SpendingHeatmap transactions={transactions} month={viewMonth} year={viewYear} />
              </GlassCard>

              {/* Financial Timeline */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">Linha do Tempo</h2>
                </div>
                <div className="space-y-3 relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5" style={{ background: "hsl(var(--border))" }} />
                  {[...monthTx].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map((tx, i) => {
                  const meta = getCategoryMeta(tx.category);
                  const Icon = meta.Icon;
                  return (
                    <div key={tx.id} className="flex items-center gap-3 pl-8 relative">
                        <div className="absolute left-2 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                      style={{
                        background: "hsl(var(--card))",
                        borderColor: tx.type === "receita" ? "#E85002" : "#E85002"
                      }} />
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${meta.color}20` }}>
                            <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{tx.title}</p>
                            <p className="text-[10px] text-muted-foreground">{tx.date}</p>
                          </div>
                          <span className="text-xs font-bold tabular-nums"
                        style={{ color: tx.type === "receita" ? "#E85002" : "#E85002" }}>
                            {tx.type === "receita" ? "+" : "-"}{fmtShort(tx.amount)}
                          </span>
                        </div>
                      </div>);

                })}
                  {monthTx.length === 0 && <p className="text-xs text-muted-foreground text-center py-4 pl-8">Nenhuma transação este mês</p>}
                </div>
              </GlassCard>

              {/* Budget Goals */}
              {budgetGoals.length > 0 &&
            <GlassCard className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-bold text-foreground">Metas de Orçamento</h2>
                  </div>
                  <div className="space-y-3">
                    {budgetGoals.map((g) => {
                  const meta = getCategoryMeta(g.categoryId);
                  const spent = monthTx.filter((t) => t.type === "despesa" && t.category === g.categoryId).reduce((s, t) => s + t.amount, 0);
                  const pct = g.limit > 0 ? spent / g.limit * 100 : 0;
                  const barColor = pct >= 100 ? "#E85002" : pct >= 75 ? "#E85002" : "#E85002";
                  return (
                    <div key={g.categoryId}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-foreground">{meta.label}</span>
                            <span className="text-muted-foreground">{fmtShort(spent)} / {fmtShort(g.limit)}</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: barColor }} />
                          </div>
                        </div>);

                })}
                  </div>
                </GlassCard>
            }
            </motion.div>
          }

          {/* ── CHAT TAB ── */}
          {activeTab === "chat" &&
          <motion.div key="chat"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          className="h-[calc(100vh-220px)] mx-5 rounded-2xl overflow-hidden"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border"
            style={{ background: "rgba(238,78,0,0.06)" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #E85002, #E85002)" }}>
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Meu Assessor 24h</p>
                  <p className="text-[10px] text-muted-foreground">Pergunte qualquer coisa sobre suas finanças</p>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] text-primary font-semibold">Online</span>
                </div>
              </div>
              <AIChatPanel financialContext={financialContext} onAction={handleAIAction} />
            </motion.div>
          }

          {/* ── GOALS TAB ── */}
          {activeTab === "goals" &&
          <motion.div key="goals"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          className="px-5 space-y-4">

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">Metas de Poupança</h2>
                </div>
                <button onClick={() => setShowGoalModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg, #E85002, #E85002)" }}>
                  <Plus className="w-3.5 h-3.5" /> Nova Meta
                </button>
              </div>

              {savingsGoals.map((goal) => {
              const pct = goal.target > 0 ? Math.min(100, goal.current / goal.target * 100) : 0;
              const remaining = goal.target - goal.current;
              return (
                <GlassCard key={goal.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: `${goal.color}20`, border: `1px solid ${goal.color}40` }}>
                          {goal.icon}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{goal.title}</p>
                          <p className="text-xs text-muted-foreground">{fmtShort(goal.current)} de {fmtShort(goal.target)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black" style={{ color: goal.color }}>{pct.toFixed(0)}%</p>
                        <p className="text-[10px] text-muted-foreground">concluído</p>
                      </div>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: "hsl(var(--muted))" }}>
                      <motion.div className="h-full rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    style={{ background: `linear-gradient(90deg, ${goal.color}, ${goal.color}bb)` }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Faltam {fmtShort(Math.max(0, remaining))}</p>
                      <div className="flex gap-1.5">
                        <button
                        onClick={() => {
                          const amount = parseFloat(prompt("Quanto depositar?") || "0");
                          if (amount > 0) setSavingsGoals((prev) => prev.map((g) => g.id === goal.id ? { ...g, current: g.current + amount } : g));
                        }}
                        className="px-3 py-1 rounded-lg text-xs font-semibold text-white"
                        style={{ background: goal.color }}>
                          + Depositar
                        </button>
                        <button onClick={() => openConfirm(
                            "Excluir meta de poupança",
                            `Deseja excluir a meta "${goal.title}"? Esta ação não pode ser desfeita.`,
                            () => setSavingsGoals((prev) => prev.filter((g) => g.id !== goal.id))
                          )}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive"
                      style={{ background: "hsl(var(--muted))" }}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </GlassCard>);

            })}

              {savingsGoals.length === 0 &&
            <div className="text-center py-12">
                  <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhuma meta criada ainda</p>
                  <button onClick={() => setShowGoalModal(true)}
              className="mt-3 px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, #E85002, #E85002)" }}>
                    Criar primeira meta
                  </button>
                </div>
            }
            </motion.div>
          }

          {/* ── BILLS TAB ── */}
          {activeTab === "bills" &&
          <motion.div key="bills"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          className="px-5 space-y-4">

              {/* Upcoming this month */}
              <GlassCard className="p-4"
            style={{ background: "rgba(238,78,0,0.06)", border: "1px solid rgba(238,78,0,0.2)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">Compromissos Próximos</h2>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                { label: "Total compromissos", value: fmtShort(commitments.reduce((s, c) => s + c.amount, 0)), icon: Banknote },
                { label: "Esta semana", value: upcomingCommitments.filter((c) => c.daysUntil <= 7).length.toString() + " contas", icon: Clock }].
                map(({ label, value, icon: Icon }) =>
                <div key={label} className="p-3 rounded-xl text-center" style={{ background: "hsl(var(--card))" }}>
                      <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
                      <p className="text-base font-black text-foreground">{value}</p>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                    </div>
                )}
                </div>
              </GlassCard>

              {/* Add commitment */}
              <AddCommitmentForm user={user} onAdd={fetchCommitments} />

              {/* List */}
              <div className="space-y-2">
                {upcomingCommitments.length === 0 ?
              <p className="text-xs text-muted-foreground text-center py-6">Nenhum compromisso cadastrado</p> :
              upcomingCommitments.map((c) => {
                const meta = getCategoryMeta(c.category);
                const Icon = meta.Icon;
                const isUrgent = c.daysUntil <= 3;
                const isClose = c.daysUntil <= 7;
                return (
                  <GlassCard key={c.id} className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: isUrgent ? "rgba(238,78,0,0.15)" : isClose ? "rgba(238,78,0,0.10)" : `${meta.color}20` }}>
                            <Icon className="w-4 h-4" style={{ color: isUrgent ? "#E85002" : isClose ? "#E85002" : meta.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{c.title}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Dia {c.dueDay} · {c.daysUntil === 0 ? "Hoje!" : `em ${c.daysUntil} dias`}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-black text-foreground">{fmtShort(c.amount)}</p>
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                        isUrgent ? "bg-primary/15 text-primary" :
                        isClose ? "bg-[#EB5002]/15 text-[#EB5002]" :
                        "bg-muted text-muted-foreground")}>
                              {isUrgent ? "URGENTE" : isClose ? "Em breve" : `Dia ${c.dueDay}`}
                            </span>
                          </div>
                          <button onClick={() => openConfirm(
                              "Excluir compromisso",
                              `Deseja excluir "${c.title}"? Esta ação não pode ser desfeita.`,
                              () => deleteCommitment(c.id)
                            )}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive ml-1"
                      style={{ background: "hsl(var(--muted))" }}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                      </GlassCard>);

              })}
              </div>

              {/* All commitments */}
              {commitments.length > upcomingCommitments.length &&
            <div className="space-y-2">
                  <h3 className="text-xs font-bold text-muted-foreground">Todos os compromissos</h3>
                  {commitments.filter((c) => !upcomingCommitments.find((u) => u.id === c.id)).map((c) => {
                const meta = getCategoryMeta(c.category);
                const Icon = meta.Icon;
                return (
                  <GlassCard key={c.id} className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: `${meta.color}20` }}>
                            <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{c.title}</p>
                            <p className="text-[10px] text-muted-foreground">Dia {c.dueDay}</p>
                          </div>
                          <p className="text-xs font-bold text-foreground">{fmtShort(c.amount)}</p>
                          <button onClick={() => openConfirm(
                              "Excluir compromisso",
                              `Deseja excluir "${c.title}"? Esta ação não pode ser desfeita.`,
                              () => deleteCommitment(c.id)
                            )}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive"
                      style={{ background: "hsl(var(--muted))" }}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                      </GlassCard>);

              })}
                </div>
            }
            </motion.div>
          }
        </AnimatePresence>
      </div>

      {/* ── Floating Action Buttons (Monefy-style) ── */}
      <FABGroup onDespesa={() => setTxModal("despesa")} onReceita={() => setTxModal("receita")} />

      {/* Modals */}
      <TransactionModal type={txModal ?? "despesa"} open={!!txModal} onClose={() => setTxModal(null)}
      onSave={(data) => {addTransaction(data);toast({ title: data.type === "receita" ? "✅ Receita registrada" : "✅ Despesa registrada" });}}
      todayStr={todayStr} />
      <SavingsGoalModal open={showGoalModal} onClose={() => setShowGoalModal(false)}
      onSave={(goal) => setSavingsGoals((prev) => [...prev, { ...goal, id: crypto.randomUUID() }])} />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        danger={confirmDialog.danger}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm} />
      
    </div>);

}

// ── FAB Group (Monefy-style) ──────────────────────────────────────────────────

function FABGroup({ onDespesa, onReceita }: {onDespesa: () => void;onReceita: () => void;}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {expanded &&
        <motion.div
          className="fixed inset-0 z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setExpanded(false)} />

        }
      </AnimatePresence>

      {/* FAB stack */}
      <div className="fixed bottom-24 right-5 z-50 flex flex-col items-end gap-3">

        {/* DESPESA pill */}
        <AnimatePresence>
          {expanded &&
          <motion.button
            initial={{ opacity: 0, x: 40, scale: 0.7 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.7 }}
            transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.05 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => {setExpanded(false);onDespesa();}}
            className="flex items-center gap-2.5 pl-4 pr-5 h-[52px] rounded-full text-white font-black text-sm shadow-2xl"
            style={{
              background: "linear-gradient(135deg, #E85002, #E85002)",
              boxShadow: "0 8px 28px rgba(238,78,0,0.45)"
            }}>
            
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <TrendingDown className="w-3.5 h-3.5 text-white" />
              </div>
              DESPESA
            </motion.button>
          }
        </AnimatePresence>

        {/* RECEITA pill */}
        <AnimatePresence>
          {expanded &&
          <motion.button
            initial={{ opacity: 0, x: 40, scale: 0.7 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.7 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => {setExpanded(false);onReceita();}}
            className="flex items-center gap-2.5 pl-4 pr-5 h-[52px] rounded-full text-white font-black text-sm shadow-2xl"
            style={{
              background: "linear-gradient(135deg, #E85002, #E85002)",
              boxShadow: "0 8px 28px rgba(238,78,0,0.45)"
            }}>
            
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-3.5 h-3.5 text-white" />
              </div>
              RECEITA
            </motion.button>
          }
        </AnimatePresence>

        {/* Main FAB button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setExpanded((v) => !v)}
          className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl relative overflow-hidden"
          style={{
            background: expanded ?
            "linear-gradient(135deg, var(--bg-card), var(--bg-card-hover))" :
            "linear-gradient(135deg, #E85002, #E85002)",
            boxShadow: expanded ?
            "0 8px 28px rgba(51,51,51,0.4)" :
            "0 8px 28px rgba(221,137,96,0.5)"
          }}
          animate={{ rotate: expanded ? 45 : 0 }}
          transition={{ type: "spring", damping: 18, stiffness: 300 }}>
          
          <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
        </motion.button>
      </div>
    </>);

}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({ open, title, description, onConfirm, onCancel, danger = true


}: {open: boolean;title: string;description: string;onConfirm: () => void;onCancel: () => void;danger?: boolean;}) {
  return (
    <AnimatePresence>
      {open &&
      <motion.div
        className="fixed inset-0 z-[60] flex items-center justify-center p-5"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
          <motion.div
          className="relative w-full max-w-sm rounded-3xl p-6 z-10"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}
          initial={{ scale: 0.88, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.88, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 22, stiffness: 320 }}>
          
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: danger ? "rgba(238,78,0,0.12)" : "rgba(238,78,0,0.12)" }}>
              <Trash2 className="w-6 h-6" style={{ color: danger ? "#E85002" : "#E85002" }} />
            </div>

            <h3 className="text-base font-black text-foreground text-center mb-2">{title}</h3>
            <p className="text-xs text-muted-foreground text-center leading-relaxed mb-6">{description}</p>

            <div className="flex gap-3">
              <button
              onClick={onCancel}
              className="flex-1 h-11 rounded-2xl text-sm font-bold text-foreground transition-colors"
              style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
              
                Cancelar
              </button>
              <button
              onClick={() => {onConfirm();onCancel();}}
              className="flex-1 h-11 rounded-2xl text-sm font-black text-white transition-all"
              style={{
                background: danger ? "linear-gradient(135deg, #E85002, #E85002)" : "linear-gradient(135deg, #E85002, #E85002)",
                boxShadow: danger ? "0 6px 20px rgba(238,78,0,0.35)" : "0 6px 20px rgba(221,137,96,0.35)"
              }}>
              
                Confirmar
              </button>
            </div>
          </motion.div>
        </motion.div>
      }
    </AnimatePresence>);

}

// ── Add Commitment Form ───────────────────────────────────────────────────────

function AddCommitmentForm({ user, onAdd }: {user: {id: string;} | null;onAdd: () => void;}) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("1");
  const [category, setCategory] = useState("bills");
  const [open, setOpen] = useState(false);

  const handleAdd = async () => {
    if (!user || !title.trim() || !amount) return;
    const { error } = await supabase.from("financial_commitments").insert({
      user_id: user.id, title: title.trim(), amount: parseFloat(amount),
      due_day: parseInt(dueDay) || 1, category, reminder: true
    });
    if (!error) {
      toast({ title: "✅ Compromisso adicionado" });
      setTitle("");setAmount("");setDueDay("1");setCategory("bills");setOpen(false);
      onAdd();
    }
  };

  return (
    <GlassCard className="overflow-hidden">
      <button onClick={() => setOpen((v) => !v)}
      className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          <span>Adicionar compromisso</span>
        </div>
        <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-90")} />
      </button>
      <AnimatePresence>
        {open &&
        <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
        className="overflow-hidden border-t border-border">
            <div className="p-4 space-y-3">
              <input className="w-full h-10 px-3 rounded-xl text-sm outline-none"
            style={{ background: "hsl(var(--muted)/0.5)", border: "1px solid hsl(var(--border))" }}
            placeholder="Nome (ex: Netflix, Aluguel)" value={title} onChange={(e) => setTitle(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <input className="h-10 px-3 rounded-xl text-sm outline-none"
              style={{ background: "hsl(var(--muted)/0.5)", border: "1px solid hsl(var(--border))" }}
              placeholder="Valor R$" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                <input className="h-10 px-3 rounded-xl text-sm outline-none"
              style={{ background: "hsl(var(--muted)/0.5)", border: "1px solid hsl(var(--border))" }}
              placeholder="Dia vencimento" type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
              </div>
              <select className="w-full h-10 px-3 rounded-xl text-sm outline-none"
            style={{ background: "hsl(var(--muted)/0.5)", border: "1px solid hsl(var(--border))" }}
            value={category} onChange={(e) => setCategory(e.target.value)}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <button onClick={handleAdd} disabled={!title.trim() || !amount}
            className="w-full h-10 rounded-xl text-white font-bold text-sm disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #E85002, #E85002)" }}>
                Adicionar
              </button>
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </GlassCard>);

}