"use client";

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { findSpreadAudioObject } from "@/lib/book/spread-audio";
import { useEditorStore } from "@/stores/editor-store";
import type { BookDocument, MediaFit, PageObject } from "@/lib/book/types";
import { BOOK_PAGE_STAGE_PADDING, getBookPageLayout, getEditorComparableViewportSize } from "@/components/shared/book-page-layout";

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

const FLIP_ANIMATION_MS = 800;
const FLIP_VISUAL_SETTLE_MS = 140;

type FlipVisualState = "idle" | "turning";
type TurnRole = "turning" | "facing" | "rest";
type TurnDirection = "forward" | "backward" | "none";

function extractPageIndex(eventData: number | FlipBookEventData): number {
  if (typeof eventData === "number") return eventData;
  if (typeof eventData.page === "number") return eventData.page;
  return 0;
}

function getCssObjectFit(fit: MediaFit): React.CSSProperties["objectFit"] {
  return fit === "stretch" ? "fill" : fit;
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
          objectFit: getCssObjectFit(object.fit),
          transform: `rotate(${object.rotation}deg)`,
          zIndex: object.zIndex,
        }}
      />
    );
  }

  if (object.type === "audio") {
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
          borderRadius: 20,
          background: "linear-gradient(180deg, rgba(39,29,22,0.98), rgba(24,18,14,0.96))",
          border: "1px solid rgba(196, 168, 130, 0.24)",
          boxShadow: "0 14px 30px rgba(0,0,0,0.18)",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "18px 22px",
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#c4a882",
            color: "#1a1410",
            fontSize: 20,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          ♪
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", color: "#d4bc9a", fontWeight: 700 }}>AUDIO</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 18,
              color: "#faf5ef",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {object.name ?? "Audio track"}
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: "rgba(250,245,239,0.58)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {object.src}
          </div>
        </div>
      </div>
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
          style={{ width: "100%", height: "100%", objectFit: getCssObjectFit(object.fit), opacity: 0.55 }}
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
    side: "left" | "right";
    flipState: FlipVisualState;
    turnRole: TurnRole;
  }
