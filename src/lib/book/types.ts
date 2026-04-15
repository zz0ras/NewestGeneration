export type ObjectTemplateType = "text" | "image" | "shape" | "video";

export interface PageObject {
  id: string;
  type: ObjectTemplateType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  // Dynamic payload based on type
  [key: string]: any;
}

export interface BookPage {
  id: string;
  name?: string;
  side?: "left" | "right";
  objects: PageObject[];
  thumbnail?: string;
  themeId?: string; // New feature: Theme tracking
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
}

export type BookViewMode = "design" | "preview";
