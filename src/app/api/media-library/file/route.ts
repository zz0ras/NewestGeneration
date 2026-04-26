const GOOGLE_DRIVE_FILE_ENDPOINT = "https://www.googleapis.com/drive/v3/files";

function getApiKey(): string | null {
  return process.env.GOOGLE_DRIVE_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY ?? null;
}

function copyHeader(source: Headers, target: Headers, name: string): void {
  const value = source.get(name);
  if (value) target.set(name, value);
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

  const url = new URL(`${GOOGLE_DRIVE_FILE_ENDPOINT}/${encodeURIComponent(fileId)}`);
  url.searchParams.set("alt", "media");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "*/*",
    },
  });

  if (!response.ok) {
    return Response.json({ error: `Google Drive file request failed with status ${response.status}.` }, { status: response.status });
  }

  if (!response.body) {
    return Response.json({ error: "Google Drive returned an empty file response." }, { status: 502 });
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
