import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { Plus, CheckCircle, Circle, Trash2, ChevronDown, ChevronUp, Calendar, Tag, CheckSquare } from "lucide-react";
import { triggerConfetti } from "@/components/XPEffects";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import type { Task } from "@/store/useAppStore";
import { ElitePageWrapper, ElitePageHeader, EliteCard, staggerContainer, fadeUp } from "@/components/ElitePageLayout";

const PRIORITY_DOT: Record<string, string> = {
  urgente: "bg-[#C10801]",
  alta: "bg-[#EB5002]",
  média: "bg-[#646464]",
  baixa: "bg-[#333333]",
};

const PRIORITY_LABEL: Record<string, { bg: string; text: string; border: string }> = {
  urgente: { bg: "bg-[#C10801]/10", text: "text-[#C10801]", border: "border-[#C10801]/20" },
  alta:    { bg: "bg-[#EB5002]/10", text: "text-[#EB5002]", border: "border-[#EB5002]/20" },
  média:   { bg: "bg-[#646464]/10", text: "text-[#646464]", border: "border-[#646464]/20" },
  baixa:   { bg: "bg-[#333333]",    text: "text-[#646464]", border: "border-transparent" },
};

function TaskItem({ task }: { task: Task }) {
  const { completeTask, deleteTask, updateTask } = useAppStore();
  const [expanded, setExpanded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleComplete = () => {
    if (!task.completed) {
      const rect = btnRef.current?.getBoundingClientRect();
      const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
      triggerConfetti(cx, cy, "hsl(var(--primary))");
    }
    completeTask(task.id);
  };

  const p = PRIORITY_LABEL[task.priority] ?? PRIORITY_LABEL.baixa;

   return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -16 }}
        whileHover={{ y: -1, boxShadow: "0 6px 20px hsl(var(--primary) / 0.10)" }}
        transition={{ duration: 0.2 }}
        className={cn("premium-card p-4 transition-all duration-200", task.completed && "opacity-55")}
      >
        <div className="flex items-start gap-3">
            <motion.button
              ref={btnRef}
              whileTap={{ scale: 0.75, rotate: -5 }}
              whileHover={{ scale: 1.15 }}
              onClick={handleComplete}
              className="mt-0.5 flex-shrink-0"
            >
            {task.completed
              ? <CheckCircle className="w-[18px] h-[18px] text-[#EB5002]" />
              : <Circle className="w-[18px] h-[18px] text-[#646464] hover:text-[#EB5002] transition-colors" />
            }
          </motion.button>

          <div className="flex-1 min-w-0">
            <span className={cn("text-[14px] font-medium leading-snug", task.completed && "line-through text-muted-foreground")}>
              {task.title}
            </span>

            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", p.bg, p.text, p.border)}>
                {task.priority}
              </span>
              {task.category && (
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Tag className="w-2.5 h-2.5" />{task.category}
                </span>
              )}
              {task.dueDate && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5" />{task.dueDate}
                </span>
              )}
              {task.subtasks.length > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} sub
                </span>
              )}
            </div>

            <AnimatePresence>
              {expanded && task.subtasks.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-3 space-y-1.5 overflow-hidden pl-1"
                >
                  {task.subtasks.map((st) => (
                    <div key={st.id} className="flex items-center gap-2">
                      <button onClick={() => {
                        const updated = task.subtasks.map((s) => s.id === st.id ? { ...s, completed: !s.completed } : s);
                        updateTask(task.id, { subtasks: updated });
                      }}>
                        {st.completed
                          ? <CheckCircle className="w-3.5 h-3.5 text-[#EB5002]" />
                          : <Circle className="w-3.5 h-3.5 text-[#646464]" />
                        }
                      </button>
                      <span className={cn("text-[12px] font-medium", st.completed && "line-through text-muted-foreground")}>
                        {st.title}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {task.subtasks.length > 0 && (
              <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                {expanded
                  ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                  : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                }
              </button>
            )}
            <motion.button
              onClick={() => setConfirmOpen(true)}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.88 }}
              className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      <DeleteConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Excluir tarefa"
        description={`Tem certeza que deseja excluir "${task.title}"? Esta ação não pode ser desfeita.`}
        onConfirm={() => deleteTask(task.id)}
      />
    </>
  );
}

