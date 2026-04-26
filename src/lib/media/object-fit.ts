import type { MediaFit } from "@/lib/book/types";

export interface MediaRenderLayout {
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
}

function toPositiveSize(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function getMediaRenderLayout(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  fit: MediaFit,
): MediaRenderLayout {
  const safeSourceWidth = toPositiveSize(sourceWidth);
  const safeSourceHeight = toPositiveSize(sourceHeight);
  const safeTargetWidth = toPositiveSize(targetWidth);
  const safeTargetHeight = toPositiveSize(targetHeight);

  if (fit === "stretch") {
    return {
      drawX: 0,
      drawY: 0,
      drawWidth: safeTargetWidth,
      drawHeight: safeTargetHeight,
    };
  }

  if (fit === "contain") {
    const scale = Math.min(safeTargetWidth / safeSourceWidth, safeTargetHeight / safeSourceHeight);
    const drawWidth = safeSourceWidth * scale;
    const drawHeight = safeSourceHeight * scale;

    return {
      drawX: (safeTargetWidth - drawWidth) / 2,
      drawY: (safeTargetHeight - drawHeight) / 2,
      drawWidth,
      drawHeight,
    };
  }

  const sourceRatio = safeSourceWidth / safeSourceHeight;
  const targetRatio = safeTargetWidth / safeTargetHeight;

  if (sourceRatio > targetRatio) {
    const cropWidth = safeSourceHeight * targetRatio;
    return {
      drawX: 0,
      drawY: 0,
      drawWidth: safeTargetWidth,
      drawHeight: safeTargetHeight,
      cropX: (safeSourceWidth - cropWidth) / 2,
      cropY: 0,
      cropWidth,
      cropHeight: safeSourceHeight,
    };
  }

  const cropHeight = safeSourceWidth / targetRatio;
  return {
    drawX: 0,
    drawY: 0,
    drawWidth: safeTargetWidth,
    drawHeight: safeTargetHeight,
    cropX: 0,
    cropY: (safeSourceHeight - cropHeight) / 2,
    cropWidth: safeSourceWidth,
    cropHeight,
  };
}
