import { useState, useRef, useEffect, useCallback } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import {
  Flame, Drumstick, Wheat, Droplets, Plus, Minus,
  Camera, Mic, Edit3, Trash2, Target, TrendingUp,
  TrendingDown, Weight, Brain, Apple, Coffee,
  Moon, Sun, Zap, ChevronDown, Check, Loader2, X, ImageIcon, ScanLine, Barcode
} from "lucide-react";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { useNutritionData, NutritionMeal as Meal, GoalType } from "@/hooks/useNutritionData";

const caloriesOverTime = [
  { day: "Seg", calories: 1850, goal: 2000 },
  { day: "Ter", calories: 2100, goal: 2000 },
  { day: "Qua", calories: 1780, goal: 2000 },
  { day: "Qui", calories: 1950, goal: 2000 },
  { day: "Sex", calories: 2200, goal: 2000 },
  { day: "Sáb", calories: 1600, goal: 2000 },
  { day: "Dom", calories: 990, goal: 2000 },
];

const proteinOverTime = [
  { day: "Seg", protein: 145 },
  { day: "Ter", protein: 162 },
  { day: "Qua", protein: 138 },
  { day: "Qui", protein: 155 },
  { day: "Sex", protein: 170 },
  { day: "Sáb", protein: 130 },
  { day: "Dom", protein: 90 },
];

const aiInsights = [
  { icon: TrendingUp, color: "text-primary", text: "Você consumiu mais carboidratos que o usual hoje." },
  { icon: TrendingDown, color: "text-[#EB5002]", text: "Você está abaixo da sua meta de proteína em 22g." },
  { icon: Check, color: "text-primary", text: "Você manteve um déficit calórico hoje. Ótimo trabalho!" },
  { icon: Droplets, color: "text-[#EB5002]", text: "Hidratação abaixo do ideal. Beba mais 3 copos de água." },
];

const goalConfig: Record<GoalType, { label: string; calories: number; protein: number; carbs: number; fat: number }> = {
  lose: { label: "Perder Peso", calories: 1700, protein: 160, carbs: 160, fat: 55 },
  maintain: { label: "Manter Peso", calories: 2000, protein: 140, carbs: 220, fat: 65 },
  gain: { label: "Ganhar Músculo", calories: 2400, protein: 180, carbs: 280, fat: 75 },
};

// ─── Sub-components ───────────────────────────────────────────
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{
        background: "hsl(var(--card) / 0.7)",
        border: "1px solid hsl(var(--border) / 0.5)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 4px 24px hsl(var(--primary) / 0.06), 0 1px 4px hsl(0 0% 0% / 0.05)"
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4" style={{ color: "hsl(var(--primary-foreground))" }} />
      </div>
      <div>
        <h2 className="text-sm font-bold text-foreground leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Circular Progress Ring ───────────────────────────────────
function CircularRing({ value, max, size = 120, strokeWidth = 10, color = "hsl(var(--primary))" }: {
  value: number; max: number; size?: number; strokeWidth?: number; color?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const dash = pct * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={strokeWidth} strokeDasharray={circ}
        strokeDashoffset={circ - dash} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }} />
    </svg>
  );
}

// ─── Helper ───────────────────────────────────────────────────
function mealCategory(h: number): Meal["category"] {
  return h < 10 ? "breakfast" : h < 14 ? "lunch" : h < 19 ? "dinner" : "snack";
}

