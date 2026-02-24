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