>(function ViewerPage({ page, pageW, pageH, renderW, renderH, fitScale, number, isHard, side, flipState, turnRole }, ref) {
  return (
    <div
      ref={ref}
      className="flip-page"
      style={{ width: renderW, height: renderH }}
      data-density={isHard ? "hard" : "soft"}
      data-side={side}
      data-flip-state={flipState}
      data-turn-role={turnRole}
    >
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const activeAudioKeyRef = useRef<string | null>(null);
  const settleTimeoutRef = useRef<number | null>(null);
  const previousPageRef = useRef(0);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [currentPage, setCurrentPage] = useState(0);
  const [readySignature, setReadySignature] = useState("");
  const [flipVisualState, setFlipVisualState] = useState<FlipVisualState>("idle");
  const [turnDirection, setTurnDirection] = useState<TurnDirection>("none");

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

  useEffect(() => {
    return () => {
      if (settleTimeoutRef.current !== null) {
        window.clearTimeout(settleTimeoutRef.current);
      }
    };
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
      const direction: TurnDirection = newPage > previousPageRef.current ? "forward" : newPage < previousPageRef.current ? "backward" : "none";

      if (settleTimeoutRef.current !== null) {
        window.clearTimeout(settleTimeoutRef.current);
      }

      setFlipVisualState("turning");
      setTurnDirection(direction);
      setCurrentPage(newPage);
      if (document.pages[newPage]) {
        selectPage(document.pages[newPage].id);
      }
      previousPageRef.current = newPage;
    },
    [document.pages, selectPage],
  );

  const isEmptyDocument = document.pages.length === 0;
  const pageLayout = getBookPageLayout(document.pageSize, getEditorComparableViewportSize(stageSize));
  const { pageWidth, pageHeight, renderWidth: renderW, renderHeight: renderH, scale: safeScale } = pageLayout;

  const spreads = useMemo(() => getSpreadLayout(document.pages.length, false), [document.pages.length]);
  const currentSpreadIndex = getSpreadIndexByPage(currentPage, spreads);
  const currentSpread = spreads[currentSpreadIndex] ?? [];
  const currentSpreadAudio = findSpreadAudioObject(document, currentSpread);
  const preloadAudioObjects = useMemo(
    () =>
      [currentSpreadIndex - 1, currentSpreadIndex, currentSpreadIndex + 1]
        .filter((index) => index >= 0 && index < spreads.length)
        .map((spreadIndex) => findSpreadAudioObject(document, spreads[spreadIndex] ?? []))
        .filter((audioObject): audioObject is NonNullable<typeof audioObject> => audioObject !== null),
    [currentSpreadIndex, document, spreads],
  );
  const preloadAudioSignature = preloadAudioObjects.map((audioObject) => `${audioObject.id}:${audioObject.src}`).join("|");
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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!currentSpreadAudio) return;

    const nextAudioKey = `${currentSpreadAudio.id}:${currentSpreadAudio.src}`;
    if (activeAudioKeyRef.current === nextAudioKey) return;

    const cachedAudio = audioCacheRef.current.get(nextAudioKey);
    audio.pause();
    if (cachedAudio) {
      audio.src = cachedAudio.src;
    } else {
      audio.src = currentSpreadAudio.src;
    }
    audio.currentTime = 0;
    activeAudioKeyRef.current = nextAudioKey;
    void audio.play().catch(() => {});
  }, [currentSpreadAudio]);

  useEffect(() => {
    const cache = audioCacheRef.current;
    const desiredKeys = new Set(preloadAudioObjects.map((audioObject) => `${audioObject.id}:${audioObject.src}`));

    for (const audioObject of preloadAudioObjects) {
      const key = `${audioObject.id}:${audioObject.src}`;
      if (cache.has(key)) continue;

      const cachedAudio = new Audio(audioObject.src);
      cachedAudio.preload = "auto";
      cachedAudio.load();
      cache.set(key, cachedAudio);
    }

    for (const [key, cachedAudio] of cache) {
      if (desiredKeys.has(key)) continue;
      cachedAudio.pause();
      cachedAudio.removeAttribute("src");
      cachedAudio.load();
      cache.delete(key);
    }
  }, [preloadAudioObjects, preloadAudioSignature]);

  useEffect(() => {
    const audio = audioRef.current;
    const audioCache = audioCacheRef.current;
    return () => {
      if (!audio) return;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      activeAudioKeyRef.current = null;

      for (const cachedAudio of audioCache.values()) {
        cachedAudio.pause();
        cachedAudio.removeAttribute("src");
        cachedAudio.load();
      }
      audioCache.clear();
    };
  }, []);

  if (isEmptyDocument) {
    return (
      <div className="flex h-full items-center justify-center" style={{ color: "#c4a882" }}>
        <div className="text-center">
          <div className="mb-4 text-5xl">📖</div>
          <p className="text-lg">Sách trống</p>
        </div>
      </div>
    );
  }

  return (
    <section className="viewer-section">
      <audio ref={audioRef} hidden preload="auto" />
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
              flippingTime={FLIP_ANIMATION_MS}
              startZIndex={10}
              autoSize
              clickEventForward
              useMouseEvents
              swipeDistance={32}
              showPageCorners
              disableFlipByClick={false}
              onFlip={handleFlip}
              onInit={(event) => {
                const initialPage = extractPageIndex(event.data);
                previousPageRef.current = initialPage;
                setCurrentPage(initialPage);
                setReadySignature(viewerSignature);
                setFlipVisualState("idle");
                setTurnDirection("none");
              }}
              onUpdate={(event) => {
                const updatedPage = extractPageIndex(event.data);
                setCurrentPage(updatedPage);
                setReadySignature(viewerSignature);
                previousPageRef.current = updatedPage;
                if (settleTimeoutRef.current !== null) {
                  window.clearTimeout(settleTimeoutRef.current);
                }
                settleTimeoutRef.current = window.setTimeout(() => {
                  setFlipVisualState("idle");
                  setTurnDirection("none");
                  settleTimeoutRef.current = null;
                }, FLIP_VISUAL_SETTLE_MS);
              }}
              className="flipbook-viewer"
            >
              {document.pages.map((page, index) => {
                const isHard = index === 0 || index === document.pages.length - 1;
                const side = index === 0 ? "right" : index === document.pages.length - 1 ? "left" : index % 2 === 0 ? "left" : "right";
                const isActiveSpreadPage = currentSpread.includes(index);
                let turnRole: TurnRole = "rest";

                if (flipVisualState === "turning" && isActiveSpreadPage) {
                  if (turnDirection === "forward") {
                    turnRole = side === "right" ? "turning" : "facing";
                  } else if (turnDirection === "backward") {
                    turnRole = side === "left" ? "turning" : "facing";
                  }
                }

                return (
                  <ViewerPage
                    key={page.id}
                    page={page}
                    pageW={pageWidth}
                    pageH={pageHeight}
                    renderW={renderW}
                    renderH={renderH}
                    fitScale={safeScale}
                    number={index + 1}
                    isHard={isHard}
                    side={side}
                    flipState={flipVisualState}
                    turnRole={turnRole}
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
  height: calc(100vh - 65px);
}

.viewer-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 100%;
  height: 100%;
  padding: ${BOOK_PAGE_STAGE_PADDING.vertical / 2}px ${BOOK_PAGE_STAGE_PADDING.horizontal / 2}px;
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

.flip-page__surface::before,
.flip-page__surface::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.flip-page__surface::before {
  z-index: 1;
}

.flip-page__surface::after {
  z-index: 2;
}

.flip-page[data-side="right"][data-density="soft"] .flip-page__surface::before {
  background:
    linear-gradient(90deg, rgba(74, 60, 48, 0.11) 0%, rgba(74, 60, 48, 0.06) 4%, rgba(74, 60, 48, 0.02) 9%, rgba(74, 60, 48, 0) 14%);
}

.flip-page[data-side="right"][data-density="soft"] .flip-page__surface::after {
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.08) 3%, rgba(255, 255, 255, 0) 8%);
}

.flip-page[data-side="left"][data-density="soft"] .flip-page__surface::before {
  background:
    linear-gradient(270deg, rgba(74, 60, 48, 0.11) 0%, rgba(74, 60, 48, 0.06) 4%, rgba(74, 60, 48, 0.02) 9%, rgba(74, 60, 48, 0) 14%);
}

.flip-page[data-side="left"][data-density="soft"] .flip-page__surface::after {
  background:
    linear-gradient(270deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.08) 3%, rgba(255, 255, 255, 0) 8%);
}

.flip-page[data-density="soft"][data-flip-state="turning"][data-turn-role="turning"][data-side="right"] .flip-page__surface::before {
  background:
    linear-gradient(90deg, rgba(74, 60, 48, 0.22) 0%, rgba(74, 60, 48, 0.14) 6%, rgba(74, 60, 48, 0.08) 12%, rgba(74, 60, 48, 0.03) 18%, rgba(74, 60, 48, 0) 24%);
}

.flip-page[data-density="soft"][data-flip-state="turning"][data-turn-role="turning"][data-side="right"] .flip-page__surface::after {
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.14) 4%, rgba(255, 255, 255, 0.04) 8%, rgba(255, 255, 255, 0) 14%);
}

