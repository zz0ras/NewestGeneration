"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Download, Globe, Loader2, X } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { generateStandaloneHtml, downloadHtmlFile } from "@/lib/export/generate-html";
import { resolveDocumentMedia } from "@/lib/export/resolve-media";

function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ExportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const document = useEditorStore((state) => state.document);
  const [slug, setSlug] = useState(() => sanitizeSlug(document.title || "flipbook"));
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: "" });
  const backdropRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setSlug(sanitizeSlug(document.title || "flipbook"));
      setProgress({ current: 0, total: 0, label: "" });
    }
  }, [open, document.title]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const finalSlug = slug || sanitizeSlug(document.title) || "flipbook";

      // Fetch all media and embed as base64
      const resolvedDocument = await resolveDocumentMedia(document, (p) => {
        setProgress(p);
      });

      const html = generateStandaloneHtml(resolvedDocument, { slug: finalSlug });
      downloadHtmlFile(html, `${finalSlug}.html`);
    } finally {
      setExporting(false);
      onClose();
    }
  }, [document, slug, onClose]);

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (!exporting && event.target === backdropRef.current) onClose();
    },
    [onClose, exporting],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!exporting && event.key === "Escape") onClose();
    },
    [onClose, exporting],
  );

  if (!open) return null;

  const previewUrl = `/${slug || "my-book"}.html`;
  const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(10, 8, 6, 0.72)", backdropFilter: "blur(6px)" }}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Export flipbook"
      tabIndex={-1}
    >
      <div
        className="relative w-full max-w-md rounded-2xl"
        style={{
          background: "linear-gradient(180deg, rgba(36, 28, 22, 0.98), rgba(26, 20, 16, 0.99))",
          border: "1px solid rgba(196, 168, 130, 0.18)",
          boxShadow:
            "0 32px 80px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(196, 168, 130, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid rgba(196, 168, 130, 0.1)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                background: "linear-gradient(135deg, rgba(196, 168, 130, 0.2), rgba(196, 168, 130, 0.08))",
                border: "1px solid rgba(196, 168, 130, 0.2)",
              }}
            >
              <Globe size={18} style={{ color: "#c4a882" }} />
            </div>
            <h2
              className="text-base font-semibold tracking-wide"
              style={{
                background: "linear-gradient(135deg, #c4a882, #e8ddd0)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Export Flipbook
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={exporting}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-30"
            style={{
              color: "rgba(232, 221, 208, 0.45)",
              background: "rgba(196, 168, 130, 0.06)",
              border: "1px solid rgba(196, 168, 130, 0.08)",
            }}
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          {/* Document info */}
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{
              background: "rgba(196, 168, 130, 0.06)",
              border: "1px solid rgba(196, 168, 130, 0.1)",
            }}
          >
            <span style={{ fontSize: 28 }}>📖</span>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium" style={{ color: "#e8ddd0" }}>
                {document.title || "Untitled"}
              </div>
              <div className="text-xs" style={{ color: "rgba(196, 168, 130, 0.6)" }}>
                {document.pages.length} trang &middot; {document.pageSize.width}&times;{document.pageSize.height}
              </div>
            </div>
          </div>

          {/* Slug input */}
          <div>
            <label
              htmlFor="export-slug"
              className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: "#d4bc9a" }}
            >
              Ten file (slug)
            </label>
            <input
              id="export-slug"
              type="text"
              value={slug}
              onChange={(event) => setSlug(sanitizeSlug(event.target.value))}
              disabled={exporting}
              placeholder="my-book"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors disabled:opacity-50"
              style={{
                background: "rgba(40, 32, 24, 0.8)",
                border: "1px solid rgba(196, 168, 130, 0.2)",
                color: "#e8ddd0",
              }}
            />
            <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: "rgba(196, 168, 130, 0.5)" }}>
              <Download size={12} />
              <span className="truncate">{previewUrl}</span>
            </div>
          </div>

          {/* Progress bar */}
          {exporting && progress.total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs" style={{ color: "#d4bc9a" }}>
                <span>Dang nhung media...</span>
                <span>{progress.current}/{progress.total} ({progressPercent}%)</span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full"
                style={{ background: "rgba(196, 168, 130, 0.1)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progressPercent}%`,
                    background: "linear-gradient(90deg, #c4a882, #d4bc9a)",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: "1px solid rgba(196, 168, 130, 0.1)" }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={exporting}
            className="rounded-xl px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-30"
            style={{
              color: "rgba(232, 221, 208, 0.5)",
              background: "rgba(196, 168, 130, 0.06)",
              border: "1px solid rgba(196, 168, 130, 0.12)",
            }}
          >
            Huy
          </button>
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting || !slug}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #c4a882, #a0845e)",
              color: "#ffffff",
              boxShadow: "0 4px 16px rgba(196, 168, 130, 0.3)",
            }}
          >
            {exporting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Dang xuat...
              </>
            ) : (
              <>
                <Download size={15} />
                Tai xuong HTML
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
