import React, { useState, useEffect } from "react";
import {
  Database,
  Brain,
  Music2,
  BarChart2,
  Bell,
  Shield,
  Zap,
  FileText,
  Target,
  Leaf,
  Wallet,
  BookOpen,
  Timer,
  Trophy,
  HeartPulse,
  Flame,
  Bot,
  Mic,
  RefreshCw,
  Star,
} from "lucide-react";

interface Integration {
  icon: React.ElementType;
  label: string;
  color: string;
}

const INTEGRATIONS: Integration[] = [
  { icon: Database,   label: "Lovable Cloud",   color: "#E85002" },
  { icon: Brain,      label: "Gemini AI",        color: "#E85002" },
  { icon: Bot,        label: "Adominus AI",      color: "#E85002" },
  { icon: Mic,        label: "Síntese de Voz",   color: "#E85002" },
  { icon: Music2,     label: "Áudio Ambiente",   color: "#E85002" },
  { icon: BarChart2,  label: "Recharts",         color: "#E85002" },
  { icon: Bell,       label: "Notificações",     color: "#E85002" },
  { icon: Shield,     label: "Autenticação",     color: "#E85002" },
  { icon: Zap,        label: "Realtime Sync",    color: "#E85002" },
  { icon: FileText,   label: "Notas IA",         color: "#333333" },
  { icon: Target,     label: "Hábitos",          color: "#E85002" },
  { icon: Leaf,       label: "Meditação",        color: "#E85002" },
  { icon: Wallet,     label: "Finanças IA",      color: "#E85002" },
  { icon: BookOpen,   label: "Leitor IA",        color: "#E85002" },
  { icon: Timer,      label: "Focus Tree",       color: "#E85002" },
  { icon: Trophy,     label: "Conquistas",       color: "#E85002" },
  { icon: HeartPulse, label: "Nutrição IA",      color: "#E85002" },
  { icon: Flame,      label: "Vícios",           color: "#E85002" },
  { icon: RefreshCw,  label: "Revisão Semanal",  color: "#E85002" },
  { icon: Star,       label: "Ranking",          color: "#E85002" },
];

function OrbitIcon({ integration, size }: { integration: Integration; size: number }) {
  const Icon = integration.icon;
  const tooltipAbove = false; // managed per-orbit
  return (
    <div className="relative flex items-center justify-center group cursor-pointer">
      <div
        className="rounded-xl flex items-center justify-center transition-transform hover:scale-110"
        style={{
          width: size,
          height: size,
          background: "hsl(var(--card))",
          border: `1.5px solid ${integration.color}44`,
          boxShadow: `0 0 12px ${integration.color}33`,
        }}
      >
        <Icon size={size * 0.48} style={{ color: integration.color }} strokeWidth={1.8} />
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-[calc(100%+8px)] hidden group-hover:block whitespace-nowrap rounded-lg bg-popover border border-border px-2 py-1 text-xs text-popover-foreground shadow-lg text-center z-50">
        {integration.label}
        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-border" />
      </div>
    </div>
  );
}

function SemiCircleOrbit({
  radius, centerX, centerY, count, iconSize, offset,
}: {
  radius: number; centerX: number; centerY: number;
  count: number; iconSize: number; offset: number;
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => {
        const angle = (index / (count - 1)) * 180;
        const x = radius * Math.cos((angle * Math.PI) / 180);
        const y = radius * Math.sin((angle * Math.PI) / 180);
        const integration = INTEGRATIONS[(offset + index) % INTEGRATIONS.length];

        return (
          <div
            key={index}
            className="absolute"
            style={{
              left: `${centerX + x - iconSize / 2}px`,
              top: `${centerY - y - iconSize / 2}px`,
              zIndex: 5,
            }}
          >
            <OrbitIcon integration={integration} size={iconSize} />
          </div>
        );
      })}
    </>
  );
}

export default function MultiOrbitSemiCircle() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const baseWidth = Math.min(size.width * 0.8, 700);
  const centerX = baseWidth / 2;
  const centerY = baseWidth * 0.5;

  const iconSize =
    size.width < 480 ? Math.max(32, baseWidth * 0.06) :
    size.width < 768 ? Math.max(36, baseWidth * 0.065) :
                       Math.max(40, baseWidth * 0.07);

  return (
    <section className="py-12 relative w-full overflow-hidden">
      <div className="relative flex flex-col items-center text-center z-10">
        <div className="mb-3 px-3 py-1 rounded-full text-xs font-semibold border border-primary/30 text-primary bg-primary/10">
          Ecossistema
        </div>
        <h2 className="my-3 text-3xl font-bold lg:text-5xl text-foreground">Integrações</h2>
        <p className="mb-10 max-w-xl text-muted-foreground lg:text-lg">
          Todas as tecnologias que potencializam o Adominus.
        </p>

        <div className="relative" style={{ width: baseWidth, height: baseWidth * 0.62 }}>
          {/* Orbit rings */}
          {[0.22, 0.36, 0.5].map((ratio, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-border/30"
              style={{
                width: ratio * 2 * baseWidth,
                height: ratio * 2 * baseWidth,
                left: centerX - ratio * baseWidth,
                top: centerY - ratio * baseWidth,
                clipPath: "inset(50% 0 0 0)",
                zIndex: 1,
              }}
            />
          ))}

          {/* Center glow */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: baseWidth * 0.25,
              height: baseWidth * 0.25,
              left: centerX - baseWidth * 0.125,
              top: centerY - baseWidth * 0.125,
              background: "radial-gradient(circle, hsl(var(--primary)/0.15), transparent 70%)",
              zIndex: 0,
            }}
          />

          <SemiCircleOrbit radius={baseWidth * 0.22} centerX={centerX} centerY={centerY} count={6}  iconSize={iconSize}      offset={0} />
          <SemiCircleOrbit radius={baseWidth * 0.36} centerX={centerX} centerY={centerY} count={8}  iconSize={iconSize * 0.9} offset={6} />
          <SemiCircleOrbit radius={baseWidth * 0.5}  centerX={centerX} centerY={centerY} count={10} iconSize={iconSize * 0.8} offset={14} />
        </div>
      </div>
    </section>
  );
}
