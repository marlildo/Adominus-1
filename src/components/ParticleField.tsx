import { useEffect, useRef } from "react";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; opacity: number;
  color: string; life: number; maxLife: number;
}

const COLORS = [
  "rgba(220,38,38,",
  "rgba(239,68,68,",
  "rgba(185,28,28,",
  "rgba(59,130,246,",
  "rgba(255,255,255,",
];

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Spawn particles
    const spawnParticle = (): Particle => {
      const maxLife = 120 + Math.random() * 180;
      return {
        x: Math.random() * canvas.width,
        y: canvas.height + 10,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(0.25 + Math.random() * 0.55),
        size: 0.8 + Math.random() * 2.2,
        opacity: 0,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 0,
        maxLife,
      };
    };

    // Init
    for (let i = 0; i < 28; i++) {
      const p = spawnParticle();
      p.y = Math.random() * canvas.height;
      p.life = Math.random() * p.maxLife;
      particlesRef.current.push(p);
    }

    let frame = 0;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Spawn new
      if (frame % 18 === 0 && particlesRef.current.length < 50) {
        particlesRef.current.push(spawnParticle());
      }

      particlesRef.current = particlesRef.current.filter((p) => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;

        const progress = p.life / p.maxLife;
        // Fade in, float, fade out
        if (progress < 0.15) p.opacity = progress / 0.15 * 0.55;
        else if (progress > 0.75) p.opacity = (1 - progress) / 0.25 * 0.55;
        else p.opacity = 0.55;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.opacity.toFixed(2)})`;
        ctx.fill();

        return p.life < p.maxLife;
      });

      frame++;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
}
