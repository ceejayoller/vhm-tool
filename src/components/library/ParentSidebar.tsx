"use client";

import { useState } from "react";
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
import { useParents, useAssets } from "@/db/hooks";
import { deleteParent, reorderParents } from "@/db/crud";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Wand2, Folder, Trash2, GripVertical } from "lucide-react";
import {
  generateAssetsForParent,
  type GenerationProgress,
} from "@/components/generation/GenerationEngine";

interface ParentSidebarProps {
  projectId: string;
  selectedParentId: string | null;
  onSelectParentAction: (id: string | null) => void;
}

export function ParentSidebar({
  projectId,
  selectedParentId,
  onSelectParentAction,
}: ParentSidebarProps) {
  const parents = useParents(projectId);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !parents) return;

    const oldIndex = parents.findIndex((p) => p.id === active.id);
    const newIndex = parents.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(parents, oldIndex, newIndex);
    await reorderParents(projectId, reordered.map((p) => p.id));
  };

  return (
    <div className="w-72 border-l bg-background overflow-hidden shrink-0 flex flex-col">
      <div className="p-4 border-b shrink-0">
        <h2 className="font-semibold">Parent Polygons</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Draw polygons on the map to create parent capture areas
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-3">
          <p className="text-xs text-muted-foreground mb-2">
            Drag to reorder for template layout
          </p>
          {!parents || parents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Folder className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No parent polygons yet</p>
              <p className="text-xs mt-1">Use the draw tools on the map</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={parents.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2 min-h-0">
                  {parents.map((parent, index) => (
                    <SortableParentCard
                      key={parent.id}
                      parent={parent}
                      order={index + 1}
                      isSelected={selectedParentId === parent.id}
                      generating={generatingId === parent.id}
                      onSelectAction={() =>
                        onSelectParentAction(
                          selectedParentId === parent.id ? null : parent.id,
                        )
                      }
                      onGenerateAction={() => handleGenerate(parent.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
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
    </div>
  );
}

function SortableParentCard({
  parent,
  order,
  isSelected,
  generating,
  onSelectAction,
  onGenerateAction,
}: {
  parent: { id: string; name: string; color: string };
  order: number;
  isSelected: boolean;
  generating: boolean;
  onSelectAction: () => void;
  onGenerateAction: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: parent.id });

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
      <button
        type="button"
        className="p-2 rounded cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted touch-manipulation shrink-0"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <ParentCard
        parent={parent}
        order={order}
        isSelected={isSelected}
        generating={generating}
        onSelectAction={onSelectAction}
        onGenerateAction={onGenerateAction}
      />
    </div>
  );
}

function ParentCard({
  parent,
  order,
  isSelected,
  generating,
  onSelectAction,
  onGenerateAction,
}: {
  parent: { id: string; name: string; color: string };
  order: number;
  isSelected: boolean;
  generating: boolean;
  onSelectAction: () => void;
  onGenerateAction: () => void;
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
    onGenerateAction();
  };

  return (
    <Card
      className={`relative cursor-pointer transition-colors flex-1 min-w-0 ${isSelected ? "ring-2 ring-primary" : ""}`}
      onClick={onSelectAction}
    >
      <span
        className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground"
        aria-hidden
      >
        {order}
      </span>
      <CardHeader className="p-2 pb-1 pl-8">
        <div className="flex items-center justify-between gap-2">
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
              className="h-8 w-8 p-0"
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
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-0">
        <p className="text-xs text-muted-foreground">
          {assets?.length ?? 0} generated asset
          {(assets?.length ?? 0) !== 1 ? "s" : ""}
        </p>
      </CardContent>
    </Card>
  );
}
