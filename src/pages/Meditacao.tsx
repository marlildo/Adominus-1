import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ElitePageWrapper, ElitePageHeader, EliteCard } from "@/components/ElitePageLayout";
import {
  Play, Pause, Moon, Sun, Wind, Flame, Droplets, TreePine,
  Music, Mic, Waves, Brain, Heart, Star, Clock, Volume2, VolumeX, Square, Headphones
} from "lucide-react";
import { useMeditacaoPlayer } from "@/hooks/useMeditacaoPlayer";
import { useAmbientAudio, type SoundId } from "@/hooks/useAmbientAudio";
import { toast } from "sonner";

// ── Guided meditation scripts (TTS text) ─────────────────────────────────
const MEDITATION_SCRIPTS: Record<number, string> = {
  1: `Feche os olhos suavemente. Respire fundo. Inspire... e expire. Seu corpo começa a relaxar. Cada músculo solta a tensão. Você está seguro, você está tranquilo. O sono se aproxima como uma névoa suave. Deixe seus pensamentos passarem como nuvens. Você não precisa segurar nada. Apenas solte. Inspire levemente... e expire. Sinta seu corpo ficar mais pesado. Mais relaxado. Você está indo para um lugar de paz profunda. Um lugar de descanso. Bem-vindo ao sono.`,
  2: `Respire fundo e sorria levemente. Sinta esse sorriso se expandir para dentro. Você está presente. Você está aqui, agora. Cada respiração é um presente. Observe sua mente sem julgamento. Os pensamentos surgem e passam. Você apenas observa. Há uma paz aqui que sempre existiu. Ela é sua. Inspire... e expire. Sinta o sorriso interior crescer. Tudo está bem.`,
  3: `Sua mente é como um céu vasto. Os pensamentos são nuvens que passam. Você não é os pensamentos. Você é o espaço. Respire fundo. Imagine uma luz clara entrando pela coroa da sua cabeça. Ela desobstrui tudo que não serve. Clareza. Foco. Presença. Inspire a claridade... expire a confusão. Sua mente está limpa. Aberta. Pronta.`,
  4: `Existe uma paz que não depende de nada externo. Ela está dentro de você. Respire e sinta. Inspire... expire. O mundo ao redor pode estar agitado, mas aqui dentro reina a calma. Você encontra equilíbrio. Estabilidade. Como uma montanha que não se move. Você é essa montanha. Firme. Tranquilo. Em paz incondicional.`,
  5: `Você carrega muito. É hora de soltar. Inspire fundo e reconheça a pressão que sente. Ao expirar, deixe ela ir. Você não precisa ter todas as respostas agora. Você não precisa ser perfeito. Você está fazendo o seu melhor. E isso é suficiente. Inspire alívio... expire tensão. Seu sistema nervoso relaxa. Você encontra serenidade.`,
  6: `Existe uma certeza dentro de você. Uma voz que sabe. Que acredita. Respire fundo e ouça ela. Você é capaz. Você é forte. Você foi feito para superar desafios. Cada dificuldade que você enfrentou te fortaleceu. Inspire confiança... expire dúvida. Você está no caminho certo. Confie no processo. Confie em você mesmo.`,
  7: `Sinta a energia pulsando em você. Uma chama que nunca se apaga. Inspire profundamente e sinta essa força crescer. Você tem o que é necessário para alcançar seus objetivos. Cada passo te leva mais alto. Inspire vitória... expire limitação. Você é um guerreiro. Você alcança o topo.`,
  8: `Nas profundezas de quem você é, existe sabedoria. Uma sabedoria que você nem sempre escuta. Hoje, você escuta. Respire e vá fundo. Quem você realmente é? O que você realmente quer? Inspire autoconhecimento... expire confusão. A cura começa quando você se conhece. Você está se conhecendo agora.`,
};

// ── Animations ───────────────────────────────────────────────────────────
const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 28 } }
};

const TABS = [
  { id: "meditacoes", label: "Meditações", icon: Mic },
  { id: "musicas", label: "Músicas", icon: Music },
  { id: "sons", label: "Sons Ambiente", icon: Waves },
];

