export interface BookPageSize {
  width: number;
  height: number;
}

export interface BookViewportSize {
  width: number;
  height: number;
}

export interface BookPageLayout {
  pageWidth: number;
  pageHeight: number;
  scale: number;
  renderWidth: number;
  renderHeight: number;
  spreadWidth: number;
}

export const BOOK_PAGE_STAGE_PADDING = {
  horizontal: 120,
  vertical: 80,
} as const;

export const BOOK_EDITOR_CHROME = {
  toolbarWidth: 68,
  desktopInspectorWidth: 340,
  filmstripHeight: 160,
  desktopBreakpoint: 1280,
} as const;

function toPositiveSize(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function getEditorComparableViewportSize(viewportSize: BookViewportSize): BookViewportSize {
  const hasDesktopInspector = viewportSize.width >= BOOK_EDITOR_CHROME.desktopBreakpoint;
  const editorSideChrome = BOOK_EDITOR_CHROME.toolbarWidth + (hasDesktopInspector ? BOOK_EDITOR_CHROME.desktopInspectorWidth : 0);

  return {
    width: Math.max(viewportSize.width - editorSideChrome, 1),
    height: Math.max(viewportSize.height - BOOK_EDITOR_CHROME.filmstripHeight, 1),
  };
}

export function getBookPageLayout(pageSize: BookPageSize, viewportSize: BookViewportSize): BookPageLayout {
  const pageWidth = toPositiveSize(pageSize.width);
  const pageHeight = toPositiveSize(pageSize.height);
  const viewportWidth = toPositiveSize(viewportSize.width);
  const viewportHeight = toPositiveSize(viewportSize.height);

  if (viewportSize.width <= 0 || viewportSize.height <= 0) {
    return {
      pageWidth,
      pageHeight,
      scale: 1,
      renderWidth: pageWidth,
      renderHeight: pageHeight,
      spreadWidth: pageWidth * 2,
    };
  }

  const availableWidth = Math.max(viewportWidth - BOOK_PAGE_STAGE_PADDING.horizontal, 1);
  const availableHeight = Math.max(viewportHeight - BOOK_PAGE_STAGE_PADDING.vertical, 1);
  const scale = Math.min(availableWidth / (pageWidth * 2), availableHeight / pageHeight, 1);
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const renderWidth = Math.max(1, Math.floor(pageWidth * safeScale));
  const renderHeight = Math.max(1, Math.floor(pageHeight * safeScale));

  return {
    pageWidth,
    pageHeight,
    scale: safeScale,
    renderWidth,
    renderHeight,
    spreadWidth: renderWidth * 2,
  };
}
