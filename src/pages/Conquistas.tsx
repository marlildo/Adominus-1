import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { Lock, Trophy, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { ElitePageWrapper, ElitePageHeader, EliteCard, fadeUp } from "@/components/ElitePageLayout";

export default function Conquistas() {
  const { achievements } = useAppStore();
  const unlocked = achievements.filter((a) => a.unlocked).length;
  const pct = achievements.length > 0 ? Math.round((unlocked / achievements.length) * 100) : 0;

  return (
    <ElitePageWrapper className="max-w-4xl">
      <ElitePageHeader
        icon={<Trophy className="w-6 h-6" />}
        title="Conquistas"
        subtitle={`${unlocked} de ${achievements.length} desbloqueadas`}
        iconColor="#EB5002"
      />

      {/* Progress overview */}
      <div className="premium-card p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0">
            <Trophy className="w-7 h-7 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-foreground">Progresso Total</span>
              <span className="text-[13px] font-bold text-accent tabular-nums">{pct}%</span>
            </div>
            <div className="h-[6px] rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: "#EB5002" }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">{unlocked} desbloqueadas · {achievements.length - unlocked} restantes</p>
          </div>
        </div>
      </div>

      {/* Unlocked */}
      {unlocked > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-3 px-1">
            Desbloqueadas
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {achievements.filter((a) => a.unlocked).map((ach, i) => (
              <motion.div
                key={ach.id}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="premium-card p-4 text-center relative overflow-hidden"
                style={{ border: "0.5px solid hsl(var(--primary) / 0.25)" }}
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary" />

                <div className="w-12 h-12 rounded-2xl bg-accent/15 flex items-center justify-center text-2xl mx-auto mb-3">
                  {ach.icon}
                </div>
                <p className="text-[13px] font-semibold text-foreground mb-0.5 leading-snug">{ach.title}</p>
                <p className="text-[11px] text-muted-foreground mb-2.5 leading-relaxed">{ach.description}</p>
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-bold">
                  ⚡ {ach.xpReward} XP
                </div>
                {ach.unlockedAt && (
                  <p className="text-[9px] text-muted-foreground mt-2 opacity-70">
                    {new Date(ach.unlockedAt).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Locked */}
      {achievements.filter((a) => !a.unlocked).length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-3 px-1">
            Bloqueadas
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {achievements.filter((a) => !a.unlocked).map((ach, i) => (
              <motion.div
                key={ach.id}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className="premium-card p-4 text-center opacity-55"
              >
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-5 h-5 text-muted-foreground/50" />
                </div>
                <p className="text-[13px] font-semibold text-foreground mb-0.5">{ach.title}</p>
                <p className="text-[11px] text-muted-foreground mb-2.5">{ach.description}</p>
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">
                  ⚡ {ach.xpReward} XP
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </ElitePageWrapper>
  );
}
