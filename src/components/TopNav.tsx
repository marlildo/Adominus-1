import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconLogout } from "@/components/icons/AdominusIcons";

const navRoutes = [
  { label: "Dashboard", to: "/" },
  { label: "Adominus AI", to: "/adominus-ai" },
  { label: "Leitor IA", to: "/leitor-ia" },
  { label: "Tarefas", to: "/tarefas" },
  { label: "Hábitos", to: "/habitos" },
  { label: "Vícios", to: "/vicios" },
  { label: "Modo Foco", to: "/focus-tree" },
  { label: "Análise", to: "/modo-analise" },
  { label: "Finanças", to: "/finance-assistant" },
  { label: "Nutrição", to: "/nutrition" },
  { label: "Meditação", to: "/meditacao" },
  { label: "Notas", to: "/notas" },
  { label: "Revisão", to: "/revisao-semanal" },
  { label: "Ranking", to: "/ranking" },
  { label: "Conquistas", to: "/conquistas" },
];

export function TopNav() {
  const { user, theme, toggleTheme } = useAppStore();
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el?.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const active = el.querySelector('[data-active="true"]') as HTMLElement;
    if (active) {
      active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [location.pathname]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  return (
    <header className="flex-shrink-0 bg-card z-30">
      {/* Top bar: logo + nav pills + user actions — single row */}
      <div className="flex items-center h-14 px-4 lg:px-6 gap-4 border-b border-border">
        {/* Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0">
            <img src="/lovable-uploads/ab13688b-41d7-4fd3-938e-35a915153737.png" alt="Adominus" className="w-full h-full object-cover" />
          </div>
          <span className="text-sm font-bold text-foreground tracking-widest uppercase hidden lg:inline">Adominus</span>
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-border flex-shrink-0 hidden sm:block" />

        {/* Nav pills — scrollable */}
        <div className="relative flex-1 flex items-center min-w-0">
          {canScrollLeft && (
            <button
              onClick={() => scroll("left")}
              className="absolute left-0 z-20 h-full px-1 bg-gradient-to-r from-card via-card/90 to-transparent flex items-center"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex items-center gap-1 overflow-x-auto scrollbar-hide w-full py-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {navRoutes.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <button
                  key={item.to}
                  data-active={isActive}
                  onClick={() => navigate(item.to)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {canScrollRight && (
            <button
              onClick={() => scroll("right")}
              className="absolute right-0 z-20 h-full px-1 bg-gradient-to-l from-card via-card/90 to-transparent flex items-center"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-background border border-border">
            <span className="text-primary font-bold tabular-nums">{user.xp} XP</span>
            <span className="w-px h-3 bg-border" />
            <span>🔥</span>
            <span className="font-medium text-foreground tabular-nums">{user.streak}</span>
          </div>

          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-background border border-border hover:border-primary/30 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark"
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            }
          </button>

          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border-2 border-primary/20">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary flex items-center justify-center font-bold text-xs text-primary-foreground">
                {user.name.charAt(0)}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate("/configuracoes")}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-colors border",
              location.pathname === "/configuracoes"
                ? "bg-primary border-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary/30"
            )}
            title="Configurações"
          >
            <Settings size={14} />
          </button>

          <button
            onClick={signOut}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Sair"
          >
            <IconLogout size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
