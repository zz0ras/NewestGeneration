"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useEditorStore } from "@/stores/editor-store";
import { ObjectToolbar } from "./ObjectToolbar";
import { Filmstrip } from "./Filmstrip";
import { FloatingContextMenu } from "./FloatingContextMenu";
import { EditorInspector } from "./EditorInspector";
import { MediaPanel } from "./MediaPanel";

const BookCanvas = dynamic(() => import("./BookCanvas").then((module) => module.BookCanvas), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center" style={{ color: "#a0845e" }}>
      <div className="flex items-center gap-3">
        <div
          className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "#c4a882", borderTopColor: "transparent" }}
        />
        <span className="text-sm font-medium">Dang tai canvas...</span>
      </div>
    </div>
  ),
});

export function PageEditor() {
  const [mediaIntent, setMediaIntent] = useState<"image" | "video" | "audio" | null>(null);
  const [isInspectorPinnedOpen, setIsInspectorPinnedOpen] = useState(false);
  const [isMediaPanelOpen, setIsMediaPanelOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        useEditorStore.getState().undo();
        return;
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey))
      ) {
        event.preventDefault();
        useEditorStore.getState().redo();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        const state = useEditorStore.getState();
        if (state.selectedPageId && state.selectedObjectId) {
          event.preventDefault();
          state.deleteObject(state.selectedPageId, state.selectedObjectId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className="relative flex h-[calc(100vh-65px)] w-full flex-col overflow-hidden"
      style={{ background: "#1a1410" }}
    >
      <div className="relative flex flex-1 overflow-hidden">
        <div className="relative flex h-full shrink-0">
          <ObjectToolbar
            isMediaPanelOpen={isMediaPanelOpen}
            onToggleMediaPanel={() => {
              setMediaIntent(null);
              setIsMediaPanelOpen((current) => !current);
            }}
            onStartMediaInsert={(type) => {
              setMediaIntent(type);
              setIsMediaPanelOpen(true);
            }}
          />

          <div className="hidden xl:block">
            <MediaPanel
              isOpen={isMediaPanelOpen}
              mediaIntent={mediaIntent}
              onClearMediaIntent={() => setMediaIntent(null)}
              onClose={() => {
                setMediaIntent(null);
                setIsMediaPanelOpen(false);
              }}
            />
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <BookCanvas />
          <FloatingContextMenu />

          {isMediaPanelOpen ? (
            <div className="absolute inset-y-3 left-3 z-50 w-[min(320px,calc(100%-24px))] xl:hidden">
              <MediaPanel
                isOpen={isMediaPanelOpen}
                mediaIntent={mediaIntent}
                onClearMediaIntent={() => setMediaIntent(null)}
                onClose={() => {
                  setMediaIntent(null);
                  setIsMediaPanelOpen(false);
                }}
              />
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setIsInspectorPinnedOpen((current) => !current)}
            className="absolute right-4 top-4 z-40 rounded-full border border-[rgba(196,168,130,0.16)] bg-[rgba(30,25,20,0.88)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent shadow-[0_10px_24px_rgba(0,0,0,0.32)] xl:hidden"
          >
            Inspector
          </button>

          {isInspectorPinnedOpen ? (
            <div className="absolute inset-y-3 right-3 z-50 w-[min(360px,calc(100%-24px))] xl:hidden">
              <EditorInspector
                onRequestClose={() => setIsInspectorPinnedOpen(false)}
                onRequestAudioLibrary={() => {
                  setMediaIntent("audio");
                  setIsMediaPanelOpen(true);
                }}
              />
            </div>
          ) : null}
        </div>

        <div className="hidden h-full w-[340px] shrink-0 xl:block">
          <EditorInspector
            onRequestAudioLibrary={() => {
              setMediaIntent("audio");
              setIsMediaPanelOpen(true);
            }}
          />
        </div>
      </div>

      <Filmstrip />
    </div>
  );
}