// ── Data ─────────────────────────────────────────────────────────────────
const meditacoes = [
  { id: 1, title: "Chamar o Sono", subtitle: "Para Dormir Meditando", duration: "~1 min", category: "Sono", color: "#EB5002", icon: Moon, gradient: "from-[var(--bg-card)] to-[var(--bg-card-hover)]" },
  { id: 2, title: "Sorriso Interior", subtitle: "Mindfulness (Atenção Plena)", duration: "~1 min", category: "Bem-estar", color: "#F16001", icon: Heart, gradient: "from-[var(--bg-card)] to-[var(--bg-card-hover)]" },
  { id: 3, title: "A Desobstrução da Mente", subtitle: "Clareza Mental", duration: "~1 min", category: "Foco", color: "#EB5002", icon: Brain, gradient: "from-[var(--bg-card-hover)] to-[var(--bg-card)]" },
  { id: 4, title: "Paz Incondicional", subtitle: "Tranquilidade Interior", duration: "~1 min", category: "Calma", color: "#F16001", icon: Wind, gradient: "from-[var(--bg-card)] to-[var(--bg-card-hover)]" },
  { id: 5, title: "Alívio e Serenidade", subtitle: "Compreender e Aliviar a Pressão", duration: "~1 min", category: "Ansiedade", color: "#EB5002", icon: Sun, gradient: "from-[var(--bg-card)] to-[var(--bg-card-hover)]" },
  { id: 6, title: "A Certeza Interior", subtitle: "Confiança Plena", duration: "~1 min", category: "Confiança", color: "#EB5002", icon: Star, gradient: "from-[var(--bg-card-hover)] to-[var(--bg-card)]" },
  { id: 7, title: "Vitória e Energia", subtitle: "Alcançar o Topo", duration: "~45s", category: "Energia", color: "#EB5002", icon: Flame, gradient: "from-[var(--bg-card)] to-[var(--bg-card)]" },
  { id: 8, title: "A Cura da Mente", subtitle: "Conhecer Profundo", duration: "~1 min", category: "Autoconhecimento", color: "#EB5002", icon: Brain, gradient: "from-[var(--bg-card-hover)] to-[var(--bg-card)]" },
];

const musicas: { id: SoundId; title: string; subtitle: string; duration: string; color: string; icon: any; gradient: string; category: string }[] = [
  { id: "music_energize", title: "Energizar", subtitle: "Alpha 10Hz • Binaural beats", duration: "∞", category: "Energia", color: "#EB5002", icon: Sun, gradient: "from-[var(--bg-card)] to-[var(--bg-card-hover)]" },
  { id: "music_nature", title: "Despertar da Natureza", subtitle: "Theta 6Hz • 432Hz natural", duration: "∞", category: "Natureza", color: "#F16001", icon: TreePine, gradient: "from-[var(--bg-card)] to-[var(--bg-card-hover)]" },
  { id: "music_relax", title: "Relaxamento", subtitle: "Theta 5Hz • Tibetan bowls", duration: "∞", category: "Relaxar", color: "#EB5002", icon: Waves, gradient: "from-[var(--bg-card-hover)] to-[var(--bg-card)]" },
  { id: "music_sleep", title: "Um Sono Tranquilo", subtitle: "Delta 2Hz • Deep drones", duration: "∞", category: "Sono", color: "#EB5002", icon: Moon, gradient: "from-[var(--bg-card)] to-[var(--bg-card-hover)]" },
  { id: "music_work", title: "Calma no Trabalho", subtitle: "Alpha 10Hz • 528Hz solfeggio", duration: "∞", category: "Foco", color: "#EB5002", icon: Brain, gradient: "from-[var(--bg-card-hover)] to-[var(--bg-card)]" },
  { id: "music_focus", title: "Concentração", subtitle: "Beta 18Hz • 396Hz focus", duration: "∞", category: "Foco", color: "#F16001", icon: Star, gradient: "from-[var(--bg-card-hover)] to-[var(--bg-card)]" },
];

