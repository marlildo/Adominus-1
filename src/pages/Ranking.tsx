import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ElitePageWrapper, ElitePageHeader, fadeUp } from "@/components/ElitePageLayout";
import { Trophy } from "lucide-react";

const GLOBAL_RANKING = [
  { pos: 1,  name: "ShadowKing",  level: 48, xp: 4720, rank: "Comandante", streak: 87, avatar: "S" },
  { pos: 2,  name: "IronMind",    level: 42, xp: 4100, rank: "Comandante", streak: 64, avatar: "I" },
  { pos: 3,  name: "PhoenixRise", level: 38, xp: 3750, rank: "Cavaleiro",  streak: 45, avatar: "P" },
  { pos: 4,  name: "ZenWarrior",  level: 35, xp: 3400, rank: "Cavaleiro",  streak: 38, avatar: "Z" },
  { pos: 5,  name: "NightForge",  level: 30, xp: 2900, rank: "Cavaleiro",  streak: 29, avatar: "N" },
  { pos: 6,  name: "Guerreiro",   level: 7,  xp: 340,  rank: "Soldado",    streak: 12, avatar: "G", isUser: true },
  { pos: 7,  name: "Titan",       level: 6,  xp: 290,  rank: "Soldado",    streak: 9,  avatar: "T" },
  { pos: 8,  name: "Spartan",     level: 5,  xp: 180,  rank: "Iniciante",  streak: 5,  avatar: "S" },
  { pos: 9,  name: "Ascendant",   level: 4,  xp: 120,  rank: "Iniciante",  streak: 3,  avatar: "A" },
  { pos: 10, name: "Novato",      level: 2,  xp: 60,   rank: "Iniciante",  streak: 1,  avatar: "N" },
];

const RANK_COLORS: Record<string, string> = {
  Lenda: "text-[#EB5002]",
  Comandante: "text-[#EB5002]",
  Cavaleiro: "text-[#F16001]",
  Guerreiro: "text-[#D9C1AB]",
  Soldado: "text-[#646464]",
  Iniciante: "text-[#646464]",
};

const PODIUM_CONFIG = [
  { pos: 1, medal: "👑", size: "w-14 h-14", offset: "mt-0", textSize: "text-[15px]", gradient: "bg-[#EB5002]", xpClass: "text-[#EB5002] text-[14px] font-black" },
  { pos: 2, medal: "🥈", size: "w-12 h-12", offset: "mt-8",  textSize: "text-[13px]", gradient: "bg-[#333333]", xpClass: "text-[#D9C1AB] text-[12px] font-bold" },
  { pos: 3, medal: "🥉", size: "w-12 h-12", offset: "mt-12", textSize: "text-[13px]", gradient: "bg-[#333333]", xpClass: "text-[#D9C1AB] text-[12px] font-bold" },
];

const DISPLAY_ORDER = [1, 0, 2]; // 2nd, 1st, 3rd

export default function Ranking() {
  const top3 = GLOBAL_RANKING.slice(0, 3);
  const rest = GLOBAL_RANKING.slice(3);

  return (
    <ElitePageWrapper className="max-w-2xl">
      <ElitePageHeader
        icon={<Trophy className="w-6 h-6" />}
        title="Ranking"
        subtitle="Top guerreiros desta semana"
        iconColor="hsl(var(--primary))"
      />

      {/* Podium */}
      <div className="premium-card p-6 relative overflow-hidden">
        {/* Subtle radial behind 1st place */}
        <div className="absolute inset-x-0 top-0 h-32 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.08), transparent 70%)" }} />

        <div className="flex items-end justify-center gap-4 relative z-10">
          {DISPLAY_ORDER.map((idx) => {
            const player = top3[idx];
            const cfg = PODIUM_CONFIG[idx];
            const isFirst = idx === 0;
            return (
              <motion.div
                key={player.pos}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: isFirst ? 0 : 0.1 * idx }}
                className={cn("flex flex-col items-center gap-2 flex-1", cfg.offset)}
              >
                <span className="text-2xl">{cfg.medal}</span>
                <div className={cn(
                  "rounded-full flex items-center justify-center font-black text-white",
                  cfg.size, cfg.gradient
                )}>
                  {player.avatar}
                </div>
                <div className="text-center">
                  <p className={cn("font-bold truncate max-w-[80px]", cfg.textSize, "text-foreground")}>{player.name}</p>
                  <p className={cn("text-[10px]", RANK_COLORS[player.rank])}>{player.rank}</p>
                  <p className="text-[10px] text-muted-foreground">Nv.{player.level}</p>
                  <p className={cfg.xpClass}>{player.xp} XP</p>
                  {isFirst && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">🔥 {player.streak} dias</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Rest of list — iOS grouped rows */}
      <div className="premium-card overflow-hidden">
        <div className="px-5 py-3.5" style={{ borderBottom: "0.5px solid hsl(var(--border) / 0.6)" }}>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Classificação Geral</p>
        </div>
        {rest.map((player, i) => (
          <motion.div
            key={player.pos}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.04 * i }}
            className={cn(
              "flex items-center gap-3 px-5 py-3.5 transition-colors",
              player.isUser ? "bg-[#EB5002]/6" : "hover:bg-[#333333]/40",
            )}
            style={{ borderBottom: i < rest.length - 1 ? "0.5px solid hsl(var(--border) / 0.4)" : "none" }}
          >
            <span className="w-7 text-center text-[12px] font-bold text-muted-foreground tabular-nums">#{player.pos}</span>
            <div className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center font-bold text-[13px] flex-shrink-0"
            )}
              style={{ background: player.isUser ? "linear-gradient(135deg, #C10801 0%, #EB5002 100%)" : "#333333", color: "#F0F0F0" }}>
              {player.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[13px] font-semibold truncate text-foreground">{player.name}</p>
                {player.isUser && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold text-[#EB5002]" style={{ background: "rgba(235,80,2,0.12)" }}>Você</span>
                )}
              </div>
              <p className={cn("text-[10px]", RANK_COLORS[player.rank])}>{player.rank} · Nv.{player.level}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[13px] font-bold text-foreground tabular-nums">{player.xp} XP</p>
              <p className="text-[10px] text-muted-foreground">🔥 {player.streak}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </ElitePageWrapper>
  );
}
