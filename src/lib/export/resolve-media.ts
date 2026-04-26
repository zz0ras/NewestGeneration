import type { BookDocument, PageObject } from "@/lib/book/types";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ResolveProgress {
  current: number;
  total: number;
  label: string;
}

/**
 * Deep-clone a BookDocument, fetching all media through the local proxy
 * and embedding them as base64 data URIs so the exported HTML is fully
 * self-contained and works offline without CORS issues.
 */
export async function resolveDocumentMedia(
  document: BookDocument,
  onProgress?: (progress: ResolveProgress) => void,
): Promise<BookDocument> {
  // Collect all unique media URLs that need fetching
  const urlSet = new Set<string>();
  for (const page of document.pages) {
    for (const object of page.objects) {
      collectMediaUrls(object, urlSet);
    }
  }

  const urls = [...urlSet];
  const total = urls.length;
  if (total === 0) return document;

  // Fetch and encode all media in parallel (with concurrency limit)
  const resolved = new Map<string, string>();
  const CONCURRENCY = 4;

  for (let i = 0; i < total; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((url) => fetchAsDataUri(url)),
    );

    for (let j = 0; j < batch.length; j++) {
      const result = results[j];
      if (result.status === "fulfilled" && result.value) {
        resolved.set(batch[j], result.value);
      }
      // If fetch fails, keep original URL as fallback

      onProgress?.({
        current: Math.min(i + j + 1, total),
        total,
        label: batch[j].length > 40
          ? `...${batch[j].slice(-35)}`
          : batch[j],
      });
    }
  }

  // Apply resolved URLs to the document
  return {
    ...document,
    pages: document.pages.map((page) => ({
      ...page,
      objects: page.objects.map((object) => applyResolved(object, resolved)),
    })),
  };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function collectMediaUrls(object: PageObject, urls: Set<string>): void {
  switch (object.type) {
    case "image":
      if (object.src) urls.add(object.src);
      break;
    case "video":
      if (object.src) urls.add(object.src);
      if (object.thumbnailSrc) urls.add(object.thumbnailSrc);
      break;
    case "audio":
      if (object.src) urls.add(object.src);
      break;
  }
}

function applyResolved(
  object: PageObject,
  resolved: Map<string, string>,
): PageObject {
  switch (object.type) {
    case "image":
      return { ...object, src: resolved.get(object.src) ?? object.src };
    case "video":
      return {
        ...object,
        src: resolved.get(object.src) ?? object.src,
        thumbnailSrc: object.thumbnailSrc
          ? (resolved.get(object.thumbnailSrc) ?? object.thumbnailSrc)
          : undefined,
      };
    case "audio":
      return { ...object, src: resolved.get(object.src) ?? object.src };
    default:
      return object;
  }
}

/**
 * Fetch a URL (works for both local proxy URLs and external URLs)
 * and return it as a base64 data URI.
 */
async function fetchAsDataUri(src: string): Promise<string | null> {
  try {
    // Build absolute URL for relative paths like /api/media-library/file?...
    const absoluteUrl = src.startsWith("/")
      ? `${window.location.origin}${src}`
      : src;

    const response = await fetch(absoluteUrl, {
      credentials: "same-origin",
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    // Reject HTML responses (Google Drive login pages, etc.)
    if (contentType.includes("text/html")) return null;

    const buffer = await response.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunks: string[] = [];
  // Process in chunks to avoid call-stack overflow with large files
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    chunks.push(
      String.fromCharCode(...bytes.slice(i, i + CHUNK)),
    );
  }
  return btoa(chunks.join(""));
}