const sonsDeFundo: { id: SoundId; title: string; subtitle: string; color: string; icon: any; gradient: string }[] = [
  { id: "nature", title: "Natureza", subtitle: "Pássaros + brisa", color: "#F16001", icon: TreePine, gradient: "from-[var(--bg-card)] to-[var(--bg-card-hover)]" },
  { id: "wind", title: "Farfalhar das Árvores", subtitle: "Vento suave", color: "#F16001", icon: Wind, gradient: "from-[var(--bg-card-hover)] to-[var(--bg-card)]" },
  { id: "sky", title: "Nidra do Céu", subtitle: "Ambient etéreo", color: "#EB5002", icon: Waves, gradient: "from-[var(--bg-card)] to-[var(--bg-card-hover)]" },
  { id: "stream", title: "Riacho Correndo", subtitle: "Água babbling", color: "#F16001", icon: Droplets, gradient: "from-[var(--bg-card-hover)] to-[var(--bg-card)]" },
  { id: "fire", title: "Lareira", subtitle: "Fogo crepitante", color: "#EB5002", icon: Flame, gradient: "from-[var(--bg-card)] to-[var(--bg-card-hover)]" },
  { id: "campfire", title: "Fogueira", subtitle: "Estalo de lenha", color: "#EB5002", icon: Flame, gradient: "from-[var(--bg-card)] to-[var(--bg-card)]" },
  { id: "rain", title: "Chuva", subtitle: "Chuva suave", color: "#EB5002", icon: Droplets, gradient: "from-[var(--bg-card-hover)] to-[var(--bg-card)]" },
  { id: "ocean", title: "Ondas do Mar", subtitle: "Ondas relaxantes", color: "#F16001", icon: Waves, gradient: "from-[var(--bg-card)] to-[var(--bg-card-hover)]" },
];

const benefitCards = [
  { icon: Moon, label: "Dormir Melhor", color: "#EB5002" },
  { icon: Wind, label: "Diminuir o Estresse", color: "#F16001" },
  { icon: Heart, label: "Melhorar a Autoestima", color: "#F16001" },
  { icon: Brain, label: "Foco e Clareza", color: "#EB5002" },
  { icon: Sun, label: "Bem-estar", color: "#EB5002" },
  { icon: Star, label: "Autoconhecimento", color: "#EB5002" },
];

// ── Card: Meditação guiada ─────────────────────────────────────────────────
function MeditacaoCard({ item, isPlaying, isLoading, onPlay }: {
  item: typeof meditacoes[0];
  isPlaying: boolean; isLoading: boolean; onPlay: () => void;
}) {
  const Icon = item.icon;
  return (
    <motion.div variants={itemVariants} whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className="relative overflow-hidden rounded-2xl cursor-pointer group"
      style={{ background: "hsl(var(--card))", border: `1px solid ${isPlaying ? item.color + "60" : item.color + "33"}`, boxShadow: isPlaying ? `0 0 20px ${item.color}25` : "none" }}
      onClick={onPlay}>
      <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-50`} />
      <div className={`absolute inset-0 transition-opacity duration-300 ${isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        style={{ background: `radial-gradient(ellipse at 30% 50%, ${item.color}18 0%, transparent 70%)` }} />

      <div className="relative p-4 flex items-center gap-3">
        <motion.div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${item.color}20`, border: `1px solid ${item.color}40` }}
          animate={isPlaying ? { boxShadow: [`0 0 10px ${item.color}40`, `0 0 22px ${item.color}60`, `0 0 10px ${item.color}40`] } : {}}
          transition={{ repeat: Infinity, duration: 1.8 }}>
          <Icon className="w-5 h-5" style={{ color: item.color }} />
        </motion.div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-foreground leading-tight truncate">{item.title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.subtitle}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${item.color}18`, color: item.color, border: `1px solid ${item.color}30` }}>{item.category}</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{item.duration}</span>
            {isPlaying && <span className="text-[10px] font-bold animate-pulse" style={{ color: item.color }}>● NARRANDO</span>}
          </div>
        </div>
        <motion.button className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: isPlaying ? `${item.color}25` : `${item.color}15`, border: `1px solid ${item.color}40`, boxShadow: isPlaying ? `0 0 16px ${item.color}50` : "none" }}
          whileTap={{ scale: 0.88 }}>
          {isLoading
            ? <motion.div className="w-4 h-4 rounded-full border-2" style={{ borderColor: `${item.color}40`, borderTopColor: item.color }}
                animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }} />
            : isPlaying ? <Pause className="w-4 h-4" style={{ color: item.color }} /> : <Play className="w-4 h-4 ml-0.5" style={{ color: item.color }} />}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Card: Música / Som Ambiente ───────────────────────────────────────────
