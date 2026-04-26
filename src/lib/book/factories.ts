import { nanoid } from "nanoid";
import type { AudioObject, BookPage, ImageObject, MediaFolderSource, PageObject, ShapeObject, TextObject, VideoObject } from "./types";
import { DEFAULT_FONT_FAMILY } from "@/lib/fonts/presets";

export function createTextObject(overrides?: Partial<TextObject>): TextObject {
  return {
    id: nanoid(),
    type: "text",
    x: 50,
    y: 50,
    width: 220,
    height: 60,
    rotation: 0,
    zIndex: 1,
    text: "Thêm nội dung tại đây...",
    fontSize: 24,
    fontFamily: DEFAULT_FONT_FAMILY,
    fill: "#5c4a36",
    fontWeight: "normal",
    fontStyle: "normal",
    align: "left",
    lineHeight: 1.5,
    ...overrides,
  };
}

export function createShapeObject(overrides?: Partial<ShapeObject>): ShapeObject {
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
    fill: "#c4a882",
    ...overrides,
  };
}

export function createImageObject(overrides?: Partial<ImageObject>): ImageObject {
  return {
    id: nanoid(),
    type: "image",
    x: 50,
    y: 50,
    width: 300,
    height: 200,
    rotation: 0,
    zIndex: 1,
    fit: "contain",
    name: "Ảnh mới",
    src: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=600&auto=format&fit=crop",
    ...overrides,
  };
}

export function createVideoObject(overrides?: Partial<VideoObject>): VideoObject {
  return {
    id: nanoid(),
    type: "video",
    x: 50,
    y: 50,
    width: 400,
    height: 225,
    rotation: 0,
    zIndex: 1,
    fit: "contain",
    name: "Video mới",
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnailSrc: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop",
    ...overrides,
  };
}

export function createAudioObject(overrides?: Partial<AudioObject>): AudioObject {
  return {
    id: nanoid(),
    type: "audio",
    x: 60,
    y: 80,
    width: 300,
    height: 96,
    rotation: 0,
    zIndex: 1,
    name: "Audio moi",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    ...overrides,
  };
}

export function createEmptyPage(index: number): BookPage {
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
    objects: page.objects.map((object) => ({ ...object, id: nanoid() }) as PageObject),
  };
}

export function createMediaFolderSource(input: Omit<MediaFolderSource, "id">): MediaFolderSource {
  return {
    id: nanoid(),
    ...input,
  };
}

export function normalizePageOrder(pages: BookPage[]): BookPage[] {
  return pages.map((page, index) => ({
    ...page,
    side: index % 2 === 0 ? "right" : "left",
  }));
}
