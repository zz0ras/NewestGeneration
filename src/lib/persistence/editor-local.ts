"use client";

import type { BookDocument, BookViewMode } from "@/lib/book/types";

const DB_NAME = "editor-local";
const DB_VERSION = 1;
const DOCUMENTS_STORE = "documents";
const META_STORE = "meta";

export interface LocalDocumentRecord {
  id: string;
  title: string;
  content: BookDocument;
  createdAt: string;
  updatedAt: string;
}

export interface LocalDocumentIndexItem {
  id: string;
  title: string;
  updatedAt: string;
}

export interface LocalEditorUiState {
  mode: BookViewMode;
  selectedPageId: string | null;
  selectedObjectId: string | null;
}

type MetaRecord<TValue> = {
  key: string;
  value: TValue;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(DOCUMENTS_STORE)) {
        database.createObjectStore(DOCUMENTS_STORE, { keyPath: "id" });
      }

      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Cannot open IndexedDB"));
  });

  return dbPromise;
}

function runRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  storeName: string,
  runner: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const database = await openDatabase();
  const transaction = database.transaction(storeName, mode);
  const store = transaction.objectStore(storeName);
  const result = await runner(store);

  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });

  return result;
}

function toIndexItem(record: LocalDocumentRecord): LocalDocumentIndexItem {
  return {
    id: record.id,
    title: record.title,
    updatedAt: record.updatedAt,
  };
}

export async function listDocuments(): Promise<LocalDocumentIndexItem[]> {
  return withStore("readonly", DOCUMENTS_STORE, async (store) => {
    const all = await runRequest(store.getAll()) as LocalDocumentRecord[];
    return all
      .map(toIndexItem)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  });
}

export async function getDocument(id: string): Promise<LocalDocumentRecord | null> {
  return withStore("readonly", DOCUMENTS_STORE, async (store) => {
    const value = await runRequest(store.get(id)) as LocalDocumentRecord | undefined;
    return value ?? null;
  });
}

export async function putDocument(record: LocalDocumentRecord): Promise<void> {
  await withStore("readwrite", DOCUMENTS_STORE, async (store) => {
    await runRequest(store.put(record));
  });
}

export async function saveDocument(input: {
  id: string;
  title: string;
  content: BookDocument;
  updatedAt: string;
}): Promise<LocalDocumentRecord> {
  const existing = await getDocument(input.id);
  const record: LocalDocumentRecord = {
    id: input.id,
    title: input.title,
    content: input.content,
    updatedAt: input.updatedAt,
    createdAt: existing?.createdAt ?? input.updatedAt,
  };
  await putDocument(record);
  return record;
}

export async function deleteDocument(id: string): Promise<void> {
  await withStore("readwrite", DOCUMENTS_STORE, async (store) => {
    await runRequest(store.delete(id));
  });
}

export async function setMeta<TValue>(key: string, value: TValue): Promise<void> {
  await withStore("readwrite", META_STORE, async (store) => {
    await runRequest(store.put({ key, value } satisfies MetaRecord<TValue>));
  });
}

export async function getMeta<TValue>(key: string): Promise<TValue | null> {
  return withStore("readonly", META_STORE, async (store) => {
    const record = await runRequest(store.get(key)) as MetaRecord<TValue> | undefined;
    return record?.value ?? null;
  });
}
