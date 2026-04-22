"use client";

import { create } from "zustand";
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

export const useEditorStore = create<EditorState>((set) => ({
  document: sampleBookDocument,
  history: { past: [], future: [] },
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
