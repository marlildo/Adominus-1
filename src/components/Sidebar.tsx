import { NavLink } from "@/components/NavLink";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  IconDashboard, IconAI, IconBibleReader, IconTasks, IconHabits,
  IconAddictions, IconFocusTree, IconAnalysis, IconFinance,
  IconNutrition, IconMeditation, IconNotes, IconWeeklyReview,
  IconRanking, IconAchievements, IconSettings, IconLogout,
  IconFlowMode,
} from "@/components/icons/AdominusIcons";

const navItems = [
  { label: "Dashboard", icon: IconDashboard, to: "/", section: "principal" },
  { label: "Tarefas", icon: IconTasks, to: "/tarefas", section: "principal" },
  { label: "Hábitos", icon: IconHabits, to: "/habitos", section: "principal" },
  { label: "Notas", icon: IconNotes, to: "/notas", section: "principal" },

  { label: "Modo Foco", icon: IconFocusTree, to: "/focus-tree", section: "foco" },
  { label: "Análise", icon: IconAnalysis, to: "/modo-analise", section: "foco" },
  { label: "Revisão Semanal", icon: IconWeeklyReview, to: "/revisao-semanal", section: "foco" },

  { label: "Meditação", icon: IconMeditation, to: "/meditacao", section: "bemestar" },
  { label: "Nutrição", icon: IconNutrition, to: "/nutrition", section: "bemestar" },
  { label: "Vícios", icon: IconAddictions, to: "/vicios", section: "bemestar" },

  { label: "Finanças", icon: IconFinance, to: "/finance-assistant", section: "financas" },

  { label: "Ranking", icon: IconRanking, to: "/ranking", section: "social" },
  { label: "Conquistas", icon: IconAchievements, to: "/conquistas", section: "social" },

  { label: "Adominus AI", icon: IconAI, to: "/adominus-ai", section: "ferramentas" },
  { label: "Leitor IA", icon: IconBibleReader, to: "/leitor-ia", section: "ferramentas" },
];

const sectionLabels: Record<string, string> = {
  principal: "Principal",
  foco: "Foco",
  bemestar: "Bem-estar",
  financas: "Finanças",
  social: "Social",
  ferramentas: "Ferramentas",
};

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, user } = useAppStore();
  const location = useLocation();
  const xpPercent = Math.round((user.xp / user.xpToNextLevel) * 100);

  return (
    <>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 lg:hidden"
            style={{ background: "rgba(0,0,0,0.75)" }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop */}
      <aside
        className={cn(
          "hidden lg:flex flex-col overflow-hidden flex-shrink-0 transition-all duration-300 ease-in-out",
          sidebarOpen ? "lg:w-[260px]" : "lg:w-[60px]"
        )}
        style={{
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border)",
        }}
      >
        <SidebarContent
          sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
          user={user} xpPercent={xpPercent} location={location}
        />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "lg:hidden fixed left-0 top-0 bottom-0 w-[260px] z-40 flex flex-col overflow-hidden",
          "transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border)",
        }}
      >
        <SidebarContent
          sidebarOpen={true} setSidebarOpen={setSidebarOpen}
          user={user} xpPercent={xpPercent} location={location} isMobile
        />
      </div>
    </>
  );
}

function SidebarContent({
  sidebarOpen, setSidebarOpen, user, xpPercent, location, isMobile = false,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  user: { name: string; level: number; xp: number; xpToNextLevel: number; avatar?: string };
  xpPercent: number;
  location: ReturnType<typeof useLocation>;
  isMobile?: boolean;
}) {
  const { signOut } = useAuth();
  const { focusSessionActive, setPendingNavTarget } = useAppStore();
  const expanded = isMobile ? true : sidebarOpen;
  const sections = ["principal", "foco", "bemestar", "financas", "social", "ferramentas"] as const;

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center h-14 flex-shrink-0 px-3 gap-2.5",
        !expanded && "justify-center"
      )} style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--brand)" }} className="text-lg">⚡</span>
          {expanded && (
              <span className="font-display text-[15px] font-extrabold tracking-wider uppercase"
              style={{ color: "var(--text-primary)" }}>
              Adominus
            </span>
          )}
        </div>
        {expanded && !isMobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto w-6 h-6 rounded-md flex items-center justify-center transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            <svg width="10" height="10" viewBox="0 0 11 11" fill="none">
              <path d="M7 1.5L3 5.5l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {!expanded && !isMobile && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute left-[17px] top-4 w-6 h-6 flex items-center justify-center"
            style={{ color: "var(--text-tertiary)" }}
          >
            <svg width="10" height="10" viewBox="0 0 11 11" fill="none">
              <path d="M4 1.5l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {/* User profile */}
      {expanded && (
        <div className="px-3 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2.5 p-2 rounded-xl">
            <div className="relative flex-shrink-0">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                  style={{ border: "2px solid var(--brand)" }}
                />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                  style={{ background: "var(--brand)", color: "var(--text-primary)" }}>
                  {user.name.charAt(0) || "G"}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                style={{ background: "var(--brand)", border: "2px solid var(--bg-surface)" }}>
                <span className="text-[7px] font-bold leading-none" style={{ color: "var(--text-primary)" }}>{user.level}</span>
              </div>
            </div>
            <div className="overflow-hidden min-w-0 flex-1">
              <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{user.name || "Guerreiro"}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-card)" }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${xpPercent}%`, background: "var(--gradient-accent)" }} />
                </div>
                <span className="text-[9px] tabular-nums font-medium" style={{ color: "var(--text-tertiary)" }}>{xpPercent}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {sections.map((section) => {
          const items = navItems.filter((i) => i.section === section);
          return (
            <div key={section} className="mb-1.5">
              {expanded && (
                <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.08em] px-4 py-2 mt-2 mb-1"
                  style={{ color: "var(--text-tertiary)" }}>
                  {sectionLabels[section]}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const isActive = location.pathname === item.to;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end
                      onClick={(e) => {
                        if (focusSessionActive && !isActive) {
                          e.preventDefault();
                          setPendingNavTarget(item.to);
                          return;
                        }
                        if (isMobile) setSidebarOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-2.5 h-11 transition-all duration-150 group relative",
                        expanded ? "px-2.5" : "justify-center px-0",
                        isActive && expanded ? "rounded-none rounded-r-lg" : "rounded-[10px]",
                      )}
                      style={isActive ? {
                        background: "var(--bg-card)",
                        borderLeft: expanded ? "3px solid var(--accent)" : undefined,
                      } : {}}
                    >
                      <item.icon
                        size={expanded ? 28 : 32}
                        className="shadow-sm"
                      />
                      {expanded && (
                        <span className={cn("text-[13px] whitespace-nowrap flex-1",
                          isActive ? "font-semibold" : "font-medium"
                        )}
                          style={{ color: isActive ? "var(--text-primary)" : "var(--text-secondary)" }}>
                          {item.label}
                        </span>
                      )}
                      {isActive && !expanded && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                          style={{ background: "var(--brand)" }} />
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn("flex-shrink-0", expanded ? "px-3 py-3" : "px-2 py-3")}
        style={{ borderTop: "1px solid var(--border)" }}>
        {expanded ? (
          <div className="flex items-center justify-between px-1">
            <p className="text-[9px] tracking-widest uppercase font-medium" style={{ color: "rgba(100,100,100,0.3)" }}>v3.0</p>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors text-[11px] font-medium"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#C10801"; e.currentTarget.style.background = "rgba(193,8,1,0.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "transparent"; }}
            >
              <IconLogout size={14} />
              Sair
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={signOut}
              className="p-2 rounded-lg transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              <IconLogout size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
