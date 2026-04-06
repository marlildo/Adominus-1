import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Zap } from "lucide-react";

// ── Rate limiting helpers ─────────────────────────────────────────────────────
const RL_KEY = "adominus_login_rl";
const MAX_ATTEMPTS = 5;
const BLOCK_MS = 15 * 60 * 1000; // 15 minutos

function getRateLimit() {
  try { return JSON.parse(localStorage.getItem(RL_KEY) || "{}") as { attempts?: number; blockedUntil?: number }; }
  catch { return {}; }
}
function saveRateLimit(data: { attempts: number; blockedUntil?: number }) {
  localStorage.setItem(RL_KEY, JSON.stringify(data));
}
function clearRateLimit() { localStorage.removeItem(RL_KEY); }

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [blockTimer, setBlockTimer] = useState(0);

  // Countdown do bloqueio
  useEffect(() => {
    const tick = () => {
      const rl = getRateLimit();
      if (rl.blockedUntil && Date.now() < rl.blockedUntil) {
        setBlockTimer(Math.ceil((rl.blockedUntil - Date.now()) / 1000));
      } else {
        if (rl.blockedUntil) clearRateLimit();
        setBlockTimer(0);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Bloquear se ainda em cooldown
    const rl = getRateLimit();
    if (rl.blockedUntil && Date.now() < rl.blockedUntil) {
      setError(`Conta bloqueada. Aguarde ${Math.ceil((rl.blockedUntil - Date.now()) / 1000)} segundos.`);
      return;
    }

    // Validação básica
    if (!email.includes("@") || !email.includes(".")) {
      setError("Digite um email válido.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const attempts = (rl.attempts || 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        const blockedUntil = Date.now() + BLOCK_MS;
        saveRateLimit({ attempts, blockedUntil });
        setError(`${MAX_ATTEMPTS} tentativas incorretas. Conta bloqueada por 15 minutos.`);
      } else {
        saveRateLimit({ attempts });
        const restantes = MAX_ATTEMPTS - attempts;
        setError(
          error.message === "Invalid login credentials"
            ? `Email ou senha incorretos. ${restantes} tentativa${restantes > 1 ? "s" : ""} restante${restantes > 1 ? "s" : ""}.`
            : error.message
        );
      }
    } else {
      clearRateLimit();
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "#000000" }}
    >
      {/* Subtle radial glow behind the card */}
      <div
        style={{
          position: "fixed", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(193,8,1,0.12) 0%, transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm relative"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl overflow-hidden mb-4 flex items-center justify-center"
            style={{ background: "var(--gradient-accent)", boxShadow: "0 0 32px rgba(232,80,2,0.3)" }}
          >
            <span style={{ fontSize: 28 }}>⚡</span>
          </div>
          <h1
            className="font-display font-extrabold tracking-tight"
            style={{ fontSize: 24, color: "#F0F0F0", letterSpacing: "-0.02em" }}
          >
            ADOMINUS
          </h1>
          <p style={{ fontSize: 12, color: "#646464", marginTop: 4, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500 }}>
            Disciplina Forja Guerreiros
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "#1A1A1A",
            border: "1px solid #333333",
            borderRadius: 16,
            padding: 24,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#F0F0F0", marginBottom: 4, fontFamily: "'Syne', sans-serif" }}>
            Entrar na conta
          </h2>
          <p style={{ fontSize: 13, color: "#646464", marginBottom: 24 }}>
            Bem-vindo de volta, guerreiro.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label style={{ fontSize: 12, color: "#646464", display: "block", marginBottom: 6, fontWeight: 500 }}>
                Email
              </label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{ background: "#111111", border: "1px solid #333333", color: "#F0F0F0" }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#646464", display: "block", marginBottom: 6, fontWeight: 500 }}>
                Senha
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                  style={{ background: "#111111", border: "1px solid #333333", color: "#F0F0F0" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "#646464" }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ fontSize: 12, color: "#C10801", background: "rgba(193,8,1,0.1)", borderRadius: 8, padding: "8px 12px" }}
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full border-0 font-bold h-11"
              style={{ background: "var(--gradient-accent)", color: "#FFFFFF", borderRadius: 10, fontSize: 14 }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Entrar
                </span>
              )}
            </Button>
          </form>

          <div style={{ height: 1, background: "#333333", margin: "20px 0" }} />

          <div className="flex flex-col items-center gap-2">
            <Link
              to="/esqueci-senha"
              style={{ fontSize: 12, color: "#646464" }}
              className="hover:text-primary transition-colors"
            >
              Esqueceu sua senha?
            </Link>
            <p style={{ fontSize: 12, color: "#646464" }}>
              Não tem uma conta?{" "}
              <Link to="/cadastro" style={{ color: "#EB5002", fontWeight: 600 }} className="hover:underline">
                Criar conta
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
