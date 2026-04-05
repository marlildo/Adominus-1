import { useState, useRef, useEffect } from "react";
import { Send, User, Zap, Sword, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ElitePageHeader } from "@/components/ElitePageLayout";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dominus-ai`;

const SUGGESTIONS = [
  "Organize meu dia de hoje",
  "⚔ Ativar War Mode",
  "Crie um plano semanal",
  "Como parar de procrastinar?",
  "Me dê estratégias de foco",
];

async function streamChat({
  messages, onDelta, onDone, signal,
}: {
  messages: Msg[];
  onDelta: (chunk: string) => void;
  onDone: () => void;
  signal: AbortSignal;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
    signal,
  });
  if (!resp.ok || !resp.body) {
    const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(err.error ?? `HTTP ${resp.status}`);
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let done = false;
  while (!done) {
    const { done: rd, value } = await reader.read();
    if (rd) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }
      try {
        const parsed = JSON.parse(json);
        const c = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (c) onDelta(c);
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }
  onDone();
}

export default function DominusAI() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: Msg = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let assistantSoFar = "";
    try {
      await streamChat({
        messages: next,
        signal: ctrl.signal,
        onDelta: (chunk) => {
          assistantSoFar += chunk;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant")
              return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
            return [...prev, { role: "assistant", content: assistantSoFar }];
          });
        },
        onDone: () => setLoading(false),
      });
    } catch (e: unknown) {
      if ((e as Error)?.name === "AbortError") return;
      toast.error((e as Error)?.message ?? "Erro ao conectar com Adominus AI");
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div className="flex flex-col h-full px-4 lg:px-6 py-4 max-h-[calc(100vh-54px)]">
      <ElitePageHeader
        icon={<Sword className="w-6 h-6" />}
        title="Adominus AI"
        subtitle="Seu assistente de disciplina e estratégia de vida"
        iconColor="#EB5002"
      />
      {/* Empty state */}
      {messages.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col items-center justify-center gap-6 text-center py-8 min-h-0"
        >
          <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center"
            style={{ boxShadow: "0 8px 32px hsl(var(--primary) / 0.25)" }}>
            <Sword className="w-10 h-10 text-white" />
          </div>
          <div>
            <h2 className="text-[22px] font-bold text-foreground mb-1 tracking-tight">Adominus AI</h2>
            <p className="text-[13px] text-muted-foreground max-w-xs leading-relaxed">
              Seu assistente pessoal de disciplina, produtividade e estratégia de vida.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center max-w-sm">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-[12px] px-3.5 py-2 rounded-full transition-all text-foreground font-medium"
                style={{
                  background: "hsl(var(--card))",
                  border: "0.5px solid hsl(var(--border))",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-4 pb-4 min-h-0">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${
                  m.role === "user"
                    ? "bg-primary/15 border border-primary/25"
                    : "gradient-primary"
                }`}>
                  {m.role === "user"
                    ? <User className="w-3.5 h-3.5 text-primary" />
                    : <Sword className="w-3.5 h-3.5 text-white" />
                  }
                </div>

                {/* Bubble */}
                <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-white rounded-tr-[6px]"
                    : "rounded-tl-[6px] text-foreground"
                }`}
                  style={m.role === "assistant" ? {
                    background: "hsl(var(--card))",
                    border: "0.5px solid hsl(var(--border) / 0.6)",
                    boxShadow: "var(--shadow-sm)",
                  } : {}}
                >
                  {m.content
                    ? m.content.split("\n").map((line, j) => (
                        <span key={j}>{line}{j < m.content.split("\n").length - 1 && <br />}</span>
                      ))
                    : <span className="opacity-40 animate-pulse">●●●</span>
                  }
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && messages[messages.length - 1]?.role === "user" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full flex-shrink-0 gradient-primary flex items-center justify-center">
                <Sword className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="rounded-2xl rounded-tl-[6px] px-4 py-3"
                style={{ background: "hsl(var(--card))", border: "0.5px solid hsl(var(--border) / 0.6)" }}>
                <div className="flex gap-1">
                  {[0, 1, 2].map((d) => (
                    <div key={d} className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce"
                      style={{ animationDelay: `${d * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input area */}
      <div className="flex-shrink-0 mt-3">
        {messages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {SUGGESTIONS.slice(0, 3).map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={loading}
                className="text-[11px] px-3 py-1.5 rounded-full border transition-colors text-muted-foreground hover:text-foreground disabled:opacity-40"
                style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div
          className="flex gap-2.5 items-end rounded-2xl p-3"
          style={{
            background: "hsl(var(--card))",
            border: "0.5px solid hsl(var(--border))",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Pergunte ao Adominus AI…"
            disabled={loading}
            rows={1}
            className="flex-1 resize-none border-0 bg-transparent p-0 text-[13px] focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[22px] max-h-28"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity"
            style={{
              background: "#EB5002",
              boxShadow: "0 2px 8px rgba(235,80,2,0.3)",
            }}
          >
            {loading
              ? <Zap className="w-3.5 h-3.5 text-white animate-spin" />
              : <Send className="w-3.5 h-3.5 text-white" />
            }
          </motion.button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5 opacity-60">
          Enter para enviar · Shift+Enter para nova linha
        </p>
      </div>
    </div>
  );
}
