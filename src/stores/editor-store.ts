"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import { sampleBookDocument } from "@/lib/book/seed";
import {
  createAudioObject,
  clonePage,
  createEmptyPage,
  createImageObject,
  createMediaFolderSource,
  createShapeObject,
  createTextObject,
  createVideoObject,
  normalizePageOrder,
} from "@/lib/book/factories";
import { hasSpreadAudioConflict } from "@/lib/book/spread-audio";
import type {
  AudioObject,
  BookDocument,
  BookPage,
  DocumentFontAsset,
  ImageObject,
  MediaAsset,
  MediaFolderSource,
  BookViewMode,
  ObjectTemplateType,
  PageObject,
  TextObject,
  VideoObject,
} from "@/lib/book/types";
import {
  deleteDocument,
  getDocument,
  getMeta,
  listDocuments,
  saveDocument,
  setMeta,
  type LocalDocumentIndexItem,
  type LocalEditorUiState,
} from "@/lib/persistence/editor-local";

interface HistoryState {
  past: BookDocument[];
  future: BookDocument[];
}

interface AddMediaFolderInput {
  name: string;
  shareUrl: string;
  folderId: string;
}

interface EditorState {
  document: BookDocument;
  history: HistoryState;
  documentsIndex: LocalDocumentIndexItem[];
  activeDocumentId: string;
  persistence: {
    status: "idle" | "saving" | "saved" | "error";
    lastSavedAt: string | null;
    errorMessage: string | null;
  };
  isHydrated: boolean;
  selectedPageId: string;
  selectedObjectId: string | null;
  editingTextObjectId: string | null;
  mode: BookViewMode;

  setMode: (mode: BookViewMode) => void;
  selectPage: (pageId: string) => void;
  selectObject: (objectId: string | null) => void;

  startTextEditing: (pageId: string, objectId: string) => void;
  stopTextEditing: () => void;

  undo: () => void;
  redo: () => void;

  updateDocumentMeta: (updates: Partial<Pick<BookDocument, "title" | "description">>) => void;

  updatePage: (pageId: string, updates: Partial<BookPage>) => void;
  addPage: () => void;
  deletePage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;
  movePage: (fromIndex: number, toIndex: number) => void;

  addObject: (type: ObjectTemplateType, overrides?: Partial<PageObject>) => void;
  updateObject: (pageId: string, objectId: string, updates: Partial<PageObject>) => void;
  updateTextObjectStyle: (pageId: string, objectId: string, updates: Partial<TextObject>) => void;
  commitInlineTextEdit: (pageId: string, objectId: string, text: string) => void;
  deleteObject: (pageId: string, objectId: string) => void;
  moveObjectLayer: (pageId: string, objectId: string, direction: "forward" | "backward") => void;
  replaceSelectedMediaSource: (asset: MediaAsset) => void;

  addMediaFolder: (input: AddMediaFolderInput) => void;
  removeMediaFolder: (folderId: string) => void;
  setActiveMediaFolder: (folderId: string | null) => void;

  addFontAsset: (fontAsset: DocumentFontAsset) => void;
  setSelectionState: (input: { pageId: string | null; objectId: string | null }) => void;

  hydrateFromLocal: () => Promise<void>;
  createDocumentLocal: () => Promise<void>;
  switchDocumentLocal: (id: string) => Promise<void>;
  renameDocumentLocal: (id: string, title: string) => Promise<void>;
  deleteDocumentLocal: (id: string) => Promise<void>;
  refreshDocumentsIndex: () => Promise<void>;
  setPersistenceStatus: (status: EditorState["persistence"]["status"]) => void;
  markPersistenceSaved: (savedAt: string) => void;
  markPersistenceError: (message: string) => void;
}

function createObject(type: ObjectTemplateType): PageObject {
  switch (type) {
    case "text":
      return createTextObject();
    case "image":
      return createImageObject();
    case "shape":
      return createShapeObject();
    case "video":
      return createVideoObject();
    case "audio":
      return createAudioObject();
  }
}

function touch(document: BookDocument): BookDocument {
  return { ...document, updatedAt: new Date().toISOString() };
}

function normalizeObjectOrder(objects: PageObject[]): PageObject[] {
  return objects.map((object, index) => ({ ...object, zIndex: index + 1 }));
}

function withHistory(state: EditorState, updater: (doc: BookDocument) => BookDocument): Pick<EditorState, "document" | "history"> {
  const nextDoc = touch(updater(state.document));
  return {
    document: nextDoc,
    history: {
      past: [...state.history.past, state.document],
      future: [],
    },
  };
}

