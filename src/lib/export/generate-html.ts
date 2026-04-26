import type { BookDocument, PageObject, MediaFit, DocumentFontAsset } from "@/lib/book/types";
import { PRESET_FONT_ASSETS } from "@/lib/fonts/presets";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ExportOptions {
  /** Filename slug (used only for the download filename). */
  slug: string;
}

/**
 * Generate a fully self-contained HTML string that renders the given
 * BookDocument as an interactive flipbook (using the page-flip CDN library).
 */
export function generateStandaloneHtml(
  document: BookDocument,
  options: ExportOptions,
): string {
  const { slug } = options;
  const title = document.title || slug || "Flipbook";
  const pageW = document.pageSize.width;
  const pageH = document.pageSize.height;

  const fontLinks = buildFontLinks(document.fontAssets);
  const pagesHtml = document.pages
    .map((page, index) => buildPageHtml(page.objects, index, pageW, pageH, document.pages.length))
    .join("\n");

  // Spread-audio data: for each page index record audio src if present
  const audioMap: Record<number, string> = {};
  document.pages.forEach((page, index) => {
    const audioObj = page.objects.find((o) => o.type === "audio");
    if (audioObj && audioObj.type === "audio") {
      audioMap[index] = audioObj.src;
    }
  });

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(document.description ?? title)}">
${fontLinks}
<script src="https://cdn.jsdelivr.net/npm/page-flip@2.0.7/dist/js/page-flip.browser.js"><\/script>
<style>
${CSS_CONTENT()}
</style>
</head>
<body>
<div class="viewer-section">
  <audio id="spread-audio" hidden preload="auto"></audio>
  <div class="viewer-shell">
    <button type="button" class="viewer-nav viewer-nav--prev" id="btn-prev" aria-label="Previous page">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
    </button>

    <div class="viewer-stage" id="viewer-stage">
      <div id="flipbook" class="flipbook-viewer">
${pagesHtml}
      </div>
    </div>

    <button type="button" class="viewer-nav viewer-nav--next" id="btn-next" aria-label="Next page">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
  </div>

  <div class="viewer-indicator" id="viewer-indicator"></div>
</div>

<script>
${JS_CONTENT(pageW, pageH, document.pages.length, audioMap)}
<\/script>
</body>
</html>`;
}

/**
 * Trigger a browser download of the generated HTML file.
 */
export function downloadHtmlFile(html: string, filename: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".html") ? filename : `${filename}.html`;
  window.document.body.appendChild(anchor);
  anchor.click();
  window.document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Helpers — Font links
// ---------------------------------------------------------------------------

function buildFontLinks(documentFonts: DocumentFontAsset[]): string {
  const combined = [...PRESET_FONT_ASSETS, ...documentFonts];
  const lines: string[] = [];

  for (const font of combined) {
    if (font.sourceType === "preset") {
      lines.push(`<link rel="stylesheet" href="${escapeHtml(font.data)}">`);
    } else {
      lines.push(`<style>
