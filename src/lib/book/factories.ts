import { nanoid } from "nanoid";
import { BookPage, PageObject } from "./types";

export function createTextObject(overrides?: Partial<PageObject>): PageObject {
  return {
    id: nanoid(),
    type: "text",
    x: 50,
    y: 50,
    width: 200,
    height: 50,
    rotation: 0,
    zIndex: 1,
    text: "Add some text here...",
    fontSize: 24,
    fontFamily: "Inter",
    fill: "#ffffff",
    ...overrides,
  };
}

export function createShapeObject(overrides?: Partial<PageObject>): PageObject {
  return {
    id: nanoid(),
    type: "shape",
    x: 100,
    y: 100,
    width: 100,
    height: 100,
    rotation: 0,
    zIndex: 1,
    shapeType: "rect",
    fill: "#6b4cff", // Premium Accent
    ...overrides,
  };
}

export function createImageObject(overrides?: Partial<PageObject>): PageObject {
  return {
    id: nanoid(),
    type: "image",
    x: 50,
    y: 50,
    width: 300,
    height: 200,
    rotation: 0,
    zIndex: 1,
    src: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=600&auto=format&fit=crop",
    ...overrides,
  };
}

export function createVideoObject(overrides?: Partial<PageObject>): PageObject {
  return {
    id: nanoid(),
    type: "video",
    x: 50,
    y: 50,
    width: 400,
    height: 225,
    rotation: 0,
    zIndex: 1,
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    ...overrides,
  };
}

export function createEmptyPage(index: number, width: number, height: number): BookPage {
  return {
    id: nanoid(),
    name: `Page ${index + 1}`,
    objects: [],
  };
}

export function clonePage(page: BookPage): BookPage {
  return {
    ...page,
    id: nanoid(),
    name: `${page.name} (Copy)`,
    objects: page.objects.map((obj) => ({ ...obj, id: nanoid() })),
  };
}

export function normalizePageOrder(pages: BookPage[]): BookPage[] {
  return pages.map((page, idx) => ({
    ...page,
    side: idx % 2 === 0 ? "right" : "left",
  }));
}
