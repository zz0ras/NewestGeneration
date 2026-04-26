"use client";

import { useRef, useState } from "react";
import { Maximize2, Type, Upload } from "lucide-react";
import { PRESET_FONT_ASSETS } from "@/lib/fonts/presets";
import { createUploadedFontAsset } from "@/lib/fonts/upload";
import type { PageObject, TextAlign, TextObject } from "@/lib/book/types";
import { useEditorStore, useSelectedObject, useSelectedPage } from "@/stores/editor-store";

interface EditorInspectorProps {
  onRequestClose?: () => void;
}

const ALIGN_OPTIONS: TextAlign[] = ["left", "center", "right"];

function isTextObject(object: PageObject | null): object is TextObject {
  return object?.type === "text";
}

function isMediaObject(object: PageObject | null): object is Extract<PageObject, { type: "image" | "video" | "audio" }> {
  return object?.type === "image" || object?.type === "video" || object?.type === "audio";
}

function isVisualMediaObject(object: PageObject | null): object is Extract<PageObject, { type: "image" | "video" }> {
  return object?.type === "image" || object?.type === "video";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-card rounded-2xl p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">{title}</div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] font-medium uppercase tracking-[0.16em] text-latte/70">{children}</label>;
}

function Input({
  value,
  onChange,
  type = "text",
  placeholder,
  min,
  max,
}: {
  value: string | number;
  onChange: (value: string) => void;
  type?: "text" | "number" | "color";
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      min={min}
      max={max}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-[rgba(196,168,130,0.16)] bg-[rgba(250,245,239,0.06)] px-3 py-2 text-sm text-cream outline-none transition focus:border-[rgba(196,168,130,0.45)]"
    />
  );
}

function NumberInput({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
}) {
  return <Input type="number" value={value} min={min} onChange={(value) => onChange(Number(value) || 0)} />;
}

