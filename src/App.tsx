import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useAppStore } from "@/store/useAppStore";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import Onboarding, { isOnboardingDone } from "@/pages/Onboarding";
import { DataSync } from "@/hooks/useDataSync";
import { RealtimeSync } from "@/hooks/useRealtimeSync";
import { NotificationScheduler } from "@/hooks/useNotifications";
import Dashboard from "@/pages/Dashboard";
import Tarefas from "@/pages/Tarefas";
import Habitos from "@/pages/Habitos";
import Vicios from "@/pages/Vicios";

import Notas from "@/pages/Notas";
import Ranking from "@/pages/Ranking";
import Conquistas from "@/pages/Conquistas";
import Configuracoes from "@/pages/Configuracoes";
import Login from "@/pages/Login";
import Cadastro from "@/pages/Cadastro";
import EsqueciSenha from "@/pages/EsqueciSenha";
import ResetPassword from "@/pages/ResetPassword";
import RevisaoSemanal from "@/pages/RevisaoSemanal";
import AdominusAI from "@/pages/AdominusAI";
import FocusTree from "@/pages/FocusTree";
import ModoAnalise from "@/pages/ModoAnalise";
import LeitorIA from "@/pages/LeitorIA";
import LeitorIAHistorico from "@/pages/LeitorIAHistorico";
import Foco from "@/pages/Foco";
import FinanceAssistant from "@/pages/FinanceAssistant";
import NutritionIntelligence from "@/pages/NutritionIntelligence";
import Meditacao from "@/pages/Meditacao";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  if (!offline) return null;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
      background: "#C10801", color: "#FFFFFF",
      padding: "8px 16px", textAlign: "center", fontSize: 13, fontWeight: 600,
    }}>
      ⚡ Sem conexão — você está offline. Os dados serão sincronizados quando a internet voltar.
    </div>
  );
}

function AppInner() {
  const { theme } = useAppStore();
  const { session, loading } = useAuth();
  useInactivityLogout(!!session);

  // Onboarding: mostra apenas para usuários logados que ainda não passaram
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (session && !loading && !isOnboardingDone()) setShowOnboarding(true);
    if (!session) setShowOnboarding(false);
  }, [session, loading]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("igris-theme", theme);
  }, [theme]);

  if (showOnboarding) return <Onboarding />;

  return (
    <>
      <OfflineBanner />
      <DataSync />
      <RealtimeSync />
      <NotificationScheduler />
      <Routes>
        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
        <Route path="/cadastro" element={<PublicOnlyRoute><Cadastro /></PublicOnlyRoute>} />
        <Route path="/esqueci-senha" element={<PublicOnlyRoute><EsqueciSenha /></PublicOnlyRoute>} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/tarefas" element={<ProtectedRoute><Layout><Tarefas /></Layout></ProtectedRoute>} />
        <Route path="/habitos" element={<ProtectedRoute><Layout><Habitos /></Layout></ProtectedRoute>} />
        <Route path="/vicios" element={<ProtectedRoute><Layout><Vicios /></Layout></ProtectedRoute>} />
        
        <Route path="/notas" element={<ProtectedRoute><Layout><Notas /></Layout></ProtectedRoute>} />
        <Route path="/ranking" element={<ProtectedRoute><Layout><Ranking /></Layout></ProtectedRoute>} />
        <Route path="/conquistas" element={<ProtectedRoute><Layout><Conquistas /></Layout></ProtectedRoute>} />
        <Route path="/configuracoes" element={<ProtectedRoute><Layout><Configuracoes /></Layout></ProtectedRoute>} />
        <Route path="/revisao-semanal" element={<ProtectedRoute><Layout><RevisaoSemanal /></Layout></ProtectedRoute>} />
        <Route path="/adominus-ai" element={<ProtectedRoute><Layout><AdominusAI /></Layout></ProtectedRoute>} />
        <Route path="/focus-tree" element={<ProtectedRoute><Layout><FocusTree /></Layout></ProtectedRoute>} />
        <Route path="/modo-analise" element={<ProtectedRoute><Layout><ModoAnalise /></Layout></ProtectedRoute>} />
        <Route path="/leitor-ia" element={<ProtectedRoute><Layout><LeitorIA /></Layout></ProtectedRoute>} />
        <Route path="/leitor-ia/historico" element={<ProtectedRoute><Layout><LeitorIAHistorico /></Layout></ProtectedRoute>} />
        <Route path="/foco" element={<ProtectedRoute><Layout><Foco /></Layout></ProtectedRoute>} />
        <Route path="/finance-assistant" element={<ProtectedRoute><Layout><FinanceAssistant /></Layout></ProtectedRoute>} />
        <Route path="/nutrition" element={<ProtectedRoute><Layout><NutritionIntelligence /></Layout></ProtectedRoute>} />
        <Route path="/meditacao" element={<ProtectedRoute><Layout><Meditacao /></Layout></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
