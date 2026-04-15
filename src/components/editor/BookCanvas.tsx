"use client";

import { useEditorStore, useSelectedPage } from "@/stores/editor-store";
import { Stage, Layer, Rect, Text as KonvaText, Image as KonvaImage, Transformer } from "react-konva";
import { useCallback, useEffect, useRef, useState } from "react";
import useImage from "use-image";
import { PageObject } from "@/lib/book/types";

// Inner component for rendering individual objects on the Konva canvas
function ObjectNode({ shapeProps, isSelected, onSelect, onChange }: any) {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  const [img] = useImage(shapeProps.src || "");

  const handleDragEnd = (e: any) => {
    onChange({ ...shapeProps, x: e.target.x(), y: e.target.y() });
  };

  const handleTransformEnd = () => {
    const node = shapeRef.current;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    onChange({
      ...shapeProps,
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, shapeProps.type === "text" ? node.height() : node.height() * scaleY),
      rotation: node.rotation(),
    });
  };

  return (
    <>
      {shapeProps.type === "shape" && (
        <Rect onClick={onSelect} onTap={onSelect} ref={shapeRef} {...shapeProps}
          draggable onDragEnd={handleDragEnd} onTransformEnd={handleTransformEnd} />
      )}
      {shapeProps.type === "text" && (
        <KonvaText onClick={onSelect} onTap={onSelect} ref={shapeRef} {...shapeProps}
          draggable onDragEnd={handleDragEnd} onTransformEnd={handleTransformEnd} />
      )}
      {(shapeProps.type === "image" || shapeProps.type === "video") && (
        <KonvaImage image={img} onClick={onSelect} onTap={onSelect} ref={shapeRef} {...shapeProps}
          draggable onDragEnd={handleDragEnd} onTransformEnd={handleTransformEnd} />
      )}
      {isSelected && (
        <Transformer ref={trRef}
          borderStroke="#c4a882"
          anchorFill="#c4a882"
          anchorStroke="#5c4a36"
          anchorSize={8}
          anchorCornerRadius={2}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) return oldBox;
            return newBox;
          }} />
      )}
    </>
  );
}

function SinglePageCanvas({
  page, pageIndex, docW, docH, scale, isActive,
  selectedObjectId, onSelectObject, onUpdateObject, onSelectPage, isCover
}: any) {
  // If it's a cover, we force the visuals to match a closed book layout:
  // Front cover (0) is a "right" page. Back cover is a "left" page.
  let isLeft = pageIndex % 2 === 0;
  if (isCover) {
    isLeft = pageIndex !== 0; // Front cover is treated as right, Back cover as left
  }

  return (
    <div
      className="relative cursor-pointer transition-all duration-200"
      onClick={() => onSelectPage(page.id)}
      style={{
        width: docW * scale,
        height: docH * scale,
        boxShadow: isActive
          ? '0 0 0 2px #1a1410, 0 0 0 4px #c4a882'
          : 'none',
        borderRadius: isCover ? '4px' : (isLeft ? '4px 0 0 4px' : '0 4px 4px 0'),
      }}
    >
      <Stage
        width={docW * scale}
        height={docH * scale}
        scaleX={scale}
        scaleY={scale}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage()) {
            onSelectObject(null);
          }
        }}
        onTouchStart={(e) => {
          if (e.target === e.target.getStage()) {
            onSelectObject(null);
          }
        }}
      >
        <Layer>
          {/* Page background — always visible cream fill */}
          <Rect x={0} y={0} width={docW} height={docH} fill="#fbf8f3" listening={false} />
          {/* Subtle inner edge shadow for left page/back cover */}
          {isLeft && (
            <Rect x={docW - 20} y={0} width={20} height={docH}
              fillLinearGradientStartPoint={{ x: 0, y: 0 }}
              fillLinearGradientEndPoint={{ x: 20, y: 0 }}
              fillLinearGradientColorStops={[0, 'rgba(92,74,54,0)', 1, 'rgba(92,74,54,0.06)']}
              listening={false} />
          )}
          {/* Subtle inner edge shadow for right page/front cover */}
          {!isLeft && (
            <Rect x={0} y={0} width={20} height={docH}
              fillLinearGradientStartPoint={{ x: 0, y: 0 }}
              fillLinearGradientEndPoint={{ x: 20, y: 0 }}
              fillLinearGradientColorStops={[0, 'rgba(92,74,54,0.08)', 1, 'rgba(92,74,54,0)']}
              listening={false} />
          )}
          {/* User objects */}
          {page.objects.map((obj: PageObject) => (
            <ObjectNode
              key={obj.id}
              shapeProps={obj}
              isSelected={isActive && obj.id === selectedObjectId}
              onSelect={() => {
                onSelectPage(page.id);
                onSelectObject(obj.id);
              }}
              onChange={(newAttrs: PageObject) => onUpdateObject(page.id, obj.id, newAttrs)}
            />
          ))}
        </Layer>
      </Stage>

      {/* Page number label */}
      <div className="absolute bottom-3 left-0 right-0 text-center text-xs font-medium" style={{ color: '#a0845e', zIndex: 3 }}>
        {pageIndex + 1}
      </div>
    </div>
  );
}

