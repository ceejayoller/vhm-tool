"use client";

import { useAssets, useParents } from "@/db/hooks";
import { db } from "@/db/db";
import { AssetCard } from "./AssetCard";
import { ExportPanel } from "@/components/export/ExportPanel";
import { ImageIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface AssetGridProps {
  projectId: string;
  parentId: string;
  onEditAsset?: (assetId: string) => void;
}

export function AssetGrid({
  projectId,
  parentId,
  onEditAsset,
}: AssetGridProps) {
  const assets = useAssets(parentId);
  const parents = useParents(projectId);
  const parent = parents?.find((p) => p.id === parentId);
  const parentName = parent?.name ?? "Untitled";

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
      <div className="grid grid-cols-2 gap-2">
        {assets.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            parentName={parentName}
            onEdit={onEditAsset ? () => onEditAsset(asset.id) : undefined}
            onDelete={() => handleDeleteAsset(asset.id)}
          />
        ))}
      </div>

      <Separator />

      <ExportPanel projectId={projectId} parentId={parentId} />
    </div>
  );
}
