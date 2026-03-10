"use client";

import { useEffect, useState } from "react";
import type { Asset } from "@/db/db";
import { db } from "@/db/db";
import { Download, Edit2, Trash2 } from "lucide-react";
import Image from "next/image";
import { getDiagramConfig } from "@/types/diagram";
import {
  renderDiagramToBlob,
  loadDiagramImageDataUrls,
} from "@/components/diagram/SatoriDiagramRenderer";
import {
  getDiagramDimensions,
  THUMBNAIL_CANVAS_SIZE,
} from "@/config/diagramConfig";

interface AssetCardProps {
  asset: Asset;
  parentName: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function AssetCard({ asset, parentName, onEdit, onDelete }: AssetCardProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;

    const loadThumb = async () => {
      const config = getDiagramConfig(asset, parentName);
      const dims = getDiagramDimensions(config.templateType);
      const scale = THUMBNAIL_CANVAS_SIZE / Math.max(dims.width, dims.height);
      const thumbWidth = Math.round(dims.width * scale);
      const thumbHeight = Math.round(dims.height * scale);

      const assetsById = new Map<string, Asset>();
      if (config.slots[1]?.assetId) {
        const a = await db.assets.get(config.slots[1].assetId);
        if (a) assetsById.set(a.id, a);
      }
      assetsById.set(asset.id, asset);

      const imageDataUrls = await loadDiagramImageDataUrls(config, asset, assetsById);
      const blob = await renderDiagramToBlob(config, asset.id, imageDataUrls, {
        width: thumbWidth,
        height: thumbHeight,
      });

      url = URL.createObjectURL(blob);
      setThumbnailUrl(url);
    };

    loadThumb();

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [asset, parentName]);

  const handleDownload = async () => {
    if (asset.finalBlobId) {
      const record = await db.blobs.get(asset.finalBlobId);
      if (record) {
        const url = URL.createObjectURL(record.blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${asset.childId}.png`;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }
    }

    const config = getDiagramConfig(asset, parentName);
    const assetsById = new Map<string, Asset>();
    if (config.slots[1]?.assetId) {
      const a = await db.assets.get(config.slots[1].assetId);
      if (a) assetsById.set(a.id, a);
    }
    assetsById.set(asset.id, asset);

    const imageDataUrls = await loadDiagramImageDataUrls(config, asset, assetsById);
    const blob = await renderDiagramToBlob(config, asset.id, imageDataUrls);

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${asset.childId}.png`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="group relative w-full aspect-square rounded-md overflow-hidden border bg-muted">
      {thumbnailUrl ? (
        <Image
          src={thumbnailUrl}
          alt={`Asset ${asset.childId}`}
          fill
          sizes="100vw"
          className="object-contain"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-xs text-muted-foreground">Loading...</span>
        </div>
      )}

      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        {onEdit && (
          <button
            onClick={onEdit}
            className="p-1.5 rounded-md bg-white/20 hover:bg-white/30 transition-colors"
            title="Edit"
          >
            <Edit2 className="h-4 w-4 text-white" />
          </button>
        )}
        <button
          onClick={handleDownload}
          className="p-1.5 rounded-md bg-white/20 hover:bg-white/30 transition-colors"
          title="Download"
        >
          <Download className="h-4 w-4 text-white" />
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-1.5 rounded-md bg-red-500/60 hover:bg-red-500/80 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-white" />
          </button>
        )}
      </div>

      {/* Label */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5">
        <p className="text-[10px] text-white truncate">{asset.childId}</p>
      </div>
    </div>
  );
}
