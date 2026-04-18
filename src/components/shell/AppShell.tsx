"use client";

import { useEditorStore } from "@/stores/editor-store";
import { useDocumentFonts } from "@/lib/fonts/runtime";
import { AppShellTopbar } from "./AppShellTopbar";
import { PageEditor } from "../editor/PageEditor";
import { BookViewer } from "../viewer/BookViewer";

export function AppShell() {
  const mode = useEditorStore((state) => state.mode);
  const document = useEditorStore((state) => state.document);
  useDocumentFonts(document.fontAssets);

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
