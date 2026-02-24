"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Stage,
  Layer,
  Image as KImage,
  Rect,
  Text,
  Circle,
  Ellipse,
  Transformer,
} from "react-konva";
import type Konva from "konva";
import { db } from "@/db/db";
import type { Asset } from "@/db/db";
import { updateAsset, storeBlob } from "@/db/crud";
import { useEditorStore } from "@/state/editorStore";
import { EditorToolbar } from "./EditorToolbar";
import {
  getDiagramConfig,
  buildEditStateWithDiagram,
  type DiagramConfig,
  type DiagramTemplateType,
  type DiagramViewType,
} from "@/types/diagram";
import {
  renderDiagramToBlob,
  loadDiagramImages,
} from "@/components/diagram/DiagramRenderer";
import { ScreenshotPickerModal } from "@/components/diagram/ScreenshotPickerModal";
import type { TemplateOverlay } from "@/types/template";
import {
  CANVAS_SIZE,
  LEGACY_CANVAS_SIZE,
} from "@/config/diagramConfig";
import { scaleOverlays } from "@/utils/overlays";

interface KonvaEditorProps {
  assetId: string;
  onCloseAction: () => void;
}

export default function KonvaEditor({
  assetId,
  onCloseAction,
}: KonvaEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [stageSize, setStageSize] = useState({
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
  });
  const [diagramConfig, setDiagramConfig] = useState<DiagramConfig | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    overlays,
    selectedOverlayId,
    selectOverlay,
    updateOverlay,
    setSelectedAsset,
  } = useEditorStore();

  const renderBaseImage = useCallback(async (config: DiagramConfig) => {
    const asset = await db.assets.get(assetId);
    if (!asset) return;

    const assetsById = new Map<string, Asset>();
    const ids = new Set<string>([asset.id]);
    for (const slot of config.slots) {
      if (slot?.assetId) ids.add(slot.assetId);
    }
    for (const id of ids) {
      const a = await db.assets.get(id);
      if (a) assetsById.set(id, a);
    }

    const images = await loadDiagramImages(config, asset, assetsById);
    const blob = await renderDiagramToBlob(config, assetId, images);

    for (const [, bm] of images) {
      bm.close();
    }

    const url = URL.createObjectURL(blob);
    const img = new window.Image();
    img.src = url;
    await new Promise<void>((resolve) => {
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
    });
    setBaseImage(img);
  }, [assetId]);

  useEffect(() => {
    const init = async () => {
      const asset = await db.assets.get(assetId);
      if (!asset) return;

      const parent = await db.parents.get(asset.parentId);
      const parentName = parent?.name ?? "Untitled";

      setProjectId(asset.projectId);

      const config = getDiagramConfig(asset, parentName);
      setDiagramConfig(config);

      const initialOverlays = (asset.editState?.overlays as TemplateOverlay[] | undefined)
        ?.filter(
          (o): o is TemplateOverlay =>
            o && typeof o === "object" && "id" in o && "type" in o,
        ) ?? [];
      const storedVersion =
        typeof (asset.editState as Record<string, unknown> | undefined)?.overlayCoordVersion === "number"
          ? (asset.editState as Record<string, unknown>).overlayCoordVersion as number
          : LEGACY_CANVAS_SIZE;
      const scale = storedVersion === CANVAS_SIZE ? 1 : CANVAS_SIZE / storedVersion;
      const scaledOverlays = scaleOverlays(initialOverlays, scale);
      setSelectedAsset(assetId, scaledOverlays);

      await renderBaseImage(config);
    };
    init();
  }, [assetId, setSelectedAsset, renderBaseImage]);

  useEffect(() => {
    if (!diagramConfig) return;
    renderBaseImage(diagramConfig);
  }, [diagramConfig, renderBaseImage]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const scale = Math.min(
          rect.width / CANVAS_SIZE,
          rect.height / CANVAS_SIZE,
        );
        setStageSize({
          width: CANVAS_SIZE * scale,
          height: CANVAS_SIZE * scale,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    if (selectedOverlayId) {
      const node = stage.findOne(`#${selectedOverlayId}`);
      if (node) {
        tr.nodes([node]);
        tr.getLayer()?.batchDraw();
        return;
      }
    }
    tr.nodes([]);
    tr.getLayer()?.batchDraw();
  }, [selectedOverlayId, overlays]);

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target === e.target.getStage()) {
        selectOverlay(null);
      }
    },
    [selectOverlay],
  );

  const handleTemplateChange = useCallback(
    (type: DiagramTemplateType) => {
      setDiagramConfig((prev) => {
        if (!prev) return prev;
        if (type === "single") {
          return {
            templateType: "single",
            title: prev.title,
            slots: [prev.slots[0] ?? { viewType: "plan" }],
          };
        }
        if (type === "row" || type === "stacked") {
          const slot0 = prev.slots[0] ?? { viewType: "plan" as DiagramViewType };
          const slot1 = prev.slots[1] ?? { viewType: "plan" as DiagramViewType };
          return {
            templateType: type,
            title: prev.title,
            slots: [slot0, slot1],
          };
        }
        return prev;
      });
    },
    [],
  );

  const handleViewTypeChange = useCallback((slotIndex: number, viewType: DiagramViewType) => {
    setDiagramConfig((prev) => {
      if (!prev) return prev;
      const slots = [...prev.slots];
      while (slots.length <= slotIndex) {
        slots.push({ viewType: "plan" });
      }
      slots[slotIndex] = { ...slots[slotIndex], viewType };
      return { ...prev, slots };
    });
  }, []);

  const handleSlotClick = useCallback((slotIndex: number) => {
    setEditingSlotIndex(slotIndex);
    setPickerOpen(true);
  }, []);

  const handlePickerSelect = useCallback((selectedAssetId: string) => {
    setDiagramConfig((prev) => {
      if (!prev || editingSlotIndex === null) return prev;
      const targetIndex = editingSlotIndex;
      const slots = [...prev.slots];
      while (slots.length <= targetIndex) {
        slots.push({ viewType: "plan" });
      }
      slots[targetIndex] = {
        ...slots[targetIndex],
        assetId: selectedAssetId,
        viewType: slots[targetIndex]?.viewType ?? "plan",
      };
      return { ...prev, slots };
    });
    setPickerOpen(false);
    setEditingSlotIndex(null);
  }, [editingSlotIndex]);

  const handleSave = useCallback(async () => {
    if (!diagramConfig) return;

    setSaving(true);
    try {
      const asset = await db.assets.get(assetId);
      if (!asset) return;

      const assetsById = new Map<string, Asset>();
      const ids = new Set<string>([asset.id]);
      for (const slot of diagramConfig.slots) {
        if (slot?.assetId) ids.add(slot.assetId);
      }
      for (const id of ids) {
        const a = await db.assets.get(id);
        if (a) assetsById.set(id, a);
      }

      const images = await loadDiagramImages(diagramConfig, asset, assetsById);
      const baseBlob = await renderDiagramToBlob(
        diagramConfig,
        assetId,
        images,
      );

      for (const [, bm] of images) {
        bm.close();
      }

      const stage = stageRef.current;
      const needComposite = stage && overlays.length > 0;
      if (needComposite) {
        const pixelRatio = CANVAS_SIZE / stageSize.width;
        const dataUrl = stage.toDataURL({ pixelRatio });
        const resp = await fetch(dataUrl);
        const finalBlob = await resp.blob();
        const finalBlobId = await storeBlob(finalBlob, "final", "image/png");
        const editState = buildEditStateWithDiagram(asset.editState, diagramConfig);
        (editState as Record<string, unknown>).overlays = overlays;
        (editState as Record<string, unknown>).overlayCoordVersion = CANVAS_SIZE;
        await updateAsset(assetId, {
          finalBlobId,
          editState,
          status: "final",
        });
      } else {
        const finalBlobId = await storeBlob(baseBlob, "final", "image/png");
        const editState = buildEditStateWithDiagram(asset.editState, diagramConfig);
        (editState as Record<string, unknown>).overlays = overlays;
        (editState as Record<string, unknown>).overlayCoordVersion = CANVAS_SIZE;
        await updateAsset(assetId, {
          finalBlobId,
          editState,
          status: "final",
        });
      }
    } finally {
      setSaving(false);
    }
  }, [assetId, diagramConfig, overlays, stageSize.width]);

  const handleClose = useCallback(async () => {
    if (!diagramConfig) {
      onCloseAction();
      return;
    }

    const asset = await db.assets.get(assetId);
    if (asset) {
      const editState = buildEditStateWithDiagram(asset.editState, diagramConfig);
      (editState as Record<string, unknown>).overlays = overlays;
      (editState as Record<string, unknown>).overlayCoordVersion = CANVAS_SIZE;
      await updateAsset(assetId, { editState });
    }

    onCloseAction();
  }, [assetId, diagramConfig, overlays, onCloseAction]);

  const scale =
    stageSize.width > 0 ? stageSize.width / CANVAS_SIZE : 1;

  return (
    <div className="flex flex-col h-full">
      <EditorToolbar
        onCloseAction={handleClose}
        diagramConfig={diagramConfig ?? undefined}
        onTemplateChange={diagramConfig ? handleTemplateChange : undefined}
        onSlotClick={diagramConfig ? handleSlotClick : undefined}
        onViewTypeChange={diagramConfig ? handleViewTypeChange : undefined}
      />
      <div className="flex gap-2 px-2 py-1 border-b items-center">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
      <div ref={containerRef} className="flex-1 bg-muted overflow-hidden flex items-center justify-center">
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          onClick={handleStageClick}
          scaleX={scale}
          scaleY={scale}
        >
          <Layer>
            {baseImage && (
              <KImage image={baseImage} width={CANVAS_SIZE} height={CANVAS_SIZE} />
            )}
            {overlays.map((overlay) => {
              const commonProps = {
                id: overlay.id,
                draggable: true,
                onClick: () => selectOverlay(overlay.id),
                onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
                  updateOverlay(overlay.id, {
                    x: e.target.x(),
                    y: e.target.y(),
                  });
                },
              };

              if (overlay.type === "text") {
                return (
                  <Text
                    key={overlay.id}
                    {...commonProps}
                    x={overlay.x}
                    y={overlay.y}
                    text={overlay.text}
                    fontSize={overlay.fontSize}
                    fontFamily={overlay.fontFamily}
                    fill={overlay.fill}
                    rotation={overlay.rotation}
                  />
                );
              }

              if (overlay.type === "shape" && overlay.shapeType === "rect") {
                return (
                  <Rect
                    key={overlay.id}
                    {...commonProps}
                    x={overlay.x}
                    y={overlay.y}
                    width={overlay.width}
                    height={overlay.height}
                    fill={overlay.fill}
                    stroke={overlay.stroke}
                    strokeWidth={overlay.strokeWidth}
                    rotation={overlay.rotation}
                  />
                );
              }

              if (overlay.type === "shape" && overlay.shapeType === "circle") {
                return (
                  <Circle
                    key={overlay.id}
                    {...commonProps}
                    x={overlay.x + overlay.width / 2}
                    y={overlay.y + overlay.height / 2}
                    radius={overlay.width / 2}
                    fill={overlay.fill}
                    stroke={overlay.stroke}
                    strokeWidth={overlay.strokeWidth}
                  />
                );
              }

              if (overlay.type === "shape" && overlay.shapeType === "ellipse") {
                return (
                  <Ellipse
                    key={overlay.id}
                    {...commonProps}
                    x={overlay.x + overlay.width / 2}
                    y={overlay.y + overlay.height / 2}
                    radiusX={overlay.width / 2}
                    radiusY={overlay.height / 2}
                    fill={overlay.fill}
                    stroke={overlay.stroke}
                    strokeWidth={overlay.strokeWidth}
                    rotation={overlay.rotation}
                  />
                );
              }

              return null;
            })}
            <Transformer ref={transformerRef} />
          </Layer>
        </Stage>
      </div>

      {projectId && (
        <ScreenshotPickerModal
          open={pickerOpen}
          onOpenChange={(open) => {
            setPickerOpen(open);
            if (!open) setEditingSlotIndex(null);
          }}
          projectId={projectId}
          excludeAssetId={assetId}
          onSelect={handlePickerSelect}
        />
      )}
    </div>
  );
}
