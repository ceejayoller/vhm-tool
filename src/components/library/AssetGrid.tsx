"use client";

import { useAssets } from "@/db/hooks";
import { AssetCard } from "./AssetCard";
import { ExportPanel } from "@/components/export/ExportPanel";
import { ImageIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface AssetGridProps {
  parentId: string;
  onEditAsset?: (assetId: string) => void;
}

export function AssetGrid({ parentId, onEditAsset }: AssetGridProps) {
  const assets = useAssets(parentId);

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
            onEdit={onEditAsset ? () => onEditAsset(asset.id) : undefined}
          />
        ))}
      </div>

      <Separator />

      <ExportPanel parentId={parentId} />
    </div>
  );
}
