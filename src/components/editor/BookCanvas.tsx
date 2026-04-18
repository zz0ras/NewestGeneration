"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Group, Image as KonvaImage, Layer, Rect, Stage, Text as KonvaText, Transformer } from "react-konva";
import type Konva from "konva";
import useImage from "use-image";
import type { BookPage, ImageObject, PageObject, ShapeObject, TextObject, VideoObject } from "@/lib/book/types";
import { useEditorStore, useSelectedObject, useSelectedPage } from "@/stores/editor-store";

interface ObjectNodeProps {
  object: PageObject;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onStartTextEdit: (object: TextObject) => void;
  onChange: (updates: Partial<PageObject>) => void;
  onRegisterNode: (node: Konva.Node | null) => void;
}

interface SinglePageCanvasProps {
  page: BookPage;
  pageIndex: number;
  docW: number;
  docH: number;
  scale: number;
  isActive: boolean;
  selectedObjectId: string | null;
  editingTextObjectId: string | null;
  onSelectObject: (objectId: string | null) => void;
  onUpdateObject: (pageId: string, objectId: string, updates: Partial<PageObject>) => void;
  onSelectPage: (pageId: string) => void;
  onStartTextEdit: (pageId: string, object: TextObject) => void;
  onRegisterObjectNode: (pageId: string, objectId: string, node: Konva.Node | null) => void;
  onRegisterPageElement: (pageId: string, element: HTMLDivElement | null) => void;
  isCover: boolean;
}

function isTextObject(object: PageObject): object is TextObject {
  return object.type === "text";
}

function isShapeObject(object: PageObject): object is ShapeObject {
  return object.type === "shape";
}

function isImageObject(object: PageObject): object is ImageObject {
  return object.type === "image";
}

function isVideoObject(object: PageObject): object is VideoObject {
  return object.type === "video";
}

function ObjectNode({ object, isSelected, isEditing, onSelect, onStartTextEdit, onChange, onRegisterNode }: ObjectNodeProps) {
  const shapeRef = useRef<Konva.Node | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const [image] = useImage(isImageObject(object) ? object.src : isVideoObject(object) ? object.thumbnailSrc ?? "" : "");

  useEffect(() => {
    onRegisterNode(shapeRef.current);
    return () => onRegisterNode(null);
  }, [onRegisterNode]);

  useEffect(() => {
    if (!isSelected || isEditing || !transformerRef.current || !shapeRef.current) return;
    transformerRef.current.nodes([shapeRef.current]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [isEditing, isSelected]);

  const selectAndStop = (event?: Konva.KonvaEventObject<MouseEvent | TouchEvent | DragEvent>) => {
    if (event) {
      event.cancelBubble = true;
    }
    onSelect();
  };

  const handleDragEnd = (event: Konva.KonvaEventObject<DragEvent>) => {
    selectAndStop(event);
    onChange({ x: event.target.x(), y: event.target.y() });
  };

  const handleTransformEnd = () => {
    const node = shapeRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);

    onChange({
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
      rotation: node.rotation(),
    });
  };

  const commonProps = {
    x: object.x,
    y: object.y,
    rotation: object.rotation,
    draggable: !isEditing,
    onMouseDown: (event: Konva.KonvaEventObject<MouseEvent>) => selectAndStop(event),
    onTap: (event: Konva.KonvaEventObject<TouchEvent>) => selectAndStop(event),
    onDragStart: (event: Konva.KonvaEventObject<DragEvent>) => selectAndStop(event),
    onDragEnd: handleDragEnd,
    onTransformEnd: handleTransformEnd,
  };

  return (
    <>
      {isShapeObject(object) ? (
        <Rect
          ref={(node) => {
            shapeRef.current = node;
          }}
          {...commonProps}
          width={object.width}
          height={object.height}
          fill={object.fill}
          cornerRadius={object.cornerRadius ?? 0}
        />
      ) : null}

      {isTextObject(object) ? (
        <KonvaText
          ref={(node) => {
            shapeRef.current = node;
          }}
          {...commonProps}
          width={object.width}
          height={object.height}
          text={object.text}
          fontSize={object.fontSize}
          fontFamily={object.fontFamily}
          fill={object.fill}
          fontStyle={
            object.fontWeight === "bold" && object.fontStyle === "italic"
              ? "bold italic"
              : object.fontWeight === "bold"
                ? "bold"
                : object.fontStyle === "italic"
                  ? "italic"
                  : "normal"
          }
          align={object.align}
          lineHeight={object.lineHeight}
          onDblClick={(event) => {
            selectAndStop(event);
            onStartTextEdit(object);
          }}
          onDblTap={(event) => {
            selectAndStop(event);
            onStartTextEdit(object);
          }}
        />
      ) : null}

      {isImageObject(object) ? (
        <KonvaImage
          ref={(node) => {
            shapeRef.current = node;
          }}
          {...commonProps}
          width={object.width}
          height={object.height}
          image={image ?? undefined}
        />
      ) : null}

      {isVideoObject(object) ? (
        <Group
          ref={(node) => {
            shapeRef.current = node;
          }}
          {...commonProps}
        >
          <Rect width={object.width} height={object.height} cornerRadius={16} fill="#2b2119" stroke="rgba(196, 168, 130, 0.25)" strokeWidth={1} />
          {image ? <KonvaImage image={image} width={object.width} height={object.height} cornerRadius={16} opacity={0.72} /> : null}
          <Rect width={object.width} height={object.height} cornerRadius={16} fill="rgba(18, 12, 9, 0.35)" />
          <KonvaText x={18} y={18} width={object.width - 36} text="VIDEO" fontSize={13} letterSpacing={2} fill="#d4bc9a" fontStyle="bold" />
          <KonvaText x={18} y={object.height / 2 - 10} width={object.width - 36} text={object.name ?? "Video placeholder"} fontSize={18} fill="#faf5ef" align="center" />
        </Group>
      ) : null}

      {isSelected && !isEditing ? (
        <Transformer
          ref={transformerRef}
          borderStroke="#c4a882"
          anchorFill="#c4a882"
          anchorStroke="#5c4a36"
          anchorSize={8}
          anchorCornerRadius={2}
          rotateEnabled
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) return oldBox;
            return newBox;
          }}
        />
      ) : null}
    </>
  );
}

