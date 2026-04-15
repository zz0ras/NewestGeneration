"use client";

import { create } from "zustand";
import { sampleBookDocument } from "@/lib/book/seed";
import {
  clonePage,
  createEmptyPage,
  createImageObject,
  createShapeObject,
  createTextObject,
  createVideoObject,
  normalizePageOrder,
} from "@/lib/book/factories";
import type { BookDocument, BookPage, BookViewMode, PageObject, ObjectTemplateType } from "@/lib/book/types";

interface HistoryState {
  past: BookDocument[];
  future: BookDocument[];
}

interface EditorState {
  document: BookDocument;
  history: HistoryState;
  selectedPageId: string;
  selectedObjectId: string | null;
  mode: BookViewMode;
  
  // Actions
  setMode: (mode: BookViewMode) => void;
  selectPage: (pageId: string) => void;
  selectObject: (objectId: string | null) => void;
  
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  
  // Documents
  updateDocumentMeta: (updates: Partial<Pick<BookDocument, "title" | "description">>) => void;
  
  // Pages
  updatePage: (pageId: string, updates: Partial<BookPage>) => void;
  addPage: (themeId?: string) => void;
  deletePage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;
  movePage: (fromIndex: number, toIndex: number) => void;
  
  // Objects
  addObject: (type: ObjectTemplateType, overrides?: Partial<PageObject>) => void;
  updateObject: (pageId: string, objectId: string, updates: Partial<PageObject>) => void;
  deleteObject: (pageId: string, objectId: string) => void;
  moveObjectLayer: (pageId: string, objectId: string, direction: "forward" | "backward") => void;
}

function createObject(type: ObjectTemplateType): PageObject {
  switch (type) {
    case "text": return createTextObject();
    case "image": return createImageObject();
    case "shape": return createShapeObject();
    case "video": return createVideoObject();
  }
}

function touch(document: BookDocument): BookDocument {
  return { ...document, updatedAt: new Date().toISOString() };
}

function normalizeObjectOrder(objects: PageObject[]): PageObject[] {
  return objects.map((object, index) => ({ ...object, zIndex: index + 1 }));
}

// Helper to push history
function withHistory(state: EditorState, updater: (doc: BookDocument) => BookDocument): Partial<EditorState> {
  const nextDoc = updater(state.document);
  return {
    document: nextDoc,
    history: {
      past: [...state.history.past, state.document],
      future: [],
    }
  };
}

export const useEditorStore = create<EditorState>((set) => ({
  document: sampleBookDocument,
  history: { past: [], future: [] },
  selectedPageId: sampleBookDocument.pages[0]?.id ?? "",
  selectedObjectId: null,
  mode: "design",

  setMode: (mode) => set({ mode }),
  selectPage: (pageId) => set({ selectedPageId: pageId, selectedObjectId: null }),
  selectObject: (objectId) => set({ selectedObjectId: objectId }),

  undo: () => set((state) => {
    if (state.history.past.length === 0) return {};
    const previous = state.history.past[state.history.past.length - 1];
    const newPast = state.history.past.slice(0, -1);
    return {
      document: previous,
      history: {
        past: newPast,
        future: [state.document, ...state.history.future],
      }
    };
  }),

  redo: () => set((state) => {
    if (state.history.future.length === 0) return {};
    const next = state.history.future[0];
    const newFuture = state.history.future.slice(1);
    return {
      document: next,
      history: {
        past: [...state.history.past, state.document],
        future: newFuture,
      }
    };
  }),

  updateDocumentMeta: (updates) => set((state) => 
    withHistory(state, doc => touch({ ...doc, ...updates }))
  ),

  updatePage: (pageId, updates) => set((state) => 
    withHistory(state, doc => ({
      ...doc,
      pages: normalizePageOrder(doc.pages.map(page => page.id === pageId ? { ...page, ...updates } : page))
    }))
  ),

  addPage: (themeId) => set((state) => {
    const page = createEmptyPage(state.document.pages.length, state.document.pageSize.width, state.document.pageSize.height);
    if (themeId) page.themeId = themeId;
    
    return {
      ...withHistory(state, doc => ({
        ...doc,
        pages: normalizePageOrder([...doc.pages, page])
      })),
      selectedPageId: page.id,
      selectedObjectId: null
    };
  }),

  deletePage: (pageId) => set((state) => {
    if (state.document.pages.length <= 1) return {};
    return {
      ...withHistory(state, doc => ({
        ...doc,
        pages: normalizePageOrder(doc.pages.filter(page => page.id !== pageId))
      })),
      selectedPageId: state.document.pages[0]?.id ?? "",
    };
  }),

  duplicatePage: (pageId) => set((state) => {
    const index = state.document.pages.findIndex(page => page.id === pageId);
    if (index === -1) return {};
    const clone = clonePage(state.document.pages[index]);
    
    return {
      ...withHistory(state, doc => {
        const pages = [...doc.pages];
        pages.splice(index + 1, 0, clone);
        return { ...doc, pages: normalizePageOrder(pages) };
      }),
      selectedPageId: clone.id,
    };
  }),

  movePage: (fromIndex, toIndex) => set((state) => 
    withHistory(state, doc => {
      const nextPages = [...doc.pages];
      const [moved] = nextPages.splice(fromIndex, 1);
      nextPages.splice(toIndex, 0, moved);
      return { ...doc, pages: normalizePageOrder(nextPages) };
    })
  ),

  addObject: (type, overrides) => set((state) => {
    const object = { ...createObject(type), ...overrides } as PageObject;
    return {
      ...withHistory(state, doc => ({
        ...doc,
        pages: doc.pages.map(page => 
          page.id === state.selectedPageId 
            ? { ...page, objects: normalizeObjectOrder([...page.objects, { ...object, zIndex: page.objects.length + 1 }]) }
            : page
        )
      })),
      selectedObjectId: object.id,
    };
  }),

  updateObject: (pageId, objectId, updates) => set((state) => 
    withHistory(state, doc => ({
      ...doc,
      pages: doc.pages.map(page => 
        page.id === pageId 
          ? { ...page, objects: page.objects.map(obj => obj.id === objectId ? { ...obj, ...updates } : obj) }
          : page
      )
    }))
  ),

  deleteObject: (pageId, objectId) => set((state) => ({
    ...withHistory(state, doc => ({
      ...doc,
      pages: doc.pages.map(page => 
        page.id === pageId 
          ? { ...page, objects: normalizeObjectOrder(page.objects.filter(obj => obj.id !== objectId)) }
          : page
      )
    })),
    selectedObjectId: state.selectedObjectId === objectId ? null : state.selectedObjectId,
  })),

  moveObjectLayer: (pageId, objectId, direction) => set((state) => ({
    ...withHistory(state, doc => ({
      ...doc,
        pages: doc.pages.map((page) => {
          if (page.id !== pageId) return page;

          const objects = [...page.objects].sort((left, right) => left.zIndex - right.zIndex);
          const index = objects.findIndex((object) => object.id === objectId);
          if (index === -1) return page;

          const targetIndex =
            direction === "forward"
              ? Math.min(objects.length - 1, index + 1)
              : Math.max(0, index - 1);

          if (targetIndex === index) return page;

          const [moved] = objects.splice(index, 1);
          objects.splice(targetIndex, 0, moved);

          return {
            ...page,
            objects: normalizeObjectOrder(objects),
          };
        }),
    }))
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