function AmbientCard({ item, isPlaying, onPlay }: {
  item: { title: string; subtitle: string; color: string; icon: any; gradient: string };
  isPlaying: boolean; onPlay: () => void;
}) {
  const Icon = item.icon;
  return (
    <motion.div variants={itemVariants} whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className="relative overflow-hidden rounded-2xl cursor-pointer group"
      style={{ background: "hsl(var(--card))", border: `1px solid ${isPlaying ? item.color + "60" : item.color + "33"}`, boxShadow: isPlaying ? `0 0 20px ${item.color}25` : "none" }}
      onClick={onPlay}>
      <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-50`} />
      <div className={`absolute inset-0 transition-opacity duration-300 ${isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        style={{ background: `radial-gradient(ellipse at 30% 50%, ${item.color}18 0%, transparent 70%)` }} />

      <div className="relative p-4 flex items-center gap-3">
        <motion.div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${item.color}20`, border: `1px solid ${item.color}40` }}
          animate={isPlaying ? { boxShadow: [`0 0 10px ${item.color}40`, `0 0 22px ${item.color}60`, `0 0 10px ${item.color}40`] } : {}}
          transition={{ repeat: Infinity, duration: 1.8 }}>
          <Icon className="w-5 h-5" style={{ color: item.color }} />
        </motion.div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-foreground leading-tight truncate">{item.title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.subtitle}</p>
          {isPlaying && (
            <div className="flex items-center gap-1.5 mt-1.5">
              {[1,2,3,4,5].map(b => (
                <motion.div key={b} className="w-1 rounded-full"
                  style={{ background: item.color }}
                  animate={{ height: ["3px", `${6 + b * 2}px`, "3px"] }}
                  transition={{ repeat: Infinity, duration: 0.5 + b * 0.1, ease: "easeInOut" }} />
              ))}
              <span className="text-[10px] font-bold ml-1" style={{ color: item.color }}>AO VIVO</span>
            </div>
          )}
        </div>
        <motion.button className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: isPlaying ? `${item.color}25` : `${item.color}15`, border: `1px solid ${item.color}40`, boxShadow: isPlaying ? `0 0 16px ${item.color}50` : "none" }}
          whileTap={{ scale: 0.88 }}>
          {isPlaying ? <Pause className="w-4 h-4" style={{ color: item.color }} /> : <Play className="w-4 h-4 ml-0.5" style={{ color: item.color }} />}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function Meditacao() {
  const [activeTab, setActiveTab] = useState("meditacoes");
  const speech = useMeditacaoPlayer();
  const ambient = useAmbientAudio();

  // Unified "is something playing" for the Now Playing bar
  const anythingPlaying = speech.playingId !== null || ambient.playingId !== null;

  const getItemKey = (tab: string, id: number) => `${tab}-${id}`;
  const isSpeechPlaying = (tab: string, id: number) => speech.playingId === getItemKey(tab, id) && speech.state === "playing";
  const isSpeechLoading = (tab: string, id: number) => speech.playingId === getItemKey(tab, id) && speech.state === "loading";

  const handleMedPlay = (id: number, title: string, text: string) => {
    ambient.stop(); // stop ambient if any
    speech.play({ id: getItemKey("med", id), text, title });
  };

  const handleAmbientPlay = (id: SoundId) => {
    speech.stop(); // stop speech if any
    ambient.play(id);
  };

  const nowPlayingTitle = speech.playingId !== null ? speech.playingTitle
    : ambient.playingId !== null
      ? [...musicas, ...sonsDeFundo].find(i => i.id === ambient.playingId)?.title ?? ""
      : "";

  const nowPlayingState = speech.playingId !== null ? speech.state : ambient.state;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = Math.floor(secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleStopAll = () => { speech.stop(); ambient.stop(); };
  const handleVolumeToggle = () => {
    const v = (speech.volume > 0 || ambient.volume > 0) ? 0 : 0.85;
    speech.changeVolume(v);
    ambient.changeVolume(v);
  };

  return (
    <ElitePageWrapper>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 pb-28">
        {/* Header */}
        <ElitePageHeader
          icon={<Moon className="w-6 h-6" />}
          title="Meditação"
          subtitle="Meditações guiadas • Música binaural • Sons ambiente reais"
          iconColor="#EB5002"
        />

        {/* Stats */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-3 gap-3">
          {[
            { label: "Meditações", value: "8", color: "#EB5002", icon: Mic },
            { label: "Músicas", value: "6", color: "#F16001", icon: Headphones },
            { label: "Sons Ambiente", value: "8", color: "#EB5002", icon: Waves },
          ].map((s) => (
            <motion.div key={s.label} variants={itemVariants}>
              <EliteCard accentColor={s.color} className="p-4 text-center">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2"
                  style={{ background: `${s.color}20`, border: `1px solid ${s.color}30` }}>
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <p className="text-xl font-black text-foreground">{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
              </EliteCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Benefits */}
        <div>
          <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Para todos os momentos</p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {benefitCards.map((b) => (
              <motion.div key={b.label} whileHover={{ y: -3, scale: 1.05 }}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-center"
                style={{ background: "hsl(var(--card))", border: `1px solid ${b.color}25` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${b.color}18`, border: `1px solid ${b.color}35` }}>
                  <b.icon className="w-4 h-4" style={{ color: b.color }} />
                </div>
                <span className="text-[10px] font-medium text-foreground leading-tight">{b.label}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 rounded-xl" style={{ background: "#1A1A1A", border: "1px solid #333333" }}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <motion.button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[12px] font-semibold transition-all"
                style={active ? {
                  background: "#EB5002", color: "#FFFFFF",
                  boxShadow: "0 0 14px rgba(235,80,2,0.3)", border: "none"
                } : { color: "#646464" }}
                whileTap={{ scale: 0.96 }}>
                <Icon className="w-3.5 h-3.5" />{tab.label}
              </motion.button>
            );
          })}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === "meditacoes" && (
            <motion.div key="meditacoes" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <p className="text-[11px] text-muted-foreground mb-3 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5" />
                Narração com voz sintetizada em português
              </p>
              <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
                {meditacoes.map((item) => (
                  <MeditacaoCard key={item.id} item={item}
                    isPlaying={isSpeechPlaying("med", item.id)}
                    isLoading={isSpeechLoading("med", item.id)}
                    onPlay={() => handleMedPlay(item.id, item.title, MEDITATION_SCRIPTS[item.id])} />
                ))}
              </motion.div>
            </motion.div>
          )}

          {activeTab === "musicas" && (
            <motion.div key="musicas" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <p className="text-[11px] text-muted-foreground mb-3 flex items-center gap-1.5">
                <Headphones className="w-3.5 h-3.5" />
                Gerada em tempo real • Binaural beats + frequências solfeggio • Use fones de ouvido
              </p>
              <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
                {musicas.map((item) => (
                  <AmbientCard key={item.id}
                    item={item}
                    isPlaying={ambient.playingId === item.id}
                    onPlay={() => handleAmbientPlay(item.id)} />
                ))}
              </motion.div>
            </motion.div>
          )}

          {activeTab === "sons" && (
            <motion.div key="sons" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <p className="text-[11px] text-muted-foreground mb-3 flex items-center gap-1.5">
                <Waves className="w-3.5 h-3.5" />
                Sons ambiente gerados em tempo real • Reprodução contínua
              </p>
              <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
                {sonsDeFundo.map((item) => (
                  <AmbientCard key={item.id}
                    item={item}
                    isPlaying={ambient.playingId === item.id}
                    onPlay={() => handleAmbientPlay(item.id)} />
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Now Playing (portal) ─────────────────────────────────────────── */}
      {createPortal(
        <AnimatePresence>
          {anythingPlaying && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 32 }}
              className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-sm rounded-2xl overflow-hidden"
              style={{
                background: "hsl(var(--background))",
                border: "1px solid hsl(var(--primary) / 0.35)",
                boxShadow: "0 0 40px hsl(var(--primary) / 0.18), 0 8px 40px rgba(0,0,0,0.7)",
              }}>
              {/* Progress bar (for speech only) */}
              {speech.playingId && (
                <div className="h-0.5 w-full" style={{ background: "hsl(var(--primary) / 0.15)" }}>
                  <motion.div className="h-full" style={{ background: "#EB5002", width: `${speech.progress * 100}%` }} transition={{ duration: 0.25 }} />
                </div>
              )}
              {/* Ambient loop indicator */}
              {ambient.playingId && (
                <div className="h-0.5 w-full overflow-hidden" style={{ background: "hsl(var(--primary) / 0.15)" }}>
                  <motion.div className="h-full rounded-full" style={{ background: "#EB5002" }}
                    animate={{ x: ["-100%", "100%"] }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }} />
                </div>
              )}

              <div className="px-4 py-3 flex items-center gap-3">
                <div className="flex gap-0.5 items-end h-5 flex-shrink-0">
                  {[1,2,3,4,5].map((b) => (
                    <motion.div key={b} className="w-1 rounded-full flex-shrink-0"
                      style={{ background: "#EB5002" }}
                      animate={nowPlayingState === "playing" ? { height: ["3px", `${8 + b * 2}px`, "3px"] } : { height: "3px" }}
                      transition={{ repeat: Infinity, duration: 0.6 + b * 0.12, ease: "easeInOut" }} />
                  ))}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-foreground truncate">{nowPlayingTitle}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    {nowPlayingState === "loading" && <span className="animate-pulse">Gerando áudio...</span>}
                    {nowPlayingState === "playing" && <span style={{ color: "#EB5002" }}>▶ Reproduzindo</span>}
                    {nowPlayingState === "paused" && <span>Pausado</span>}
                    {speech.duration > 0 && <span className="ml-1 opacity-50">{formatTime(speech.duration)}</span>}
                    {ambient.playingId && <span className="opacity-50">∞ ao vivo</span>}
                  </p>
                </div>

                <motion.button whileTap={{ scale: 0.88 }} onClick={handleVolumeToggle}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "hsl(var(--muted)/0.5)" }}>
                  {(speech.volume > 0 || ambient.volume > 0)
                    ? <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
                    : <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />}
                </motion.button>

                {/* Pause/resume for speech */}
                {speech.playingId && (
                  <motion.button whileTap={{ scale: 0.88 }}
                    onClick={() => speech.play({ id: speech.playingId!, text: "", title: "" })}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "hsl(var(--primary) / 0.2)", border: "1px solid hsl(var(--primary) / 0.4)" }}>
                    {speech.state === "loading"
                      ? <motion.div className="w-4 h-4 rounded-full border-2" style={{ borderColor: "hsl(var(--primary) / 0.3)", borderTopColor: "#EB5002" }}
                          animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }} />
                      : speech.state === "playing"
                        ? <Pause className="w-4 h-4" style={{ color: "#EB5002" }} />
                        : <Play className="w-4 h-4 ml-0.5" style={{ color: "#EB5002" }} />}
                  </motion.button>
                )}

                <motion.button whileTap={{ scale: 0.88 }} onClick={handleStopAll}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "hsl(var(--muted)/0.5)" }}>
                  <Square className="w-3 h-3 text-muted-foreground" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </ElitePageWrapper>
  );
}