export function EditorInspector({ onRequestClose }: EditorInspectorProps) {
  const selectedPage = useSelectedPage();
  const selectedObject = useSelectedObject();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { document, updateObject, updateTextObjectStyle, deleteObject, addFontAsset } = useEditorStore();
  const [fontError, setFontError] = useState<string | null>(null);

  const inspectorTitle = selectedObject ? `Dang chon ${selectedObject.type}` : "Editor Inspector";

  const handleTransformChange = (field: "x" | "y" | "width" | "height" | "rotation", value: number) => {
    if (!selectedPage || !selectedObject) return;
    updateObject(selectedPage.id, selectedObject.id, {
      [field]: field === "width" || field === "height" ? Math.max(5, value) : value,
    });
  };

  const handleTextChange = (updates: Partial<TextObject>) => {
    if (!selectedPage || !isTextObject(selectedObject)) return;
    updateTextObjectStyle(selectedPage.id, selectedObject.id, updates);
  };

  const handleAutoFitPage = () => {
    if (!selectedPage || !isVisualMediaObject(selectedObject)) return;
    updateObject(selectedPage.id, selectedObject.id, {
      x: 0,
      y: 0,
      width: document.pageSize.width,
      height: document.pageSize.height,
      rotation: 0,
      fit: "cover",
    });
  };

  const handleFontUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fontAsset = await createUploadedFontAsset(file);
      addFontAsset(fontAsset);
      setFontError(null);
      if (isTextObject(selectedObject) && selectedPage) {
        updateTextObjectStyle(selectedPage.id, selectedObject.id, { fontFamily: fontAsset.family });
      }
    } catch (error) {
      setFontError(error instanceof Error ? error.message : "Khong the them font.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <aside className="glass-panel flex h-full w-full flex-col border-l border-[rgba(196,168,130,0.1)] bg-[rgba(20,16,12,0.78)]">
      <div className="flex items-center justify-between border-b border-[rgba(196,168,130,0.08)] px-5 py-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent/80">Inspector</div>
          <h2 className="mt-1 text-sm font-semibold text-cream">{inspectorTitle}</h2>
        </div>
        {onRequestClose ? (
          <button
            type="button"
            onClick={onRequestClose}
            className="rounded-full border border-[rgba(196,168,130,0.16)] px-3 py-1 text-xs text-latte/80 transition hover:border-[rgba(196,168,130,0.35)] hover:text-cream"
          >
            Dong
          </button>
        ) : null}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <Section title="Tong quan">
          <div className="rounded-2xl bg-[rgba(250,245,239,0.04)] px-4 py-3 text-sm text-latte/85">
            {selectedObject ? (
              <>
                <div className="font-medium text-cream">
                  {selectedObject.type === "text"
                    ? "Khoi van ban"
                    : selectedObject.type === "shape"
                      ? "Hinh khoi"
                      : selectedObject.name || "Khoi media"}
                </div>
                <div className="mt-1 text-xs text-latte/65">
                  Trang {selectedPage ? selectedPage.name : "-"} • Layer {selectedObject.zIndex}
                </div>
              </>
            ) : (
              <>
                <div className="font-medium text-cream">Chua chon object</div>
                <div className="mt-1 text-xs text-latte/65">
                  Dung toolbar ben trai de them object hoac chon mot phan tu tren canvas de chinh sua.
                </div>
              </>
            )}
          </div>
        </Section>

        {selectedObject ? (
          <Section title="Transform">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>X</FieldLabel>
                <NumberInput value={selectedObject.x} onChange={(value) => handleTransformChange("x", value)} />
              </div>
              <div>
                <FieldLabel>Y</FieldLabel>
                <NumberInput value={selectedObject.y} onChange={(value) => handleTransformChange("y", value)} />
              </div>
              <div>
                <FieldLabel>Width</FieldLabel>
                <NumberInput value={selectedObject.width} onChange={(value) => handleTransformChange("width", value)} min={5} />
              </div>
              <div>
                <FieldLabel>Height</FieldLabel>
                <NumberInput value={selectedObject.height} onChange={(value) => handleTransformChange("height", value)} min={5} />
              </div>
            </div>
            <div>
              <FieldLabel>Rotation</FieldLabel>
              <NumberInput value={selectedObject.rotation} onChange={(value) => handleTransformChange("rotation", value)} min={-360} />
            </div>
          </Section>
        ) : null}

        {isTextObject(selectedObject) ? (
          <>
            <Section title="Typography">
              <div>
                <FieldLabel>Noi dung</FieldLabel>
                <textarea
                  value={selectedObject.text}
                  onChange={(event) => handleTextChange({ text: event.target.value })}
                  className="min-h-28 w-full rounded-2xl border border-[rgba(196,168,130,0.16)] bg-[rgba(250,245,239,0.06)] px-3 py-3 text-sm text-cream outline-none transition focus:border-[rgba(196,168,130,0.45)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Font Size</FieldLabel>
                  <NumberInput value={selectedObject.fontSize} onChange={(value) => handleTextChange({ fontSize: Math.max(8, value) })} min={8} />
                </div>
                <div>
                  <FieldLabel>Mau chu</FieldLabel>
                  <Input type="color" value={selectedObject.fill} onChange={(value) => handleTextChange({ fill: value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleTextChange({ fontWeight: selectedObject.fontWeight === "bold" ? "normal" : "bold" })}
                  className={`rounded-xl border px-3 py-2 text-sm transition ${selectedObject.fontWeight === "bold" ? "border-[rgba(196,168,130,0.42)] bg-[rgba(196,168,130,0.18)] text-cream" : "border-[rgba(196,168,130,0.14)] bg-[rgba(250,245,239,0.04)] text-latte/80"}`}
                >
                  Bold
                </button>
                <button
                  type="button"
                  onClick={() => handleTextChange({ fontStyle: selectedObject.fontStyle === "italic" ? "normal" : "italic" })}
                  className={`rounded-xl border px-3 py-2 text-sm transition ${selectedObject.fontStyle === "italic" ? "border-[rgba(196,168,130,0.42)] bg-[rgba(196,168,130,0.18)] text-cream" : "border-[rgba(196,168,130,0.14)] bg-[rgba(250,245,239,0.04)] text-latte/80"}`}
                >
                  Italic
                </button>
              </div>
              <div>
                <FieldLabel>Can le</FieldLabel>
                <div className="grid grid-cols-3 gap-2">
                  {ALIGN_OPTIONS.map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => handleTextChange({ align })}
                      className={`rounded-xl border px-3 py-2 text-sm capitalize transition ${selectedObject.align === align ? "border-[rgba(196,168,130,0.42)] bg-[rgba(196,168,130,0.18)] text-cream" : "border-[rgba(196,168,130,0.14)] bg-[rgba(250,245,239,0.04)] text-latte/80"}`}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Fonts">
              <div className="flex items-center justify-between rounded-2xl bg-[rgba(250,245,239,0.04)] px-4 py-3 text-xs text-latte/70">
                <span>Double-click tren canvas de nhap text truc tiep voi caret.</span>
                <Type size={14} className="text-accent" />
              </div>

              <div>
                <FieldLabel>Preset Unicode Viet</FieldLabel>
                <div className="grid gap-2">
                  {PRESET_FONT_ASSETS.map((font) => {
                    const isActive = selectedObject.fontFamily === font.family;
                    return (
                      <button
                        key={font.id}
                        type="button"
                        onClick={() => handleTextChange({ fontFamily: font.family })}
                        className={`rounded-2xl border px-3 py-3 text-left transition ${isActive ? "border-[rgba(196,168,130,0.38)] bg-[rgba(196,168,130,0.16)]" : "border-[rgba(196,168,130,0.12)] bg-[rgba(250,245,239,0.04)]"}`}
                        style={{ fontFamily: font.family }}
                      >
                        <div className="text-sm font-medium text-cream">{font.family}</div>
                        <div className="mt-1 text-xs text-latte/65">Album ky niem bang tieng Viet</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <FieldLabel>Font user them</FieldLabel>
                <div className="space-y-2">
                  {document.fontAssets.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[rgba(196,168,130,0.16)] px-4 py-4 text-sm text-latte/65">
                      Chua co font upload nao trong document.
                    </div>
                  ) : (
                    document.fontAssets.map((font) => {
                      const isActive = selectedObject.fontFamily === font.family;
                      return (
                        <button
                          key={font.id}
                          type="button"
                          onClick={() => handleTextChange({ fontFamily: font.family })}
                          className={`w-full rounded-2xl border px-3 py-3 text-left transition ${isActive ? "border-[rgba(196,168,130,0.38)] bg-[rgba(196,168,130,0.16)]" : "border-[rgba(196,168,130,0.12)] bg-[rgba(250,245,239,0.04)]"}`}
                          style={{ fontFamily: font.family }}
                        >
                          <div className="text-sm font-medium text-cream">{font.family}</div>
                          <div className="mt-1 text-xs text-latte/65">{font.originalFileName}</div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                className="hidden"
                onChange={handleFontUpload}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[rgba(196,168,130,0.24)] bg-[rgba(196,168,130,0.14)] px-4 py-2.5 text-sm font-medium text-cream transition hover:border-[rgba(196,168,130,0.4)] hover:bg-[rgba(196,168,130,0.2)]"
              >
                <Upload size={16} />
                Them font vao document
              </button>
              {fontError ? <div className="text-xs text-red-300">{fontError}</div> : null}
            </Section>
          </>
        ) : null}

        {isMediaObject(selectedObject) ? (
          <Section title={selectedObject.type === "image" ? "Image" : selectedObject.type === "video" ? "Video" : "Audio"}>
            <div className="rounded-2xl bg-[rgba(250,245,239,0.04)] px-4 py-3 text-sm text-latte/80">
              <div className="font-medium text-cream">{selectedObject.name || "Media object"}</div>
              <div className="mt-1 break-all text-xs text-latte/60">{selectedObject.src}</div>
            </div>
            {isVisualMediaObject(selectedObject) ? (
              <>
                <button
                  type="button"
                  onClick={handleAutoFitPage}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[rgba(196,168,130,0.24)] bg-[rgba(196,168,130,0.14)] px-4 py-2.5 text-sm font-medium text-cream transition hover:border-[rgba(196,168,130,0.4)] hover:bg-[rgba(196,168,130,0.2)]"
                >
                  <Maximize2 size={16} />
                  Auto fit trang
                </button>
                <div>
                  <FieldLabel>Render mode</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {(["cover", "contain"] as const).map((fit) => (
                      <button
                        key={fit}
                        type="button"
                        onClick={() => selectedPage && updateObject(selectedPage.id, selectedObject.id, { fit })}
                        className={`rounded-xl border px-3 py-2 text-sm transition ${selectedObject.fit === fit ? "border-[rgba(196,168,130,0.42)] bg-[rgba(196,168,130,0.18)] text-cream" : "border-[rgba(196,168,130,0.14)] bg-[rgba(250,245,239,0.04)] text-latte/80"}`}
                      >
                        {fit}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </Section>
        ) : null}

        {selectedObject && selectedPage ? (
          <Section title="Actions">
            <button
              type="button"
              onClick={() => deleteObject(selectedPage.id, selectedObject.id)}
              className="w-full rounded-xl border border-[rgba(204,123,123,0.24)] bg-[rgba(204,123,123,0.08)] px-4 py-2.5 text-sm font-medium text-red-200 transition hover:border-[rgba(204,123,123,0.4)] hover:bg-[rgba(204,123,123,0.14)]"
            >
              Xoa object dang chon
            </button>
          </Section>
        ) : null}
      </div>
    </aside>
  );
}