.flip-page[data-density="soft"][data-flip-state="turning"][data-turn-role="turning"][data-side="left"] .flip-page__surface::before {
  background:
    linear-gradient(270deg, rgba(74, 60, 48, 0.22) 0%, rgba(74, 60, 48, 0.14) 6%, rgba(74, 60, 48, 0.08) 12%, rgba(74, 60, 48, 0.03) 18%, rgba(74, 60, 48, 0) 24%);
}

.flip-page[data-density="soft"][data-flip-state="turning"][data-turn-role="turning"][data-side="left"] .flip-page__surface::after {
  background:
    linear-gradient(270deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.14) 4%, rgba(255, 255, 255, 0.04) 8%, rgba(255, 255, 255, 0) 14%);
}

.flip-page[data-density="soft"][data-flip-state="turning"][data-turn-role="facing"][data-side="right"] .flip-page__surface::before {
  background:
    linear-gradient(90deg, rgba(74, 60, 48, 0.16) 0%, rgba(74, 60, 48, 0.09) 5%, rgba(74, 60, 48, 0.04) 10%, rgba(74, 60, 48, 0) 16%);
}

.flip-page[data-density="soft"][data-flip-state="turning"][data-turn-role="facing"][data-side="right"] .flip-page__surface::after {
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 3%, rgba(255, 255, 255, 0) 9%);
}

.flip-page[data-density="soft"][data-flip-state="turning"][data-turn-role="facing"][data-side="left"] .flip-page__surface::before {
  background:
    linear-gradient(270deg, rgba(74, 60, 48, 0.16) 0%, rgba(74, 60, 48, 0.09) 5%, rgba(74, 60, 48, 0.04) 10%, rgba(74, 60, 48, 0) 16%);
}

.flip-page[data-density="soft"][data-flip-state="turning"][data-turn-role="facing"][data-side="left"] .flip-page__surface::after {
  background:
    linear-gradient(270deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 3%, rgba(255, 255, 255, 0) 9%);
}

.flip-page[data-density="hard"] .flip-page__surface::before,
.flip-page[data-density="hard"] .flip-page__surface::after {
  opacity: 0.2;
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

  .viewer-nav--prev {
    left: 8px;
  }

  .viewer-nav--next {
    right: 8px;
  }
}
`;
