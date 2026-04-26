import type { MediaAsset } from "@/lib/book/types";

interface GoogleDriveFile {
  id?: string;
  name?: string;
  mimeType?: string;
  thumbnailLink?: string;
}

interface GoogleDriveFilesResponse {
  files?: GoogleDriveFile[];
  error?: {
    message?: string;
  };
}

const GOOGLE_DRIVE_FILES_ENDPOINT = "https://www.googleapis.com/drive/v3/files";

function getMediaType(mimeType: string | undefined): MediaAsset["type"] | null {
  if (!mimeType) return null;
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return null;
}

function getMediaFileUrl(fileId: string): string {
  const url = new URL("/api/media-library/file", "http://localhost");
  url.searchParams.set("id", fileId);
  return `${url.pathname}${url.search}`;
}

function toMediaAsset(file: GoogleDriveFile): MediaAsset | null {
  if (!file.id || !file.name) return null;

  const type = getMediaType(file.mimeType);
  if (!type) return null;

  return {
    id: file.id,
    type,
    name: file.name,
    src: getMediaFileUrl(file.id),
    thumbnailSrc: file.thumbnailLink,
  };
}

export async function GET(request: Request): Promise<Response> {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Missing GOOGLE_DRIVE_API_KEY or NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folderId")?.trim();
  if (!folderId) {
    return Response.json({ error: "Missing folderId query parameter." }, { status: 400 });
  }

  const url = new URL(GOOGLE_DRIVE_FILES_ENDPOINT);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", `'${folderId.replaceAll("'", "\\'")}' in parents and trashed = false`);
  url.searchParams.set("fields", "files(id,name,mimeType,thumbnailLink)");
  url.searchParams.set("pageSize", "1000");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  const payload = (await response.json()) as GoogleDriveFilesResponse;
  if (!response.ok) {
    return Response.json(
      { error: payload.error?.message ?? `Google Drive request failed with status ${response.status}.` },
      { status: response.status },
    );
  }

  const assets = (payload.files ?? []).map(toMediaAsset).filter((asset): asset is MediaAsset => asset !== null);
  return Response.json({ assets });
}