function AddTaskDialog() {
  const { addTask } = useAppStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("média");
  const [category, setCategory] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleAdd = () => {
    if (!title.trim()) return;
    addTask({ title: title.trim(), priority, category, completed: false, subtasks: [], dueDate });
    setTitle(""); setCategory(""); setDueDate(""); setPriority("média");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[13px] text-primary-foreground text-[13px] font-semibold"
          style={{
            background: "hsl(var(--primary))",
            boxShadow: "0 4px 12px hsl(var(--primary) / 0.2)",
          }}
        >
          <Plus className="w-4 h-4" />
          Nova Tarefa
        </motion.button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[17px] font-semibold">Nova Tarefa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Input
            placeholder="Título da tarefa..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            autoFocus
            className="h-11 rounded-xl text-[14px]"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium">Prioridade</label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Task["priority"])}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">— Baixa</SelectItem>
                  <SelectItem value="média">· Média</SelectItem>
                  <SelectItem value="alta">▲ Alta</SelectItem>
                  <SelectItem value="urgente">⚡ Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium">Categoria</label>
              <Input placeholder="Ex: Trabalho" value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 rounded-xl" />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium">Data Limite</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-10 rounded-xl" />
          </div>
          <Button
            onClick={handleAdd}
            disabled={!title.trim()}
            className="w-full h-11 rounded-[13px] text-[13px] font-semibold border-0 text-primary-foreground"
            style={{
              background: "hsl(var(--primary))",
              boxShadow: "0 4px 12px hsl(var(--primary) / 0.2)",
            }}
          >
            Criar Tarefa (+10 XP)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Tarefas() {
  const { tasks } = useAppStore();
  const [filter, setFilter] = useState<"todas" | "pendentes" | "concluídas">("todas");
  const [priorityFilter, setPriorityFilter] = useState<string>("todas");

  const filtered = tasks.filter((t) => {
    if (filter === "pendentes" && t.completed) return false;
    if (filter === "concluídas" && !t.completed) return false;
    if (priorityFilter !== "todas" && t.priority !== priorityFilter) return false;
    return true;
  });

  const completedCount = tasks.filter((t) => t.completed).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <ElitePageWrapper className="max-w-3xl">
      <ElitePageHeader
        icon={<CheckSquare className="w-6 h-6" />}
        title="Tarefas"
        subtitle={`${completedCount} de ${tasks.length} concluídas · ${progress}%`}
        iconColor="hsl(var(--primary))"
        action={<AddTaskDialog />}
      />

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="premium-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-semibold text-foreground">Progresso de Hoje</span>
          <motion.span
            key={progress}
            initial={{ scale: 1.3, color: "hsl(var(--primary))" }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-[13px] font-bold text-primary tabular-nums"
          >{progress}%</motion.span>
        </div>
        <div className="h-[6px] rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: "hsl(var(--primary))" }}
          />
        </div>
      </motion.div>

      {/* Filters — iOS segmented style */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 flex-wrap items-center"
      >
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#1A1A1A" }}>
          {(["todas", "pendentes", "concluídas"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all",
                filter === f
                  ? "text-white"
                  : "text-[#646464] hover:text-[#F0F0F0]"
              )}
              style={filter === f ? { background: "#EB5002" } : {}}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="w-px h-5 mx-1" style={{ background: "#333333" }} />

        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#1A1A1A" }}>
          {["todas", "urgente", "alta", "média", "baixa"].map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all capitalize",
                priorityFilter === p
                  ? "text-white"
                  : "text-[#646464] hover:text-[#F0F0F0]"
              )}
              style={priorityFilter === p ? { background: "#EB5002" } : {}}
            >
              {p === "todas" ? "Prioridade" : p}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Task list */}
      <AnimatePresence mode="popLayout">
        <div className="space-y-2.5">
          {filtered.map((task, i) => (
            <motion.div key={task.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.045, duration: 0.25 }}>
              <TaskItem task={task} />
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <p className="text-4xl mb-3">⚔️</p>
              <p className="text-[13px] text-muted-foreground">Nenhuma tarefa encontrada</p>
            </motion.div>
          )}
        </div>
      </AnimatePresence>
    </ElitePageWrapper>
  );
}
