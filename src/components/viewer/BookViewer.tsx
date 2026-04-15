"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { useEditorStore } from "@/stores/editor-store";
import { BookDocument } from "@/lib/book/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  FlipBook handle type (react-pageflip's internal API)               */
/* ------------------------------------------------------------------ */
interface FlipBookHandle {
  pageFlip: () => {
    getPageCount?: () => number;
    flipNext: () => void;
    flipPrev: () => void;
    turnToNextPage: () => void;
    turnToPrevPage: () => void;
    turnToPage: (page: number) => void;
    getCurrentPageIndex: () => number;
  };
}

/* ------------------------------------------------------------------ */
/*  Spread helpers                                                     */
/* ------------------------------------------------------------------ */
function getSpreadLayout(pageCount: number, portrait: boolean, showCover: boolean = true): number[][] {
  if (pageCount <= 0) return [];
  if (portrait) return Array.from({ length: pageCount }, (_, i) => [i]);

  const spreads: number[][] = [];
  let start = 0;

  if (showCover) {
    spreads.push([0]);
    start = 1;
  }

  for (let i = start; i < pageCount; i += 2) {
    if (i < pageCount - 1) {
      spreads.push([i, i + 1]);
    } else {
      spreads.push([i]);
    }
  }
  return spreads;
}

function getSpreadIndexByPage(pageIndex: number, spreads: number[][]): number {
  const idx = spreads.findIndex((s) => s.includes(pageIndex));
  return idx >= 0 ? idx : 0;
}

/* ------------------------------------------------------------------ */
/*  ViewerPage – single page rendered inside HTMLFlipBook               */
/* ------------------------------------------------------------------ */
const ViewerPage = forwardRef<
  HTMLDivElement,
  { page: any; pageW: number; pageH: number; renderW: number; renderH: number; fitScale: number; number: number; isHard: boolean }
