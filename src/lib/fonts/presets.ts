import type { DocumentFontAsset } from "@/lib/book/types";

export const PRESET_FONT_ASSETS: DocumentFontAsset[] = [
  {
    id: "preset-be-vietnam-pro",
    family: "Be Vietnam Pro",
    sourceType: "preset",
    mimeType: "text/css",
    data: "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;700&display=swap&subset=vietnamese",
    originalFileName: "be-vietnam-pro.css",
  },
  {
    id: "preset-lora",
    family: "Lora",
    sourceType: "preset",
    mimeType: "text/css",
    data: "https://fonts.googleapis.com/css2?family=Lora:wght@400;500;700&display=swap&subset=vietnamese",
    originalFileName: "lora.css",
  },
  {
    id: "preset-montserrat",
    family: "Montserrat",
    sourceType: "preset",
    mimeType: "text/css",
    data: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700&display=swap&subset=vietnamese",
    originalFileName: "montserrat.css",
  },
  {
    id: "preset-dancing-script",
    family: "Dancing Script",
    sourceType: "preset",
    mimeType: "text/css",
    data: "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;700&display=swap&subset=vietnamese",
    originalFileName: "dancing-script.css",
  },
];

export const DEFAULT_FONT_FAMILY = PRESET_FONT_ASSETS[0].family;
