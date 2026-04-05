import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  History, Search, Trash2, BookOpen, ArrowLeft, Loader2,
  Sparkles, Brain, GraduationCap, ChevronRight, X,
  MessageSquare, Star, BookMarked, CheckCircle, List, RefreshCw
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

interface ReadingEntry {
  id: string;
  title: string;
  text: string;
  ai_result: AIResult | null;
  study_result: StudyResult | null;
  created_at: string;
}

function ResultCard({ icon, title, children }: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted/30 border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40">
        {icon}
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

export default function LeitorIAHistorico() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [entries, setEntries] = useState<ReadingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<ReadingEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("reading_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar histórico", variant: "destructive" });
    } else {
      setEntries((data ?? []).map(row => ({
        id: row.id,
        title: row.title,
        text: row.text,
        ai_result: row.ai_result as unknown as AIResult | null,
        study_result: row.study_result as unknown as StudyResult | null,
        created_at: row.created_at,
      })));
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("reading_history")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao apagar leitura", variant: "destructive" });
    } else {
      setEntries(prev => prev.filter(e => e.id !== id));
      if (selectedEntry?.id === id) setSelectedEntry(null);
      toast({ title: "Leitura apagada" });
    }
    setDeletingId(null);
  };

  const handleReread = (entry: ReadingEntry) => {
    // Navigate back to main page with state
    navigate("/leitor-ia", { state: { text: entry.text, aiResult: entry.ai_result } });
  };

  const filtered = entries.filter(e =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });

  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/leitor-ia")}
            className="shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
              <History className="w-5 h-5" style={{ color: "hsl(var(--primary-foreground))" }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">Histórico de Leituras</h1>
              <p className="text-sm text-muted-foreground">
                {entries.length} {entries.length === 1 ? "leitura salva" : "leituras salvas"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchHistory} title="Atualizar">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </motion.div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por título ou conteúdo..."
            className="pl-9 bg-card border-border rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Carregando histórico...</span>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-2 border-dashed border-border rounded-2xl py-20 flex flex-col items-center gap-4 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">
                {searchQuery ? "Nenhuma leitura encontrada" : "Nenhuma leitura salva ainda"}
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                {searchQuery
                  ? "Tente outros termos de busca"
                  : "Salve leituras no Leitor IA para vê-las aqui"}
              </p>
            </div>
            {!searchQuery && (
              <Button size="sm" onClick={() => navigate("/leitor-ia")} className="gap-2">
                <BookOpen className="w-4 h-4" />
                Ir para o Leitor IA
              </Button>
            )}
          </motion.div>
        ) : (
          <div className={cn(
            "grid gap-4",
            selectedEntry ? "grid-cols-1 lg:grid-cols-[1fr_1.4fr]" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          )}>

            {/* Entry list */}
            <div className={cn("space-y-3", selectedEntry && "lg:overflow-y-auto lg:max-h-[calc(100vh-220px)]")}>
              <AnimatePresence initial={false}>
                {filtered.map(entry => (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    onClick={() => setSelectedEntry(entry.id === selectedEntry?.id ? null : entry)}
                    className={cn(
                      "bg-card border rounded-2xl p-4 cursor-pointer transition-all group",
                      entry.id === selectedEntry?.id
                        ? "border-primary/60 shadow-[0_0_16px_hsl(var(--primary)/0.12)]"
                        : "border-border hover:border-primary/30 hover:bg-card/80"
                    )}
                  >
                    {/* Title row */}
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                        entry.id === selectedEntry?.id ? "gradient-primary" : "bg-muted"
                      )}>
                        <BookOpen className={cn(
                          "w-4 h-4",
                          entry.id === selectedEntry?.id ? "" : "text-muted-foreground"
                        )}
                          style={entry.id === selectedEntry?.id
                            ? { color: "hsl(var(--primary-foreground))" } : {}} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
                          {entry.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</span>
                          <span className="text-xs text-muted-foreground/50">·</span>
                          <span className="text-xs text-muted-foreground">{wordCount(entry.text)} palavras</span>
                          {entry.ai_result && (
                            <>
                              <span className="text-xs text-muted-foreground/50">·</span>
                              <span className="flex items-center gap-1 text-xs text-primary">
                                <Brain className="w-3 h-3" />
                                Analisado
                              </span>
                            </>
                          )}
                          {entry.study_result && (
                            <span className="flex items-center gap-1 text-xs text-secondary">
                              <GraduationCap className="w-3 h-3" />
                              Estudo
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => { e.stopPropagation(); handleReread(entry); }}
                          className="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors"
                          title="Reler"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={e => handleDelete(entry.id, e)}
                          disabled={deletingId === entry.id}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                          title="Apagar"
                        >
                          {deletingId === entry.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Text preview */}
                    {entry.id !== selectedEntry?.id && (
                      <p className="text-xs text-muted-foreground mt-2.5 line-clamp-2 leading-relaxed pl-11">
                        {entry.text}
                      </p>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Detail panel */}
            <AnimatePresence>
              {selectedEntry && (
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col"
                >
                  {/* Detail header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen className="w-4 h-4 text-primary shrink-0" />
                      <p className="text-sm font-semibold text-foreground truncate">{selectedEntry.title}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 text-xs gradient-primary border-0"
                        style={{ color: "hsl(var(--primary-foreground))" }}
                        onClick={() => handleReread(selectedEntry)}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                        Reler
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedEntry(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* Original text */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Texto original
                      </p>
                      <div className="bg-muted/30 rounded-xl p-3 max-h-40 overflow-y-auto">
                        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                          {selectedEntry.text}
                        </p>
                      </div>
                    </div>

                    {/* AI Analysis */}
                    {selectedEntry.ai_result && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Brain className="w-3.5 h-3.5 text-primary" />
                          Análise da IA
                        </p>

                        <ResultCard
                          icon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
                          title="Resumo"
                        >
                          <p className="text-sm text-foreground/90 leading-relaxed">
                            {selectedEntry.ai_result.resumo}
                          </p>
                        </ResultCard>

                        <ResultCard
                          icon={<MessageSquare className="w-3.5 h-3.5 text-primary" />}
                          title="Explicação"
                        >
                          <p className="text-sm text-foreground/90 leading-relaxed">
                            {selectedEntry.ai_result.explicacao}
                          </p>
                        </ResultCard>

                        {selectedEntry.ai_result.ideias?.length > 0 && (
                          <ResultCard
                            icon={<Star className="w-3.5 h-3.5 text-secondary" />}
                            title="Principais Ideias"
                          >
                            <ul className="space-y-1.5">
                              {selectedEntry.ai_result.ideias.map((idea, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                                  <span className="w-4 h-4 rounded-full gradient-primary flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-black"
                                    style={{ color: "hsl(var(--primary-foreground))" }}>
                                    {i + 1}
                                  </span>
                                  {idea}
                                </li>
                              ))}
                            </ul>
                          </ResultCard>
                        )}

                        {selectedEntry.ai_result.sugestoes?.length > 0 && (
                          <ResultCard
                            icon={<BookMarked className="w-3.5 h-3.5 text-primary" />}
                            title="Sugestões de Aprendizado"
                          >
                            <ul className="space-y-1.5">
                              {selectedEntry.ai_result.sugestoes.map((s, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                                  <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </ResultCard>
                        )}
                      </div>
                    )}

                    {/* Study result */}
                    {selectedEntry.study_result && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-secondary" />
                          Modo Estudo
                        </p>

                        <ResultCard
                          icon={<List className="w-3.5 h-3.5 text-secondary" />}
                          title="Resumo Detalhado"
                        >
                          <p className="text-sm text-foreground/90 leading-relaxed">
                            {selectedEntry.study_result.resumo_detalhado}
                          </p>
                        </ResultCard>

                        {selectedEntry.study_result.pontos_importantes?.length > 0 && (
                          <ResultCard
                            icon={<CheckCircle className="w-3.5 h-3.5 text-primary" />}
                            title="Pontos Importantes"
                          >
                            <ul className="space-y-1.5">
                              {selectedEntry.study_result.pontos_importantes.map((p, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-2" />
                                  {p}
                                </li>
                              ))}
                            </ul>
                          </ResultCard>
                        )}

                        {selectedEntry.study_result.perguntas?.length > 0 && (
                          <ResultCard
                            icon={<GraduationCap className="w-3.5 h-3.5 text-secondary" />}
                            title="Perguntas para Estudo"
                          >
                            <ul className="space-y-2">
                              {selectedEntry.study_result.perguntas.map((q, i) => (
                                <li key={i} className="p-2.5 rounded-lg bg-muted/40 text-sm text-foreground/90 font-medium">
                                  {i + 1}. {q}
                                </li>
                              ))}
                            </ul>
                          </ResultCard>
                        )}
                      </div>
                    )}

                    {/* No analysis note */}
                    {!selectedEntry.ai_result && !selectedEntry.study_result && (
                      <div className="text-center py-8">
                        <Brain className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Esta leitura não possui análise da IA.</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Clique em "Reler" para analisá-la.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
