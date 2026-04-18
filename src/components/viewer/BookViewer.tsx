"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import type { BookDocument, PageObject } from "@/lib/book/types";

interface FlipBookHandle {
  pageFlip: () => {
    getPageCount?: () => number;
    turnToPrevPage?: () => void;
    turnToNextPage?: () => void;
    turnToPage: (page: number) => void;
    getCurrentPageIndex: () => number;
  };
}

interface FlipBookEventData {
  page?: number;
}

interface FlipBookEvent {
  data: number | FlipBookEventData;
}

interface FlipBookProps {
  width: number;
  height: number;
  size: "fixed";
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  showCover: boolean;
  maxShadowOpacity: number;
  mobileScrollSupport: boolean;
  drawShadow: boolean;
  usePortrait: boolean;
  startPage: number;
  style: React.CSSProperties;
  flippingTime: number;
  startZIndex: number;
  autoSize: boolean;
  clickEventForward: boolean;
  useMouseEvents: boolean;
  swipeDistance: number;
  showPageCorners: boolean;
  disableFlipByClick: boolean;
  onFlip: (event: FlipBookEvent) => void;
  onInit: (event: FlipBookEvent) => void;
  onUpdate: (event: FlipBookEvent) => void;
  className: string;
  children: React.ReactNode;
}

const FlipBookComponent = HTMLFlipBook as unknown as React.ForwardRefExoticComponent<
  FlipBookProps & React.RefAttributes<FlipBookHandle>
>;

function extractPageIndex(eventData: number | FlipBookEventData): number {
  if (typeof eventData === "number") return eventData;
  if (typeof eventData.page === "number") return eventData.page;
  return 0;
}

function renderViewerObject(object: PageObject) {
  if (object.type === "shape") {
    return (
      <div
        key={object.id}
        style={{
          position: "absolute",
          left: object.x,
          top: object.y,
          width: object.width,
          height: object.height,
          background: object.fill,
          transform: `rotate(${object.rotation}deg)`,
          borderRadius: object.cornerRadius ?? 0,
          zIndex: object.zIndex,
        }}
      />
    );
  }

  if (object.type === "text") {
    return (
      <div
        key={object.id}
        style={{
          position: "absolute",
          left: object.x,
          top: object.y,
          width: object.width,
          height: object.height,
          color: object.fill,
          fontSize: object.fontSize,
          fontFamily: `${object.fontFamily}, sans-serif`,
          fontWeight: object.fontWeight,
          fontStyle: object.fontStyle,
          lineHeight: object.lineHeight,
          textAlign: object.align,
          transform: `rotate(${object.rotation}deg)`,
          whiteSpace: "pre-wrap",
          zIndex: object.zIndex,
        }}
      >
        {object.text}
      </div>
    );
  }

  if (object.type === "image") {
    return (
      <img
        key={object.id}
        src={object.src}
        alt=""
        style={{
          position: "absolute",
          left: object.x,
          top: object.y,
          width: object.width,
          height: object.height,
          objectFit: object.fit,
          transform: `rotate(${object.rotation}deg)`,
          zIndex: object.zIndex,
        }}
      />
    );
  }

  return (
    <div
      key={object.id}
      style={{
        position: "absolute",
        left: object.x,
        top: object.y,
        width: object.width,
        height: object.height,
        transform: `rotate(${object.rotation}deg)`,
        zIndex: object.zIndex,
        borderRadius: 18,
        background: "linear-gradient(180deg, rgba(43,33,25,0.96), rgba(24,16,12,0.94))",
        border: "1px solid rgba(196, 168, 130, 0.24)",
        overflow: "hidden",
      }}
    >
      {object.thumbnailSrc ? (
        <img
          src={object.thumbnailSrc}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: object.fit, opacity: 0.55 }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "16px 18px",
          color: "#faf5ef",
          background: "linear-gradient(180deg, rgba(18,12,9,0.12), rgba(18,12,9,0.44))",
        }}
      >
        <span style={{ fontSize: 11, letterSpacing: "0.18em", color: "#d4bc9a", fontWeight: 700 }}>VIDEO</span>
        <span style={{ fontSize: 18, fontWeight: 500, textAlign: "center" }}>{object.name ?? "Video"}</span>
      </div>
    </div>
  );
}

const ViewerPage = forwardRef<
  HTMLDivElement,
  {
    page: BookDocument["pages"][number];
    pageW: number;
    pageH: number;
    renderW: number;
    renderH: number;
    fitScale: number;
    number: number;
    isHard: boolean;
  }
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
          {[...page.objects]
            .sort((left, right) => left.zIndex - right.zIndex)
            .map((object) => renderViewerObject(object))}

          <div
            style={{
              position: "absolute",
              bottom: 20,
              left: 0,
              right: 0,
              textAlign: "center",
              fontSize: 11,
              fontFamily: "Inter, sans-serif",
              color: "#a0845e",
              letterSpacing: "0.05em",
              zIndex: 100,
            }}
          >
            {number}
          </div>
        </div>
      </div>
    </div>
  );
});