// ─── Main Page ────────────────────────────────────────────────
export default function NutritionIntelligence() {
  const { meals, water, setWater, goal, setGoal, weightLog, logWeight, addMeal, deleteMeal: deleteMealFromDB } = useNutritionData();
  const waterGoal = 8;
  const [weight, setWeight] = useState("");
  const [foodInput, setFoodInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<null | { name: string; calories: number; protein: number; carbs: number; fat: number; fiber?: number; confidence?: string; notes?: string }>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<"today" | "week" | "month">("today");
  const [editingMeal, setEditingMeal] = useState<string | null>(null);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [mealToDelete, setMealToDelete] = useState<string | null>(null);

  // Sync weight input from latest log entry
  useEffect(() => {
    if (weightLog.length > 0) {
      setWeight(String(weightLog[weightLog.length - 1].weight));
    }
  }, [weightLog.length]);

  // ── Camera / Scanner state ──
  const [showCamera, setShowCamera] = useState(false);
  const [scanMode, setScanMode] = useState<"photo" | "barcode">("photo");
  const [isScanningImage, setIsScanningImage] = useState(false);
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [scanResult, setScanResult] = useState<null | { items: string[]; calories: number; protein: number; carbs: number; fat: number; fiber?: number; confidence?: string; notes?: string }>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // ── Barcode state ──
  const [barcodeScanning, setBarcodeScanning] = useState(false);
  const [barcodeDetected, setBarcodeDetected] = useState<string | null>(null);
  const [barcodeResult, setBarcodeResult] = useState<null | { name: string; brand?: string; calories: number; protein: number; carbs: number; fat: number; fiber?: number }>(null);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const barcodeReaderRef = useRef<import("@zxing/browser").BrowserMultiFormatReader | null>(null);
  const barcodeVideoRef = useRef<HTMLVideoElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const cfg = goalConfig[goal];

  // Current totals
  const totalCals = meals.reduce((s, m) => s + m.calories, 0);
  const totalProtein = meals.reduce((s, m) => s + m.protein, 0);
  const totalCarbs = meals.reduce((s, m) => s + m.carbs, 0);
  const totalFat = meals.reduce((s, m) => s + m.fat, 0);
  const remaining = Math.max(cfg.calories - totalCals, 0);

  // Real AI food analysis
  const analyzeFood = async () => {
    if (!foodInput.trim()) return;
    setIsAnalyzing(true);
    setAiResult(null);
    setAiError(null);
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/nutrition-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ description: foodInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error ?? "Erro ao analisar alimento.");
      } else {
        setAiResult({
          name: data.meal_name,
          calories: Math.round(data.calories),
          protein: Math.round(data.protein),
          carbs: Math.round(data.carbs),
          fat: Math.round(data.fat),
          fiber: data.fiber ? Math.round(data.fiber) : undefined,
          confidence: data.confidence,
          notes: data.notes,
        });
      }
    } catch {
      setAiError("Falha na conexão com a IA. Tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addFromAi = () => {
    if (!aiResult) return;
    const now = new Date();
    addMeal({
      name: aiResult.name,
      calories: aiResult.calories,
      protein: aiResult.protein,
      carbs: aiResult.carbs,
      fat: aiResult.fat,
      time: `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`,
      category: mealCategory(now.getHours()),
    });
    setFoodInput("");
    setAiResult(null);
  };

  // ── Stop camera stream helper ──
  const stopCamera = useCallback((stream?: MediaStream | null) => {
    const s = stream ?? cameraStream;
    if (s) s.getTracks().forEach(t => t.stop());
    setCameraStream(null);
  }, [cameraStream]);

  // ── Close scanner modal ──
  const closeScanner = () => {
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    stopBarcodeScanner();
    setShowCamera(false);
    setScanPreviewUrl(null);
    setCameraError(null);
    setIsScanningImage(false);
    setBarcodeDetected(null);
    setBarcodeResult(null);
    setBarcodeError(null);
    setScanMode("photo");
  };

  // ── Start live camera ──
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setCameraError("Não foi possível acessar a câmera. Verifique as permissões ou use 'Galeria' para enviar uma foto.");
      }
    }
  };

  // ── Open scanner modal ──
  const openScanner = () => {
    setScanResult(null);
    setScanPreviewUrl(null);
    setCameraError(null);
    setShowCamera(true);
    setTimeout(() => startCamera(), 150);
  };

  // ── Snap photo from live feed ──
  const snapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setScanPreviewUrl(dataUrl);
    analyzeImageFromDataUrl(dataUrl, "image/jpeg");
  };

  // ── Handle gallery / file input ──
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
      setScanPreviewUrl(dataUrl);
      analyzeImageFromDataUrl(dataUrl, file.type || "image/jpeg");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── Analyze image via Gemini Vision edge function ──
  const analyzeImageFromDataUrl = async (dataUrl: string, mimeType: string) => {
    setIsScanningImage(true);
    setCameraError(null);
    try {
      const base64 = dataUrl.split(",")[1];
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/nutrition-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCameraError(data.error ?? "Erro ao analisar imagem.");
      } else {
        setScanResult({
          items: data.detected_items?.length ? data.detected_items : [data.meal_name],
          calories: Math.round(data.calories),
          protein: Math.round(data.protein),
          carbs: Math.round(data.carbs),
          fat: Math.round(data.fat),
          fiber: data.fiber ? Math.round(data.fiber) : undefined,
          confidence: data.confidence,
          notes: data.notes,
        });
      }
    } catch {
      setCameraError("Falha na conexão com a IA. Tente novamente.");
    } finally {
      setIsScanningImage(false);
    }
  };

  // ── Start barcode scanning ──
  const startBarcodeScanner = useCallback(async () => {
    setBarcodeDetected(null);
    setBarcodeResult(null);
    setBarcodeError(null);
    setBarcodeScanning(true);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      barcodeReaderRef.current = reader;
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        barcodeVideoRef.current!,
        async (result) => {
          if (result) {
            const barcode = result.getText();
            controls.stop();
            barcodeReaderRef.current = null;
            setBarcodeDetected(barcode);
            setBarcodeScanning(false);
            await lookupBarcode(barcode);
          }
        }
      );
      // Store stop function so we can call it later
      (barcodeReaderRef.current as any).__controls = controls;
    } catch {
      setBarcodeError("Não foi possível acessar a câmera para leitura de código de barras.");
      setBarcodeScanning(false);
    }
  }, []);

  const stopBarcodeScanner = useCallback(() => {
    if (barcodeReaderRef.current) {
      try { (barcodeReaderRef.current as any).__controls?.stop(); } catch { /* ignore */ }
      barcodeReaderRef.current = null;
    }
    // Stop all video tracks on barcode video element
    if (barcodeVideoRef.current?.srcObject) {
      (barcodeVideoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    setBarcodeScanning(false);
  }, []);

  // ── Look up barcode in Open Food Facts ──
  const lookupBarcode = async (barcode: string) => {
    setBarcodeError(null);
    setBarcodeResult(null);
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );
      const data = await res.json();
      if (data.status !== 1 || !data.product) {
        setBarcodeError(`Produto (${barcode}) não encontrado na base de dados. Tente outro código.`);
        return;
      }
      const p = data.product;
      const n = p.nutriments ?? {};
      setBarcodeResult({
        name: p.product_name || p.product_name_pt || "Produto desconhecido",
        brand: p.brands ?? undefined,
        calories: Math.round(n["energy-kcal_100g"] ?? n["energy-kcal"] ?? (n["energy_100g"] ?? 0) / 4.184),
        protein: Math.round((n["proteins_100g"] ?? n["proteins"] ?? 0) * 10) / 10,
        carbs: Math.round((n["carbohydrates_100g"] ?? n["carbohydrates"] ?? 0) * 10) / 10,
        fat: Math.round((n["fat_100g"] ?? n["fat"] ?? 0) * 10) / 10,
        fiber: n["fiber_100g"] != null ? Math.round(n["fiber_100g"] * 10) / 10 : undefined,
      });
    } catch {
      setBarcodeError("Falha ao consultar a base de dados de alimentos. Verifique sua conexão.");
    }
  };

  // ── Switch scanner mode ──
  const switchScanMode = (mode: "photo" | "barcode") => {
    if (mode === "barcode") {
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
      setScanPreviewUrl(null);
      setCameraError(null);
      setScanMode("barcode");
      setTimeout(() => startBarcodeScanner(), 200);
    } else {
      stopBarcodeScanner();
      setBarcodeDetected(null);
      setBarcodeResult(null);
      setBarcodeError(null);
      setScanMode("photo");
      setScanPreviewUrl(null);
      setCameraError(null);
      setTimeout(() => startCamera(), 150);
    }
  };

  const deleteMeal = (id: string) => {
    setMealToDelete(id);
  };

  const handleLogWeight = () => {
    const w = parseFloat(weight);
    if (!isNaN(w)) logWeight(w);
  };

  const mealCategories = [
    { key: "breakfast" as const, label: "Café da manhã", icon: Sun },
    { key: "lunch" as const, label: "Almoço", icon: Coffee },
    { key: "dinner" as const, label: "Jantar", icon: Moon },
    { key: "snack" as const, label: "Lanches", icon: Apple },
  ];

  const macros = [
    { label: "Proteína", value: totalProtein, goal: cfg.protein, color: "hsl(var(--primary))", unit: "g", icon: Drumstick },
    { label: "Carboidratos", value: totalCarbs, goal: cfg.carbs, color: "hsl(var(--foreground))", unit: "g", icon: Wheat },
    { label: "Gorduras", value: totalFat, goal: cfg.fat, color: "hsl(var(--primary))", unit: "g", icon: Zap },
  ];

  const weightChange = weightLog.length >= 2
    ? (weightLog[weightLog.length - 1].weight - weightLog[weightLog.length - 2].weight).toFixed(1)
    : "0";

  return (
    <>
    <div className="min-h-screen p-4 md:p-6 space-y-6 pb-28 relative">
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
              Nutrição
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Rastreie calorias, macros e nutrição automaticamente.
            </p>
          </div>
          {/* Goal Picker */}
          <div className="relative">
            <button
              onClick={() => setShowGoalPicker(p => !p)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: "hsl(var(--primary) / 0.12)",
                border: "1px solid hsl(var(--primary) / 0.3)",
                color: "hsl(var(--primary))"
              }}
            >
              <Target className="w-4 h-4" />
              {goalConfig[goal].label}
              <ChevronDown className="w-3 h-3" />
            </button>
            <AnimatePresence>
              {showGoalPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-11 z-50 rounded-2xl overflow-hidden min-w-[180px]"
                  style={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border) / 0.6)",
                    boxShadow: "0 8px 32px hsl(0 0% 0% / 0.15)"
                  }}
                >
                  {(Object.keys(goalConfig) as GoalType[]).map(g => (
                    <button key={g} onClick={() => { setGoal(g); setShowGoalPicker(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium hover:bg-accent/60 transition-colors text-left"
                    >
                      {goal === g && <Check className="w-3 h-3 text-primary" />}
                      {goal !== g && <div className="w-3 h-3" />}
                      {goalConfig[g].label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* ── SECTION 1: Daily Calorie Dashboard ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard>
          <SectionTitle icon={Flame} title="Painel de Calorias" subtitle="Resumo do dia" />
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Ring */}
            <div className="relative flex-shrink-0">
              <CircularRing value={totalCals} max={cfg.calories} size={148} strokeWidth={12} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-foreground">{totalCals}</span>
                <span className="text-xs text-muted-foreground">kcal</span>
              </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 flex-1 w-full">
              {[
                { label: "Consumido", value: totalCals, unit: "kcal", color: "hsl(var(--primary))" },
                { label: "Meta", value: cfg.calories, unit: "kcal", color: "hsl(var(--muted-foreground))" },
                { label: "Restante", value: remaining, unit: "kcal", color: remaining > 0 ? "#EB5002" : "hsl(var(--primary))" },
              ].map(stat => (
                <div key={stat.label} className="text-center p-4 rounded-2xl"
                  style={{ background: "hsl(var(--muted) / 0.4)", border: "1px solid hsl(var(--border) / 0.4)" }}>
                  <div className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-[10px] text-muted-foreground font-medium mt-0.5">{stat.unit}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ── SECTION 2: Macros Tracker ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard>
          <SectionTitle icon={Drumstick} title="Macronutrientes" subtitle="Proteína, carboidratos e gorduras" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {macros.map(m => (
              <div key={m.label} className="p-4 rounded-2xl space-y-3"
                style={{ background: "hsl(var(--muted) / 0.4)", border: "1px solid hsl(var(--border) / 0.4)" }}>
                <div className="flex items-center gap-2">
                  <m.icon className="w-4 h-4" style={{ color: m.color }} />
                  <span className="text-sm font-semibold text-foreground">{m.label}</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-black" style={{ color: m.color }}>{m.value}<span className="text-sm font-medium ml-0.5">g</span></span>
                  <span className="text-xs text-muted-foreground">/ {m.goal}g</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--border) / 0.5)" }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min((m.value / m.goal) * 100, 100)}%`, background: m.color }} />
                </div>
                <div className="text-xs text-muted-foreground">{Math.round((m.value / m.goal) * 100)}% da meta</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* ── SECTION 3: Smart Food Input ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <GlassCard>
          <SectionTitle icon={Brain} title="Entrada Inteligente de Alimentos" subtitle="Descreva o que comeu para análise automática" />
          <div className="space-y-3">
            <Textarea
              placeholder='"Comi frango grelhado com arroz e salada" ou "Tomei um shake de whey"…'
              value={foodInput}
              onChange={e => setFoodInput(e.target.value)}
              className="min-h-[80px] resize-none text-sm w-full"
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); analyzeFood(); } }}
            />
            <div className="flex gap-2 pr-2">
              <Button onClick={analyzeFood} disabled={isAnalyzing || !foodInput.trim()}
                className="gradient-primary border-0 flex-1">
                {isAnalyzing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Analisando com Gemini…</> : <><Zap className="w-4 h-4 mr-2" />Analisar com IA</>}
              </Button>
              <Button size="icon" variant="outline" title="Entrada por voz (simulado)" className="w-10 h-10 shrink-0">
                <Mic className="w-4 h-4" />
              </Button>
            </div>
            <AnimatePresence>
              {aiError && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="p-3 rounded-2xl text-sm"
                  style={{ background: "rgba(232,80,2,0.1)", border: "1px solid rgba(232,80,2,0.3)", color: "hsl(var(--primary))" }}>
                  ⚠️ {aiError}
                </motion.div>
              )}
              {aiResult && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="p-4 rounded-2xl space-y-3"
                  style={{ background: "hsl(var(--primary) / 0.08)", border: "1px solid hsl(var(--primary) / 0.25)" }}>
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-xs font-bold text-primary uppercase tracking-wide">Análise Gemini AI</p>
                        {aiResult.confidence && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                            style={{
                              background: aiResult.confidence === "high" ? "hsl(var(--secondary) / 0.15)" : aiResult.confidence === "medium" ? "hsl(var(--secondary) / 0.15)" : "hsl(var(--primary) / 0.15)",
                              color: aiResult.confidence === "high" ? "#EB5002" : aiResult.confidence === "medium" ? "#EB5002" : "hsl(var(--primary))",
                            }}>
                            {aiResult.confidence === "high" ? "✓ Alta confiança" : aiResult.confidence === "medium" ? "~ Confiança média" : "! Baixa confiança"}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-foreground truncate">{aiResult.name}</p>
                    </div>
                    <Button size="sm" onClick={addFromAi} className="gradient-primary border-0 text-xs shrink-0">
                      <Plus className="w-3 h-3 mr-1" /> Adicionar
                    </Button>
                  </div>
                  {/* Macros */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-lg font-bold" style={{ background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" }}>
                      🔥 {aiResult.calories} kcal
                    </span>
                    <span className="px-2.5 py-1 rounded-lg font-bold" style={{ background: "rgba(232,80,2,0.12)", color: "hsl(var(--primary))" }}>
                      💪 {aiResult.protein}g proteína
                    </span>
                    <span className="px-2.5 py-1 rounded-lg font-bold" style={{ background: "rgba(232,80,2,0.08)", color: "hsl(var(--foreground))" }}>
                      🌾 {aiResult.carbs}g carbs
                    </span>
                    <span className="px-2.5 py-1 rounded-lg font-bold" style={{ background: "rgba(232,80,2,0.12)", color: "hsl(var(--primary))" }}>
                      🥑 {aiResult.fat}g gordura
                    </span>
                    {aiResult.fiber !== undefined && (
                      <span className="px-2.5 py-1 rounded-lg font-bold" style={{ background: "rgba(232,80,2,0.08)", color: "hsl(var(--foreground))" }}>
                        🥦 {aiResult.fiber}g fibra
                      </span>
                    )}
                  </div>
                  {/* Notes */}
                  {aiResult.notes && (
                    <p className="text-xs text-muted-foreground italic border-t pt-2" style={{ borderColor: "hsl(var(--border) / 0.4)" }}>
                      📝 {aiResult.notes}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </GlassCard>
      </motion.div>


      {/* ── SECTION 4: AI Food Scanner (Real Camera) ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <GlassCard>
          <SectionTitle icon={Camera} title="Scanner de Refeição IA" subtitle="Foto do prato ou código de barras — análise instantânea" />

          {/* Hidden file input for gallery */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Entry button */}
          {!scanResult && (
            <button
              onClick={openScanner}
              className="w-full h-40 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{ background: "hsl(var(--muted) / 0.5)", border: "2px dashed hsl(var(--border))" }}
            >
              <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
                <ScanLine className="w-7 h-7" style={{ color: "hsl(var(--primary-foreground))" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-foreground">Escanear Refeição</p>
                <p className="text-xs text-muted-foreground mt-0.5">Foto do prato ou código de barras</p>
              </div>
              <div className="flex gap-2 mt-1 flex-wrap justify-center">
                <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-medium"
                  style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>
                  <Camera className="w-3 h-3" /> Câmera ao vivo
                </span>
                <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-medium"
                  style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                  <ImageIcon className="w-3 h-3" /> Galeria
                </span>
                <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-medium"
                  style={{ background: "rgba(232,80,2,0.08)", color: "hsl(var(--foreground))" }}>
                  <Barcode className="w-3 h-3" /> Código de barras
                </span>
              </div>
            </button>
          )}

          {/* Scan result */}
          {scanResult && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {scanPreviewUrl && (
                <div className="relative w-full h-48 rounded-2xl overflow-hidden">
                  <img src={scanPreviewUrl} alt="Refeição escaneada" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {scanResult.confidence && (
                    <span className="absolute top-3 right-3 text-[10px] px-2.5 py-1 rounded-full font-semibold"
                      style={{
                        background: scanResult.confidence === "high" ? "hsl(var(--secondary) / 0.85)" : scanResult.confidence === "medium" ? "hsl(var(--secondary) / 0.85)" : "hsl(var(--primary) / 0.85)",
                        color: "white"
                      }}>
                      {scanResult.confidence === "high" ? "✓ Alta precisão" : scanResult.confidence === "medium" ? "~ Precisão média" : "! Baixa precisão"}
                    </span>
                  )}
                </div>
              )}
              <div className="p-4 rounded-2xl" style={{ background: "hsl(var(--primary) / 0.08)", border: "1px solid hsl(var(--primary) / 0.25)" }}>
                <p className="text-xs font-bold text-primary uppercase tracking-wide mb-3">
                  📸 Gemini Vision — Itens detectados
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {scanResult.items.map(item => (
                    <span key={item} className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ background: "hsl(var(--primary) / 0.12)", color: "hsl(var(--primary))" }}>
                      {item}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="px-2.5 py-1 rounded-lg font-bold" style={{ background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" }}>🔥 {scanResult.calories} kcal</span>
                  <span className="px-2.5 py-1 rounded-lg font-bold" style={{ background: "rgba(232,80,2,0.12)", color: "hsl(var(--primary))" }}>💪 {scanResult.protein}g prot</span>
                  <span className="px-2.5 py-1 rounded-lg font-bold" style={{ background: "rgba(232,80,2,0.08)", color: "hsl(var(--foreground))" }}>🌾 {scanResult.carbs}g carbs</span>
                  <span className="px-2.5 py-1 rounded-lg font-bold" style={{ background: "rgba(232,80,2,0.12)", color: "hsl(var(--primary))" }}>🥑 {scanResult.fat}g gordura</span>
                  {scanResult.fiber !== undefined && (
                    <span className="px-2.5 py-1 rounded-lg font-bold" style={{ background: "rgba(232,80,2,0.08)", color: "hsl(var(--foreground))" }}>🥦 {scanResult.fiber}g fibra</span>
                  )}
                </div>
                {scanResult.notes && (
                  <p className="text-xs text-muted-foreground italic border-t pt-2 mt-3" style={{ borderColor: "hsl(var(--border) / 0.4)" }}>
                    📝 {scanResult.notes}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="gradient-primary border-0 text-xs flex-1" onClick={() => {
                  const now = new Date();
                  const h = now.getHours();
                  addMeal({
                    name: scanResult.items.slice(0, 3).join(", "),
                    calories: scanResult.calories, protein: scanResult.protein,
                    carbs: scanResult.carbs, fat: scanResult.fat,
                    time: `${h.toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`,
                    category: mealCategory(h),
                  });
                  setScanResult(null); setScanPreviewUrl(null);
                }}>
                  <Plus className="w-3 h-3 mr-1" /> Adicionar ao Diário
                </Button>
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setScanResult(null); setScanPreviewUrl(null); }}>
                  Cancelar
                </Button>
                <Button size="sm" variant="outline" className="text-xs" onClick={openScanner}>
                  <Camera className="w-3 h-3 mr-1" /> Nova foto
                </Button>
              </div>
            </motion.div>
          )}
        </GlassCard>
      </motion.div>

      {/* ── Camera Modal ── */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)" }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md rounded-3xl overflow-hidden"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.5)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "hsl(var(--border) / 0.5)" }}>
                <div className="flex items-center gap-2">
                  <ScanLine className="w-5 h-5 text-primary" />
                  <span className="font-bold text-sm text-foreground">Scanner de Refeição IA</span>
                </div>
                <button onClick={closeScanner}
                  className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Mode Tabs */}
              <div className="flex border-b" style={{ borderColor: "hsl(var(--border) / 0.5)" }}>
                {([
                  { mode: "photo" as const, label: "Foto da Refeição", icon: Camera },
                  { mode: "barcode" as const, label: "Código de Barras", icon: Barcode },
                ] as const).map(tab => (
                  <button
                    key={tab.mode}
                    onClick={() => switchScanMode(tab.mode)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold transition-all"
                    style={{
                      borderBottom: scanMode === tab.mode ? "2px solid hsl(var(--primary))" : "2px solid transparent",
                      color: scanMode === tab.mode ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                      background: scanMode === tab.mode ? "hsl(var(--primary) / 0.06)" : "transparent",
                    }}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── PHOTO MODE ── */}
              {scanMode === "photo" && (
                <>
                  {/* Camera viewfinder or preview */}
                  <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
                    {!scanPreviewUrl && (
                      <>
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        {cameraStream && !cameraError && (
                          <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-6 left-6 w-10 h-10 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: "hsl(var(--primary))" }} />
                            <div className="absolute top-6 right-6 w-10 h-10 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: "hsl(var(--primary))" }} />
                            <div className="absolute bottom-6 left-6 w-10 h-10 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: "hsl(var(--primary))" }} />
                            <div className="absolute bottom-6 right-6 w-10 h-10 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: "hsl(var(--primary))" }} />
                            <motion.div
                              className="absolute left-8 right-8 h-0.5 rounded-full"
                              style={{ background: "hsl(var(--primary) / 0.7)", top: "50%" }}
                              animate={{ top: ["30%", "70%", "30%"] }}
                              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                            />
                          </div>
                        )}
                        {!cameraStream && !cameraError && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            <p className="text-sm text-white/70">Iniciando câmera…</p>
                          </div>
                        )}
                        {cameraError && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                            <Camera className="w-10 h-10 text-muted-foreground" />
                            <p className="text-sm text-white/80">{cameraError}</p>
                          </div>
                        )}
                      </>
                    )}
                    {scanPreviewUrl && (
                      <div className="relative w-full h-full">
                        <img src={scanPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                        {isScanningImage && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: "rgba(0,0,0,0.65)" }}>
                            <motion.div className="w-16 h-16 rounded-full border-2 flex items-center justify-center"
                              style={{ borderColor: "hsl(var(--primary))" }}
                              animate={{ scale: [1, 1.1, 1], opacity: [1, 0.7, 1] }}
                              transition={{ duration: 1.2, repeat: Infinity }}>
                              <Brain className="w-8 h-8 text-primary" />
                            </motion.div>
                            <p className="text-sm font-bold text-white">Analisando com Gemini Vision…</p>
                            <p className="text-xs text-white/60">Identificando alimentos e calculando macros</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {cameraError && scanPreviewUrl && (
                    <div className="px-4 pt-3">
                      <p className="text-xs text-destructive bg-destructive/10 rounded-xl px-3 py-2">⚠️ {cameraError}</p>
                    </div>
                  )}
                  <div className="p-4 flex gap-3 items-center justify-center">
                    <button onClick={() => fileRef.current?.click()} disabled={isScanningImage}
                      className="flex flex-col items-center gap-1 px-4 py-3 rounded-2xl transition-all disabled:opacity-50"
                      style={{ background: "hsl(var(--muted) / 0.6)", border: "1px solid hsl(var(--border) / 0.5)" }}>
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground font-medium">Galeria</span>
                    </button>
                    {!scanPreviewUrl ? (
                      <button onClick={snapPhoto} disabled={!cameraStream || isScanningImage}
                        className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
                        style={{ background: "hsl(var(--primary))", boxShadow: "0 0 0 4px hsl(var(--primary) / 0.25)" }}>
                        <Camera className="w-7 h-7" style={{ color: "hsl(var(--primary-foreground))" }} />
                      </button>
                    ) : (
                      <button onClick={() => { setScanPreviewUrl(null); setCameraError(null); startCamera(); }}
                        disabled={isScanningImage}
                        className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
                        style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
                        <Camera className="w-6 h-6 text-muted-foreground" />
                      </button>
                    )}
                    <button onClick={closeScanner}
                      className="flex flex-col items-center gap-1 px-4 py-3 rounded-2xl transition-all"
                      style={{ background: "hsl(var(--muted) / 0.6)", border: "1px solid hsl(var(--border) / 0.5)" }}>
                      <X className="w-5 h-5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground font-medium">Fechar</span>
                    </button>
                  </div>
                  <p className="text-center text-[10px] text-muted-foreground pb-4 px-4">
                    Aponte para o prato e toque no botão da câmera • A IA identifica os alimentos automaticamente
                  </p>
                </>
              )}

              {/* ── BARCODE MODE ── */}
              {scanMode === "barcode" && (
                <>
                  <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
                    <video ref={barcodeVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

                    {/* Barcode scan overlay */}
                    {barcodeScanning && !barcodeDetected && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        {/* Horizontal barcode frame */}
                        <div className="relative w-4/5 h-24">
                          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2" style={{ borderColor: "hsl(var(--primary))" }} />
                          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2" style={{ borderColor: "hsl(var(--primary))" }} />
                          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2" style={{ borderColor: "hsl(var(--primary))" }} />
                          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2" style={{ borderColor: "hsl(var(--primary))" }} />
                          {/* Scan line */}
                          <motion.div
                            className="absolute left-2 right-2 h-0.5 rounded-full"
                            style={{ background: "hsl(var(--primary))", top: "50%" }}
                            animate={{ top: ["10%", "90%", "10%"] }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                          />
                        </div>
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                          <span className="text-[10px] text-white/70 bg-black/50 px-3 py-1 rounded-full">
                            Aponte a câmera para o código de barras
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Loading spinner (camera starting) */}
                    {!barcodeScanning && !barcodeDetected && !barcodeError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-sm text-white/70">Iniciando câmera…</p>
                      </div>
                    )}

                    {/* Barcode detected — fetching data */}
                    {barcodeDetected && !barcodeResult && !barcodeError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: "rgba(0,0,0,0.7)" }}>
                        <motion.div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                          style={{ background: "hsl(var(--primary) / 0.2)", border: "2px solid hsl(var(--primary))" }}
                          animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                          <Barcode className="w-8 h-8 text-primary" />
                        </motion.div>
                        <p className="text-sm font-bold text-white">Código detectado!</p>
                        <p className="text-xs text-white/60 font-mono">{barcodeDetected}</p>
                        <p className="text-xs text-white/50">Buscando informações nutricionais…</p>
                        <Loader2 className="w-5 h-5 text-primary animate-spin mt-1" />
                      </div>
                    )}

                    {/* Camera error */}
                    {barcodeError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center" style={{ background: "rgba(0,0,0,0.7)" }}>
                        <Barcode className="w-10 h-10 text-muted-foreground" />
                        <p className="text-sm text-white/80">{barcodeError}</p>
                      </div>
                    )}
                  </div>

                  {/* Barcode result */}
                  {barcodeResult && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="p-4 space-y-3">
                      <div className="p-3 rounded-2xl" style={{ background: "hsl(var(--primary) / 0.08)", border: "1px solid hsl(var(--primary) / 0.25)" }}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="text-xs font-bold text-primary uppercase tracking-wide mb-0.5">
                              🔖 Produto Encontrado
                            </p>
                            <p className="text-sm font-semibold text-foreground">{barcodeResult.name}</p>
                            {barcodeResult.brand && (
                              <p className="text-xs text-muted-foreground">{barcodeResult.brand}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-0.5">Valores por 100g</p>
                          </div>
                          <span className="text-[10px] px-2 py-1 rounded-full font-semibold shrink-0"
                            style={{ background: "hsl(var(--secondary) / 0.15)", color: "hsl(var(--foreground))" }}>
                            ✓ Open Food Facts
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-2.5 py-1 rounded-lg font-bold" style={{ background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" }}>🔥 {barcodeResult.calories} kcal</span>
                          <span className="px-2.5 py-1 rounded-lg font-bold" style={{ background: "rgba(232,80,2,0.12)", color: "hsl(var(--primary))" }}>💪 {barcodeResult.protein}g prot</span>
                          <span className="px-2.5 py-1 rounded-lg font-bold" style={{ background: "rgba(232,80,2,0.08)", color: "hsl(var(--foreground))" }}>🌾 {barcodeResult.carbs}g carbs</span>
                          <span className="px-2.5 py-1 rounded-lg font-bold" style={{ background: "rgba(232,80,2,0.12)", color: "hsl(var(--primary))" }}>🥑 {barcodeResult.fat}g gordura</span>
                          {barcodeResult.fiber != null && (
                            <span className="px-2.5 py-1 rounded-lg font-bold" style={{ background: "rgba(232,80,2,0.08)", color: "hsl(var(--foreground))" }}>🥦 {barcodeResult.fiber}g fibra</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="gradient-primary border-0 text-xs flex-1" onClick={() => {
                          const now = new Date();
                          const h = now.getHours();
                          addMeal({
                            name: barcodeResult!.name,
                            calories: barcodeResult!.calories,
                            protein: barcodeResult!.protein,
                            carbs: barcodeResult!.carbs,
                            fat: barcodeResult!.fat,
                            time: `${h.toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`,
                            category: mealCategory(h),
                          });
                          closeScanner();
                        }}>
                          <Plus className="w-3 h-3 mr-1" /> Adicionar ao Diário
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                          setBarcodeResult(null);
                          setBarcodeDetected(null);
                          setBarcodeError(null);
                          startBarcodeScanner();
                        }}>
                          <Barcode className="w-3 h-3 mr-1" /> Novo scan
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {barcodeError && (
                    <div className="p-4 flex gap-2">
                      <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => {
                        setBarcodeError(null);
                        setBarcodeDetected(null);
                        startBarcodeScanner();
                      }}>
                        <Barcode className="w-3 h-3 mr-1" /> Tentar novamente
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs" onClick={closeScanner}>
                        Fechar
                      </Button>
                    </div>
                  )}

                  {!barcodeResult && !barcodeError && (
                    <div className="p-4 flex justify-center">
                      <button onClick={closeScanner}
                        className="flex flex-col items-center gap-1 px-4 py-3 rounded-2xl transition-all"
                        style={{ background: "hsl(var(--muted) / 0.6)", border: "1px solid hsl(var(--border) / 0.5)" }}>
                        <X className="w-5 h-5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground font-medium">Fechar</span>
                      </button>
                    </div>
                  )}

                  <p className="text-center text-[10px] text-muted-foreground pb-4 px-4">
                    Suportado por Open Food Facts • Dados para 100g do produto
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ── SECTION 5: Daily Meal Log ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <GlassCard>
          <SectionTitle icon={Apple} title="Registro de Refeições" subtitle="Log completo do dia" />
          <div className="space-y-5">
            {mealCategories.map(cat => {
              const catMeals = meals.filter(m => m.category === cat.key);
              return (
                <div key={cat.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <cat.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{cat.label}</span>
                    {catMeals.length === 0 && <span className="text-xs text-muted-foreground/50 ml-1">— vazio</span>}
                  </div>
                  <div className="space-y-2">
                    {catMeals.map(meal => (
                      <AnimatePresence key={meal.id}>
                        <motion.div
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                          className="flex items-center gap-3 p-3 rounded-xl group"
                          style={{ background: "hsl(var(--muted) / 0.4)", border: "1px solid hsl(var(--border) / 0.4)" }}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground truncate">{meal.name}</span>
                              <span className="text-xs text-muted-foreground">{meal.time}</span>
                            </div>
                            <div className="flex gap-3 mt-1 flex-wrap">
                              <span className="text-xs font-bold text-primary">🔥 {meal.calories} kcal</span>
                              <span className="text-xs text-muted-foreground">💪 {meal.protein}g</span>
                              <span className="text-xs text-muted-foreground">🌾 {meal.carbs}g</span>
                              <span className="text-xs text-muted-foreground">🥑 {meal.fat}g</span>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingMeal(editingMeal === meal.id ? null : meal.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteMeal(meal.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </motion.div>

      {/* ── SECTION 6: Hydration Tracker ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <GlassCard>
          <SectionTitle icon={Droplets} title="Hidratação" subtitle={`${water} de ${waterGoal} copos hoje`} />
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex items-center gap-1.5 flex-wrap">
              {Array.from({ length: waterGoal }).map((_, i) => (
                <motion.button key={i} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => setWater(i + 1)}
                  className="w-10 h-12 rounded-xl flex items-center justify-center transition-all"
                  style={{
                    background: i < water ? "rgba(232,80,2,0.2)" : "hsl(var(--muted) / 0.5)",
                    border: `1px solid ${i < water ? "rgba(232,80,2,0.4)" : "hsl(var(--border) / 0.4)"}`,
                  }}>
                  <Droplets className="w-5 h-5" style={{ color: i < water ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }} />
                </motion.button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:ml-auto">
              <div className="flex items-center gap-3">
                <Button size="sm" variant="outline" onClick={() => setWater(w => Math.max(0, w - 1))} className="w-9 h-9 p-0">
                  <Minus className="w-4 h-4" />
                </Button>
                <div className="text-center">
                  <div className="text-2xl font-black" style={{ color: "hsl(var(--primary))" }}>{water}</div>
                  <div className="text-xs text-muted-foreground">copos</div>
                </div>
                <Button size="sm" onClick={() => setWater(w => Math.min(waterGoal, w + 1))} className="w-9 h-9 p-0 gradient-primary border-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="h-2 rounded-full overflow-hidden w-40" style={{ background: "hsl(var(--muted))" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(water / waterGoal) * 100}%`, background: "hsl(var(--primary))" }} />
              </div>
              <span className="text-xs text-muted-foreground text-center">{Math.round((water / waterGoal) * 100)}% da meta</span>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ── SECTION 7: Weight Tracking ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <GlassCard>
          <SectionTitle icon={Weight} title="Controle de Peso" subtitle="Evolução semanal" />
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex flex-col gap-4 sm:w-48 flex-shrink-0">
              <div className="p-4 rounded-2xl text-center"
                style={{ background: "hsl(var(--muted) / 0.4)", border: "1px solid hsl(var(--border) / 0.4)" }}>
                <div className="text-3xl font-black text-foreground">{weightLog[weightLog.length - 1]?.weight ?? "—"}</div>
                <div className="text-xs text-muted-foreground">kg atual</div>
                <div className={`text-sm font-bold mt-1 ${parseFloat(weightChange) < 0 ? "text-primary" : parseFloat(weightChange) > 0 ? "text-[#EB5002]" : "text-muted-foreground"}`}>
                  {parseFloat(weightChange) > 0 ? "+" : ""}{weightChange} kg esta semana
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  placeholder="Peso (kg)"
                  className="text-sm"
                />
                <Button size="icon" onClick={handleLogWeight} className="gradient-primary border-0 flex-shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weightLog}>
                  <defs>
                    <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: 12 }} />
                  <Area type="monotone" dataKey="weight" stroke="hsl(var(--primary))" fill="url(#wGrad)" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ── SECTION 8: AI Insights ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <GlassCard>
          <SectionTitle icon={Brain} title="Insights Nutricionais IA" subtitle="Análise inteligente do seu dia" />
          <div className="space-y-3">
            {aiInsights.map((insight, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.07 }}
                className="flex items-start gap-3 p-3.5 rounded-2xl"
                style={{ background: "hsl(var(--muted) / 0.4)", border: "1px solid hsl(var(--border) / 0.4)" }}>
                <insight.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${insight.color}`} />
                <p className="text-sm text-foreground/90 font-medium">{insight.text}</p>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* ── SECTION 9: Progress Charts ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <GlassCard>
          <SectionTitle icon={TrendingUp} title="Gráficos de Progresso" subtitle="Últimos 7 dias" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Calories */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Calorias vs Meta</p>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={caloriesOverTime} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: 11 }} />
                    <Bar dataKey="goal" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="calories" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Protein */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Ingestão de Proteína</p>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={proteinOverTime}>
                    <defs>
                      <linearGradient id="pGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: 11 }} />
                    <Area type="monotone" dataKey="protein" stroke="hsl(var(--primary))" fill="url(#pGrad)" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ── SECTION 10: Goals System (shown inline in header) ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <GlassCard>
          <SectionTitle icon={Target} title="Metas Nutricionais" subtitle="Baseado no seu objetivo atual" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Objetivo", value: goalConfig[goal].label, color: "hsl(var(--primary))" },
              { label: "Calorias/dia", value: `${goalConfig[goal].calories} kcal`, color: "hsl(var(--foreground))" },
              { label: "Proteína", value: `${goalConfig[goal].protein}g`, color: "hsl(var(--primary))" },
              { label: "Carbs", value: `${goalConfig[goal].carbs}g`, color: "hsl(var(--foreground))" },
            ].map(item => (
              <div key={item.label} className="p-3.5 rounded-2xl text-center"
                style={{ background: "hsl(var(--muted) / 0.4)", border: "1px solid hsl(var(--border) / 0.4)" }}>
                <div className="text-sm font-black" style={{ color: item.color }}>{item.value}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3 flex-wrap">
            {(Object.keys(goalConfig) as GoalType[]).map(g => (
              <button key={g} onClick={() => setGoal(g)}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: goal === g ? "hsl(var(--primary))" : "hsl(var(--muted) / 0.6)",
                  color: goal === g ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                  border: `1px solid ${goal === g ? "transparent" : "hsl(var(--border) / 0.5)"}`,
                }}>
                {goalConfig[g].label}
              </button>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* ── SECTION 11: Food History ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
        <GlassCard>
          <SectionTitle icon={TrendingUp} title="Histórico de Refeições" subtitle="Suas refeições anteriores" />
          <div className="flex gap-2 mb-4">
            {(["today", "week", "month"] as const).map(f => (
              <button key={f} onClick={() => setHistoryFilter(f)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: historyFilter === f ? "hsl(var(--primary))" : "hsl(var(--muted) / 0.5)",
                  color: historyFilter === f ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                }}>
                {f === "today" ? "Hoje" : f === "week" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {meals.map(meal => (
              <div key={meal.id} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.3)" }}>
                <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                  <Flame className="w-4 h-4" style={{ color: "hsl(var(--primary-foreground))" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{meal.name}</div>
                  <div className="text-xs text-muted-foreground">{meal.time} · {meal.category}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-primary">{meal.calories}</div>
                  <div className="text-[10px] text-muted-foreground">kcal</div>
                </div>
              </div>
            ))}
            {meals.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">Nenhuma refeição registrada.</p>
            )}
          </div>
        </GlassCard>
      </motion.div>

      {/* ── SECTION 12: Floating Quick Actions ── */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2.5 z-50">
        <motion.button
          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
          onClick={() => openScanner()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold shadow-xl transition-all"
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            color: "hsl(var(--foreground))",
            boxShadow: "0 8px 24px hsl(0 0% 0% / 0.15)"
          }}
          title="Escanear Comida"
        >
          <Camera className="w-4 h-4 text-primary" />
          <span className="hidden sm:inline">Escanear</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
          onClick={() => setWater(w => Math.min(waterGoal, w + 1))}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold shadow-xl transition-all"
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            color: "hsl(var(--foreground))",
            boxShadow: "0 8px 24px hsl(0 0% 0% / 0.15)"
          }}
          title="Adicionar Água"
        >
          <Droplets className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
          <span className="hidden sm:inline">Água</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
          onClick={() => document.querySelector<HTMLTextAreaElement>("textarea")?.focus()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold shadow-xl"
          style={{
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
            boxShadow: "0 8px 24px hsl(var(--primary) / 0.35)"
          }}
          title="Adicionar Refeição"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Refeição</span>
        </motion.button>
      </div>
    </div>

    <DeleteConfirmDialog
      open={!!mealToDelete}
      onOpenChange={(open) => { if (!open) setMealToDelete(null); }}
      title="Excluir refeição"
      description="Tem certeza que deseja excluir esta refeição do seu diário?"
      onConfirm={() => { if (mealToDelete) { deleteMealFromDB(mealToDelete); setMealToDelete(null); } }}
    />
    </>
  );
}
