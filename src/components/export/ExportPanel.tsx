"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download } from "lucide-react";
import { useAssets, useParents } from "@/db/hooks";
import { db } from "@/db/db";
import type { Asset } from "@/db/db";
import { getDiagramConfig } from "@/types/diagram";
import {
  renderDiagramToBlob,
  loadDiagramImageDataUrls,
} from "@/components/diagram/SatoriDiagramRenderer";

interface ExportPanelProps {
  projectId: string;
  parentId: string;
}

export function ExportPanel({ projectId, parentId }: ExportPanelProps) {
  const assets = useAssets(parentId);
  const parents = useParents(projectId);
  const parent = parents?.find((p) => p.id === parentId);
  const parentName = parent?.name ?? "Untitled";
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleExportAll = async () => {
    if (!assets || assets.length === 0) return;

    setExporting(true);
    setProgress({ current: 0, total: assets.length });

    try {
      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];

        if (asset.finalBlobId) {
          const record = await db.blobs.get(asset.finalBlobId);
          if (record) {
            const url = URL.createObjectURL(record.blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${asset.childId}.png`;
            link.click();
            URL.revokeObjectURL(url);
          }
        } else {
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
        }

        setProgress({ current: i + 1, total: assets.length });
        await new Promise((r) => setTimeout(r, 150));
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExporting(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Total assets:</span>
        <span className="font-medium">{assets?.length ?? 0}</span>
      </div>

      <Button
        className="w-full"
        onClick={handleExportAll}
        disabled={exporting || !assets || assets.length === 0}
        size="sm"
      >
        <Download className="h-4 w-4 mr-2" />
        {exporting ? "Exporting..." : "Export All PNGs"}
      </Button>

      {exporting && (
        <div>
          <Progress
            value={
              progress.total > 0
                ? (progress.current / progress.total) * 100
                : 0
            }
          />
          <p className="text-xs text-muted-foreground mt-1 text-center">
            {progress.current} / {progress.total} files
          </p>
        </div>
      )}
    </div>
  );
}
