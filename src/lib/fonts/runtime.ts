import { useEffect } from "react";
import type { DocumentFontAsset } from "@/lib/book/types";
import { PRESET_FONT_ASSETS } from "@/lib/fonts/presets";

const registeredFontIds = new Set<string>();

function ensurePresetStylesheet(font: DocumentFontAsset) {
  const elementId = `preset-font-${font.id}`;
  if (document.getElementById(elementId)) return;

  const link = document.createElement("link");
  link.id = elementId;
  link.rel = "stylesheet";
  link.href = font.data;
  document.head.appendChild(link);
}

async function ensureUploadedFont(font: DocumentFontAsset) {
  if (registeredFontIds.has(font.id)) return;
  const face = new FontFace(font.family, `url(${font.data})`);
  await face.load();
  document.fonts.add(face);
  registeredFontIds.add(font.id);
}

export async function registerDocumentFonts(fontAssets: DocumentFontAsset[]) {
  const combined = [...PRESET_FONT_ASSETS, ...fontAssets];
  for (const font of combined) {
    if (font.sourceType === "preset") ensurePresetStylesheet(font);
    else await ensureUploadedFont(font);
  }
}

export function useDocumentFonts(fontAssets: DocumentFontAsset[]) {
  useEffect(() => {
    void registerDocumentFonts(fontAssets);
  }, [fontAssets]);
}
