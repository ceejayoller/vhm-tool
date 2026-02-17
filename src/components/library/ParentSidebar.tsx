"use client";

import { useState } from "react";
import { useParents, useAssets } from "@/db/hooks";
import { deleteParent } from "@/db/crud";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Wand2, Folder, Trash2 } from "lucide-react";
import {
  generateAssetsForParent,
  type GenerationProgress,
} from "@/components/generation/GenerationEngine";
import { AssetGrid } from "./AssetGrid";

interface ParentSidebarProps {
  projectId: string;
  selectedParentId: string | null;
  onSelectParent: (id: string | null) => void;
  onEditAsset?: (assetId: string) => void;
}

export function ParentSidebar({
  projectId,
  selectedParentId,
  onSelectParent,
  onEditAsset,
}: ParentSidebarProps) {
  const parents = useParents(projectId);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);

  const handleGenerate = async (parentId: string) => {
    setGeneratingId(parentId);
    setProgress(null);

    try {
      await generateAssetsForParent({
        projectId,
        parentId,
        onProgress: setProgress,
      });
    } catch (error) {
      console.error("Generation failed:", error);
    } finally {
      setGeneratingId(null);
      setProgress(null);
    }
  };

  return (
    <div className="w-80 border-l bg-background overflow-y-auto shrink-0 flex flex-col">
      <div className="p-4 border-b shrink-0">
        <h2 className="font-semibold">Parent Polygons</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Draw polygons on the map to create parent capture areas
        </p>
      </div>

      <div className="p-3 space-y-2 shrink-0">
        {!parents || parents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Folder className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No parent polygons yet</p>
            <p className="text-xs mt-1">Use the draw tools on the map</p>
          </div>
        ) : (
          parents.map((parent) => (
            <ParentCard
              key={parent.id}
              parent={parent}
              isSelected={selectedParentId === parent.id}
              projectId={projectId}
              generating={generatingId === parent.id}
              onSelect={() =>
                onSelectParent(
                  selectedParentId === parent.id ? null : parent.id,
                )
              }
              onGenerate={() => handleGenerate(parent.id)}
            />
          ))
        )}
      </div>

      {/* Generation progress indicator */}
      {progress && progress.phase === "rendering" && (
        <div className="p-3 border-t shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <Wand2 className="h-4 w-4 animate-pulse text-primary" />
            <span className="text-sm font-medium">
              Generating: {progress.parentName}
            </span>
          </div>
          <Progress
            value={
              progress.total > 0
                ? (progress.current / progress.total) * 100
                : 0
            }
          />
          <p className="text-xs text-muted-foreground mt-1">
            {progress.current} / {progress.total} images
          </p>
        </div>
      )}

      {/* Asset grid for selected parent */}
      {selectedParentId && (
        <div className="flex-1 border-t overflow-y-auto">
          <div className="p-3">
            <h3 className="font-medium text-sm mb-2">Generated Assets</h3>
            <AssetGrid parentId={selectedParentId} onEditAsset={onEditAsset} />
          </div>
        </div>
      )}
    </div>
  );
}

function ParentCard({
  parent,
  isSelected,
  projectId,
  generating,
  onSelect,
  onGenerate,
}: {
  parent: { id: string; name: string; color: string };
  isSelected: boolean;
  projectId: string;
  generating: boolean;
  onSelect: () => void;
  onGenerate: () => void;
}) {
  const assets = useAssets(parent.id);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete parent "${parent.name}" and all its assets?`)) {
      await deleteParent(parent.id);
    }
  };

  const handleGenerate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onGenerate();
  };

  return (
    <Card
      className={`cursor-pointer transition-colors ${isSelected ? "ring-2 ring-primary" : ""}`}
      onClick={onSelect}
    >
      <CardHeader className="p-3 pb-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: parent.color }}
            />
            <CardTitle className="text-sm truncate">{parent.name}</CardTitle>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleGenerate}
              disabled={generating}
              title="Generate screenshots"
            >
              <Wand2
                className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        <p className="text-xs text-muted-foreground">
          {assets?.length ?? 0} generated asset
          {(assets?.length ?? 0) !== 1 ? "s" : ""}
        </p>
      </CardContent>
    </Card>
  );
}
