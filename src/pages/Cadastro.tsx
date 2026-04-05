import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Shield } from "lucide-react";

export default function Cadastro() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
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
              <span className="text-3xl">📬</span>
            </div>
            <h2 className="text-xl font-black text-foreground mb-2">Verifique seu email</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Enviamos um link de confirmação para <strong>{email}</strong>. Clique no link para ativar sua conta.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate("/login")}
              className="w-full"
            >
              Voltar para o login
            </Button>
          </div>
        </motion.div>
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

        {/* Card */}
        <div className="glass-card rounded-2xl p-6 premium-shadow">
          <h2 className="text-lg font-bold text-foreground mb-1">Criar sua conta</h2>
          <p className="text-xs text-muted-foreground mb-6">Comece sua jornada de disciplina.</p>

          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Nome de Guerreiro</label>
              <Input
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Senha</label>
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
              className="w-full bg-primary text-primary-foreground border-0 font-bold h-11"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Criando conta...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Criar conta grátis
                </span>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-5">
            Já tem uma conta?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
