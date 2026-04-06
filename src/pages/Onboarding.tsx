import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { requestNotificationPermission } from "@/hooks/useNotifications";
import { ChevronRight, Bell, Target, User, CheckCircle2, Zap } from "lucide-react";

const ONBOARDING_KEY = "adominus_onboarding_done";

export function isOnboardingDone(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function markOnboardingDone() {
  localStorage.setItem(ONBOARDING_KEY, "true");
}

const GOALS = [
  { id: "produtividade", label: "Produtividade", emoji: "⚡" },
  { id: "habitos",      label: "Hábitos",        emoji: "🔥" },
  { id: "saude",        label: "Saúde",           emoji: "💪" },
  { id: "financas",     label: "Finanças",        emoji: "💰" },
  { id: "foco",         label: "Foco",            emoji: "🎯" },
  { id: "bem-estar",    label: "Bem-estar",       emoji: "🧘" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.user_metadata?.name ?? "");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [notifStatus, setNotifStatus] = useState<"idle" | "granted" | "denied">("idle");
  const [saving, setSaving] = useState(false);

  const totalSteps = 3;

  const toggleGoal = (id: string) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const handleNotif = async () => {
    const perm = await requestNotificationPermission();
    setNotifStatus(perm === "granted" ? "granted" : "denied");
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      if (name.trim() && user) {
        await supabase.auth.updateUser({ data: { name: name.trim(), onboarding_goals: selectedGoals } });
      }
    } catch {}
    markOnboardingDone();
    setSaving(false);
    navigate("/");
  };

  const canNext = step === 0 ? name.trim().length >= 2 : step === 1 ? selectedGoals.length > 0 : true;

  const steps = [
    {
      icon: <User size={28} style={{ color: "#EB5002" }} />,
      title: "Bem-vindo, Guerreiro!",
      subtitle: "Como você quer ser chamado?",
      content: (
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            maxLength={50}
            style={{
              width: "100%", padding: "14px 16px", borderRadius: 12,
              background: "#111111", border: "1px solid #333333",
              color: "#F0F0F0", fontSize: 16, outline: "none",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#EB5002")}
            onBlur={(e) => (e.target.style.borderColor = "#333333")}
          />
          <p style={{ fontSize: 12, color: "#646464", marginTop: 8 }}>
            Este nome aparecerá no seu perfil e no ranking.
          </p>
        </div>
      ),
    },
    {
      icon: <Target size={28} style={{ color: "#EB5002" }} />,
      title: "Quais são seus objetivos?",
      subtitle: "Selecione tudo que deseja melhorar",
      content: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {GOALS.map((g) => {
            const active = selectedGoals.includes(g.id);
            return (
              <button
                key={g.id}
                onClick={() => toggleGoal(g.id)}
                style={{
                  padding: "14px 12px", borderRadius: 12, cursor: "pointer",
                  background: active ? "rgba(235,80,2,0.15)" : "#111111",
                  border: `1px solid ${active ? "#EB5002" : "#333333"}`,
                  color: active ? "#EB5002" : "#646464",
                  fontSize: 14, fontWeight: 600, transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                <span style={{ fontSize: 20 }}>{g.emoji}</span>
                {g.label}
                {active && <CheckCircle2 size={14} style={{ marginLeft: "auto", color: "#EB5002" }} />}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      icon: <Bell size={28} style={{ color: "#EB5002" }} />,
      title: "Ativar notificações?",
      subtitle: "Receba lembretes de hábitos, tarefas e foco",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { emoji: "🌅", text: "Lembrete matinal de hábitos" },
            { emoji: "📋", text: "Aviso de tarefas pendentes" },
            { emoji: "🌳", text: "Sugestão de sessão de foco" },
            { emoji: "📊", text: "Resumo diário de progresso" },
          ].map((item) => (
            <div
              key={item.text}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", borderRadius: 10,
                background: "#111111", border: "1px solid #333333",
              }}
            >
              <span style={{ fontSize: 20 }}>{item.emoji}</span>
              <span style={{ fontSize: 14, color: "#D9C1AB" }}>{item.text}</span>
            </div>
          ))}

          {notifStatus === "idle" && (
            <button
              onClick={handleNotif}
              style={{
                marginTop: 4, padding: "14px", borderRadius: 12,
                background: "linear-gradient(135deg, #C10801 0%, #F16001 50%, #EB5002 100%)",
                border: "none", color: "#FFFFFF", fontSize: 15, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <Bell size={18} /> Ativar notificações
            </button>
          )}
          {notifStatus === "granted" && (
            <div style={{ textAlign: "center", color: "#EB5002", fontWeight: 600, fontSize: 14, paddingTop: 4 }}>
              ✅ Notificações ativadas!
            </div>
          )}
          {notifStatus === "denied" && (
            <div style={{ textAlign: "center", color: "#646464", fontSize: 13, paddingTop: 4 }}>
              Você pode ativar depois em Configurações.
            </div>
          )}
        </div>
      ),
    },
  ];

  const current = steps[step];

  return (
    <div
      style={{
        minHeight: "100vh", background: "#000000",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      {/* Glow de fundo */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(193,8,1,0.10) 0%, transparent 70%)",
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: "100%", maxWidth: 420, position: "relative" }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, margin: "0 auto 12px",
            background: "linear-gradient(135deg, #C10801 0%, #EB5002 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 28px rgba(235,80,2,0.35)",
          }}>
            <Zap size={26} color="#FFFFFF" />
          </div>
          <span style={{ fontSize: 11, color: "#646464", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            ADOMINUS — Passo {step + 1} de {totalSteps}
          </span>
        </div>

        {/* Barra de progresso */}
        <div style={{ height: 3, background: "#1A1A1A", borderRadius: 99, marginBottom: 28, overflow: "hidden" }}>
          <motion.div
            animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.4 }}
            style={{ height: "100%", background: "linear-gradient(90deg, #C10801, #EB5002)", borderRadius: 99 }}
          />
        </div>

        {/* Card */}
        <div style={{ background: "#1A1A1A", border: "1px solid #333333", borderRadius: 20, padding: 28 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {/* Ícone + título */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "rgba(235,80,2,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {current.icon}
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "#F0F0F0", margin: 0 }}>{current.title}</h2>
                  <p style={{ fontSize: 13, color: "#646464", margin: 0 }}>{current.subtitle}</p>
                </div>
              </div>

              <div style={{ height: 1, background: "#333333", margin: "16px 0" }} />

              {current.content}
            </motion.div>
          </AnimatePresence>

          {/* Botões */}
          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                style={{
                  flex: 1, padding: "13px", borderRadius: 12,
                  background: "transparent", border: "1px solid #333333",
                  color: "#646464", fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}
              >
                Voltar
              </button>
            )}
            {step < totalSteps - 1 ? (
              <button
                onClick={() => canNext && setStep((s) => s + 1)}
                disabled={!canNext}
                style={{
                  flex: 2, padding: "13px", borderRadius: 12, border: "none",
                  background: canNext
                    ? "linear-gradient(135deg, #C10801 0%, #F16001 50%, #EB5002 100%)"
                    : "#1A1A1A",
                  color: canNext ? "#FFFFFF" : "#333333",
                  fontSize: 14, fontWeight: 700, cursor: canNext ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  transition: "all 0.2s",
                }}
              >
                Continuar <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={saving}
                style={{
                  flex: 2, padding: "13px", borderRadius: 12, border: "none",
                  background: "linear-gradient(135deg, #C10801 0%, #F16001 50%, #EB5002 100%)",
                  color: "#FFFFFF", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Zap size={16} /> Começar jornada!</>
                )}
              </button>
            )}
          </div>

          {/* Pular */}
          {step < totalSteps - 1 && (
            <button
              onClick={() => setStep((s) => s + 1)}
              style={{
                width: "100%", marginTop: 12, padding: "8px",
                background: "transparent", border: "none",
                color: "#646464", fontSize: 12, cursor: "pointer",
              }}
            >
              Pular esta etapa
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
