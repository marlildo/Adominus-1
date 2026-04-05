import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { User, Palette, Target, Trash2, Sun, Moon, Camera, AlertTriangle, ChevronRight, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ElitePageWrapper, ElitePageHeader, staggerContainer, fadeUp } from "@/components/ElitePageLayout";

// iOS-style grouped section
function Section({ title, icon, children }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="w-6 h-6 rounded-[7px] bg-primary/15 flex items-center justify-center flex-shrink-0">
          <span className="text-primary">{icon}</span>
        </div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
      </div>
      <div className="premium-card overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Row({ label, children, last = false }: {
  label?: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between px-5 py-4"
      style={{ borderBottom: last ? "none" : "0.5px solid hsl(var(--border) / 0.5)" }}
    >
      {label && <span className="text-[14px] font-medium text-foreground">{label}</span>}
      {children}
    </div>
  );
}

export default function Configuracoes() {
  const { user: storeUser, theme, toggleTheme, updateProfile, setPlan } = useAppStore();
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(storeUser.name);
  const [serverPlan, setServerPlan] = useState<"free" | "pro">(storeUser.plan);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(storeUser.avatar);

  useEffect(() => {
    if (!authUser) return;
    supabase.from("profiles").select("name, plan, avatar_url").eq("id", authUser.id).single()
      .then(({ data }) => {
        if (data) {
          setName(data.name || "");
          const plan = data.plan as "free" | "pro";
          setServerPlan(plan);
          updateProfile({ name: data.name || "", avatar: data.avatar_url ?? undefined });
          setPlan(plan);
          setAvatarUrl(data.avatar_url ?? undefined);
        }
      });
  }, [authUser]);

  const handleSave = async () => {
    if (!authUser) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ name }).eq("id", authUser.id);
    if (!error) { updateProfile({ name }); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    setSaving(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser || !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) return;
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `${authUser.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!uploadError) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", authUser.id);
      setAvatarUrl(url);
      updateProfile({ avatar: url });
    }
    setUploadingAvatar(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "EXCLUIR") return;
    setDeleting(true);
    setDeleteError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao excluir conta");
      await supabase.auth.signOut();
      navigate("/login");
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Erro desconhecido");
      setDeleting(false);
    }
  };

  const displayEmail = authUser?.email ?? storeUser.email;

  return (
    <ElitePageWrapper className="max-w-xl">
      <ElitePageHeader
        icon={<Settings className="w-6 h-6" />}
        title="Configurações"
        subtitle="Conta e preferências"
        iconColor="#EB5002"
      />

      {/* Avatar header */}
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="relative">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover"
              style={{ border: "2px solid hsl(var(--primary) / 0.2)" }} />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-3xl font-black text-white">
              {(name || "G").charAt(0).toUpperCase()}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
          >
            {uploadingAvatar
              ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Camera className="w-3.5 h-3.5 text-white" />
            }
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div className="text-center">
          <p className="text-[16px] font-semibold text-foreground">{name || "Guerreiro"}</p>
          <p className="text-[12px] text-muted-foreground">{displayEmail}</p>
        </div>
      </div>

      {/* Perfil */}
      <Section title="Perfil" icon={<User className="w-3 h-3" />}>
        <Row label="Nome">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 w-44 rounded-xl text-[13px] text-right border-0 bg-muted/50 focus-visible:ring-1"
          />
        </Row>
        <Row label="Email" last>
          <span className="text-[13px] text-muted-foreground">{displayEmail}</span>
        </Row>
      </Section>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleSave}
        disabled={saving}
        className="w-full h-11 rounded-[13px] text-[13px] font-semibold text-white disabled:opacity-70"
        style={{
          background: "linear-gradient(135deg, #C10801 0%, #F16001 50%, #EB5002 100%)",
          boxShadow: "0 4px 12px rgba(235,80,2,0.25)",
        }}
      >
        {saved ? "✓ Salvo!" : saving ? "Salvando..." : "Salvar alterações"}
      </motion.button>

      {/* Aparência */}
      <Section title="Aparência" icon={<Palette className="w-3 h-3" />}>
        <Row label={`Modo ${theme === "dark" ? "Cinza" : "Claro"}`} last>
          <div className="flex items-center gap-2">
            {theme === "dark" ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-accent" />}
            <Switch checked={theme === "dark"} onCheckedChange={() => toggleTheme()} />
          </div>
        </Row>
      </Section>

      {/* Metas */}
      <Section title="Metas Diárias" icon={<Target className="w-3 h-3" />}>
        {[
          { label: "Tarefas por dia",    value: "5", unit: "tarefas" },
          { label: "Sessões de foco",    value: "4", unit: "sessões" },
          { label: "Hábitos diários",    value: "3", unit: "hábitos" },
          { label: "Horas de foco",      value: "2", unit: "horas" },
        ].map((m, i, arr) => (
          <Row key={m.label} label={m.label} last={i === arr.length - 1}>
            <div className="flex items-center gap-2">
              <Input
                defaultValue={m.value}
                type="number"
                min="1"
                className="w-14 h-8 text-center rounded-lg text-[13px] border-0 bg-muted/50"
              />
              <span className="text-[12px] text-muted-foreground">{m.unit}</span>
            </div>
          </Row>
        ))}
      </Section>

      {/* Zona de perigo */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="w-6 h-6 rounded-[7px] bg-destructive/15 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-3 h-3 text-destructive" />
          </div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Zona de Perigo</p>
        </div>
        <div className="premium-card overflow-hidden" style={{ borderColor: "hsl(var(--destructive) / 0.2)" }}>
          <button
            onClick={() => { setShowDeleteModal(true); setDeleteConfirm(""); setDeleteError(""); }}
            className="w-full flex items-center justify-between px-5 py-4 text-destructive hover:bg-destructive/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-4 h-4" />
              <span className="text-[14px] font-medium">Excluir Conta</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-50" />
          </button>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="premium-card p-6 w-full max-w-sm space-y-4"
            style={{ border: "0.5px solid hsl(var(--destructive) / 0.3)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-foreground">Excluir conta</h3>
                <p className="text-[11px] text-muted-foreground">Esta ação é irreversível</p>
              </div>
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Todos os seus dados (tarefas, hábitos, finanças, notas) serão apagados permanentemente.
            </p>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium">
                Digite <strong className="text-foreground">EXCLUIR</strong> para confirmar:
              </label>
              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="EXCLUIR"
                className="h-11 rounded-xl border-destructive/30 focus-visible:ring-destructive"
                autoFocus
              />
            </div>
            {deleteError && (
              <p className="text-[12px] text-destructive bg-destructive/8 rounded-xl px-3 py-2">{deleteError}</p>
            )}
            <div className="flex gap-2.5">
              <Button variant="outline" className="flex-1 h-11 rounded-[13px]" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
                Cancelar
              </Button>
              <Button
                className="flex-1 h-11 rounded-[13px] border-0 text-white"
                style={{ background: "hsl(var(--destructive))" }}
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== "EXCLUIR" || deleting}
              >
                {deleting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Excluindo...
                  </span>
                ) : "Excluir conta"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </ElitePageWrapper>
  );
}
