"use client";

import { useCallback, useEffect, useRef } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { saveDocument, setMeta } from "./editor-local";

const DEBOUNCE_MS = 300;
const ACTIVE_DOCUMENT_ID_META_KEY = "activeDocumentId";
const UI_META_PREFIX = "ui:";

function getUiMetaKey(documentId: string): string {
  return `${UI_META_PREFIX}${documentId}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) return error.message;
  return "Cannot save local data";
}

export function useLocalAutosave() {
  const activeDocumentId = useEditorStore((state) => state.activeDocumentId);
  const isHydrated = useEditorStore((state) => state.isHydrated);
  const bookDocument = useEditorStore((state) => state.document);
  const mode = useEditorStore((state) => state.mode);
  const selectedPageId = useEditorStore((state) => state.selectedPageId);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const setPersistenceStatus = useEditorStore((state) => state.setPersistenceStatus);
  const markPersistenceSaved = useEditorStore((state) => state.markPersistenceSaved);
  const markPersistenceError = useEditorStore((state) => state.markPersistenceError);
  const refreshDocumentsIndex = useEditorStore((state) => state.refreshDocumentsIndex);

  const hasMountedRef = useRef(false);
  const lastActiveDocumentIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistNow = useCallback(async () => {
    if (!isHydrated || !activeDocumentId) return;

    const now = new Date().toISOString();
    setPersistenceStatus("saving");

    try {
      await saveDocument({
        id: activeDocumentId,
        title: bookDocument.title,
        content: bookDocument,
        updatedAt: now,
      });
      await setMeta(ACTIVE_DOCUMENT_ID_META_KEY, activeDocumentId);
      await setMeta(getUiMetaKey(activeDocumentId), {
        mode,
        selectedPageId,
        selectedObjectId,
      });
      await refreshDocumentsIndex();
      markPersistenceSaved(now);
    } catch (error) {
      markPersistenceError(getErrorMessage(error));
    }
  }, [
    activeDocumentId,
    bookDocument,
    isHydrated,
    markPersistenceError,
    markPersistenceSaved,
    mode,
    refreshDocumentsIndex,
    selectedObjectId,
    selectedPageId,
    setPersistenceStatus,
  ]);

  useEffect(() => {
    if (!isHydrated || !activeDocumentId) return;

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      lastActiveDocumentIdRef.current = activeDocumentId;
      return;
    }

    if (lastActiveDocumentIdRef.current !== activeDocumentId) {
      lastActiveDocumentIdRef.current = activeDocumentId;
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = setTimeout(() => {
      void persistNow();
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [activeDocumentId, bookDocument, isHydrated, mode, persistNow, selectedObjectId, selectedPageId]);

  useEffect(() => {
    if (!isHydrated || !activeDocumentId) return;

    const onVisibilityChange = () => {
      if (window.document.visibilityState === "hidden") {
        void persistNow();
      }
    };

    window.document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [activeDocumentId, isHydrated, persistNow]);
}
