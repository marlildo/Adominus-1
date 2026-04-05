import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DOMPurify from "dompurify";
import { useAppStore, Note } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Trash2, Clock, FileText,
  Bold, Italic, Underline, List, ListOrdered, Save, ChevronLeft } from
"lucide-react";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric"
  });
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function isRecent(iso: string) {
  return Date.now() - new Date(iso).getTime() < 1000 * 60 * 60 * 24;
}

// ─── Toolbar Button ──────────────────────────────────────────────────────────

function ToolbarBtn({
  cmd, arg, title, children


}: {cmd: string;arg?: string;title: string;children: React.ReactNode;}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        document.execCommand(cmd, false, arg ?? undefined);
      }}
      title={title}
      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
      
      {children}
    </button>);

}

// ─── Note Card ───────────────────────────────────────────────────────────────

function NoteCard({
  note, isActive, onClick, onDelete





}: {note: Note;isActive: boolean;onClick: () => void;onDelete: (e: React.MouseEvent) => void;}) {
  const preview = stripHtml(note.content).slice(0, 120) || "Nota vazia...";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.18 }}
      onClick={onClick}
      className={cn(
        "group relative rounded-2xl p-4 cursor-pointer transition-all duration-200 border",
        isActive ?
        "bg-primary/10 border-primary/30" :
        "bg-card border-border hover:border-primary/20 hover:shadow-md"
      )}>
      
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className={cn(
          "font-semibold text-sm leading-snug truncate flex-1",
          isActive ? "text-primary" : "text-foreground"
        )}>
          {note.title || "Sem título"}
        </h3>
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {isRecent(note.updatedAt) &&
          <span
            className="w-2 h-2 rounded-full bg-primary flex-shrink-0"
            title="Editada recentemente" />

          }
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onDelete}
            className="p-1 rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors">
            
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
        {preview}
      </p>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
        <Clock className="w-3 h-3" />
        <span>{formatDate(note.updatedAt)}</span>
      </div>
    </motion.div>);

}

// ─── Editor ──────────────────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "saved";

