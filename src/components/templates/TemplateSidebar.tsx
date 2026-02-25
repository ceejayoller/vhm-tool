"use client";

import { useParents } from "@/db/hooks";
import { AssetGrid } from "@/components/library/AssetGrid";
import { ExportPanel } from "@/components/export/ExportPanel";

interface TemplateSidebarProps {
  projectId: string;
  parentId: string;
  onEditAssetAction?: (assetId: string) => void;
}

export function TemplateSidebar({
  projectId,
  parentId,
  onEditAssetAction,
}: TemplateSidebarProps) {
  const parents = useParents(projectId);
  const parent = parents?.find((p) => p.id === parentId);
  const parentName = parent?.name ?? "Selected parent";

  return (
    <div className="w-80 border-l bg-background overflow-hidden shrink-0 flex flex-col">
      <div className="p-4 border-b shrink-0 space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Templates
        </p>
        <h2 className="text-lg font-semibold leading-tight truncate">
          {parentName}
        </h2>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-3">
          <p className="text-xs text-muted-foreground mb-3">
            Drag to reorder for template layout
          </p>
          <AssetGrid
            projectId={projectId}
            parentId={parentId}
            onEditAssetAction={onEditAssetAction}
          />
        </div>
      </div>

      <div className="shrink-0 border-t p-4 bg-muted/30">
        <ExportPanel projectId={projectId} parentId={parentId} />
      </div>
    </div>
  );
}
