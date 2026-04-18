import { nanoid } from "nanoid";
import type { DocumentFontAsset } from "@/lib/book/types";

const SUPPORTED_FONT_MIME_TYPES = new Set([
  "font/ttf",
  "font/otf",
  "font/woff",
  "font/woff2",
  "application/font-sfnt",
  "application/font-woff",
  "application/font-woff2",
  "application/x-font-ttf",
  "application/x-font-opentype",
  "application/octet-stream",
]);

const SUPPORTED_EXTENSIONS = [".ttf", ".otf", ".woff", ".woff2"];

function hasSupportedExtension(fileName: string) {
  const lower = fileName.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function toFamilyName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Unable to read font data."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read font file."));
    reader.readAsDataURL(file);
  });
}

export async function createUploadedFontAsset(file: File): Promise<DocumentFontAsset> {
  if (!SUPPORTED_FONT_MIME_TYPES.has(file.type) && !hasSupportedExtension(file.name)) {
    throw new Error("Font file must be .ttf, .otf, .woff, or .woff2.");
  }

  const data = await readFileAsDataUrl(file);

  return {
    id: nanoid(),
    family: toFamilyName(file.name),
    sourceType: "upload",
    mimeType: file.type || "application/octet-stream",
    data,
    originalFileName: file.name,
  };
}
