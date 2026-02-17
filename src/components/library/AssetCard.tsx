"use client";

import { useEffect, useState } from "react";
import type { Asset } from "@/db/db";
import { db } from "@/db/db";
import { Download, Edit2 } from "lucide-react";

interface AssetCardProps {
  asset: Asset;
  onEdit?: () => void;
}

export function AssetCard({ asset, onEdit }: AssetCardProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;

    const loadThumb = async () => {
      const blobId = asset.previewBlobId ?? asset.workingBlobId ?? asset.finalBlobId;
      if (!blobId) return;
      const record = await db.blobs.get(blobId);
      if (!record) return;
      url = URL.createObjectURL(record.blob);
      setThumbnailUrl(url);
    };

    loadThumb();

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [asset.previewBlobId, asset.workingBlobId, asset.finalBlobId]);

  const handleDownload = async () => {
    const blobId = asset.finalBlobId ?? asset.previewBlobId;
    if (!blobId) return;
    const record = await db.blobs.get(blobId);
    if (!record) return;

    const url = URL.createObjectURL(record.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${asset.childId}.png`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="group relative rounded-md overflow-hidden border bg-muted">
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={`Asset ${asset.childId}`}
          className="w-full aspect-square object-cover"
        />
      ) : (
        <div className="w-full aspect-square flex items-center justify-center">
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
      </div>

      {/* Label */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5">
        <p className="text-[10px] text-white truncate">{asset.childId}</p>
      </div>
    </div>
  );
}
