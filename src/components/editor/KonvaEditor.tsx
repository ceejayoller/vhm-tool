"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Stage, Layer, Image as KImage, Rect, Text, Circle, Transformer } from "react-konva";
import type Konva from "konva";
import { db } from "@/db/db";
import { useEditorStore } from "@/state/editorStore";
import { EditorToolbar } from "./EditorToolbar";

interface KonvaEditorProps {
  assetId: string;
  onClose: () => void;
}

export default function KonvaEditor({ assetId, onClose }: KonvaEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  const {
    overlays,
    selectedOverlayId,
    selectOverlay,
    updateOverlay,
    setSelectedAsset,
  } = useEditorStore();

  // Load asset image
  useEffect(() => {
    setSelectedAsset(assetId);

    const loadImage = async () => {
      const asset = await db.assets.get(assetId);
      if (!asset) return;

      const blobId = asset.previewBlobId ?? asset.workingBlobId ?? asset.finalBlobId;
      if (!blobId) return;

      const record = await db.blobs.get(blobId);
      if (!record) return;

      const url = URL.createObjectURL(record.blob);
      const img = new window.Image();
      img.src = url;
      img.onload = () => {
        setImage(img);
        URL.revokeObjectURL(url);
      };
    };

    loadImage();
  }, [assetId, setSelectedAsset]);

  // Resize stage to fit container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setStageSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Update transformer when selection changes
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

  // Calculate scale to fit image in stage
  const scale = image
    ? Math.min(stageSize.width / image.width, stageSize.height / image.height, 1)
    : 1;
  const imgW = image ? image.width * scale : 0;
  const imgH = image ? image.height * scale : 0;
  const offsetX = (stageSize.width - imgW) / 2;
  const offsetY = (stageSize.height - imgH) / 2;

  return (
    <div className="flex flex-col h-full">
      <EditorToolbar onClose={onClose} />
      <div ref={containerRef} className="flex-1 bg-muted overflow-hidden">
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          onClick={handleStageClick}
        >
          <Layer x={offsetX} y={offsetY} scaleX={scale} scaleY={scale}>
            {image && <KImage image={image} />}

            {overlays.map((overlay) => {
              const commonProps = {
                id: overlay.id,
                key: overlay.id,
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

              return null;
            })}

            <Transformer ref={transformerRef} />
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