function updatePageObjects(
  document: BookDocument,
  pageId: string,
  updater: (objects: PageObject[]) => PageObject[],
): BookDocument {
  return {
    ...document,
    pages: document.pages.map((page) =>
      page.id === pageId ? { ...page, objects: updater(page.objects) } : page,
    ),
  };
}

function mapObject(
  objects: PageObject[],
  objectId: string,
  updater: (object: PageObject) => PageObject,
): PageObject[] {
  return objects.map((object) => (object.id === objectId ? updater(object) : object));
}

function isMediaObject(object: PageObject): object is ImageObject | VideoObject | AudioObject {
  return object.type === "image" || object.type === "video" || object.type === "audio";
}

const ACTIVE_DOCUMENT_ID_META_KEY = "activeDocumentId";
const UI_META_PREFIX = "ui:";

function createDocumentFromSeed(): BookDocument {
  const now = new Date().toISOString();
  const pages = sampleBookDocument.pages.map((page, index) => ({
    ...page,
    id: nanoid(),
    side: index % 2 === 0 ? "right" : "left",
    objects: page.objects.map((object) => ({ ...object, id: nanoid() })),
  }));

  return {
    ...sampleBookDocument,
    id: nanoid(),
    title: "Untitled document",
    updatedAt: now,
    pages,
    mediaFolders: [],
    activeMediaFolderId: null,
    fontAssets: [],
  };
}

function normalizeSelectionState(
  document: BookDocument,
  input: { pageId: string | null; objectId: string | null },
): { pageId: string; objectId: string | null } {
  const fallbackPageId = document.pages[0]?.id ?? "";
  const selectedPageId =
    input.pageId && document.pages.some((page) => page.id === input.pageId) ? input.pageId : fallbackPageId;

  const selectedPage = document.pages.find((page) => page.id === selectedPageId);
  const selectedObjectId =
    input.objectId && selectedPage?.objects.some((object) => object.id === input.objectId) ? input.objectId : null;

  return {
    pageId: selectedPageId,
    objectId: selectedObjectId,
  };
}

function getUiMetaKey(documentId: string): string {
  return `${UI_META_PREFIX}${documentId}`;
}