function getSpreadLayout(pageCount: number, portrait: boolean, showCover = true): number[][] {
  if (pageCount <= 0) return [];
  if (portrait) return Array.from({ length: pageCount }, (_, index) => [index]);

  const spreads: number[][] = [];
  let start = 0;

  if (showCover) {
    spreads.push([0]);
    start = 1;
  }

  for (let index = start; index < pageCount; index += 2) {
    if (index < pageCount - 1) spreads.push([index, index + 1]);
    else spreads.push([index]);
  }

  return spreads;
}

function getSpreadIndexByPage(pageIndex: number, spreads: number[][]): number {
  const index = spreads.findIndex((spread) => spread.includes(pageIndex));
  return index >= 0 ? index : 0;
}

export function BookViewer({ document }: { document: BookDocument }) {
  const selectedPageId = useEditorStore((state) => state.selectedPageId);
  const selectPage = useEditorStore((state) => state.selectPage);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<FlipBookHandle | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [currentPage, setCurrentPage] = useState(0);
  const [readySignature, setReadySignature] = useState("");

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;

    const updateSize = () => {
      const width = Math.floor(node.clientWidth);
      const height = Math.floor(node.clientHeight);
      setStageSize((current) => (current.width === width && current.height === height ? current : { width, height }));
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const selectedPageIndex = document.pages.findIndex((page) => page.id === selectedPageId);
  useEffect(() => {
    if (selectedPageIndex < 0) return;
    const api = bookRef.current?.pageFlip();
    if (!api) return;

    try {
      const currentIndex = api.getCurrentPageIndex();
      if (Math.abs(currentIndex - selectedPageIndex) >= 1) {
        api.turnToPage(selectedPageIndex);
      }
    } catch {
      return;
    }
  }, [selectedPageIndex]);

  const handleFlip = useCallback(
    (event: FlipBookEvent) => {
      const newPage = extractPageIndex(event.data);
      setCurrentPage(newPage);
      if (document.pages[newPage]) {
        selectPage(document.pages[newPage].id);
      }
    },
    [document.pages, selectPage],
  );

  if (!document.pages.length) {
    return (
      <div className="flex h-full items-center justify-center" style={{ color: "#c4a882" }}>
        <div className="text-center">
          <div className="mb-4 text-5xl">📖</div>
          <p className="text-lg">Sách trống</p>
        </div>
      </div>
    );
  }

  const stageWidth = Math.max(stageSize.width, 1);
  const stageHeight = Math.max(stageSize.height, 1);
  const availablePerPage = stageWidth / 2;
  const fitScale = Math.min(availablePerPage / document.pageSize.width, stageHeight / document.pageSize.height);
  const safeScale = Number.isFinite(fitScale) && fitScale > 0 ? fitScale : 0.1;
  const renderW = Math.max(1, Math.floor(document.pageSize.width * safeScale));
  const renderH = Math.max(1, Math.floor(document.pageSize.height * safeScale));

  const spreads = getSpreadLayout(document.pages.length, false);
  const currentSpreadIndex = getSpreadIndexByPage(currentPage, spreads);
  const viewerSignature = `${document.pages.length}:${renderW}:${renderH}`;
  const hasStage = stageSize.width > 0 && stageSize.height > 0 && document.pages.length > 0;
  const isReady = readySignature === viewerSignature;
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
  if (isFrontCover) translateX = -(renderW / 2);
  else if (isBackCover) translateX = renderW / 2;

  return (
    <section className="viewer-section">
      <div className="viewer-shell">
        <button type="button" className="viewer-nav viewer-nav--prev" onClick={handlePrev} disabled={!canPrev} aria-label="Trang trước">
          <ChevronLeft size={24} />
        </button>

        <div
          className="viewer-stage"
          ref={stageRef}
          style={{ transform: `translateX(${translateX}px)`, transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}
        >
          {hasStage ? (
            <FlipBookComponent
              ref={bookRef}
              width={renderW}
              height={renderH}
              size="fixed"
              minWidth={renderW}
              maxWidth={renderW}
              minHeight={renderH}
              maxHeight={renderH}
              showCover
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
              onInit={(event) => {
                setCurrentPage(extractPageIndex(event.data));
                setReadySignature(viewerSignature);
              }}
              onUpdate={(event) => {
                setCurrentPage(extractPageIndex(event.data));
                setReadySignature(viewerSignature);
              }}
              className="flipbook-viewer"
            >
              {document.pages.map((page, index) => {
                const isHard = index === 0 || index === document.pages.length - 1;
                return (
                  <ViewerPage
                    key={page.id}
                    page={page}
                    pageW={document.pageSize.width}
                    pageH={document.pageSize.height}
                    renderW={renderW}
                    renderH={renderH}
                    fitScale={safeScale}
                    number={index + 1}
                    isHard={isHard}
                  />
                );
              })}
            </FlipBookComponent>
          ) : null}
        </div>

        <button type="button" className="viewer-nav viewer-nav--next" onClick={handleNext} disabled={!canNext} aria-label="Trang sau">
          <ChevronRight size={24} />
        </button>
      </div>

      <div className="viewer-indicator">
        Trang {currentPage + 1}-{Math.min(currentPage + 2, document.pages.length)} / {document.pages.length}
      </div>

      <style>{viewerStyles}</style>
    </section>
  );
}

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
