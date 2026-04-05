import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Camera, FileText, Brain, BookOpen,
  Play, Pause, Square, Sparkles, Save, BookMarked,
  Loader2, Upload, ChevronRight, GraduationCap, List,
  MessageSquare, Star, History, CheckCircle,
  Volume2, ChevronDown, Settings2, Mic2, Zap, Globe
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AIResult {
  resumo: string;
  explicacao: string;
  ideias: string[];
  sugestoes: string[];
}

interface StudyResult {
  resumo_detalhado: string;
  explicacao_simplificada: string;
  perguntas: string[];
  pontos_importantes: string[];
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  labels: Record<string, string>;
  preview_url?: string;
}

// Curated fallback voices (covers Portuguese + popular options)
const FALLBACK_VOICES: ElevenLabsVoice[] = [
  { voice_id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", labels: { accent: "american", gender: "male", use_case: "narration" } },
  { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", labels: { accent: "american", gender: "female", use_case: "news" } },
  { voice_id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", labels: { accent: "american", gender: "female", use_case: "conversational" } },
  { voice_id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", labels: { accent: "australian", gender: "male", use_case: "conversational" } },
  { voice_id: "JBFqnCBsd6RMkjVDRZzb", name: "George", labels: { accent: "british", gender: "male", use_case: "narration" } },
  { voice_id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum", labels: { accent: "american", gender: "male", use_case: "characters" } },
  { voice_id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", labels: { accent: "american", gender: "male", use_case: "narration" } },
  { voice_id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", labels: { accent: "british", gender: "female", use_case: "news" } },
  { voice_id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", labels: { accent: "american", gender: "female", use_case: "narration" } },
  { voice_id: "bIHbv24MWmeRgasZH58o", name: "Will", labels: { accent: "american", gender: "male", use_case: "social_media" } },
  { voice_id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", labels: { accent: "american", gender: "female", use_case: "conversational" } },
  { voice_id: "iP95p4xoKVk53GoZ742B", name: "Chris", labels: { accent: "american", gender: "male", use_case: "conversational" } },
  { voice_id: "nPczCjzI2devNBz1zQrb", name: "Brian", labels: { accent: "american", gender: "male", use_case: "narration" } },
  { voice_id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", labels: { accent: "british", gender: "male", use_case: "news" } },
  { voice_id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", labels: { accent: "british", gender: "female", use_case: "narration" } },
  { voice_id: "pqHfZKP75CvOlQylNhV4", name: "Bill", labels: { accent: "american", gender: "male", use_case: "narration" } },
];

type ActiveMode = "scan" | "paste" | null;
type TTSState = "idle" | "loading" | "playing" | "paused";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function LeitorIA() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const locationState = location.state as { text?: string; aiResult?: AIResult } | null;

  // Text state
  const [activeMode, setActiveMode] = useState<ActiveMode>(locationState?.text ? "paste" : null);
  const [pastedText, setPastedText] = useState(locationState?.text ?? "");
  const [scannedText, setScannedText] = useState("");
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // AI state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(locationState?.aiResult ?? null);
  const [studyResult, setStudyResult] = useState<StudyResult | null>(null);
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [isStudyLoading, setIsStudyLoading] = useState(false);

  // TTS state
  const [ttsState, setTtsState] = useState<TTSState>("idle");
  const [ttsEngine, setTtsEngine] = useState<"elevenlabs" | "browser" | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ElevenLabs voice state
  const [elevenLabsVoices, setElevenLabsVoices] = useState<ElevenLabsVoice[]>(FALLBACK_VOICES);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("CwhRBWXzGAHq8TQ4Fs17"); // Roger default
  const [ttsRate, setTtsRate] = useState(1.0);
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);

  // Load ElevenLabs voices on mount
  useEffect(() => {
    const loadVoices = async () => {
      setIsLoadingVoices(true);
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({ action: "list_voices" }),
        });
        if (!response.ok) throw new Error("Failed to fetch voices");
        const data = await response.json();
        if (data.voices?.length > 0) {
          setElevenLabsVoices(data.voices);
        }
      } catch {
        // Keep fallback voices silently
      } finally {
        setIsLoadingVoices(false);
      }
    };
    loadVoices();
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeText = activeMode === "scan" ? scannedText : pastedText;

  // ── OCR via Lovable AI (vision) ──────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Por favor, envie uma imagem.", variant: "destructive" });
      return;
    }

    setIsOcrLoading(true);
    setActiveMode("scan");

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setUploadedImage(base64);

      try {
        const { data, error } = await supabase.functions.invoke("leitor-ia", {
          body: { action: "ocr", imageBase64: base64 }
        });
        if (error) throw error;
        setScannedText(data.text || "");
        toast({ title: "Texto detectado!", description: "Você pode editar antes de analisar." });
      } catch {
        toast({ title: "Erro no OCR", description: "Não foi possível extrair o texto da imagem.", variant: "destructive" });
      } finally {
        setIsOcrLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── AI Analysis ──────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    const text = activeText.trim();
    if (!text) {
      toast({ title: "Texto vazio", description: "Adicione um texto para analisar.", variant: "destructive" });
      return;
    }
    if (text.length < 20) {
      toast({ title: "Texto muito curto", description: "O texto precisa ter pelo menos 20 caracteres.", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    setAiResult(null);
    setStudyResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("leitor-ia", {
        body: { action: "analyze", text }
      });
      if (error) throw error;
      setAiResult(data.result);
      toast({ title: "Análise concluída!", description: "A IA analisou seu texto com sucesso." });
    } catch {
      toast({ title: "Erro na análise", description: "Não foi possível analisar o texto.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Study Mode ───────────────────────────────────────────────────────────
  const handleStudyMode = async () => {
    const text = activeText.trim();
    if (!text) {
      toast({ title: "Texto vazio", description: "Adicione um texto para o Modo Estudo.", variant: "destructive" });
      return;
    }

    setIsStudyLoading(true);
    setIsStudyMode(true);
    setStudyResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("leitor-ia", {
        body: { action: "study", text }
      });
      if (error) throw error;
      setStudyResult(data.result);
    } catch {
      toast({ title: "Erro", description: "Não foi possível gerar o Modo Estudo.", variant: "destructive" });
      setIsStudyMode(false);
    } finally {
      setIsStudyLoading(false);
    }
  };

  // ── Browser SpeechSynthesis fallback ─────────────────────────────────────
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speakWithBrowser = useCallback((text: string) => {
    if (!window.speechSynthesis) return false;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "pt-BR";
    utter.rate = ttsRate;

    // Pick a Portuguese voice if available
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.startsWith("pt")) ?? voices[0];
    if (ptVoice) utter.voice = ptVoice;

    utter.onend = () => { setTtsState("idle"); setTtsEngine(null); };
    utter.onerror = () => { setTtsState("idle"); setTtsEngine(null); };
    synthRef.current = utter;
    window.speechSynthesis.speak(utter);
    setTtsState("playing");
    setTtsEngine("browser");
    return true;
  }, [ttsRate]);

  // ── ElevenLabs Text-to-Speech (with browser fallback) ────────────────────
  const handleTTS = useCallback(async () => {
    const text = activeText.trim();
    if (!text) {
      toast({ title: "Texto vazio", description: "Adicione um texto para ouvir a leitura.", variant: "destructive" });
      return;
    }

    // Pause/resume ElevenLabs audio
    if (ttsState === "playing") {
      if (audioRef.current) {
        audioRef.current.pause();
      } else {
        window.speechSynthesis?.pause();
      }
      setTtsState("paused");
      return;
    }

    if (ttsState === "paused") {
      if (audioRef.current) {
        audioRef.current.play();
      } else {
        window.speechSynthesis?.resume();
      }
      setTtsState("playing");
      return;
    }

    // idle → load → play
    setTtsState("loading");
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          action: "tts",
          text,
          voiceId: selectedVoiceId,
          speed: ttsRate,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error ?? "Falha no TTS");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(url);
      audio.onended = () => { setTtsState("idle"); setTtsEngine(null); };
      audio.onerror = () => { setTtsState("idle"); setTtsEngine(null); };
      audioRef.current = audio;
      await audio.play();
      setTtsState("playing");
      setTtsEngine("elevenlabs");
    } catch {
      // ── Fallback: browser SpeechSynthesis ──────────────────────────────
      audioRef.current = null;
      const ok = speakWithBrowser(text);
      if (ok) {
        toast({
          title: "Usando voz do navegador",
          description: "ElevenLabs indisponível. Usando síntese de voz local.",
        });
      } else {
        setTtsState("idle");
        setTtsEngine(null);
        toast({
          title: "TTS indisponível",
          description: "Não foi possível reproduzir o áudio neste dispositivo.",
          variant: "destructive",
        });
      }
    }
  }, [activeText, ttsState, toast, selectedVoiceId, ttsRate, speakWithBrowser]);

  const handleTTSStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setTtsState("idle");
    setTtsEngine(null);
  };

  // Preview a voice with a short sample phrase
  const handlePreviewVoice = async (voiceId: string) => {
    setPreviewingVoiceId(voiceId);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          action: "tts",
          text: "Olá! Esta é uma prévia da minha voz para o Leitor IA.",
          voiceId,
          speed: 1.0,
        }),
      });
      if (!response.ok) throw new Error("Falha no preview");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => setPreviewingVoiceId(null);
      audio.onerror = () => setPreviewingVoiceId(null);
      await audio.play();
    } catch {
      // Fallback preview with browser voice
      setPreviewingVoiceId(null);
      speakWithBrowser("Olá! Esta é uma prévia da voz do navegador para o Leitor IA.");
    }
  };

  // ── Save Reading to DB ───────────────────────────────────────────────────
  const handleSave = async () => {
    const text = activeText.trim();
    if (!text) {
      toast({ title: "Texto vazio", description: "Adicione um texto para salvar.", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Não autenticado", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const title = text.slice(0, 80) + (text.length > 80 ? "..." : "");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("reading_history").insert({
      user_id: user.id,
      title,
      text,
      ai_result: aiResult ?? null,
      study_result: studyResult ?? null,
    });
    if (error) {
      toast({ title: "Erro ao salvar", description: "Não foi possível salvar a leitura.", variant: "destructive" });
    } else {
      toast({ title: "Leitura salva!", description: "Adicionada ao histórico de leituras." });
    }
    setIsSaving(false);
  };

  const ttsIcon = ttsState === "loading" ? Loader2 : ttsState === "playing" ? Pause : Play;
  const TtsIcon = ttsIcon;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
                <BookOpen className="w-5 h-5" style={{ color: "hsl(var(--primary-foreground))" }} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-foreground tracking-tight">Leitor IA</h1>
                <p className="text-sm text-muted-foreground">
                  Leia, entenda e ouça qualquer página de livro com inteligência artificial.
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/leitor-ia/historico")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Histórico</span>
          </Button>
        </motion.div>


        {/* ── Mode Selection Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { id: "scan" as const, icon: Camera, label: "Escanear página", desc: "Tire foto ou envie imagem", color: "text-primary" },
            { id: "paste" as const, icon: FileText, label: "Colar texto", desc: "Cole qualquer trecho", color: "text-primary" },
          ].map(mode => (
            <motion.button
              key={mode.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setActiveMode(mode.id);
                if (mode.id === "scan") fileInputRef.current?.click();
              }}
              className={cn(
                "p-4 rounded-2xl border transition-all text-left",
                activeMode === mode.id
                  ? "border-primary/60 bg-primary/8 shadow-[0_0_12px_hsl(var(--primary)/0.15)]"
                  : "border-border bg-card hover:border-primary/30 hover:bg-card/80"
              )}
            >
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-2",
                activeMode === mode.id ? "gradient-primary" : "bg-muted")}>
                <mode.icon className={cn("w-4 h-4", activeMode === mode.id ? "" : mode.color)}
                  style={activeMode === mode.id ? { color: "hsl(var(--primary-foreground))" } : {}} />
              </div>
              <p className="text-sm font-semibold text-foreground">{mode.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{mode.desc}</p>
            </motion.button>
          ))}

          {/* Quick action buttons */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStudyMode}
            disabled={!activeText.trim()}
            className={cn(
              "p-4 rounded-2xl border transition-all text-left",
              isStudyMode
                ? "border-primary/60 bg-primary/8"
                : "border-border bg-card hover:border-primary/30 hover:bg-card/80",
              !activeText.trim() && "opacity-40 cursor-not-allowed"
            )}
          >
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-2",
              isStudyMode ? "bg-primary/20" : "bg-muted")}>
              <GraduationCap className={cn("w-4 h-4", isStudyMode ? "text-[#EB5002]" : "text-[#EB5002]")} />
            </div>
            <p className="text-sm font-semibold text-foreground">Modo Estudo</p>
            <p className="text-xs text-muted-foreground mt-0.5">Perguntas e análise</p>
          </motion.button>
        </div>

        {/* ── Hidden file input ── */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleImageUpload}
        />

        {/* ── Text Input Area ── */}
        <AnimatePresence mode="wait">
          {activeMode && (
            <motion.div
              key={activeMode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-card border border-border rounded-2xl overflow-hidden"
            >
              {/* Card header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  {activeMode === "scan" ? (
                    <Camera className="w-4 h-4 text-primary" />
                  ) : (
                    <FileText className="w-4 h-4 text-primary" />
                  )}
                  <span className="text-sm font-semibold text-foreground">
                    {activeMode === "scan" ? "Texto detectado" : "Cole aqui o texto do livro"}
                  </span>
                  {activeMode === "scan" && isOcrLoading && (
                    <span className="flex items-center gap-1.5 text-xs text-primary">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Extraindo texto...
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {activeMode === "scan" && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5"
                      onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-3 h-3" />
                      Nova imagem
                    </Button>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {activeText.length} caracteres
                  </span>
                </div>
              </div>

              {/* Image preview for scan mode */}
              {activeMode === "scan" && uploadedImage && (
                <div className="px-4 pt-3">
                  <img src={uploadedImage} alt="Página escaneada"
                    className="h-24 w-auto rounded-xl border border-border object-cover" />
                </div>
              )}

              <Textarea
                value={activeMode === "scan" ? scannedText : pastedText}
                onChange={e => activeMode === "scan"
                  ? setScannedText(e.target.value)
                  : setPastedText(e.target.value)}
                placeholder={activeMode === "scan"
                  ? "O texto da imagem aparecerá aqui. Você pode editar antes de analisar..."
                  : "Cole aqui o texto do livro, artigo ou qualquer conteúdo que deseja analisar..."}
                className="min-h-[180px] border-0 rounded-none resize-none focus-visible:ring-0 text-sm bg-transparent px-4 py-3"
              />


              {/* Action bar */}
              <div className="border-t border-border/50">
                {/* ── ElevenLabs Voice Settings Panel ── */}
                <AnimatePresence>
                  {showVoicePanel && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 py-3 bg-muted/30 border-b border-border/30 space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-semibold text-foreground">Vozes ElevenLabs</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">IA Premium</span>
                          </div>
                          {isLoadingVoices && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Carregando vozes...
                            </span>
                          )}
                        </div>

                        {/* Voice grid */}
                        <div>
                          <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1.5 block">
                            {elevenLabsVoices.length} vozes disponíveis — clique ▶ para ouvir prévia
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
                            {elevenLabsVoices.map(voice => {
                              const isSelected = selectedVoiceId === voice.voice_id;
                              const isPreviewing = previewingVoiceId === voice.voice_id;
                              const gender = voice.labels?.gender ?? "";
                              const accent = voice.labels?.accent ?? "";
                              const useCase = voice.labels?.use_case ?? "";
                              return (
                                <div
                                  key={voice.voice_id}
                                  className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-xl text-xs cursor-pointer transition-all border",
                                    isSelected
                                      ? "border-primary/60 bg-primary/10 text-foreground"
                                      : "border-border bg-card text-foreground hover:border-primary/30 hover:bg-card/80"
                                  )}
                                  onClick={() => setSelectedVoiceId(voice.voice_id)}
                                >
                                  {/* Select indicator */}
                                  <div className={cn(
                                    "w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center transition-all",
                                    isSelected ? "bg-primary" : "border border-border"
                                  )}>
                                    {isSelected && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                                  </div>

                                  {/* Voice info */}
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold truncate leading-tight">{voice.name}</p>
                                    <p className="text-[9px] text-muted-foreground truncate capitalize">
                                      {[gender, accent, useCase].filter(Boolean).join(" · ")}
                                    </p>
                                  </div>

                                  {/* Preview button */}
                                  <button
                                    onClick={e => { e.stopPropagation(); handlePreviewVoice(voice.voice_id); }}
                                    disabled={isPreviewing}
                                    className={cn(
                                      "w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                                      isPreviewing ? "bg-primary/20" : "bg-muted hover:bg-primary/20"
                                    )}
                                    title="Prévia da voz"
                                  >
                                    {isPreviewing ? (
                                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                    ) : (
                                      <Play className="w-3 h-3 text-muted-foreground" />
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Speed control */}
                        <div>
                          <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1.5 flex justify-between">
                            <span>Velocidade</span>
                            <span className="text-primary font-bold">{ttsRate.toFixed(1)}x</span>
                          </label>
                          <input
                            type="range"
                            min={0.7} max={1.2} step={0.1}
                            value={ttsRate}
                            onChange={e => setTtsRate(Number(e.target.value))}
                            className="w-full h-1.5 rounded-full accent-primary cursor-pointer"
                          />
                          <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                            <span>0.7x Lento</span>
                            <span>1.0x Normal</span>
                            <span>1.2x Rápido</span>
                          </div>
                        </div>

                        {/* Selected voice info bar */}
                        {(() => {
                          const v = elevenLabsVoices.find(v => v.voice_id === selectedVoiceId);
                          return v ? (
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/8 border border-primary/20">
                              <Globe className="w-3 h-3 text-primary flex-shrink-0" />
                              <span className="text-[10px] text-foreground">
                                Voz selecionada: <strong>{v.name}</strong>
                                {v.labels?.accent && ` · ${v.labels.accent}`}
                              </span>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Main action row */}
                <div className="flex items-center gap-2 px-4 py-3 flex-wrap">
                  {/* TTS controls */}
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleTTS}
                      disabled={!activeText.trim() || ttsState === "loading"}
                      className={cn("h-8 gap-1.5 text-xs",
                        ttsState !== "idle" && "border-primary/60 text-primary")}
                    >
                      <TtsIcon className={cn("w-3.5 h-3.5", ttsState === "loading" && "animate-spin")} />
                      {ttsState === "idle" ? "Ouvir" : ttsState === "loading" ? "Gerando..." : ttsState === "playing" ? "Pausar" : "Retomar"}
                    </Button>
                    {(ttsState === "playing" || ttsState === "paused") && (
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleTTSStop}>
                        <Square className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    )}
                    {/* Voice settings toggle */}
                    <Button
                      size="sm"
                      variant={showVoicePanel ? "default" : "ghost"}
                      className={cn("h-8 gap-1 text-xs px-2",
                        showVoicePanel ? "bg-primary text-primary-foreground" : ""
                      )}
                      onClick={() => setShowVoicePanel(v => !v)}
                      title="Configurar voz ElevenLabs"
                    >
                      <Mic2 className="w-3.5 h-3.5" />
                      <ChevronDown className={cn("w-3 h-3 transition-transform", showVoicePanel && "rotate-180")} />
                    </Button>
                  </div>

                  {/* ── TTS Engine Indicator ── */}
                  <AnimatePresence>
                    {ttsEngine && (
                      <motion.div
                        key="tts-engine-badge"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border",
                          ttsEngine === "elevenlabs"
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "bg-muted border-border text-muted-foreground"
                        )}
                      >
                        {ttsEngine === "elevenlabs" ? (
                          <>
                            <Zap className="w-3 h-3" />
                            <span>ElevenLabs</span>
                          </>
                        ) : (
                          <>
                            <Globe className="w-3 h-3" />
                            <span>Voz do navegador</span>
                          </>
                        )}
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0",
                          ttsEngine === "elevenlabs" ? "bg-primary" : "bg-muted-foreground"
                        )} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5 text-xs"
                    disabled={!activeText.trim() || isSaving}
                    onClick={handleSave}
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {isSaving ? "Salvando..." : "Salvar"}
                  </Button>

                  <div className="flex-1" />

                  <Button
                    size="sm"
                    onClick={handleAnalyze}
                    disabled={!activeText.trim() || isAnalyzing}
                    className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 border-0"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Brain className="w-3.5 h-3.5" />
                    )}
                    {isAnalyzing ? "Analisando..." : "Analisar com IA"}
                    {!isAnalyzing && <ChevronRight className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── No mode selected placeholder ── */}
        {!activeMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-2 border-dashed border-border rounded-2xl py-16 flex flex-col items-center justify-center gap-4 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Selecione um modo para começar</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Escaneie uma página ou cole um texto</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-2"
                onClick={() => { setActiveMode("scan"); fileInputRef.current?.click(); }}>
                <Camera className="w-4 h-4" />
                Escanear
              </Button>
              <Button size="sm" variant="outline" className="gap-2"
                onClick={() => setActiveMode("paste")}>
                <FileText className="w-4 h-4" />
                Colar texto
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── AI Results ── */}
        <AnimatePresence>
          {(aiResult || studyResult) && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Tabs defaultValue={studyResult ? "study" : "summary"}>
                <TabsList className="w-full mb-4 bg-muted/50 p-1 rounded-xl h-auto flex-wrap gap-1">
                  {aiResult && (
                    <>
                      <TabsTrigger value="summary" className="flex-1 rounded-lg gap-1.5 text-xs data-[state=active]:bg-background">
                        <Sparkles className="w-3.5 h-3.5" />
                        Resumo
                      </TabsTrigger>
                      <TabsTrigger value="explain" className="flex-1 rounded-lg gap-1.5 text-xs data-[state=active]:bg-background">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Explicação
                      </TabsTrigger>
                      <TabsTrigger value="ideas" className="flex-1 rounded-lg gap-1.5 text-xs data-[state=active]:bg-background">
                        <Star className="w-3.5 h-3.5" />
                        Ideias
                      </TabsTrigger>
                    </>
                  )}
                  {studyResult && (
                    <TabsTrigger value="study" className="flex-1 rounded-lg gap-1.5 text-xs data-[state=active]:bg-background">
                      <GraduationCap className="w-3.5 h-3.5" />
                      Modo Estudo
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* Summary Tab */}
                {aiResult && (
                  <>
                    <TabsContent value="summary">
                      <ResultCard
                        icon={<Sparkles className="w-4 h-4 text-primary" />}
                        title="Resumo Inteligente"
                      >
                        <p className="text-sm text-foreground/90 leading-relaxed">{aiResult.resumo}</p>
                      </ResultCard>
                    </TabsContent>

                    <TabsContent value="explain">
                      <ResultCard
                        icon={<MessageSquare className="w-4 h-4 text-primary" />}
                        title="Explicação Simples"
                      >
                        <p className="text-sm text-foreground/90 leading-relaxed">{aiResult.explicacao}</p>
                      </ResultCard>
                    </TabsContent>

                    <TabsContent value="ideas">
                      <div className="grid gap-3">
                        <ResultCard
                          icon={<Star className="w-4 h-4 text-[#EB5002]" />}
                          title="Principais Ideias"
                        >
                          <ul className="space-y-2">
                            {aiResult.ideias.map((idea, i) => (
                              <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/90">
                                <span className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-black"
                                  style={{ color: "hsl(var(--primary-foreground))" }}>
                                  {i + 1}
                                </span>
                                {idea}
                              </li>
                            ))}
                          </ul>
                        </ResultCard>

                        <ResultCard
                          icon={<BookMarked className="w-4 h-4 text-primary" />}
                          title="Sugestões de Aprendizado"
                        >
                          <ul className="space-y-2">
                            {aiResult.sugestoes.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                                <ChevronRight className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </ResultCard>
                      </div>
                    </TabsContent>
                  </>
                )}

                {/* Study Tab */}
                {studyResult && (
                  <TabsContent value="study">
                    {isStudyLoading ? (
                      <div className="flex items-center justify-center py-12 gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Gerando Modo Estudo...</span>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        <ResultCard
                          icon={<List className="w-4 h-4 text-[#EB5002]" />}
                          title="Resumo Detalhado"
                        >
                          <p className="text-sm text-foreground/90 leading-relaxed">{studyResult.resumo_detalhado}</p>
                        </ResultCard>

                        <ResultCard
                          icon={<MessageSquare className="w-4 h-4 text-primary" />}
                          title="Explicação Simplificada"
                        >
                          <p className="text-sm text-foreground/90 leading-relaxed">{studyResult.explicacao_simplificada}</p>
                        </ResultCard>

                        <ResultCard
                          icon={<CheckCircle className="w-4 h-4 text-primary" />}
                          title="Pontos Mais Importantes"
                        >
                          <ul className="space-y-2">
                            {studyResult.pontos_importantes.map((p, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-2" />
                                {p}
                              </li>
                            ))}
                          </ul>
                        </ResultCard>

                        <ResultCard
                          icon={<GraduationCap className="w-4 h-4 text-[#EB5002]" />}
                          title="Perguntas para Estudo"
                          accent="violet"
                        >
                          <ul className="space-y-3">
                            {studyResult.perguntas.map((q, i) => (
                              <li key={i} className="p-3 rounded-xl bg-muted/40 text-sm text-foreground/90 font-medium">
                                {i + 1}. {q}
                              </li>
                            ))}
                          </ul>
                        </ResultCard>
                      </div>
                    )}
                  </TabsContent>
                )}
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Analyzing skeleton ── */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center animate-pulse">
                <Brain className="w-6 h-6" style={{ color: "hsl(var(--primary-foreground))" }} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">IA analisando seu texto...</p>
                <p className="text-sm text-muted-foreground mt-1">Gerando resumo, explicação e ideias principais</p>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

// ── Result Card Component ─────────────────────────────────────────────────
function ResultCard({
  icon, title, children, accent
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50">
        {icon}
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <div className="px-4 py-4">
        {children}
      </div>
    </div>
  );
}
