import { ReactNode, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { useAppStore } from "@/store/useAppStore";
import { XPFloatingEffect, LevelUpModal, ConfettiOverlay } from "./XPEffects";
import { PageTransition } from "./PageTransition";
import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";

interface LayoutProps { children: ReactNode; }

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/adominus-ai": "Adominus AI",
  "/leitor-ia": "Leitor IA",
  "/tarefas": "Tarefas",
  "/habitos": "Hábitos",
  "/vicios": "Vícios",
  "/focus-tree": "Modo Flow",
  "/modo-analise": "Modo de Análise",
  "/finance-assistant": "Finanças",
  "/nutrition": "Nutrição",
  "/meditacao": "Meditação",
  "/notas": "Bloco de Notas",
  "/revisao-semanal": "Revisão Semanal",
  "/ranking": "Ranking",
  "/conquistas": "Conquistas",
  "/configuracoes": "Configurações",
};

export function Layout({ children }: LayoutProps) {
  const { user, setSidebarOpen, theme, toggleTheme } = useAppStore();
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] || "Adominus";

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
    document.body.style.background = 'var(--bg)';
    document.body.style.color = 'var(--text-primary)';
  }, [theme]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header — 56px, sticky, blurred */}
        <header
          className="h-14 flex-shrink-0 flex items-center justify-between px-4 lg:px-6 z-20 sticky top-0"
          style={{
            background: "var(--bg-surface)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {/* Left: menu + page title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-display text-[17px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              {pageTitle}
            </h2>
          </div>

          {/* Right: badges + actions + avatar */}
          <div className="flex items-center gap-2.5">
            {/* XP Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
              style={{
                background: "var(--accent-glow)",
                border: "1px solid rgba(232, 80, 2, 0.30)",
                color: "var(--accent)",
              }}>
              ⭐ {user.xp} XP
            </div>

            {/* Streak badge */}
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[12px] font-semibold"
              style={{
                background: "var(--accent-glow)",
                border: "1px solid rgba(232, 80, 2, 0.30)",
                color: "var(--accent)",
              }}>
              🔥 {user.streak}
            </div>

            {/* Notification bell */}
            <button
              className="w-9 h-9 rounded-[9px] flex items-center justify-center transition-all"
              style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-card)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 0a2 2 0 00-2 2v.29A7 7 0 003 9v4l-2 2v1h18v-1l-2-2V9a7 7 0 00-5-6.71V2a2 2 0 00-2-2zm0 20a2 2 0 002-2H8a2 2 0 002 2z" />
              </svg>
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-[9px] flex items-center justify-center transition-all"
              style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-card)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border)"; }}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                /* Sun icon — shown in dark mode */
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <circle cx="10" cy="10" r="4" />
                  <path d="M10 0v3M10 17v3M0 10h3M17 10h3M2.93 2.93l2.12 2.12M14.95 14.95l2.12 2.12M17.07 2.93l-2.12 2.12M5.05 14.95l-2.12 2.12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                /* Moon icon — shown in light mode */
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7 0a10 10 0 000 20A10 10 0 107 0zm0 18a8 8 0 010-16 10 10 0 000 16z" />
                </svg>
              )}
            </button>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
              style={{ border: "2px solid var(--accent)" }}>
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-xs"
                  style={{ background: "var(--accent)", color: "#F9F9F9" }}>
                  {user.name.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      <XPFloatingEffect />
      <ConfettiOverlay />
      <LevelUpModal />
    </div>
  );
}
