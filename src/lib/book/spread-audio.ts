import type { AudioObject, BookDocument } from "./types";

export function getSpreadPageIndexes(pageCount: number, pageIndex: number): number[] {
  if (pageCount <= 0 || pageIndex < 0 || pageIndex >= pageCount) return [];
  if (pageIndex === 0) return [0];
  if (pageIndex === pageCount - 1 && pageCount % 2 === 0) return [pageIndex];

  let startIndex = pageIndex % 2 !== 0 ? pageIndex : pageIndex - 1;
  if (startIndex < 1) startIndex = 1;

  const indexes = [startIndex];
  if (startIndex + 1 < pageCount) {
    indexes.push(startIndex + 1);
  }
  return indexes;
}

export function findSpreadAudioObject(document: BookDocument, pageIndexes: number[], ignoreObjectId?: string): AudioObject | null {
  for (const pageIndex of pageIndexes) {
    const page = document.pages[pageIndex];
    if (!page) continue;

    const audioObject = page.objects.find(
      (object): object is AudioObject => object.type === "audio" && object.id !== ignoreObjectId,
    );
    if (audioObject) return audioObject;
  }

  return null;
}

export function hasSpreadAudioConflict(
  document: BookDocument,
  pageId: string,
  ignoreObjectId?: string,
): boolean {
  const pageIndex = document.pages.findIndex((page) => page.id === pageId);
  if (pageIndex === -1) return false;

  const spreadIndexes = getSpreadPageIndexes(document.pages.length, pageIndex);
  return findSpreadAudioObject(document, spreadIndexes, ignoreObjectId) !== null;
}