@font-face {
  font-family: '${escapeHtml(font.family)}';
  src: url('${escapeHtml(font.data)}');
  font-display: swap;
}
</style>`);
    }
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Helpers — Page HTML generation
// ---------------------------------------------------------------------------

function cssObjectFit(fit: MediaFit): string {
  return fit === "stretch" ? "fill" : fit;
}

function renderObjectHtml(object: PageObject): string {
  const base = `position:absolute;left:${object.x}px;top:${object.y}px;width:${object.width}px;height:${object.height}px;transform:rotate(${object.rotation}deg);z-index:${object.zIndex};`;

  switch (object.type) {
    case "shape":
      return `<div style="${base}background:${escapeHtml(object.fill)};border-radius:${object.cornerRadius ?? 0}px;"></div>`;

    case "text":
      return `<div style="${base}color:${escapeHtml(object.fill)};font-size:${object.fontSize}px;font-family:'${escapeHtml(object.fontFamily)}',sans-serif;font-weight:${object.fontWeight};font-style:${object.fontStyle};line-height:${object.lineHeight};text-align:${object.align};white-space:pre-wrap;">${escapeHtml(object.text)}</div>`;

    case "image":
      return `<img src="${escapeHtml(object.src)}" alt="" style="${base}object-fit:${cssObjectFit(object.fit)};" loading="lazy">`;

    case "video":
      return `<div style="${base}border-radius:18px;background:linear-gradient(180deg,rgba(43,33,25,0.96),rgba(24,16,12,0.94));border:1px solid rgba(196,168,130,0.24);overflow:hidden;">
        ${object.thumbnailSrc ? `<img src="${escapeHtml(object.thumbnailSrc)}" alt="" style="width:100%;height:100%;object-fit:${cssObjectFit(object.fit)};opacity:0.55;">` : ""}
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;padding:16px 18px;color:#faf5ef;background:linear-gradient(180deg,rgba(18,12,9,0.12),rgba(18,12,9,0.44));">
          <span style="font-size:11px;letter-spacing:0.18em;color:#d4bc9a;font-weight:700;">VIDEO</span>
          <span style="font-size:18px;font-weight:500;text-align:center;">${escapeHtml(object.name ?? "Video")}</span>
        </div>
      </div>`;

    case "audio":
      // Audio objects are rendered as visual placeholders but the actual
      // playback is controlled via the spread-audio JS logic.
      return `<div style="${base}border-radius:20px;background:linear-gradient(180deg,rgba(39,29,22,0.98),rgba(24,18,14,0.96));border:1px solid rgba(196,168,130,0.24);box-shadow:0 14px 30px rgba(0,0,0,0.18);overflow:hidden;display:flex;align-items:center;gap:16px;padding:18px 22px;">
        <div style="width:42px;height:42px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:#c4a882;color:#1a1410;font-size:20px;font-weight:700;flex-shrink:0;">♪</div>
        <div style="min-width:0;">
          <div style="font-size:11px;letter-spacing:0.18em;color:#d4bc9a;font-weight:700;">AUDIO</div>
          <div style="margin-top:8px;font-size:18px;color:#faf5ef;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(object.name ?? "Audio track")}</div>
        </div>
      </div>`;

    default:
      return "";
  }
}

function buildPageHtml(
  objects: PageObject[],
  index: number,
  pageW: number,
  pageH: number,
  totalPages: number,
): string {
  const isHard = index === 0 || index === totalPages - 1;
  const side = index === 0 ? "right" : index === totalPages - 1 ? "left" : index % 2 === 0 ? "left" : "right";
  const sortedObjects = [...objects].sort((a, b) => a.zIndex - b.zIndex);
  const objectsHtml = sortedObjects.map(renderObjectHtml).join("\n          ");

  return `        <div class="flip-page" data-density="${isHard ? "hard" : "soft"}" data-side="${side}">
          <div class="flip-page__surface" style="width:${pageW}px;height:${pageH}px;">
          ${objectsHtml}
            <div class="page-number">${index + 1}</div>
          </div>
        </div>`;
}

// ---------------------------------------------------------------------------
// CSS template
// ---------------------------------------------------------------------------

function CSS_CONTENT(): string {
  return `
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  width: 100%; height: 100%;
  overflow: hidden;
  font-family: 'Inter', 'Be Vietnam Pro', system-ui, sans-serif;
  background: #1a1410;
  color: #f5ede1;
}

