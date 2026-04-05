import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  // Wait for the recovery session to be set by Supabase
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    // Also check if we already have a recovery session from the URL hash
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => navigate("/"), 2500);
    }
    setLoading(false);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm text-center"
        >
          <div className="glass-card rounded-2xl p-8 premium-shadow">
            <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h2 className="text-xl font-black text-foreground mb-2">Senha redefinida!</h2>
            <p className="text-sm text-muted-foreground">
              Sua nova senha foi salva. Redirecionando para o Dashboard...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl overflow-hidden mb-4 shadow-lg">
            <img
              src="/lovable-uploads/ab13688b-41d7-4fd3-938e-35a915153737.png"
              alt="Adominus"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Adominus</h1>
          <p className="text-sm text-muted-foreground mt-1">Disciplina Forja Guerreiros</p>
        </div>

        <div className="glass-card rounded-2xl p-6 premium-shadow">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">Nova senha</h2>
          <p className="text-xs text-muted-foreground mb-6">
            Escolha uma senha forte para proteger sua conta.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Nova senha</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Confirmar senha</label>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Repita a senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            {/* Strength indicator */}
            {password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="flex-1 h-1 rounded-full transition-all duration-300"
                      style={{
                        background:
                          password.length >= i * 3
                            ? i <= 1 ? "hsl(var(--destructive))"
                              : i <= 2 ? "hsl(var(--accent))"
                              : i <= 3 ? "hsl(var(--primary))"
                              : "hsl(var(--secondary))"
                            : "hsl(var(--muted))",
                      }}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {password.length < 3 ? "Muito fraca" : password.length < 6 ? "Fraca" : password.length < 9 ? "Boa" : "Forte"}
                </p>
              </div>
            )}

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full gradient-primary text-primary-foreground border-0 font-bold h-11"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Salvar nova senha
                </span>
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
