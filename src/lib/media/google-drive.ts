import { nanoid } from "nanoid";
import type { MediaAsset } from "@/lib/book/types";

type UnknownRecord = Record<string, unknown>;

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function toMediaType(value: unknown): MediaAsset["type"] | null {
  if (value === "image" || value === "video" || value === "audio") return value;
  if (typeof value === "string" && value.startsWith("image/")) return "image";
  if (typeof value === "string" && value.startsWith("video/")) return "video";
  if (typeof value === "string" && value.startsWith("audio/")) return "audio";
  return null;
}

export function parseGoogleDriveFolderId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const patterns = [
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }

  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function normalizeAsset(rawAsset: UnknownRecord): MediaAsset | null {
  const src =
    readString(rawAsset.src) ??
    readString(rawAsset.url) ??
    readString(rawAsset.streamUrl) ??
    readString(rawAsset.downloadUrl);
  const thumbnailSrc =
    readString(rawAsset.thumbnailSrc) ??
    readString(rawAsset.thumbnail) ??
    readString(rawAsset.poster) ??
    readString(rawAsset.previewUrl);
  const type =
    toMediaType(rawAsset.type) ??
    toMediaType(rawAsset.mimeType) ??
    toMediaType(rawAsset.kind);

  if (!src || !type) return null;

  return {
    id: readString(rawAsset.id) ?? nanoid(),
    type,
    name: readString(rawAsset.name) ?? `Untitled ${type}`,
    src,
    thumbnailSrc,
  };
}

export async function fetchGoogleDriveFolderAssets(folderId: string): Promise<MediaAsset[]> {
  const endpoint = process.env.NEXT_PUBLIC_MEDIA_LIBRARY_ENDPOINT;
  if (!endpoint) {
    throw new Error(
      "Chua cau hinh media API. Hay tao file .env.local va set NEXT_PUBLIC_MEDIA_LIBRARY_ENDPOINT.",
    );
  }

  const baseUrl = typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;
  const url = new URL(endpoint, baseUrl);
  url.searchParams.set("folderId", folderId);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
    const detail = typeof payload?.error === "string" ? payload.error : `Media API request failed with status ${response.status}`;
    throw new Error(detail);
  }

  const payload = (await response.json()) as unknown;
  const records = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { assets?: unknown }).assets)
      ? ((payload as { assets: unknown[] }).assets)
      : Array.isArray((payload as { items?: unknown }).items)
        ? ((payload as { items: unknown[] }).items)
        : [];

  return records
    .filter((entry): entry is UnknownRecord => typeof entry === "object" && entry !== null)
    .map(normalizeAsset)
    .filter((entry): entry is MediaAsset => entry !== null);
}