.viewer-section {
  position: relative; width: 100%; height: 100vh; overflow: hidden;
  background: radial-gradient(circle at center, rgba(92,74,54,0.10), transparent 40%),
              linear-gradient(180deg, #1e1914 0%, #1a1410 100%);
}

.viewer-shell {
  position: relative; width: 100%; height: 100vh;
  display: flex; align-items: center; justify-content: center;
}

.viewer-stage {
  display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.viewer-nav {
  position: absolute; top: 50%; z-index: 1000;
  width: 48px; height: 48px;
  border: 1px solid rgba(196,168,130,0.15);
  border-radius: 999px;
  display: inline-flex; align-items: center; justify-content: center;
  color: #c4a882;
  background: rgba(30,25,20,0.7);
  box-shadow: 0 8px 20px rgba(0,0,0,0.3);
  transform: translateY(-50%);
  backdrop-filter: blur(10px);
  cursor: pointer; transition: all 0.2s;
}
.viewer-nav:hover:not(:disabled) {
  background: rgba(40,32,24,0.9);
  border-color: rgba(196,168,130,0.3);
  color: #e8ddd0;
}
.viewer-nav:disabled { cursor: default; opacity: 0.2; }
.viewer-nav--prev { left: 24px; }
.viewer-nav--next { right: 24px; }

.flipbook-viewer {
  filter: drop-shadow(0 24px 60px rgba(92,74,54,0.35));
}

.flip-page {
  display: flex; align-items: stretch; justify-content: stretch;
  background: #fbf8f3;
}

.flip-page__surface {
  position: relative;
  background: #fbf8f3;
  transform-origin: top left;
  box-shadow: inset 0 0 0 1px rgba(92,74,54,0.06), 0 12px 24px rgba(92,74,54,0.06);
}

.flip-page__surface::before,
.flip-page__surface::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
}
.flip-page__surface::before { z-index: 1; }
.flip-page__surface::after { z-index: 2; }

.flip-page[data-side="right"][data-density="soft"] .flip-page__surface::before {
  background: linear-gradient(90deg, rgba(74,60,48,0.11) 0%, rgba(74,60,48,0.06) 4%, rgba(74,60,48,0.02) 9%, rgba(74,60,48,0) 14%);
}
.flip-page[data-side="right"][data-density="soft"] .flip-page__surface::after {
  background: linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.08) 3%, rgba(255,255,255,0) 8%);
}
.flip-page[data-side="left"][data-density="soft"] .flip-page__surface::before {
  background: linear-gradient(270deg, rgba(74,60,48,0.11) 0%, rgba(74,60,48,0.06) 4%, rgba(74,60,48,0.02) 9%, rgba(74,60,48,0) 14%);
}
.flip-page[data-side="left"][data-density="soft"] .flip-page__surface::after {
  background: linear-gradient(270deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.08) 3%, rgba(255,255,255,0) 8%);
}

.flip-page[data-density="hard"] .flip-page__surface::before,
.flip-page[data-density="hard"] .flip-page__surface::after { opacity: 0.2; }

.page-number {
  position: absolute; bottom: 20px; left: 0; right: 0;
  text-align: center; font-size: 11px; font-family: 'Inter', sans-serif;
  color: #a0845e; letter-spacing: 0.05em; z-index: 100;
}

.viewer-indicator {
  position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
  z-index: 100; font-size: 12px; font-weight: 500;
  padding: 6px 20px; border-radius: 999px;
  background: rgba(30,25,20,0.75);
  border: 1px solid rgba(196,168,130,0.12);
  color: #c4a882; backdrop-filter: blur(8px);
  letter-spacing: 0.02em;
}

@media (max-width: 960px) {
  .viewer-nav--prev { left: 8px; }
  .viewer-nav--next { right: 8px; }
}
`;
}

// ---------------------------------------------------------------------------
// JS template
// ---------------------------------------------------------------------------

function JS_CONTENT(
  pageW: number,
  pageH: number,
  pageCount: number,
  audioMap: Record<number, string>,
): string {
  return `