function SinglePageCanvas({
  page,
  pageIndex,
  docW,
  docH,
  scale,
  isActive,
  selectedObjectId,
  editingTextObjectId,
  onSelectObject,
  onUpdateObject,
  onSelectPage,
  onStartTextEdit,
  onRegisterObjectNode,
  onRegisterPageElement,
  isCover,
}: SinglePageCanvasProps) {
  let isLeft = pageIndex % 2 === 0;
  if (isCover) {
    isLeft = pageIndex !== 0;
  }

  const objects = useMemo(() => [...page.objects].sort((left, right) => left.zIndex - right.zIndex), [page.objects]);

  const handleObjectSelect = (objectId: string) => {
    onSelectPage(page.id);
    onSelectObject(objectId);
  };

  return (
    <div
      ref={(element) => onRegisterPageElement(page.id, element)}
      className="relative transition-all duration-200"
      style={{
        width: docW * scale,
        height: docH * scale,
        boxShadow: isActive ? "0 0 0 2px #1a1410, 0 0 0 4px #c4a882" : "none",
        borderRadius: isCover ? "4px" : isLeft ? "4px 0 0 4px" : "0 4px 4px 0",
      }}
    >
      <Stage width={docW * scale} height={docH * scale} scaleX={scale} scaleY={scale}>
        <Layer>
          <Rect
            x={0}
            y={0}
            width={docW}
            height={docH}
            fill="#fbf8f3"
            onMouseDown={() => {
              onSelectPage(page.id);
              onSelectObject(null);
            }}
            onTouchStart={() => {
              onSelectPage(page.id);
              onSelectObject(null);
            }}
          />

          {isLeft ? (
            <Rect
              x={docW - 20}
              y={0}
              width={20}
              height={docH}
              fillLinearGradientStartPoint={{ x: 0, y: 0 }}
              fillLinearGradientEndPoint={{ x: 20, y: 0 }}
              fillLinearGradientColorStops={[0, "rgba(92,74,54,0)", 1, "rgba(92,74,54,0.06)"]}
              listening={false}
            />
          ) : (
            <Rect
              x={0}
              y={0}
              width={20}
              height={docH}
              fillLinearGradientStartPoint={{ x: 0, y: 0 }}
              fillLinearGradientEndPoint={{ x: 20, y: 0 }}
              fillLinearGradientColorStops={[0, "rgba(92,74,54,0.08)", 1, "rgba(92,74,54,0)"]}
              listening={false}
            />
          )}

          {objects.map((object) => (
            <ObjectNode
              key={object.id}
              object={object}
              isSelected={isActive && object.id === selectedObjectId}
              isEditing={editingTextObjectId === object.id}
              onSelect={() => handleObjectSelect(object.id)}
              onStartTextEdit={(textObject) => onStartTextEdit(page.id, textObject)}
              onChange={(updates) => onUpdateObject(page.id, object.id, updates)}
              onRegisterNode={(node) => onRegisterObjectNode(page.id, object.id, node)}
            />
          ))}
        </Layer>
      </Stage>

      <div className="absolute bottom-3 left-0 right-0 text-center text-xs font-medium" style={{ color: "#a0845e", zIndex: 3 }}>
        {pageIndex + 1}
      </div>
    </div>
  );
}