export function BookCanvas() {
  const document = useEditorStore((state) => state.document);
  const selectedPageId = useEditorStore((state) => state.selectedPageId);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const selectObject = useEditorStore((state) => state.selectObject);
  const selectPage = useEditorStore((state) => state.selectPage);
  const updateObject = useEditorStore((state) => state.updateObject);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  if (document.pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-cream/50 text-lg">
        <div className="text-center">
          <div className="text-4xl mb-3">📖</div>
          <p>Hãy thêm trang để bắt đầu thiết kế</p>
        </div>
      </div>
    );
  }

  const { width: docW, height: docH } = document.pageSize;

  // For 2-page spread, we need to fit (2 * docW + gap) x docH
  const spreadGap = 0; // seamless spine
  const totalSpreadW = docW * 2 + spreadGap;

  let scale = 1;
  if (dimensions.width > 0 && dimensions.height > 0) {
    scale = Math.min(
      (dimensions.width - 120) / totalSpreadW,
      (dimensions.height - 80) / docH,
      1.0 // cap at 1x
    );
  }

  // Determine spread components
  const selectedPageIndex = document.pages.findIndex(p => p.id === selectedPageId);
  const isFrontCover = selectedPageIndex === 0;
  const isBackCover = selectedPageIndex === document.pages.length - 1 && document.pages.length % 2 === 0 && selectedPageIndex !== 0;

  let leftPage = null;
  let rightPage = null;
  let spreadLabel = "";
  let spreadStartIndex = 0;

  if (isFrontCover) {
    rightPage = document.pages[0]; // Front cover shows visually as a right-side page
    spreadLabel = "Bìa trước";
  } else if (isBackCover) {
    leftPage = document.pages[selectedPageIndex]; // Back cover visually as a left-side page 
    spreadStartIndex = selectedPageIndex;
    spreadLabel = "Bìa sau";
  } else {
    spreadStartIndex = selectedPageIndex % 2 !== 0 ? selectedPageIndex : selectedPageIndex - 1;
    if (spreadStartIndex < 1) spreadStartIndex = 1;
    leftPage = document.pages[spreadStartIndex] ?? null;
    rightPage = document.pages[spreadStartIndex + 1] ?? null;
    spreadLabel = `Trang ${spreadStartIndex + 1}–${Math.min(spreadStartIndex + 2, document.pages.length)} / ${document.pages.length}`;
  }

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center relative overflow-hidden">
      {/* Subtle warm radial background */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, rgba(92, 74, 54, 0.08) 0%, rgba(26, 20, 16, 0.0) 70%)'
      }} />

      {/* Book spread container */}
      <div className="relative flex" style={{ filter: 'drop-shadow(0 20px 40px rgba(92, 74, 54, 0.25))' }}>
        
        {/* Left page area */}
        {!isFrontCover && (
          leftPage ? (
            <SinglePageCanvas
              page={leftPage}
              pageIndex={spreadStartIndex}
              docW={docW}
              docH={docH}
              scale={scale}
              isActive={selectedPageId === leftPage.id}
              selectedObjectId={selectedObjectId}
              onSelectObject={selectObject}
              onUpdateObject={updateObject}
              onSelectPage={selectPage}
              isCover={isBackCover}
            />
          ) : (
            <div
              className="book-page book-page--left paper-texture flex items-center justify-center"
              style={{
                width: docW * scale,
                height: docH * scale,
                borderRadius: '4px 0 0 4px',
              }}
            >
              <span className="text-espresso/30 text-sm italic">Trang trống</span>
            </div>
          )
        )}

        {/* Spine divider (hidden for covers) */}
        {!isFrontCover && !isBackCover && (
          <div className="book-spine-shadow" style={{
            position: 'relative',
            width: '4px',
            left: 'auto',
            transform: 'none',
            background: 'linear-gradient(to right, rgba(92,74,54,0.12), rgba(92,74,54,0.25) 50%, rgba(92,74,54,0.12))',
          }} />
        )}

        {/* Right page area */}
        {!isBackCover && (
          rightPage ? (
            <SinglePageCanvas
              page={rightPage}
              pageIndex={isFrontCover ? 0 : spreadStartIndex + 1}
              docW={docW}
              docH={docH}
              scale={scale}
              isActive={selectedPageId === rightPage.id}
              selectedObjectId={selectedObjectId}
              onSelectObject={selectObject}
              onUpdateObject={updateObject}
              onSelectPage={selectPage}
              isCover={isFrontCover}
            />
          ) : (
            <div
              className="book-page book-page--right paper-texture flex items-center justify-center"
              style={{
                width: docW * scale,
                height: docH * scale,
                borderRadius: '0 4px 4px 0',
              }}
            >
              <span className="text-espresso/30 text-sm italic">Trang trống</span>
            </div>
          )
        )}
      </div>

      {/* Spread indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs font-medium px-4 py-1.5 rounded-full glass-card" style={{ color: '#c4a882' }}>
        {spreadLabel}
      </div>
    </div>
  );
}
