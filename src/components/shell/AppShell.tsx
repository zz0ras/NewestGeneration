"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { useDocumentFonts } from "@/lib/fonts/runtime";
import { useLocalAutosave } from "@/lib/persistence/useLocalAutosave";
import { AppShellTopbar } from "./AppShellTopbar";
import { PageEditor } from "../editor/PageEditor";
import { BookViewer } from "../viewer/BookViewer";

export function AppShell() {
  const isHydrated = useEditorStore((state) => state.isHydrated);
  const mode = useEditorStore((state) => state.mode);
  const document = useEditorStore((state) => state.document);
  const hydrateFromLocal = useEditorStore((state) => state.hydrateFromLocal);
  useDocumentFonts(document.fontAssets);
  useLocalAutosave();

  useEffect(() => {
    void hydrateFromLocal();
  }, [hydrateFromLocal]);

  if (!isHydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-shell-bg text-[13px] uppercase tracking-[0.2em] text-[rgba(232,221,208,0.7)]">
        Loading local data...
      </div>
    );
  }

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-shell-bg text-white">
      <AppShellTopbar />
      
      {mode === "design" ? (
        <PageEditor />
      ) : (
        <BookViewer document={document} />
      )}
    </div>
  );
}
