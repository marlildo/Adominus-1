import { forwardRef, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";

/* ── Types ── */
interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  shape: "circle" | "square" | "star";
  size: number;
  rotation: number;
}

/* ── Confetti burst store (global singleton) ── */
type ConfettiBurst = { id: string; x: number; y: number; color: string };
type ConfettiListener = (burst: ConfettiBurst) => void;

const confettiListeners = new Set<ConfettiListener>();

export function triggerConfetti(x: number, y: number, color = "#E85002") {
  const burst: ConfettiBurst = { id: Math.random().toString(36).slice(2), x, y, color };
  confettiListeners.forEach((fn) => fn(burst));
}

/* ── Confetti colors palette ── */
const CONFETTI_COLORS = [
  "#E85002",
  "#C10801",
  "#F9F9F9",
  "#333333",
  "#F16001",
  "#E85002",
];

/* ── Generate burst particles ── */
function generateParticles(cx: number, cy: number, accent: string): Particle[] {
  return Array.from({ length: 22 }, (_, i) => {
    const angle = (Math.random() * Math.PI * 2);
    const speed = 3 + Math.random() * 5;
    return {
      id: `${i}-${Math.random()}`,
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      color: i < 4 ? accent : CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      shape: (["circle", "square", "star"] as const)[Math.floor(Math.random() * 3)],
      size: 5 + Math.random() * 6,
      rotation: Math.random() * 360,
    };
  });
}

/* ── Single confetti particle ── */
const ConfettiParticle = forwardRef<HTMLDivElement, { p: Particle }>(({ p }, ref) => (
  <motion.div
    ref={ref}
    key={p.id}
    initial={{ x: p.x, y: p.y, opacity: 1, rotate: p.rotation, scale: 1 }}
    animate={{
      x: p.x + p.vx * 28,
      y: p.y + p.vy * 28 + 40,
      opacity: 0,
      rotate: p.rotation + (Math.random() > 0.5 ? 360 : -360),
      scale: 0.3,
    }}
    transition={{ duration: 0.85 + Math.random() * 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    style={{
      position: "fixed",
      width: p.size,
      height: p.shape === "circle" ? p.size : p.size * 0.7,
      borderRadius: p.shape === "circle" ? "50%" : p.shape === "square" ? "2px" : "0",
      background: p.color,
      pointerEvents: "none",
      zIndex: 9999,
      clipPath: p.shape === "star"
        ? "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)"
        : undefined,
      boxShadow: `0 0 6px ${p.color}80`,
    }}
  />
));
ConfettiParticle.displayName = "ConfettiParticle";

/* ── Confetti Overlay ── */
export function ConfettiOverlay() {
  const [bursts, setBursts] = useState<{ id: string; particles: Particle[] }[]>([]);

  useEffect(() => {
    const handler = (burst: ConfettiBurst) => {
      const particles = generateParticles(burst.x, burst.y, burst.color);
      const entry = { id: burst.id, particles };
      setBursts((prev) => [...prev, entry]);
      setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== burst.id));
      }, 1800);
    };
    confettiListeners.add(handler);
    return () => { confettiListeners.delete(handler); };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9998]">
      <AnimatePresence>
        {bursts.flatMap((b) => b.particles.map((p) => (
          <ConfettiParticle key={`${b.id}-${p.id}`} p={p} />
        )))}
      </AnimatePresence>
    </div>
  );
}

/* ── XP Floating Effect (upgraded) ── */
export function XPFloatingEffect() {
  const xpFloating = useAppStore((s) => s.xpFloating);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <AnimatePresence>
        {xpFloating.map((f) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 0, x: 0, scale: 0.5 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: [-10, -30, -55, -90],
              x: [0, Math.sin(f.id.charCodeAt(0)) * 18, Math.sin(f.id.charCodeAt(0)) * 12, 0],
              scale: [0.5, 1.25, 1.1, 0.9],
            }}
            transition={{ duration: 1.6, ease: "easeOut", times: [0, 0.2, 0.7, 1] }}
            style={{ position: "fixed", left: f.x - 38, top: f.y - 20 }}
          >
            {/* Glow ring */}
            <motion.div
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute inset-0 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(232,80,2,0.5), transparent)" }}
            />
            {/* XP badge */}
            <div
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-sm select-none"
              style={{
                background: "hsl(var(--primary))",
                boxShadow: "0 0 15px hsl(var(--primary) / 0.4)",
                color: "white",
                textShadow: "0 1px 4px rgba(0,0,0,0.4)",
              }}
            >
              <motion.span
                animate={{ rotate: [0, 20, -20, 0] }}
                transition={{ duration: 0.5, delay: 0.1 }}
                style={{ fontSize: 14 }}
              >
                ⭐
              </motion.span>
              +{f.amount} XP
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ── Level Up Modal ── */
export function LevelUpModal() {
  const { showLevelUp, user, dismissLevelUp } = useAppStore();

  return (
    <AnimatePresence>
      {showLevelUp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={dismissLevelUp}
        >
          <motion.div
            initial={{ scale: 0.3, rotate: -10, y: 40 }}
            animate={{ scale: 1, rotate: 0, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
            className="relative bg-card border border-border rounded-3xl p-10 text-center max-w-sm mx-4"
            style={{ boxShadow: "0 0 40px hsl(var(--primary) / 0.2), 0 20px 40px rgba(0,0,0,0.1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Shimmer ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{
                background: "conic-gradient(from 0deg, transparent 70%, rgba(232,80,2,0.3) 80%, transparent 90%)",
              }}
            />

            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-7xl mb-4"
            >
              ⚔️
            </motion.div>

            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Nível alcançado
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.2 }}
              className="text-6xl font-black text-gradient mb-2"
            >
              {user.level}
            </motion.div>
            <div className="text-xl font-bold text-accent mb-1">{user.rank}</div>
            <p className="text-muted-foreground text-sm mb-6">Você evoluiu! Continue sua jornada, Guerreiro.</p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={dismissLevelUp}
              className="gradient-primary text-white font-semibold px-8 py-3 rounded-xl glow-primary"
            >
              Continuar
            </motion.button>

            {/* Burst particles */}
            {[...Array(16)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                animate={{
                  opacity: 0,
                  scale: 1,
                  x: Math.cos((i / 16) * Math.PI * 2) * (100 + Math.random() * 60),
                  y: Math.sin((i / 16) * Math.PI * 2) * (100 + Math.random() * 60),
                }}
                transition={{ duration: 0.9, delay: 0.15 + (i * 0.03), ease: "easeOut" }}
                className="absolute top-1/2 left-1/2 pointer-events-none rounded-full"
                style={{
                  width: 6 + Math.random() * 6,
                  height: 6 + Math.random() * 6,
                  background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                  boxShadow: `0 0 8px ${CONFETTI_COLORS[i % CONFETTI_COLORS.length]}`,
                  marginLeft: -4,
                  marginTop: -4,
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
