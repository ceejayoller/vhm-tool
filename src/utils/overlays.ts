import type { TemplateOverlay } from "@/types/template";

export function scaleOverlays(
  overlays: TemplateOverlay[],
  scale: number,
): TemplateOverlay[] {
  if (scale === 1) return overlays;
  return overlays.map((overlay) => {
    if (overlay.type === "text") {
      return {
        ...overlay,
        x: overlay.x * scale,
        y: overlay.y * scale,
        fontSize: overlay.fontSize * scale,
      };
    }

    if (overlay.type === "shape") {
      return {
        ...overlay,
        x: overlay.x * scale,
        y: overlay.y * scale,
        width: overlay.width * scale,
        height: overlay.height * scale,
        strokeWidth: overlay.strokeWidth * scale,
      };
    }

    return {
      ...overlay,
      x: overlay.x * scale,
      y: overlay.y * scale,
      width: overlay.width * scale,
      height: overlay.height * scale,
    };
  });
}

/**
 * Scale overlays when canvas dimensions change (e.g. switching layout).
 * Uses scaleX/scaleY for positions and sizes; fontSize/strokeWidth use average to limit distortion.
 */
export function scaleOverlaysByDimensions(
  overlays: TemplateOverlay[],
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number,
): TemplateOverlay[] {
  const scaleX = newWidth / oldWidth;
  const scaleY = newHeight / oldHeight;
  const scaleAvg = (scaleX + scaleY) / 2;
  if (scaleX === 1 && scaleY === 1) return overlays;

  return overlays.map((overlay) => {
    if (overlay.type === "text") {
      return {
        ...overlay,
        x: overlay.x * scaleX,
        y: overlay.y * scaleY,
        fontSize: overlay.fontSize * scaleAvg,
      };
    }

    if (overlay.type === "shape") {
      return {
        ...overlay,
        x: overlay.x * scaleX,
        y: overlay.y * scaleY,
        width: overlay.width * scaleX,
        height: overlay.height * scaleY,
        strokeWidth: overlay.strokeWidth * scaleAvg,
      };
    }

    return {
      ...overlay,
      x: overlay.x * scaleX,
      y: overlay.y * scaleY,
      width: overlay.width * scaleX,
      height: overlay.height * scaleY,
    };
  });
}