export const useEditorStore = create<EditorState>((set) => ({
  document: sampleBookDocument,
  history: { past: [], future: [] },
  documentsIndex: [],
  activeDocumentId: sampleBookDocument.id,
  persistence: {
    status: "idle",
    lastSavedAt: null,
    errorMessage: null,
  },
  isHydrated: false,
  selectedPageId: sampleBookDocument.pages[0]?.id ?? "",
  selectedObjectId: null,
  editingTextObjectId: null,
  mode: "design",

  setMode: (mode) => set({ mode }),
  selectPage: (pageId) => set((state) => ({
    selectedPageId: pageId,
    selectedObjectId: state.selectedPageId === pageId ? state.selectedObjectId : null,
    editingTextObjectId: null,
  })),
  selectObject: (objectId) => set({ selectedObjectId: objectId, editingTextObjectId: null }),
  setSelectionState: (input) =>
    set((state) => {
      const normalized = normalizeSelectionState(state.document, input);
      return {
        selectedPageId: normalized.pageId,
        selectedObjectId: normalized.objectId,
        editingTextObjectId: null,
      };
    }),

  startTextEditing: (pageId, objectId) =>
    set({ selectedPageId: pageId, selectedObjectId: objectId, editingTextObjectId: objectId }),
  stopTextEditing: () => set({ editingTextObjectId: null }),

  undo: () =>
    set((state) => {
      if (state.history.past.length === 0) return {};
      const previous = state.history.past[state.history.past.length - 1];
      const newPast = state.history.past.slice(0, -1);

      return {
        document: previous,
        history: {
          past: newPast,
          future: [state.document, ...state.history.future],
        },
        editingTextObjectId: null,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.history.future.length === 0) return {};
      const next = state.history.future[0];
      const newFuture = state.history.future.slice(1);

      return {
        document: next,
        history: {
          past: [...state.history.past, state.document],
          future: newFuture,
        },
        editingTextObjectId: null,
      };
    }),

  updateDocumentMeta: (updates) => set((state) => withHistory(state, (doc) => ({ ...doc, ...updates }))),

  updatePage: (pageId, updates) =>
    set((state) =>
      withHistory(state, (doc) => ({
        ...doc,
        pages: normalizePageOrder(doc.pages.map((page) => (page.id === pageId ? { ...page, ...updates } : page))),
      })),
    ),

  addPage: () =>
    set((state) => {
      const page = createEmptyPage(state.document.pages.length);
      return {
        ...withHistory(state, (doc) => ({
          ...doc,
          pages: normalizePageOrder([...doc.pages, page]),
        })),
        selectedPageId: page.id,
        selectedObjectId: null,
        editingTextObjectId: null,
      };
    }),

  deletePage: (pageId) =>
    set((state) => {
      if (state.document.pages.length <= 1) return {};

      const nextPages = state.document.pages.filter((page) => page.id !== pageId);
      const nextSelectedPageId = nextPages[0]?.id ?? "";

      return {
        ...withHistory(state, (doc) => ({
          ...doc,
          pages: normalizePageOrder(doc.pages.filter((page) => page.id !== pageId)),
        })),
        selectedPageId: nextSelectedPageId,
        selectedObjectId: null,
        editingTextObjectId: null,
      };
    }),

  duplicatePage: (pageId) =>
    set((state) => {
      const index = state.document.pages.findIndex((page) => page.id === pageId);
      if (index === -1) return {};

      const clone = clonePage(state.document.pages[index]);
      return {
        ...withHistory(state, (doc) => {
          const pages = [...doc.pages];
          pages.splice(index + 1, 0, clone);
          return { ...doc, pages: normalizePageOrder(pages) };
        }),
        selectedPageId: clone.id,
        selectedObjectId: null,
        editingTextObjectId: null,
      };
    }),

  movePage: (fromIndex, toIndex) =>
    set((state) =>
      withHistory(state, (doc) => {
        const nextPages = [...doc.pages];
        const [moved] = nextPages.splice(fromIndex, 1);
        nextPages.splice(toIndex, 0, moved);
        return { ...doc, pages: normalizePageOrder(nextPages) };
      }),
    ),

  addObject: (type, overrides) =>
    set((state) => {
      if (type === "audio" && hasSpreadAudioConflict(state.document, state.selectedPageId)) {
        return {};
      }

      const object = { ...createObject(type), ...overrides } as PageObject;

      return {
        ...withHistory(state, (doc) =>
          updatePageObjects(doc, state.selectedPageId, (objects) =>
            normalizeObjectOrder([...objects, { ...object, zIndex: objects.length + 1 }]),
          ),
        ),
        selectedObjectId: object.id,
        editingTextObjectId: null,
      };
    }),

  updateObject: (pageId, objectId, updates) =>
    set((state) =>
      withHistory(state, (doc) =>
        updatePageObjects(doc, pageId, (objects) =>
          mapObject(objects, objectId, (object) => ({ ...object, ...updates } as PageObject)),
        ),
      ),
    ),

  updateTextObjectStyle: (pageId, objectId, updates) =>
    set((state) =>
      withHistory(state, (doc) =>
        updatePageObjects(doc, pageId, (objects) =>
          mapObject(objects, objectId, (object) => (object.type === "text" ? { ...object, ...updates } : object)),
        ),
      ),
    ),

  commitInlineTextEdit: (pageId, objectId, text) =>
    set((state) => ({
      ...withHistory(state, (doc) =>
        updatePageObjects(doc, pageId, (objects) =>
          mapObject(objects, objectId, (object) => (object.type === "text" ? { ...object, text } : object)),
        ),
      ),
      editingTextObjectId: null,
    })),

  deleteObject: (pageId, objectId) =>
    set((state) => ({
      ...withHistory(state, (doc) =>
        updatePageObjects(doc, pageId, (objects) => normalizeObjectOrder(objects.filter((object) => object.id !== objectId))),
      ),
      selectedObjectId: state.selectedObjectId === objectId ? null : state.selectedObjectId,
      editingTextObjectId: state.editingTextObjectId === objectId ? null : state.editingTextObjectId,
    })),

  moveObjectLayer: (pageId, objectId, direction) =>
    set((state) => ({
      ...withHistory(state, (doc) =>
        updatePageObjects(doc, pageId, (objects) => {
          const sortedObjects = [...objects].sort((left, right) => left.zIndex - right.zIndex);
          const index = sortedObjects.findIndex((object) => object.id === objectId);
          if (index === -1) return objects;

          const targetIndex =
            direction === "forward"
              ? Math.min(sortedObjects.length - 1, index + 1)
              : Math.max(0, index - 1);
          if (targetIndex === index) return objects;

          const [moved] = sortedObjects.splice(index, 1);
          sortedObjects.splice(targetIndex, 0, moved);
          return normalizeObjectOrder(sortedObjects);
        }),
      ),
    })),

  replaceSelectedMediaSource: (asset) =>
    set((state) => {
      const pageId = state.selectedPageId;
      const objectId = state.selectedObjectId;
      if (!pageId || !objectId) return {};

      return withHistory(state, (doc) =>
        updatePageObjects(doc, pageId, (objects) =>
          mapObject(objects, objectId, (object) => {
            if (!isMediaObject(object) || object.type !== asset.type) return object;
            return {
              ...object,
              src: asset.src,
              name: asset.name,
              thumbnailSrc: asset.thumbnailSrc,
            };
          }),
        ),
      );
    }),

  addMediaFolder: (input) =>
    set((state) => {
      const nextFolder = createMediaFolderSource(input);
      const exists = state.document.mediaFolders.some(
        (folder) => folder.folderId === nextFolder.folderId || folder.shareUrl === nextFolder.shareUrl,
      );
      if (exists) return {};

      return withHistory(state, (doc) => ({
        ...doc,
        mediaFolders: [...doc.mediaFolders, nextFolder],
        activeMediaFolderId: doc.activeMediaFolderId ?? nextFolder.id,
      }));
    }),

  removeMediaFolder: (folderId) =>
    set((state) => {
      const nextFolders = state.document.mediaFolders.filter((folder) => folder.id !== folderId);
      const nextActiveFolderId =
        state.document.activeMediaFolderId === folderId ? nextFolders[0]?.id ?? null : state.document.activeMediaFolderId;

      return withHistory(state, (doc) => ({
        ...doc,
        mediaFolders: doc.mediaFolders.filter((folder) => folder.id !== folderId),
        activeMediaFolderId: nextActiveFolderId,
      }));
    }),

  setActiveMediaFolder: (folderId) =>
    set((state) =>
      withHistory(state, (doc) => ({
        ...doc,
        activeMediaFolderId: folderId,
      })),
    ),

  addFontAsset: (fontAsset) =>
    set((state) => {
      const exists = state.document.fontAssets.some(
        (entry) => entry.family === fontAsset.family || entry.originalFileName === fontAsset.originalFileName,
      );
      if (exists) return {};

      return withHistory(state, (doc) => ({
        ...doc,
        fontAssets: [...doc.fontAssets, fontAsset],
      }));
    }),

  refreshDocumentsIndex: async () => {
    const index = await listDocuments();
    set({ documentsIndex: index });
  },

  hydrateFromLocal: async () => {
    try {
      let index = await listDocuments();

      if (index.length === 0) {
        const document = createDocumentFromSeed();
        await saveDocument({
          id: document.id,
          title: document.title,
          content: document,
          updatedAt: document.updatedAt,
        });
        await setMeta(ACTIVE_DOCUMENT_ID_META_KEY, document.id);
        await setMeta<LocalEditorUiState>(getUiMetaKey(document.id), {
          mode: "design",
          selectedPageId: document.pages[0]?.id ?? null,
          selectedObjectId: null,
        });
        index = await listDocuments();
      }

      const savedActiveDocumentId = await getMeta<string>(ACTIVE_DOCUMENT_ID_META_KEY);
      const fallbackDocumentId = index[0]?.id ?? "";
      const nextActiveDocumentId =
        savedActiveDocumentId && index.some((entry) => entry.id === savedActiveDocumentId)
          ? savedActiveDocumentId
          : fallbackDocumentId;

      const activeRecord = (await getDocument(nextActiveDocumentId)) ?? (await getDocument(fallbackDocumentId));
      if (!activeRecord) {
        set({ isHydrated: true, documentsIndex: index });
        return;
      }

      await setMeta(ACTIVE_DOCUMENT_ID_META_KEY, activeRecord.id);
      const persistedUiState = await getMeta<LocalEditorUiState>(getUiMetaKey(activeRecord.id));
      const normalizedSelection = normalizeSelectionState(activeRecord.content, {
        pageId: persistedUiState?.selectedPageId ?? activeRecord.content.pages[0]?.id ?? null,
        objectId: persistedUiState?.selectedObjectId ?? null,
      });

      set({
        document: activeRecord.content,
        history: { past: [], future: [] },
        documentsIndex: index,
        activeDocumentId: activeRecord.id,
        mode: persistedUiState?.mode ?? "design",
        selectedPageId: normalizedSelection.pageId,
        selectedObjectId: normalizedSelection.objectId,
        editingTextObjectId: null,
        isHydrated: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cannot load local data";
      set((state) => ({
        isHydrated: true,
        persistence: {
          ...state.persistence,
          status: "error",
          errorMessage: message,
        },
      }));
    }
  },

  createDocumentLocal: async () => {
    const nextDocument = createDocumentFromSeed();
    await saveDocument({
      id: nextDocument.id,
      title: nextDocument.title,
      content: nextDocument,
      updatedAt: nextDocument.updatedAt,
    });
    await setMeta(ACTIVE_DOCUMENT_ID_META_KEY, nextDocument.id);
    await setMeta<LocalEditorUiState>(getUiMetaKey(nextDocument.id), {
      mode: "design",
      selectedPageId: nextDocument.pages[0]?.id ?? null,
      selectedObjectId: null,
    });

    const index = await listDocuments();
    set({
      document: nextDocument,
      history: { past: [], future: [] },
      documentsIndex: index,
      activeDocumentId: nextDocument.id,
      mode: "design",
      selectedPageId: nextDocument.pages[0]?.id ?? "",
      selectedObjectId: null,
      editingTextObjectId: null,
    });
  },

  switchDocumentLocal: async (id) => {
    const record = await getDocument(id);
    if (!record) return;

    await setMeta(ACTIVE_DOCUMENT_ID_META_KEY, id);
    const persistedUiState = await getMeta<LocalEditorUiState>(getUiMetaKey(id));
    const normalizedSelection = normalizeSelectionState(record.content, {
      pageId: persistedUiState?.selectedPageId ?? record.content.pages[0]?.id ?? null,
      objectId: persistedUiState?.selectedObjectId ?? null,
    });

    set({
      document: record.content,
      history: { past: [], future: [] },
      activeDocumentId: id,
      mode: persistedUiState?.mode ?? "design",
      selectedPageId: normalizedSelection.pageId,
      selectedObjectId: normalizedSelection.objectId,
      editingTextObjectId: null,
    });
  },

  renameDocumentLocal: async (id, title) => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) return;

    const record = await getDocument(id);
    if (!record) return;

    const updatedAt = new Date().toISOString();
    const updatedContent: BookDocument = {
      ...record.content,
      title: normalizedTitle,
      updatedAt,
    };
    await saveDocument({
      id,
      title: normalizedTitle,
      content: updatedContent,
      updatedAt,
    });

    const index = await listDocuments();
    set((state) => ({
      documentsIndex: index,
      ...(state.activeDocumentId === id
        ? {
            document: updatedContent,
          }
        : {}),
    }));
  },

  deleteDocumentLocal: async (id) => {
    const currentIndex = await listDocuments();
    if (currentIndex.length <= 1) return;

    await deleteDocument(id);
    const nextIndex = await listDocuments();

    set((state) => {
      const deletingActive = state.activeDocumentId === id;
      if (!deletingActive) {
        return { documentsIndex: nextIndex };
      }

      return { documentsIndex: nextIndex };
    });

    const state = useEditorStore.getState();
    if (state.activeDocumentId !== id) return;

    const fallbackDocumentId = nextIndex[0]?.id;
    if (!fallbackDocumentId) return;

    await state.switchDocumentLocal(fallbackDocumentId);
  },

  setPersistenceStatus: (status) =>
    set((state) => ({
      persistence: {
        ...state.persistence,
        status,
        errorMessage: status === "error" ? state.persistence.errorMessage : null,
      },
    })),

  markPersistenceSaved: (savedAt) =>
    set((state) => ({
      persistence: {
        ...state.persistence,
        status: "saved",
        lastSavedAt: savedAt,
        errorMessage: null,
      },
    })),

  markPersistenceError: (message) =>
    set((state) => ({
      persistence: {
        ...state.persistence,
        status: "error",
        errorMessage: message,
      },
    })),
}));

export function useSelectedPage() {
  return useEditorStore((state) => state.document.pages.find((page) => page.id === state.selectedPageId) ?? null);
}

export function useSelectedObject() {
  return useEditorStore((state) => {
    const page = state.document.pages.find((entry) => entry.id === state.selectedPageId);
    return page?.objects.find((object) => object.id === state.selectedObjectId) ?? null;
  });
}

export function useActiveMediaFolder(): MediaFolderSource | null {
  return useEditorStore((state) => {
    const activeFolderId = state.document.activeMediaFolderId;
    if (!activeFolderId) return null;
    return state.document.mediaFolders.find((folder) => folder.id === activeFolderId) ?? null;
  });
}