>(function ViewerPage({ page, pageW, pageH, renderW, renderH, fitScale, number, isHard }, ref) {
  return (
    <div ref={ref} className="flip-page" style={{ width: renderW, height: renderH }} data-density={isHard ? "hard" : "soft"}>
      <div className="flip-page__viewport" style={{ width: renderW, height: renderH }}>
        <div
          className="flip-page__surface"
          style={{
            width: pageW,
            height: pageH,
            background: "#fbf8f3",
            transform: `scale(${fitScale})`,
            transformOrigin: "top left",
            position: "relative",
          }}
        >
          {page.objects.map((obj: any) => {
            if (obj.type === "shape") {
              return (
                <div key={obj.id} style={{
                  position: "absolute", left: obj.x, top: obj.y,
                  width: obj.width, height: obj.height,
                  background: obj.fill,
                  transform: `rotate(${obj.rotation}deg)`,
                  borderRadius: obj.cornerRadius || 0,
                  zIndex: obj.zIndex,
                }} />
              );
            }
            if (obj.type === "text") {
              return (
                <div key={obj.id} style={{
                  position: "absolute", left: obj.x, top: obj.y,
                  width: obj.width, height: obj.height,
                  color: obj.fill || "#5c4a36",
                  fontSize: obj.fontSize,
                  fontFamily: obj.fontFamily || "Inter, sans-serif",
                  fontWeight: (obj.fontWeight || obj.fontStyle === "bold") ? "bold" : "normal",
                  fontStyle: obj.fontStyle === "italic" ? "italic" : "normal",
                  lineHeight: obj.lineHeight || 1.5,
                  transform: `rotate(${obj.rotation}deg)`,
                  whiteSpace: "pre-wrap",
                  zIndex: obj.zIndex,
                }}>
                  {obj.text}
                </div>
              );
            }
            if (obj.type === "image") {
              return (
                <img key={obj.id} src={obj.src} alt=""
                  style={{
                    position: "absolute", left: obj.x, top: obj.y,
                    width: obj.width, height: obj.height,
                    objectFit: "cover",
                    transform: `rotate(${obj.rotation}deg)`,
                    zIndex: obj.zIndex,
                  }} />
              );
            }
            return null;
          })}

          {/* Page number */}
          <div style={{
            position: "absolute", bottom: 20, left: 0, right: 0,
            textAlign: "center", fontSize: 11,
            fontFamily: "Inter, sans-serif",
            color: "#a0845e", letterSpacing: "0.05em",
            zIndex: 100,
          }}>
            {number}
          </div>
        </div>
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  BookViewer – main component                                         */
/* ------------------------------------------------------------------ */
export function BookViewer({ document }: { document: BookDocument }) {
  const selectedPageId = useEditorStore((state) => state.selectedPageId);
  const selectPage = useEditorStore((state) => state.selectPage);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<FlipBookHandle | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [currentPage, setCurrentPage] = useState(0);
  const [readySignature, setReadySignature] = useState("");

  // Safely extract page index from react-pageflip event
  const extractPageIndex = (eventData: any): number => {
    if (typeof eventData === "number") return eventData;
    if (eventData && typeof eventData === "object" && "page" in eventData) return Number(eventData.page) || 0;
    return Number(eventData) || 0;
  };

  // Measure container
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;

    const updateSize = () => {
      const w = Math.floor(node.clientWidth);
      const h = Math.floor(node.clientHeight);
      setStageSize((cur) => (cur.width === w && cur.height === h ? cur : { width: w, height: h }));
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Sync from editor: when selectedPageId changes, flip to that spread
  const selectedPageIndex = document.pages.findIndex((p) => p.id === selectedPageId);
  useEffect(() => {
    if (selectedPageIndex < 0) return;
    const api = bookRef.current?.pageFlip();
    if (!api) return;
    try {
      const curIdx = api.getCurrentPageIndex();
      // Only flip if we're on a different spread
      if (Math.abs(curIdx - selectedPageIndex) >= 1) {
        api.turnToPage(selectedPageIndex);
      }
    } catch {
      // pageFlip not ready yet
    }
  }, [selectedPageIndex]);

  // Sync back to editor: when user flips in preview, update selectedPageId
  const handleFlip = useCallback((event: any) => {
    const newPage = extractPageIndex(event.data);
    setCurrentPage(newPage);
    if (document.pages[newPage]) {
      selectPage(document.pages[newPage].id);
    }
  }, [document.pages, selectPage]);

  if (!document.pages.length) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: '#c4a882' }}>
        <div className="text-center">
          <div className="text-5xl mb-4">📖</div>
          <p className="text-lg">Sách trống</p>
        </div>
      </div>
    );
  }

  const stageWidth = Math.max(stageSize.width, 1);
  const stageHeight = Math.max(stageSize.height, 1);
  const spreadCount = 2; // always show 2-page spread
  const availablePerPage = stageWidth / spreadCount;
  const fitScale = Math.min(
    availablePerPage / document.pageSize.width,
    stageHeight / document.pageSize.height,
  );
  const safeScale = Number.isFinite(fitScale) && fitScale > 0 ? fitScale : 0.1;
  const renderW = Math.max(1, Math.floor(document.pageSize.width * safeScale));
  const renderH = Math.max(1, Math.floor(document.pageSize.height * safeScale));

  const spreads = getSpreadLayout(document.pages.length, false);
  const currentSpreadIndex = getSpreadIndexByPage(currentPage, spreads);
  const viewerSig = `${document.pages.length}:${renderW}:${renderH}`;
  const hasStage = stageSize.width > 0 && stageSize.height > 0 && document.pages.length > 0;
  const isReady = readySignature === viewerSig;
  const canPrev = isReady && currentSpreadIndex > 0;
  const canNext = isReady && currentSpreadIndex < spreads.length - 1;

  const handlePrev = () => {
    if (!canPrev) return;
    const api = bookRef.current?.pageFlip();
    if (!api || api.getPageCount?.() === 0) return;
    api.turnToPrevPage?.();
  };

  const handleNext = () => {
    if (!canNext) return;
    const api = bookRef.current?.pageFlip();
    if (!api || api.getPageCount?.() === 0) return;
    api.turnToNextPage?.();
  };

  const isFrontCover = currentPage === 0;
  const isBackCover = currentPage === document.pages.length - 1 && document.pages.length % 2 === 0 && currentPage !== 0;

  let translateX = 0;
  if (isFrontCover) {
    translateX = -(renderW / 2);
  } else if (isBackCover) {
    translateX = renderW / 2;
  }

  return (
    <section className="viewer-section">
      <div className="viewer-shell">
        {/* Prev button */}
        <button
          type="button"
          className="viewer-nav viewer-nav--prev"
          onClick={handlePrev}
          disabled={!canPrev}
          aria-label="Trang trước"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Flipbook stage */}
        <div 
          className="viewer-stage" 
          ref={stageRef}
          style={{ transform: `translateX(${translateX}px)`, transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          {hasStage ? (
            // @ts-ignore react-pageflip types
            <HTMLFlipBook
              ref={bookRef}
              width={renderW}
              height={renderH}
              size="fixed"
              minWidth={renderW}
              maxWidth={renderW}
              minHeight={renderH}
              maxHeight={renderH}
              showCover={true}
              maxShadowOpacity={0.35}
              mobileScrollSupport
              drawShadow
              usePortrait={false}
              startPage={selectedPageIndex >= 0 ? selectedPageIndex : 0}
              style={{}}
              flippingTime={800}
              startZIndex={10}
              autoSize
              clickEventForward
              useMouseEvents
              swipeDistance={32}
              showPageCorners
              disableFlipByClick={false}
              onFlip={handleFlip}
              onInit={(event: any) => {
                setCurrentPage(extractPageIndex(event.data));
                setReadySignature(viewerSig);
              }}
              onUpdate={(event: any) => {
                setCurrentPage(extractPageIndex(event.data));
                setReadySignature(viewerSig);
              }}
              className="flipbook-viewer"
            >
              {document.pages.map((page, i) => {
                const isHard = i === 0 || i === document.pages.length - 1;
                return (
                  <ViewerPage
                    key={page.id}
                    page={page}
                    pageW={document.pageSize.width}
                    pageH={document.pageSize.height}
                    renderW={renderW}
                    renderH={renderH}
                    fitScale={safeScale}
                    number={i + 1}
                    isHard={isHard}
                  />
                )
              })}
            </HTMLFlipBook>
          ) : null}
        </div>

        {/* Next button */}
        <button
          type="button"
          className="viewer-nav viewer-nav--next"
          onClick={handleNext}
          disabled={!canNext}
          aria-label="Trang sau"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Spread indicator */}
      <div className="viewer-indicator">
        Trang {currentPage + 1}–{Math.min(currentPage + 2, document.pages.length)} / {document.pages.length}
      </div>

      <style>{viewerStyles}</style>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Scoped CSS (warm pastel brown theme)                               */
/* ------------------------------------------------------------------ */
const viewerStyles = `
.viewer-section {
  position: relative;
  width: 100%;
  height: calc(100vh - 65px);
  overflow: hidden;
  background:
    radial-gradient(circle at center, rgba(92,74,54,0.10), transparent 40%),
    linear-gradient(180deg, #1e1914 0%, #1a1410 100%);
}

.viewer-shell {
  position: relative;
  width: 100%;
  height: calc(100vh - 65px - 48px);
}

.viewer-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 100%;
  height: 100%;
  padding: 24px;
  overflow: hidden;
}

.viewer-nav {
  position: absolute;
  top: 50%;
  z-index: 1000;
  width: 48px;
  height: 48px;
  border: 1px solid rgba(196, 168, 130, 0.15);
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #c4a882;
  background: rgba(30, 25, 20, 0.7);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  transform: translateY(-50%);
  backdrop-filter: blur(10px);
  cursor: pointer;
  transition: all 0.2s;
}

.viewer-nav:hover:not(:disabled) {
  background: rgba(40, 32, 24, 0.9);
  border-color: rgba(196, 168, 130, 0.3);
  color: #e8ddd0;
}

.viewer-nav:disabled {
  cursor: default;
  opacity: 0.2;
}

.viewer-nav--prev {
  left: 24px;
}

.viewer-nav--next {
  right: 24px;
}

.flipbook-viewer {
  filter: drop-shadow(0 24px 60px rgba(92, 74, 54, 0.35));
}

.flip-page {
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  background: #fbf8f3;
}

.flip-page__viewport {
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.flip-page__surface {
  position: relative;
  box-shadow:
    inset 0 0 0 1px rgba(92, 74, 54, 0.06),
    0 12px 24px rgba(92, 74, 54, 0.06);
}

.viewer-indicator {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  font-size: 12px;
  font-weight: 500;
  padding: 6px 20px;
  border-radius: 999px;
  background: rgba(30, 25, 20, 0.75);
  border: 1px solid rgba(196, 168, 130, 0.12);
  color: #c4a882;
  backdrop-filter: blur(8px);
  letter-spacing: 0.02em;
}

@media (max-width: 960px) {
  .viewer-section,
  .viewer-shell {
    height: calc(100vh - 65px);
  }

  .viewer-stage {
    padding: 12px;
  }

  .viewer-nav--prev {
    left: 8px;
  }

  .viewer-nav--next {
    right: 8px;
  }
}
`;
