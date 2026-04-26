import type { MediaAsset } from "@/lib/book/types";

const GOOGLE_DRIVE_FILE_ENDPOINT = "https://www.googleapis.com/drive/v3/files";

type ProxyableMediaType = MediaAsset["type"];

interface FetchAttempt {
  label: string;
  url: string;
}

function getApiKey(): string | null {
  return process.env.GOOGLE_DRIVE_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY ?? null;
}

function copyHeader(source: Headers, target: Headers, name: string): void {
  const value = source.get(name);
  if (value) target.set(name, value);
}

function readMediaType(value: string | null): ProxyableMediaType | null {
  if (value === "image" || value === "video" || value === "audio") return value;
  return null;
}

function getDriveApiMediaUrl(fileId: string, apiKey: string): string {
  const url = new URL(`${GOOGLE_DRIVE_FILE_ENDPOINT}/${encodeURIComponent(fileId)}`);
  url.searchParams.set("alt", "media");
  url.searchParams.set("key", apiKey);
  return url.toString();
}

function getDriveDownloadUrl(fileId: string): string {
  const url = new URL("https://drive.google.com/uc");
  url.searchParams.set("export", "download");
  url.searchParams.set("id", fileId);
  return url.toString();
}

function getPublicImageUrl(fileId: string): string {
  return `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}=s0`;
}

function getFetchAttempts(fileId: string, mediaType: ProxyableMediaType | null, apiKey: string): FetchAttempt[] {
  const attempts: FetchAttempt[] = [];

  if (mediaType === "image" || mediaType === null) {
    attempts.push({ label: "googleusercontent image", url: getPublicImageUrl(fileId) });
  }

  attempts.push({ label: "drive api media", url: getDriveApiMediaUrl(fileId, apiKey) });
  attempts.push({ label: "drive public download", url: getDriveDownloadUrl(fileId) });

  return attempts;
}

function isUsableMediaResponse(response: Response): boolean {
  if (!response.ok || !response.body) return false;

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("text/html")) return false;
  if (contentType.includes("application/json")) return false;

  return true;
}

async function readFailureMessage(response: Response, label: string): Promise<string> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("application/json")) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: unknown } } | null;
    const message = payload?.error?.message;
    if (typeof message === "string" && message.trim()) return `${label}: ${message}`;
  }

  return `${label}: status ${response.status}`;
}

export async function GET(request: Request): Promise<Response> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return Response.json({ error: "Missing GOOGLE_DRIVE_API_KEY or NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("id")?.trim();
  if (!fileId) {
    return Response.json({ error: "Missing id query parameter." }, { status: 400 });
  }

  const mediaType = readMediaType(searchParams.get("type"));
  const failures: string[] = [];

  for (const attempt of getFetchAttempts(fileId, mediaType, apiKey)) {
    const response = await fetch(attempt.url, {
      headers: {
        Accept: "*/*",
      },
      redirect: "follow",
    });

    if (!isUsableMediaResponse(response)) {
      failures.push(await readFailureMessage(response, attempt.label));
      continue;
    }

    const headers = new Headers();
    copyHeader(response.headers, headers, "content-type");
    copyHeader(response.headers, headers, "content-length");
    headers.set("cache-control", "private, max-age=300");

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  }

  return Response.json(
    {
      error: `Cannot load Google Drive file. Make sure the file is shared publicly and downloadable. ${failures.join("; ")}`,
    },
    { status: 403 },
  );
}
