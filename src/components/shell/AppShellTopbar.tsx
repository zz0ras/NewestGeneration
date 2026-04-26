"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  LayoutTemplate,
  MonitorPlay,
  Pencil,
  Plus,
  Redo,
  Save,
  Trash2,
  Undo,
} from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { ExportDialog } from "@/components/shell/ExportDialog";

function formatPersistenceLabel(input: {
  status: "idle" | "saving" | "saved" | "error";
  lastSavedAt: string | null;
}): string {
  if (input.status === "saving") return "Saving local...";
  if (input.status === "error") return "Save failed";
  if (!input.lastSavedAt) return "Not saved yet";

  return `Saved ${new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(input.lastSavedAt))}`;
}

export function AppShellTopbar() {
  const {
    mode,
    setMode,
    history,
    undo,
    redo,
    document,
    updateDocumentMeta,
    documentsIndex,
    activeDocumentId,
    createDocumentLocal,
    switchDocumentLocal,
    renameDocumentLocal,
    deleteDocumentLocal,
    persistence,
  } = useEditorStore();

  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  const canDeleteDocument = documentsIndex.length > 1;

  const persistenceLabel = useMemo(
    () =>
      formatPersistenceLabel({
        status: persistence.status,
        lastSavedAt: persistence.lastSavedAt,
      }),
    [persistence.lastSavedAt, persistence.status],
  );

  const handleCreateDocument = () => {
    void createDocumentLocal();
  };

  const handleSwitchDocument = (id: string) => {
    void switchDocumentLocal(id);
  };

  const handleRenameDocument = () => {
    const nextTitle = window.prompt("Rename document", document.title);
    if (nextTitle === null) return;
    void renameDocumentLocal(activeDocumentId, nextTitle);
  };

  const handleDeleteDocument = () => {
    if (!canDeleteDocument) return;
    const accepted = window.confirm("Delete this document from local storage?");
    if (!accepted) return;
    void deleteDocumentLocal(activeDocumentId);
  };

  return (
    <header
      className="z-50 flex items-center justify-between px-6 py-3 glass-panel"
      style={{
        borderBottom: "1px solid rgba(196, 168, 130, 0.1)",
      }}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <BookOpen size={22} style={{ color: "#c4a882" }} />
          <h1
            className="text-lg font-bold tracking-wide"
            style={{
              background: "linear-gradient(135deg, #c4a882, #d4bc9a, #e8ddd0)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            NextGeneration
          </h1>
        </div>

        <div className="h-5 w-px" style={{ background: "rgba(196, 168, 130, 0.2)" }} />

        <select
          value={activeDocumentId}
          onChange={(event) => handleSwitchDocument(event.target.value)}
          className="rounded-lg border px-3 py-2 text-xs outline-none"
          style={{
            minWidth: "210px",
            background: "rgba(40, 32, 24, 0.75)",
            borderColor: "rgba(196, 168, 130, 0.25)",
            color: "#e8ddd0",
          }}
          title="Local documents"
        >
          {documentsIndex.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.title || "Untitled document"}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleCreateDocument}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] interactive-bounce"
          style={{
            background: "rgba(196, 168, 130, 0.12)",
            border: "1px solid rgba(196, 168, 130, 0.24)",
            color: "#d4bc9a",
          }}
          title="Create local document"
        >
          <Plus size={13} /> New
        </button>

        <button
          type="button"
          onClick={handleRenameDocument}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] interactive-bounce"
          style={{
            background: "rgba(196, 168, 130, 0.08)",
            border: "1px solid rgba(196, 168, 130, 0.2)",
            color: "#d4bc9a",
          }}
          title="Rename document"
        >
          <Pencil size={13} /> Rename
        </button>

        <button
          type="button"
          onClick={handleDeleteDocument}
          disabled={!canDeleteDocument}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] disabled:opacity-40 interactive-bounce"
          style={{
            background: "rgba(239, 68, 68, 0.09)",
            border: "1px solid rgba(239, 68, 68, 0.28)",
            color: "#fda4af",
          }}
          title="Delete document"
        >
          <Trash2 size={13} /> Delete
        </button>

        <input
          type="text"
          value={document.title}
          onChange={(event) => updateDocumentMeta({ title: event.target.value })}
          className="w-64 rounded border-none bg-transparent px-2 py-1 text-sm outline-none transition-colors"
          style={{
            color: "#e8ddd0",
          }}
          placeholder="Document title"
        />
      </div>

      <div className="flex items-center gap-2">
        <span
          className="mr-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
          style={{
            color:
              persistence.status === "error"
                ? "#fca5a5"
                : persistence.status === "saving"
                  ? "#fcd34d"
                  : "#d4bc9a",
            borderColor:
              persistence.status === "error"
                ? "rgba(252, 165, 165, 0.45)"
                : persistence.status === "saving"
                  ? "rgba(252, 211, 77, 0.35)"
                  : "rgba(196, 168, 130, 0.25)",
            backgroundColor:
              persistence.status === "error"
                ? "rgba(127, 29, 29, 0.26)"
                : persistence.status === "saving"
                  ? "rgba(120, 53, 15, 0.24)"
                  : "rgba(196, 168, 130, 0.08)",
          }}
          title={persistence.errorMessage ?? persistenceLabel}
        >
          {persistenceLabel}
        </span>

        {mode === "design" && (
          <div className="mr-3 flex gap-1">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="glass-button interactive-bounce rounded-lg p-2 disabled:opacity-30"
              title="Undo"
            >
              <Undo size={17} />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="glass-button interactive-bounce rounded-lg p-2 disabled:opacity-30"
              title="Redo"
            >
              <Redo size={17} />
            </button>
          </div>
        )}

        <div className="glass-card flex overflow-hidden rounded-xl p-1">
          <button
            onClick={() => setMode("design")}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all"
            style={
              mode === "design"
                ? {
                    background: "linear-gradient(135deg, #c4a882, #a0845e)",
                    color: "#ffffff",
                    boxShadow: "0 4px 12px rgba(196, 168, 130, 0.3)",
                  }
                : {
                    color: "rgba(232, 221, 208, 0.5)",
                  }
            }
          >
            <LayoutTemplate size={15} /> Design
          </button>
          <button
            onClick={() => setMode("preview")}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all"
            style={
              mode === "preview"
                ? {
                    background: "linear-gradient(135deg, #c4a882, #a0845e)",
                    color: "#ffffff",
                    boxShadow: "0 4px 12px rgba(196, 168, 130, 0.3)",
                  }
                : {
                    color: "rgba(232, 221, 208, 0.5)",
                  }
            }
          >
            <MonitorPlay size={15} /> Preview
          </button>
        </div>

        <button
          className="interactive-bounce ml-3 flex items-center gap-2 rounded-xl px-4 py-2 font-medium transition-all"
          style={{
            background: "rgba(196, 168, 130, 0.15)",
            border: "1px solid rgba(196, 168, 130, 0.25)",
            color: "#c4a882",
          }}
          onClick={() => setExportDialogOpen(true)}
        >
          <Save size={15} /> Export
        </button>
      </div>

      <ExportDialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} />
    </header>
  );
}