(function() {
  var PAGE_W = ${pageW};
  var PAGE_H = ${pageH};
  var PAGE_COUNT = ${pageCount};
  var AUDIO_MAP = ${JSON.stringify(audioMap)};

  var stage = document.getElementById('viewer-stage');
  var container = document.getElementById('flipbook');
  var btnPrev = document.getElementById('btn-prev');
  var btnNext = document.getElementById('btn-next');
  var indicator = document.getElementById('viewer-indicator');
  var audioEl = document.getElementById('spread-audio');
  var activeAudioKey = null;
  var currentPage = 0;

  function calcLayout() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var paddingH = 120;
    var paddingV = 80;
    var availW = Math.max(vw - paddingH, 1);
    var availH = Math.max(vh - paddingV, 1);
    var scale = Math.min(availW / (PAGE_W * 2), availH / PAGE_H, 1);
    if (!isFinite(scale) || scale <= 0) scale = 1;
    var renderW = Math.max(1, Math.floor(PAGE_W * scale));
    var renderH = Math.max(1, Math.floor(PAGE_H * scale));
    return { scale: scale, renderW: renderW, renderH: renderH };
  }

  function getSpreadLayout() {
    if (PAGE_COUNT <= 0) return [];
    var spreads = [];
    spreads.push([0]);
    for (var i = 1; i < PAGE_COUNT; i += 2) {
      if (i < PAGE_COUNT - 1) spreads.push([i, i + 1]);
      else spreads.push([i]);
    }
    return spreads;
  }

  function getSpreadIndex(pageIndex, spreads) {
    for (var i = 0; i < spreads.length; i++) {
      if (spreads[i].indexOf(pageIndex) >= 0) return i;
    }
    return 0;
  }

  function updateIndicator() {
    indicator.textContent = 'Trang ' + (currentPage + 1) + '-' + Math.min(currentPage + 2, PAGE_COUNT) + ' / ' + PAGE_COUNT;
  }

  function updateCenterOffset(layout) {
    var isFront = currentPage === 0;
    var isBack = currentPage === PAGE_COUNT - 1 && PAGE_COUNT % 2 === 0 && currentPage !== 0;
    var tx = 0;
    if (isFront) tx = -(layout.renderW / 2);
    else if (isBack) tx = layout.renderW / 2;
    stage.style.transform = 'translateX(' + tx + 'px)';
  }

  function playSpreadAudio() {
    var spreads = getSpreadLayout();
    var si = getSpreadIndex(currentPage, spreads);
    var spread = spreads[si] || [];
    var src = null;
    for (var i = 0; i < spread.length; i++) {
      if (AUDIO_MAP[spread[i]]) { src = AUDIO_MAP[spread[i]]; break; }
    }
    var key = src ? (si + ':' + src) : null;
    if (key === activeAudioKey) return;
    activeAudioKey = key;
    audioEl.pause();
    if (src) {
      audioEl.src = src;
      audioEl.currentTime = 0;
      audioEl.play().catch(function(){});
    }
  }

  function updateNavButtons() {
    var spreads = getSpreadLayout();
    var si = getSpreadIndex(currentPage, spreads);
    btnPrev.disabled = si <= 0;
    btnNext.disabled = si >= spreads.length - 1;
  }

  var book = null;

  function initBook() {
    var layout = calcLayout();

    // Apply scale to page surfaces
    var surfaces = container.querySelectorAll('.flip-page__surface');
    for (var i = 0; i < surfaces.length; i++) {
      surfaces[i].style.transform = 'scale(' + layout.scale + ')';
    }

    if (book) {
      try { book.destroy(); } catch(e) {}
    }

    book = new St.PageFlip(container, {
      width: layout.renderW,
      height: layout.renderH,
      size: 'fixed',
      minWidth: layout.renderW,
      maxWidth: layout.renderW,
      minHeight: layout.renderH,
      maxHeight: layout.renderH,
      showCover: true,
      maxShadowOpacity: 0.35,
      mobileScrollSupport: true,
      drawShadow: true,
      usePortrait: false,
      startPage: 0,
      flippingTime: 800,
      startZIndex: 10,
      autoSize: true,
      clickEventForward: true,
      useMouseEvents: true,
      swipeDistance: 32,
      showPageCorners: true,
      disableFlipByClick: false,
    });

    book.loadFromHTML(container.querySelectorAll('.flip-page'));

    book.on('flip', function(e) {
      currentPage = typeof e.data === 'number' ? e.data : (e.data.page || 0);
      updateIndicator();
      updateCenterOffset(layout);
      updateNavButtons();
      playSpreadAudio();
    });

    book.on('init', function(e) {
      currentPage = typeof e.data === 'number' ? e.data : (e.data.page || 0);
      updateIndicator();
      updateCenterOffset(layout);
      updateNavButtons();
    });

    book.on('update', function(e) {
      currentPage = typeof e.data === 'number' ? e.data : (e.data.page || 0);
      updateIndicator();
      updateCenterOffset(layout);
      updateNavButtons();
    });

    updateCenterOffset(layout);
    updateIndicator();
    updateNavButtons();
  }

  btnPrev.addEventListener('click', function() {
    if (book) book.flipPrev();
  });

  btnNext.addEventListener('click', function() {
    if (book) book.flipNext();
  });

  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(initBook, 200);
  });

  // Keyboard navigation
  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (book) book.flipPrev();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      if (book) book.flipNext();
    }
  });

  initBook();
})();
`;
}

// ---------------------------------------------------------------------------
// HTML escaping utility
// ---------------------------------------------------------------------------

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
