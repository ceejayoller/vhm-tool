"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAssets, useParents } from "@/db/hooks";
import { db } from "@/db/db";
import { reorderAssets } from "@/db/crud";
import { AssetCard } from "./AssetCard";
import { ImageIcon, GripVertical } from "lucide-react";
import type { Asset } from "@/db/db";

interface AssetGridProps {
  projectId: string;
  parentId: string;
  onEditAssetAction?: (assetId: string) => void;
}

function SortableAssetCard({
  asset,
  order,
  parentName,
  onEdit,
  onDelete,
}: {
  asset: Asset;
  order: number;
  parentName: string;
  onEdit?: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: asset.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 ${isDragging ? "opacity-50" : ""}`}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
        aria-hidden
      >
        {order}
      </span>
      <button
        type="button"
        className="p-2 rounded cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted touch-manipulation shrink-0"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="w-28 shrink-0">
        <AssetCard
          asset={asset}
          parentName={parentName}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

export function AssetGrid({
  projectId,
  parentId,
  onEditAssetAction,
}: AssetGridProps) {
  const assets = useAssets(parentId);
  const parents = useParents(projectId);
  const parent = parents?.find((p) => p.id === parentId);
  const parentName = parent?.name ?? "Untitled";

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDeleteAsset = async (assetId: string) => {
    const asset = await db.assets.get(assetId);
    if (!asset) return;

    await db.transaction("rw", db.assets, db.blobs, async () => {
      if (asset.previewBlobId) await db.blobs.delete(asset.previewBlobId);
      if (asset.workingBlobId) await db.blobs.delete(asset.workingBlobId);
      if (asset.finalBlobId) await db.blobs.delete(asset.finalBlobId);
      await db.assets.delete(assetId);
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !assets) return;

    const oldIndex = assets.findIndex((a) => a.id === active.id);
    const newIndex = assets.findIndex((a) => a.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(assets, oldIndex, newIndex);
    await reorderAssets(parentId, reordered.map((a) => a.id));
  };

  if (!assets || assets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No assets generated yet</p>
        <p className="text-xs mt-1">
          Click the wand icon to generate screenshots
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={assets.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-3">
            {assets.map((asset, index) => (
              <SortableAssetCard
                key={asset.id}
                asset={asset}
                order={index + 1}
                parentName={parentName}
                onEdit={
                  onEditAssetAction
                    ? () => onEditAssetAction(asset.id)
                    : undefined
                }
                onDelete={() => handleDeleteAsset(asset.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