export function BookCanvas() {
  const document = useEditorStore((state) => state.document);
  const selectedPageId = useEditorStore((state) => state.selectedPageId);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const editingTextObjectId = useEditorStore((state) => state.editingTextObjectId);
  const selectObject = useEditorStore((state) => state.selectObject);
  const selectPage = useEditorStore((state) => state.selectPage);
  const updateObject = useEditorStore((state) => state.updateObject);
  const startTextEditing = useEditorStore((state) => state.startTextEditing);
  const stopTextEditing = useEditorStore((state) => state.stopTextEditing);
  const commitInlineTextEdit = useEditorStore((state) => state.commitInlineTextEdit);
  const selectedPage = useSelectedPage();
  const selectedObject = useSelectedObject();

  const containerRef = useRef<HTMLDivElement>(null);
  const pageElementRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [draftText, setDraftText] = useState("");
  const [editingOverlayStyle, setEditingOverlayStyle] = useState<React.CSSProperties | null>(null);

  const editingTextObject = selectedObject?.type === "text" && selectedObject.id === editingTextObjectId ? selectedObject : null;

  const updateDimensions = useCallback(() => {
    if (!containerRef.current) return;
    setDimensions({
      width: containerRef.current.offsetWidth,
      height: containerRef.current.offsetHeight,
    });
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [updateDimensions]);

  const finishTextEdit = useCallback(
    (mode: "commit" | "cancel") => {
      if (!editingTextObject || !selectedPage) return;
      if (mode === "commit") {
        commitInlineTextEdit(selectedPage.id, editingTextObject.id, draftText);
      } else {
        stopTextEditing();
      }
    },
    [commitInlineTextEdit, draftText, editingTextObject, selectedPage, stopTextEditing],
  );

  useEffect(() => {
    if (!editingTextObject || !selectedPage || !containerRef.current) {
      const clearOverlay = window.requestAnimationFrame(() => setEditingOverlayStyle(null));
      return () => window.cancelAnimationFrame(clearOverlay);
    }

    const pageElement = pageElementRefs.current[selectedPage.id];
    if (!pageElement) {
      const clearOverlay = window.requestAnimationFrame(() => setEditingOverlayStyle(null));
      return () => window.cancelAnimationFrame(clearOverlay);
    }

    const frameId = window.requestAnimationFrame(() => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const pageRect = pageElement.getBoundingClientRect();

      setEditingOverlayStyle({
        left: pageRect.left - containerRect.left + editingTextObject.x,
        top: pageRect.top - containerRect.top + editingTextObject.y,
        width: editingTextObject.width,
        height: editingTextObject.height,
        transform: `rotate(${editingTextObject.rotation}deg)`,
        fontFamily: editingTextObject.fontFamily,
        fontSize: `${editingTextObject.fontSize}px`,
        color: editingTextObject.fill,
        fontWeight: editingTextObject.fontWeight,
        fontStyle: editingTextObject.fontStyle,
        lineHeight: String(editingTextObject.lineHeight),
        textAlign: editingTextObject.align,
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [dimensions, editingTextObject, selectedPage]);

  const handleStartTextEdit = useCallback(
    (pageId: string, textObject: TextObject) => {
      setDraftText(textObject.text);
      startTextEditing(pageId, textObject.id);
    },
    [startTextEditing],
  );

  if (document.pages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-lg text-cream/50">
        <div className="text-center">
          <div className="mb-3 text-4xl">📖</div>
          <p>Hãy thêm trang để bắt đầu thiết kế</p>
        </div>
      </div>
    );
  }

  const { width: docW, height: docH } = document.pageSize;
  const totalSpreadW = docW * 2;

  let scale = 1;
  if (dimensions.width > 0 && dimensions.height > 0) {
    scale = Math.min((dimensions.width - 120) / totalSpreadW, (dimensions.height - 80) / docH, 1);
  }

  const selectedPageIndex = document.pages.findIndex((page) => page.id === selectedPageId);
  const isFrontCover = selectedPageIndex === 0;
  const isBackCover = selectedPageIndex === document.pages.length - 1 && document.pages.length % 2 === 0 && selectedPageIndex !== 0;

  let leftPage: BookPage | null = null;
  let rightPage: BookPage | null = null;
  let spreadLabel = "";
  let spreadStartIndex = 0;

  if (isFrontCover) {
    rightPage = document.pages[0];
    spreadLabel = "Bìa trước";
  } else if (isBackCover) {
    leftPage = document.pages[selectedPageIndex];
    spreadStartIndex = selectedPageIndex;
    spreadLabel = "Bìa sau";
  } else {
    spreadStartIndex = selectedPageIndex % 2 !== 0 ? selectedPageIndex : selectedPageIndex - 1;
    if (spreadStartIndex < 1) spreadStartIndex = 1;
    leftPage = document.pages[spreadStartIndex] ?? null;
    rightPage = document.pages[spreadStartIndex + 1] ?? null;
    spreadLabel = `Trang ${spreadStartIndex + 1}-${Math.min(spreadStartIndex + 2, document.pages.length)} / ${document.pages.length}`;
  }

  return (
    <div ref={containerRef} className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(92, 74, 54, 0.08) 0%, rgba(26, 20, 16, 0.0) 70%)" }} />

      <div className="relative flex" style={{ filter: "drop-shadow(0 20px 40px rgba(92, 74, 54, 0.25))" }}>
        {!isFrontCover ? (
          leftPage ? (
            <SinglePageCanvas
              page={leftPage}
              pageIndex={spreadStartIndex}
              docW={docW}
              docH={docH}
              scale={scale}
              isActive={selectedPageId === leftPage.id}
              selectedObjectId={selectedObjectId}
              editingTextObjectId={editingTextObjectId}
              onSelectObject={selectObject}
              onUpdateObject={updateObject}
              onSelectPage={selectPage}
              onStartTextEdit={handleStartTextEdit}
              onRegisterObjectNode={() => {}}
              onRegisterPageElement={(pageId, element) => {
                pageElementRefs.current[pageId] = element;
              }}
              isCover={isBackCover}
            />
          ) : (
            <div className="book-page book-page--left paper-texture flex items-center justify-center" style={{ width: docW * scale, height: docH * scale, borderRadius: "4px 0 0 4px" }}>
              <span className="text-sm italic text-espresso/30">Trang trống</span>
            </div>
          )
        ) : null}

        {!isFrontCover && !isBackCover ? (
          <div
            className="book-spine-shadow"
            style={{
              position: "relative",
              width: "4px",
              left: "auto",
              transform: "none",
              background: "linear-gradient(to right, rgba(92,74,54,0.12), rgba(92,74,54,0.25) 50%, rgba(92,74,54,0.12))",
            }}
          />
        ) : null}

        {!isBackCover ? (
          rightPage ? (
            <SinglePageCanvas
              page={rightPage}
              pageIndex={isFrontCover ? 0 : spreadStartIndex + 1}
              docW={docW}
              docH={docH}
              scale={scale}
              isActive={selectedPageId === rightPage.id}
              selectedObjectId={selectedObjectId}
              editingTextObjectId={editingTextObjectId}
              onSelectObject={selectObject}
              onUpdateObject={updateObject}
              onSelectPage={selectPage}
              onStartTextEdit={handleStartTextEdit}
              onRegisterObjectNode={() => {}}
              onRegisterPageElement={(pageId, element) => {
                pageElementRefs.current[pageId] = element;
              }}
              isCover={isFrontCover}
            />
          ) : (
            <div className="book-page book-page--right paper-texture flex items-center justify-center" style={{ width: docW * scale, height: docH * scale, borderRadius: "0 4px 4px 0" }}>
              <span className="text-sm italic text-espresso/30">Trang trống</span>
            </div>
          )
        ) : null}
      </div>

      {editingTextObject && editingOverlayStyle ? (
        <textarea
          autoFocus
          value={draftText}
          onChange={(event) => setDraftText(event.target.value)}
          onBlur={() => finishTextEdit("commit")}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              finishTextEdit("cancel");
            }
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              finishTextEdit("commit");
            }
          }}
          className="absolute z-[60] resize-none overflow-hidden rounded-md border border-[rgba(196,168,130,0.35)] bg-[rgba(251,248,243,0.92)] p-2 outline-none shadow-[0_16px_36px_rgba(0,0,0,0.22)]"
          style={editingOverlayStyle}
        />
      ) : null}

      <div className="glass-card absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-xs font-medium" style={{ color: "#c4a882" }}>
        {spreadLabel}
      </div>
    </div>
  );
}