function NoteEditor({
  note,
  onUpdate,
  onBack




}: {note: Note;onUpdate: (id: string, u: Partial<Note>) => void;onBack?: () => void;}) {
  const [title, setTitle] = useState(note.title);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const currentNoteId = useRef(note.id);

  // Sync when switching notes
  useEffect(() => {
    if (currentNoteId.current !== note.id) {
      currentNoteId.current = note.id;
      setTitle(note.title);
      if (editorRef.current) editorRef.current.innerHTML = DOMPurify.sanitize(note.content);
      setStatus("idle");
    }
  }, [note.id, note.title, note.content]);

  // First mount: set content
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = DOMPurify.sanitize(note.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerSave = useCallback(
    (newTitle: string, newContent: string) => {
      clearTimeout(saveTimer.current);
      setStatus("saving");
      saveTimer.current = setTimeout(() => {
        onUpdate(note.id, {
          title: newTitle,
          content: newContent,
          updatedAt: new Date().toISOString()
        });
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      }, 1800);
    },
    [note.id, onUpdate]
  );

  const handleTitleChange = (v: string) => {
    setTitle(v);
    triggerSave(v, editorRef.current?.innerHTML ?? "");
  };

  const handleContentInput = () => {
    triggerSave(title, editorRef.current?.innerHTML ?? "");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Editor Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border flex-shrink-0">
        {onBack &&
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground lg:hidden">
          
            <ChevronLeft className="w-4 h-4" />
          </button>
        }
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Título da nota..."
            className="w-full bg-transparent text-xl font-bold text-foreground placeholder:text-muted-foreground/40 outline-none border-none" />
          
          <p className="text-xs text-muted-foreground mt-0.5">
            Última edição: {formatDate(note.updatedAt)}
          </p>
        </div>

        {/* Save status */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0 min-w-[80px] justify-end">
          <AnimatePresence mode="wait">
            {status === "saving" &&
            <motion.span
              key="saving"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1">
              
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#EB5002" }} />
                Salvando...
              </motion.span>
            }
            {status === "saved" &&
            <motion.span
              key="saved"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1 text-primary">
              
                <Save className="w-3 h-3" />
                Salvo
              </motion.span>
            }
          </AnimatePresence>
        </div>
      </div>

      {/* Rich-text Toolbar */}
      <div className="flex items-center gap-0.5 px-4 py-2 border-b border-border bg-muted/30 flex-wrap flex-shrink-0">
        <ToolbarBtn cmd="bold" title="Negrito (Ctrl+B)">
          <Bold className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn cmd="italic" title="Itálico (Ctrl+I)">
          <Italic className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn cmd="underline" title="Sublinhado (Ctrl+U)">
          <Underline className="w-4 h-4" />
        </ToolbarBtn>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarBtn cmd="insertUnorderedList" title="Lista com marcadores">
          <List className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn cmd="insertOrderedList" title="Lista numerada">
          <ListOrdered className="w-4 h-4" />
        </ToolbarBtn>
      </div>

      {/* Editor Content */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleContentInput}
        data-placeholder="Comece a escrever sua nota..."
        className={cn(
          "flex-1 overflow-y-auto px-6 py-5 outline-none text-foreground text-sm leading-relaxed",
          "[&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5",
          "[&>p]:mb-2",
          "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/40 empty:before:pointer-events-none"
        )} />
      
    </div>);

}

// ─── Empty State (no note selected) ─────────────────────────────────────────

function EmptyEditor({ onCreate }: {onCreate: () => void;}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center">
        <FileText className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">
        Selecione uma nota à esquerda<br />ou crie uma nova para começar.
      </p>
      <button
        onClick={onCreate}
        className="btn-apple-primary px-5 py-2.5 text-sm">
        
        + Nova nota
      </button>
    </div>);

}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Notas() {
  const { notes, addNote, updateNote, deleteNote } = useAppStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filtered = notes.
  filter((n) => {
    const q = search.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      stripHtml(n.content).toLowerCase().includes(q));

  }).
  slice().
  sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

  const handleCreate = () => {
    const now = new Date().toISOString();
    const tempId = Math.random().toString(36).slice(2);
    addNote({ title: "Nova nota", content: "" });
    // After store updates, pick the newest note
    setTimeout(() => {
      const latest = useAppStore.
      getState().
      notes.slice().
      sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      if (latest) {
        setSelectedId(latest.id);
        setMobileView("editor");
      }
    }, 30);
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setMobileView("editor");
  };

  const handleDelete = (id: string) => {
    deleteNote(id);
    if (selectedId === id) {
      setSelectedId(null);
      setMobileView("list");
    }
  };

  const noteToDelete = notes.find((n) => n.id === deleteConfirmId);

  return (
    <>
    <div className="flex h-full overflow-hidden bg-background">
      {/* ── Left Panel – Notes List ── */}
      <div
        className={cn(
          "flex flex-col border-r border-border flex-shrink-0 bg-card/40",
          "w-full lg:w-[300px] xl:w-[320px]",
          mobileView === "editor" ? "hidden lg:flex" : "flex"
        )}>
        
        {/* List Header */}
        <div className="px-4 pt-5 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-bold text-foreground">Notas</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {notes.length} {notes.length === 1 ? "nota" : "notas"}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCreate}
              className="btn-apple-primary flex items-center gap-1.5 px-3 py-2 text-xs">
              
              <Plus className="w-3.5 h-3.5" />
              Nova nota
            </motion.button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar notas..."
              className={cn(
                "w-full pl-9 pr-4 py-2.5 rounded-xl text-sm",
                "bg-muted/60 border border-border text-foreground",
                "placeholder:text-muted-foreground/50 outline-none",
                "focus:border-primary/40 focus:bg-background transition-all"
              )} />
            
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {filtered.length === 0 ?
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center shadow-2xl">
              <FileText className="w-10 h-10 text-muted-foreground/30" />
              {search ?
            <p className="text-sm text-muted-foreground">Nenhuma nota encontrada.</p> :

            <>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Você ainda não criou<br />nenhuma nota.
                  </p>
                  <button
                onClick={handleCreate}
                className="btn-apple-primary px-4 py-2 text-xs mt-1">
                
                    Criar primeira nota
                  </button>
                </>
            }
            </div> :

          <AnimatePresence>
              {filtered.map((note) =>
            <NoteCard
              key={note.id}
              note={note}
              isActive={selectedId === note.id}
              onClick={() => handleSelect(note.id)}
            onDelete={(e) => {
                e.stopPropagation();
                setDeleteConfirmId(note.id);
              }} />

            )}
            </AnimatePresence>
          }
        </div>
      </div>

      {/* ── Right Panel – Editor ── */}
      <div
        className={cn(
          "flex-1 min-w-0 bg-background overflow-hidden",
          mobileView === "list" ? "hidden lg:flex lg:flex-col" : "flex flex-col"
        )}>
        
        <AnimatePresence mode="wait">
          {selectedNote ?
          <motion.div
            key={selectedNote.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="h-full flex flex-col">
            
              <NoteEditor
              note={selectedNote}
              onUpdate={updateNote}
              onBack={() => setMobileView("list")} />
            
            </motion.div> :

          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full">
            
              <EmptyEditor onCreate={handleCreate} />
            </motion.div>
          }
        </AnimatePresence>
      </div>
    </div>

    <DeleteConfirmDialog
      open={!!deleteConfirmId}
      onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}
      title="Excluir nota"
      description={`Tem certeza que deseja excluir "${noteToDelete?.title || "esta nota"}"? Esta ação não pode ser desfeita.`}
      onConfirm={() => { if (deleteConfirmId) { handleDelete(deleteConfirmId); setDeleteConfirmId(null); } }}
    />
    </>
  );

}