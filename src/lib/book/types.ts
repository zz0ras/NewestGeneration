export type ObjectTemplateType = "text" | "image" | "shape" | "video" | "audio";
export type TextAlign = "left" | "center" | "right";
export type MediaFit = "cover" | "contain" | "stretch";
export type FontSourceType = "preset" | "upload";

interface BasePageObject {
  id: string;
  type: ObjectTemplateType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

export interface TextObject extends BasePageObject {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  align: TextAlign;
  lineHeight: number;
}

export interface ShapeObject extends BasePageObject {
  type: "shape";
  shapeType: "rect";
  fill: string;
  cornerRadius?: number;
}

interface BaseMediaObject extends BasePageObject {
  src: string;
  fit: MediaFit;
  name?: string;
  thumbnailSrc?: string;
}

export interface ImageObject extends BaseMediaObject {
  type: "image";
}

export interface VideoObject extends BaseMediaObject {
  type: "video";
}

export interface AudioObject extends BasePageObject {
  type: "audio";
  src: string;
  name?: string;
  thumbnailSrc?: string;
}

export type PageObject = TextObject | ShapeObject | ImageObject | VideoObject | AudioObject;

export interface BookPage {
  id: string;
  name?: string;
  side?: "left" | "right";
  objects: PageObject[];
  thumbnail?: string;
  themeId?: string;
}

export interface MediaFolderSource {
  id: string;
  name: string;
  shareUrl: string;
  folderId: string;
}

export interface MediaAsset {
  id: string;
  type: "image" | "video" | "audio";
  name: string;
  src: string;
  thumbnailSrc?: string;
}

export interface DocumentFontAsset {
  id: string;
  family: string;
  sourceType: FontSourceType;
  mimeType: string;
  data: string;
  originalFileName: string;
}

export interface BookDocument {
  id: string;
  title: string;
  description?: string;
  pageSize: {
    width: number;
    height: number;
  };
  pages: BookPage[];
  updatedAt: string;
  mediaFolders: MediaFolderSource[];
  activeMediaFolderId: string | null;
  fontAssets: DocumentFontAsset[];
}

export type BookViewMode = "design" | "preview";
