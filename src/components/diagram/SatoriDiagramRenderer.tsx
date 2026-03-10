import satori from "satori";
import type { Font } from "satori";
import { db } from "@/db/db";
import type { Asset } from "@/db/db";
import type { DiagramConfig, DiagramViewType } from "@/types/diagram";
import {
  CANVAS_SIZE,
  COLOR_BG,
  COLOR_TEXT,
  COLOR_SUBTEXT,
  COLOR_EMPTY_SLOT_TEXT,
  INSPECTION_TITLE_FONT_SIZE,
  INSPECTION_TITLE_FONT_WEIGHT,
  INSPECTION_PANEL_LABEL_FONT_SIZE,
  INSPECTION_COMPASS_FONT_SIZE,
  INSPECTION_COMPASS_FONT_WEIGHT,
  getDiagramDimensions,
  getInspectionPanelGap,
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

async function getImageDimensions(
  src: string,
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (width && height) {
        resolve({ width, height });
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

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
// Inspection-sheet components
// ---------------------------------------------------------------------------

function Header(props: { title: string; scale: number }) {
  const { title, scale } = props;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        paddingBottom: 0,
        paddingLeft: 12 * scale,
        borderBottom: "none",
      }}
    >
      <div
        style={{
          fontSize: INSPECTION_TITLE_FONT_SIZE * scale,
          fontWeight: INSPECTION_TITLE_FONT_WEIGHT,
          color: COLOR_TEXT,
          lineHeight: 1.05,
        }}
      >
        {title}
      </div>
    </div>
  );
}

// Port, Stbd, Fwd, Aft
const compassLabelStyle = (scale: number) => ({
  fontSize: INSPECTION_COMPASS_FONT_SIZE * scale,
  fontWeight: INSPECTION_COMPASS_FONT_WEIGHT,
  color: COLOR_SUBTEXT,
  letterSpacing: 1,
});

function CompassLayout(props: {
  viewType: DiagramViewType;
  scale: number;
  imageDimensions?: { width: number; height: number };
  containerSize?: { width: number; height: number };
  labelYOffset?: number;
  labelXOffset?: number;
  isSingle?: boolean;
  children: React.ReactNode;
}) {
  const {
    viewType,
    scale,
    imageDimensions,
    containerSize,
    labelYOffset = 0,
    labelXOffset = 0,
    isSingle = false,
    children,
  } = props;
  const bandSize = 12 * scale;
  const isPlan = viewType === "plan";
  const labelStyle = compassLabelStyle(scale);
  const labelGap = 6 * scale;
  const labelGapWide = 10 * scale;
  const singleBottomPad = isSingle ? 8 * scale : 0;
  const availableBox = containerSize
    ? {
        width: Math.max(
          containerSize.width - (bandSize * 2 + labelGapWide * 2),
          0,
        ),
        height: Math.max(
          containerSize.height -
            (isPlan ? bandSize * 2 + labelGap * 2 + singleBottomPad : 0),
          0,
        ),
      }
    : null;
  const fitScale =
    imageDimensions && availableBox
      ? Math.min(
          availableBox.width / imageDimensions.width,
          availableBox.height / imageDimensions.height,
          1,
        )
      : null;
  const imageBoxStyle = imageDimensions && fitScale !== null
    ? {
        width: Math.round(imageDimensions.width * fitScale),
        height: Math.round(imageDimensions.height * fitScale),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }
    : {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      };

  if (isPlan) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: singleBottomPad,
          minHeight: 0,
          minWidth: 0,
        }}
      >
        <div
          style={{
            flex: "0 0 auto",
            height: bandSize,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: labelGap,
            transform: `translateX(${labelXOffset}px)`,
            ...labelStyle,
            textAlign: "center" as const,
          }}
        >
          PORT
        </div>
        <div
          style={{
            flex: "0 0 auto",
            display: "flex",
            flexDirection: "row",
            minHeight: 0,
            minWidth: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              minHeight: 0,
              minWidth: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                flex: "0 0 auto",
                width: bandSize,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: labelGapWide,
                transform: `translateY(${labelYOffset}px)`,
                ...labelStyle,
              }}
            >
              AFT
            </div>
            <div style={imageBoxStyle}>{children}</div>
            <div
              style={{
                flex: "0 0 auto",
                width: bandSize,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: labelGapWide,
                transform: `translateY(${labelYOffset}px)`,
                ...labelStyle,
              }}
            >
              FWD
            </div>
          </div>
        </div>
        <div
          style={{
            flex: "0 0 auto",
            height: bandSize,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: labelGap + singleBottomPad,
            marginBottom: singleBottomPad,
            transform: `translateX(${labelXOffset}px)`,
            ...labelStyle,
            textAlign: "center" as const,
          }}
        >
          STBD
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "row",
        minHeight: 0,
        minWidth: 0,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          minHeight: 0,
          minWidth: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            flex: "0 0 auto",
            width: bandSize,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: labelGapWide,
            transform: `translateY(${labelYOffset}px)`,
            ...labelStyle,
          }}
        >
          AFT
        </div>
        <div style={imageBoxStyle}>{children}</div>
        <div
          style={{
            flex: "0 0 auto",
            width: bandSize,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: labelGapWide,
            transform: `translateY(${labelYOffset}px)`,
            ...labelStyle,
          }}
        >
          FWD
        </div>
      </div>
    </div>
  );
}

