import { db } from "@/db/db";
import type { Asset } from "@/db/db";
import type { DiagramConfig } from "@/types/diagram";
import { computeLayout, getLabelFontSize } from "./DiagramLayoutEngine";

const CANVAS_SIZE = 360;

/**
 * Build a map of assetId -> ImageBitmap for all slots in the config.
 * Includes current asset (for slot 0) and any additional assets (for slot 1).
 */
export async function loadDiagramImages(
  config: DiagramConfig,
  currentAsset: Asset,
  assetsById: Map<string, Asset>,
): Promise<Map<string, ImageBitmap>> {
  const images = new Map<string, ImageBitmap>();
  const ids = new Set<string>([currentAsset.id]);
  for (const slot of config.slots) {
    if (slot?.assetId) ids.add(slot.assetId);
  }
  for (const id of ids) {
    const asset = id === currentAsset.id ? currentAsset : assetsById.get(id);
    if (asset) {
      const bm = await loadScreenshotImage(asset);
      if (bm) images.set(id, bm);
    }
  }
  return images;
}

/**
 * Load the best available screenshot for an asset as ImageBitmap.
 */
export async function loadScreenshotImage(
  asset: Asset,
): Promise<ImageBitmap | null> {
  const blobId =
    asset.finalBlobId ?? asset.workingBlobId ?? asset.previewBlobId;
  if (!blobId) return null;
  const record = await db.blobs.get(blobId);
  if (!record) return null;
  return createImageBitmap(record.blob);
}

/**
 * Render a diagram to a Blob (PNG).
 * @param config Diagram configuration
 * @param currentAssetId The asset being edited (slot 0 when assetId undefined)
 * @param images Map of assetId -> ImageBitmap for each slot. Slot 0 uses currentAssetId when key is currentAssetId or undefined.
 */
export async function renderDiagramToBlob(
  config: DiagramConfig,
  currentAssetId: string,
  images: Map<string, ImageBitmap>,
): Promise<Blob> {
  const canvas = new OffscreenCanvas(CANVAS_SIZE, CANVAS_SIZE);
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const { titleRect, slotLayouts } = computeLayout(
    config.templateType,
    config.slots,
  );

  ctx.fillStyle = "#000000";
  ctx.font = "bold 14px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(config.title, titleRect.x + 4, titleRect.y + 6);

  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, titleRect.height);
  ctx.lineTo(CANVAS_SIZE, titleRect.height);
  ctx.stroke();

  const labelFontSize = getLabelFontSize();
  ctx.font = `${labelFontSize}px system-ui, sans-serif`;
  ctx.fillStyle = "#6b7280";

  for (let i = 0; i < slotLayouts.length; i++) {
    const slot = config.slots[i];
    const layout = slotLayouts[i];
    const assetId =
      slot?.assetId === undefined ? currentAssetId : slot.assetId;
    const img = assetId ? images.get(assetId) ?? images.get(currentAssetId) : null;

    if (img) {
      const { imageRect } = layout;
      const scale = Math.min(
        imageRect.width / img.width,
        imageRect.height / img.height,
        1,
      );
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const drawX = imageRect.x + (imageRect.width - drawW) / 2;
      const drawY = imageRect.y + (imageRect.height - drawH) / 2;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      ctx.strokeStyle = "#d1d5db";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        layout.slotRect.x,
        layout.slotRect.y,
        layout.slotRect.width,
        layout.slotRect.height,
      );
    } else {
      ctx.fillStyle = "#f3f4f6";
      ctx.fillRect(
        layout.slotRect.x,
        layout.slotRect.y,
        layout.slotRect.width,
        layout.slotRect.height,
      );
      ctx.strokeStyle = "#d1d5db";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        layout.slotRect.x,
        layout.slotRect.y,
        layout.slotRect.width,
        layout.slotRect.height,
      );
    }

    for (const label of layout.labels) {
      ctx.fillStyle = "#6b7280";
      ctx.textAlign = label.textAlign;
      ctx.textBaseline = label.textBaseline;
      ctx.fillText(label.text, label.x, label.y);
    }
  }

  return canvas.convertToBlob({ type: "image/png" });
}

/**
 * Convenience: render diagram and return object URL.
 * Caller must revoke the URL when done.
 */
export async function renderDiagramToUrl(
  config: DiagramConfig,
  currentAssetId: string,
  images: Map<string, ImageBitmap>,
): Promise<string> {
  const blob = await renderDiagramToBlob(config, currentAssetId, images);
  return URL.createObjectURL(blob);
}
