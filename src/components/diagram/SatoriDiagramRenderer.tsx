import satori from "satori";
import type { Font } from "satori";
import { db } from "@/db/db";
import type { Asset } from "@/db/db";
import type { DiagramConfig, DiagramViewType } from "@/types/diagram";
import {
  CANVAS_SIZE,
  TITLE_FONT_SIZE,
  LABEL_MARGIN,
  COLOR_BG,
  COLOR_TITLE_TEXT,
  COLOR_SEPARATOR,
  COLOR_DIVIDER,
  COLOR_EMPTY_SLOT_BG,
  COLOR_EMPTY_SLOT_TEXT,
  COLOR_LABEL_TEXT,
  TITLE_LETTER_SPACING,
  LABEL_LETTER_SPACING,
  LABEL_FONT_SIZE_NEW,
  TITLE_BAR_HEIGHT,
  TITLE_PADDING_X,
  CONTENT_PADDING_NEW,
  SEPARATOR_HEIGHT,
  DIVIDER_WIDTH,
} from "@/config/diagramConfig";

// ---------------------------------------------------------------------------
// Font loading (cached after first load)
// ---------------------------------------------------------------------------

let fontCache: Font[] | null = null;
let initPromise: Promise<void> | null = null;

async function ensureInitialized(): Promise<Font[]> {
  if (fontCache) return fontCache;

  if (!initPromise) {
    initPromise = (async () => {
      const [regularBuf, boldBuf] = await Promise.all([
        fetch("/fonts/Inter-Regular.woff").then((r) => r.arrayBuffer()),
        fetch("/fonts/Inter-Bold.woff").then((r) => r.arrayBuffer()),
      ]);

      fontCache = [
        { name: "Inter", data: regularBuf, weight: 400, style: "normal" as const },
        { name: "Inter", data: boldBuf, weight: 700, style: "normal" as const },
      ];
    })();
  }

  await initPromise;
  return fontCache!;
}

// ---------------------------------------------------------------------------
// Blob / data-URL helpers
// ---------------------------------------------------------------------------

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function loadScreenshotDataUrl(asset: Asset): Promise<string | null> {
  const blobId =
    asset.previewBlobId ?? asset.workingBlobId ?? asset.finalBlobId;
  if (!blobId) return null;

  let record = await db.blobs.get(blobId);

  if (!record) {
    const latestAsset = await db.assets.get(asset.id);
    const refreshedBlobId = latestAsset
      ? (latestAsset.previewBlobId ?? latestAsset.workingBlobId ?? latestAsset.finalBlobId)
      : null;
    if (refreshedBlobId && refreshedBlobId !== blobId) {
      record = await db.blobs.get(refreshedBlobId) ?? undefined;
    }
  }

  if (!record) return null;
  return blobToDataUrl(record.blob);
}

/**
 * Load screenshot blobs as base64 data URLs for embedding in satori JSX.
 */
export async function loadDiagramImageDataUrls(
  config: DiagramConfig,
  currentAsset: Asset,
  assetsById: Map<string, Asset>,
): Promise<Map<string, string>> {
  const dataUrls = new Map<string, string>();
  const ids = new Set<string>([currentAsset.id]);
  for (const slot of config.slots) {
    if (slot?.assetId) ids.add(slot.assetId);
  }
  for (const id of ids) {
    let asset = id === currentAsset.id ? currentAsset : assetsById.get(id);
    if (!asset) {
      asset = (await db.assets.get(id)) ?? undefined;
    }
    if (asset) {
      const url = await loadScreenshotDataUrl(asset);
      if (url) dataUrls.set(id, url);
    }
  }
  return dataUrls;
}

// ---------------------------------------------------------------------------
// Label helpers
// ---------------------------------------------------------------------------

interface LabelDef {
  text: string;
  position: "top" | "bottom" | "left" | "right";
}

function getLabels(viewType: DiagramViewType): LabelDef[] {
  if (viewType === "plan") {
    return [
      { text: "Port", position: "top" },
      { text: "Stbd", position: "bottom" },
      { text: "Fwd", position: "right" },
      { text: "Aft", position: "left" },
    ];
  }
  return [
    { text: "Fwd", position: "right" },
    { text: "Aft", position: "left" },
  ];
}