function ImageWithCompass(props: {
  src: string;
  viewType: DiagramViewType;
  scale: number;
  imageDimensions?: { width: number; height: number };
  containerSize?: { width: number; height: number };
  labelYOffset?: number;
  isSingle?: boolean;
  labelXOffset?: number;
}) {
  const {
    src,
    viewType,
    scale,
    imageDimensions,
    containerSize,
    labelYOffset,
    isSingle,
    labelXOffset,
  } = props;

  return (
    <CompassLayout
      viewType={viewType}
      scale={scale}
      imageDimensions={imageDimensions}
      containerSize={containerSize}
      labelYOffset={labelYOffset}
      isSingle={isSingle}
      labelXOffset={labelXOffset}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain" as const,
        }}
      />
    </CompassLayout>
  );
}

function Panel(props: {
  scale: number;
  flex?: number;
  children: React.ReactNode;
}) {
  const { flex = 1, children } = props;
  const pad = 0;

  return (
    <div
      style={{
        flex,
        padding: pad,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        minWidth: 0,
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Satori JSX template
// ---------------------------------------------------------------------------

function DiagramElement(props: {
  config: DiagramConfig;
  currentAssetId: string;
  imageDataUrls: Map<string, string>;
  imageDimensions: Map<string, { width: number; height: number }>;
  width: number;
  height: number;
}) {
  const { config, currentAssetId, imageDataUrls, imageDimensions, width, height } = props;
  const scale = Math.min(width, height) / CANVAS_SIZE;
  const pad = 0;
  const gap = getInspectionPanelGap(config.templateType) * scale;
  const labelSafePad = (INSPECTION_COMPASS_FONT_SIZE + 10) * scale;
  const headerHeight = INSPECTION_TITLE_FONT_SIZE * scale * 1.05;

  const panelAreaHeight = Math.max(
    height - pad * 2 - headerHeight - 22 * scale,
    0,
  );
  const panelAreaWidth = Math.max(width - pad * 2, 0);

  const slotCount = config.templateType === "single" ? 1 : 2;
  const slots = config.slots.slice(0, slotCount);
  const isStacked = config.templateType === "stacked";

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: COLOR_BG,
        paddingTop: 12 * scale,
        paddingBottom: 12 * scale,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter",
      }}
    >
      <Header title={config.title} scale={scale} />

      <div
        style={{
          marginTop: 22 * scale,
          flex: 1,
          display: "flex",
          flexDirection: isStacked ? "column" : "row",
          gap,
          paddingLeft: config.templateType === "row" ? labelSafePad : 0,
          paddingRight: config.templateType === "row" ? labelSafePad : 0,
        }}
      >
        {slots.map((slot, i) => {
          const stackedFlex = isStacked ? 5 : 1;
          const assetId =
            slot?.assetId === undefined ? currentAssetId : slot.assetId;
          const usesExplicitSlotAsset = slot?.assetId !== undefined;
          const selectedUrl = assetId ? imageDataUrls.get(assetId) : null;
          const fallbackUrl = imageDataUrls.get(currentAssetId);
          const imgUrl = usesExplicitSlotAsset
            ? (selectedUrl ?? null)
            : (selectedUrl ?? fallbackUrl ?? null);

          const viewType = slot?.viewType ?? "plan";
          const slotImageDimensions = assetId
            ? imageDimensions.get(assetId)
            : undefined;
          const panelWidth = isStacked
            ? panelAreaWidth
            : config.templateType === "row"
              ? Math.max((panelAreaWidth - gap) / 2, 0)
              : panelAreaWidth;
          const panelHeight = isStacked
            ? Math.max(
                ((panelAreaHeight - gap) * stackedFlex) / 10,
                0,
              )
            : panelAreaHeight;
          const labelYOffset =
            config.templateType === "row"
              ? (i === 0 ? 30 * scale : -30 * scale)
              : 0;
          const labelXOffset =
            config.templateType === "stacked"
              ? (i === 0 ? 40 * scale : -40 * scale)
              : 0;
          const isSingle = config.templateType === "single";

          return (
            <Panel key={i} scale={scale} flex={stackedFlex}>
              {imgUrl ? (
                <ImageWithCompass
                  src={imgUrl}
                  viewType={viewType}
                  scale={scale}
                  imageDimensions={slotImageDimensions}
                  containerSize={{ width: panelWidth, height: panelHeight }}
                  labelYOffset={labelYOffset}
                  isSingle={isSingle}
                  labelXOffset={labelXOffset}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    height: "100%",
                    fontSize: INSPECTION_PANEL_LABEL_FONT_SIZE * scale,
                    fontFamily: "Inter",
                    color: COLOR_EMPTY_SLOT_TEXT,
                    textTransform: "uppercase" as const,
                  }}
                >
                  No Screenshot
                </div>
              )}
            </Panel>
          );
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
 * Dimensions default from config.templateType; override via options.
 */
export async function renderDiagramToBlob(
  config: DiagramConfig,
  currentAssetId: string,
  imageDataUrls: Map<string, string>,
  options?: { width?: number; height?: number },
): Promise<Blob> {
  const { width, height } =
    options?.width != null && options?.height != null
      ? { width: options.width, height: options.height }
      : getDiagramDimensions(config.templateType);
  const fonts = await ensureInitialized();
  const slotCount = config.templateType === "single" ? 1 : 2;
  const slots = config.slots.slice(0, slotCount);
  const usedAssetIds = new Set<string>();

  for (const slot of slots) {
    const assetId =
      slot?.assetId === undefined ? currentAssetId : slot.assetId;
    if (assetId) usedAssetIds.add(assetId);
  }

  const imageDimensions = new Map<string, { width: number; height: number }>();
  for (const assetId of usedAssetIds) {
    const src = imageDataUrls.get(assetId);
    if (!src) continue;
    const dimensions = await getImageDimensions(src);
    if (dimensions) {
      imageDimensions.set(assetId, dimensions);
    }
  }

  const element = DiagramElement({
    config,
    currentAssetId,
    imageDataUrls,
    imageDimensions,
    width,
    height,
  });

  const svg = await satori(element, {
    width,
    height,
    fonts,
  });

  return svgToPngBlob(svg, width, height);
}