function labelContainerStyle(
  position: "top" | "bottom" | "left" | "right",
  scale: number,
  stagger: "none" | "first" | "second",
): Record<string, unknown> {
  const margin = LABEL_MARGIN * scale;
  const base: Record<string, unknown> = {
    position: "absolute",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  // Subtle offset so adjacent inner-edge labels don't collide.
  // "first" nudges toward start (up / left), "second" toward end (down / right).
  const offset = "5%";

  switch (position) {
    case "top":
      if (stagger === "first") {
        return { ...base, top: 0, left: 0, right: offset, height: margin };
      }
      if (stagger === "second") {
        return { ...base, top: 0, left: offset, right: 0, height: margin };
      }
      return { ...base, top: 0, left: 0, right: 0, height: margin };
    case "bottom":
      if (stagger === "first") {
        return { ...base, bottom: 0, left: 0, right: offset, height: margin };
      }
      if (stagger === "second") {
        return { ...base, bottom: 0, left: offset, right: 0, height: margin };
      }
      return { ...base, bottom: 0, left: 0, right: 0, height: margin };
    case "left":
      if (stagger === "first") {
        return { ...base, left: 0, top: 0, bottom: offset, width: margin };
      }
      if (stagger === "second") {
        return { ...base, left: 0, top: offset, bottom: 0, width: margin };
      }
      return { ...base, left: 0, top: 0, bottom: 0, width: margin };
    case "right":
      if (stagger === "first") {
        return { ...base, right: 0, top: 0, bottom: offset, width: margin };
      }
      if (stagger === "second") {
        return { ...base, right: 0, top: offset, bottom: 0, width: margin };
      }
      return { ...base, right: 0, top: 0, bottom: 0, width: margin };
  }
}

function labelTextStyle(scale: number): Record<string, unknown> {
  return {
    fontSize: LABEL_FONT_SIZE_NEW * scale,
    fontFamily: "Inter",
    fontWeight: 600,
    color: COLOR_LABEL_TEXT,
    letterSpacing: LABEL_LETTER_SPACING * scale,
    textTransform: "uppercase" as const,
    lineHeight: 1,
  };
}

/**
 * For multi-slot layouts, returns stagger info so inner-edge labels
 * don't overlap across the divider. Both labels on the same axis
 * within a slot share the same offset to stay visually aligned.
 *
 * Row layout (left/right labels stagger vertically):
 *   slot 0: left + right → "second" (nudged down)
 *   slot 1: left + right → "first"  (nudged up)
 *
 * Stacked layout (top/bottom labels stagger horizontally):
 *   slot 0: top + bottom → "second" (nudged right)
 *   slot 1: top + bottom → "first"  (nudged left)
 */
function getStaggerMap(
  isMultiSlot: boolean,
  isStacked: boolean,
  slotIndex: number,
): Map<string, "first" | "second"> {
  const map = new Map<string, "first" | "second">();
  if (!isMultiSlot) return map;
  const value: "first" | "second" = slotIndex === 0 ? "second" : "first";
  if (isStacked) {
    map.set("top", value);
    map.set("bottom", value);
  } else {
    map.set("left", value);
    map.set("right", value);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Satori JSX template
// ---------------------------------------------------------------------------

function DiagramElement(props: {
  config: DiagramConfig;
  currentAssetId: string;
  imageDataUrls: Map<string, string>;
  size: number;
}) {
  const { config, currentAssetId, imageDataUrls, size } = props;
  const scale = size / CANVAS_SIZE;

  const slotCount = config.templateType === "single" ? 1 : 2;
  const slots = config.slots.slice(0, slotCount);

  const isMultiSlot = config.templateType !== "single";
  const isStacked = config.templateType === "stacked";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: size,
        height: size,
        background: COLOR_BG,
        fontFamily: "Inter",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: TITLE_BAR_HEIGHT * scale,
          paddingLeft: TITLE_PADDING_X * scale,
          paddingRight: TITLE_PADDING_X * scale,
          fontSize: TITLE_FONT_SIZE * scale,
          fontWeight: 700,
          color: COLOR_TITLE_TEXT,
          letterSpacing: TITLE_LETTER_SPACING * scale,
          textTransform: "uppercase" as const,
          lineHeight: 1,
        }}
      >
        {config.title}
      </div>

      {/* Separator line under title */}
      <div
        style={{
          height: SEPARATOR_HEIGHT * scale,
          background: COLOR_SEPARATOR,
          width: "100%",
          flexShrink: 0,
        }}
      />

      {/* Content area with slots */}
      <div
        style={{
          display: "flex",
          flex: 1,
          padding: CONTENT_PADDING_NEW * scale,
          flexDirection: isStacked ? "column" : "row",
        }}
      >
        {slots.map((slot, i) => {
          const assetId =
            slot?.assetId === undefined ? currentAssetId : slot.assetId;
          const usesExplicitSlotAsset = slot?.assetId !== undefined;
          const selectedUrl = assetId ? imageDataUrls.get(assetId) : null;
          const fallbackUrl = imageDataUrls.get(currentAssetId);
          const imgUrl = usesExplicitSlotAsset
            ? (selectedUrl ?? null)
            : (selectedUrl ?? fallbackUrl ?? null);

          const viewType = slot?.viewType ?? "plan";
          const labels = getLabels(viewType);
          const staggerMap = getStaggerMap(isMultiSlot, isStacked, i);

          const margin = LABEL_MARGIN * scale;

          return [
            // Divider line between slots (only before the second slot)
            isMultiSlot && i === 1 && (
              <div
                key="divider"
                style={{
                  flexShrink: 0,
                  background: COLOR_DIVIDER,
                  ...(isStacked
                    ? { height: DIVIDER_WIDTH * scale, width: "100%" }
                    : { width: DIVIDER_WIDTH * scale, height: "100%" }),
                }}
              />
            ),
            <div
              key={i}
              style={{
                display: "flex",
                flex: 1,
                position: "relative",
                background: imgUrl ? COLOR_BG : COLOR_EMPTY_SLOT_BG,
              }}
            >
              {/* Image container — inset by label margin on all sides */}
              {imgUrl && (
                <div
                  style={{
                    display: "flex",
                    position: "absolute",
                    top: margin,
                    left: margin,
                    right: margin,
                    bottom: margin,
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt=""
                    src={imgUrl}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>
              )}

              {/* Empty slot placeholder */}
              {!imgUrl && (
                <div
                  style={{
                    display: "flex",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: LABEL_FONT_SIZE_NEW * scale,
                    fontFamily: "Inter",
                    color: COLOR_EMPTY_SLOT_TEXT,
                    letterSpacing: LABEL_LETTER_SPACING * scale,
                    textTransform: "uppercase" as const,
                  }}
                >
                  No Screenshot
                </div>
              )}

              {/* Directional labels */}
              {labels.map((label) => {
                const stagger = staggerMap.get(label.position) ?? "none";
                return (
                  <div
                    key={label.text}
                    style={labelContainerStyle(label.position, scale, stagger) as Record<string, string | number>}
                  >
                    <div style={labelTextStyle(scale) as Record<string, string | number>}>
                      {label.text}
                    </div>
                  </div>
                );
              })}
            </div>,
          ];
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SVG → PNG rasterization (browser Canvas, no WASM)
// ---------------------------------------------------------------------------

async function svgToPngBlob(
  svgString: string,
  width: number,
  height: number,
): Promise<Blob> {
  const svgBlob = new Blob([svgString], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = new window.Image();
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load SVG as image"));
    });

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2d context");
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.convertToBlob({ type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render a diagram to a PNG Blob using satori (JSX → SVG → Canvas → PNG).
 */
export async function renderDiagramToBlob(
  config: DiagramConfig,
  currentAssetId: string,
  imageDataUrls: Map<string, string>,
  options?: { size?: number },
): Promise<Blob> {
  const size = options?.size ?? CANVAS_SIZE;
  const fonts = await ensureInitialized();

  const element = DiagramElement({
    config,
    currentAssetId,
    imageDataUrls,
    size,
  });

  const svg = await satori(element, {
    width: size,
    height: size,
    fonts,
  });

  return svgToPngBlob(svg, size, size);
}
