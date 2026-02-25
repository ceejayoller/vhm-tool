"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Type,
  Square,
  Circle,
  Undo,
  Redo,
  Trash2,
  X,
  LayoutTemplate,
  Columns2,
  Rows2,
  RefreshCw,
} from "lucide-react";
import { useEditorStore } from "@/state/editorStore";
import { generateId } from "@/utils/id";
import { ViewTypeToggle } from "@/components/diagram/ViewTypeToggle";
import type { DiagramConfig, DiagramTemplateType, DiagramViewType } from "@/types/diagram";
import { SCALE_FACTOR } from "@/config/diagramConfig";

interface EditorToolbarProps {
  onCloseAction: () => void;
  diagramConfig?: DiagramConfig;
  onTemplateChange?: (type: DiagramTemplateType) => void;
  onSlotClick?: (slotIndex: number) => void;
  onViewTypeChange?: (slotIndex: number, viewType: DiagramViewType) => void;
}

export function EditorToolbar({
  onCloseAction,
  diagramConfig,
  onTemplateChange,
  onSlotClick,
  onViewTypeChange,
}: EditorToolbarProps) {
  const { addOverlay, deleteOverlay, selectedOverlayId, undo, redo } =
    useEditorStore();

  const handleAddText = () => {
    addOverlay({
      type: "text",
      id: generateId("text"),
      x: 50 * SCALE_FACTOR,
      y: 50 * SCALE_FACTOR,
      text: "New Text",
      fontSize: 24 * SCALE_FACTOR,
      fontFamily: "Arial",
      fill: "#000000",
      rotation: 0,
    });
  };

  const handleAddRect = () => {
    addOverlay({
      type: "shape",
      id: generateId("shape"),
      x: 50 * SCALE_FACTOR,
      y: 50 * SCALE_FACTOR,
      width: 100 * SCALE_FACTOR,
      height: 80 * SCALE_FACTOR,
      shapeType: "rect",
      fill: "rgba(59, 130, 246, 0.3)",
      stroke: "#3b82f6",
      strokeWidth: 2 * SCALE_FACTOR,
      rotation: 0,
    });
  };

  const handleAddCircle = () => {
    addOverlay({
      type: "shape",
      id: generateId("shape"),
      x: 100 * SCALE_FACTOR,
      y: 100 * SCALE_FACTOR,
      width: 80 * SCALE_FACTOR,
      height: 80 * SCALE_FACTOR,
      shapeType: "circle",
      fill: "rgba(34, 197, 94, 0.3)",
      stroke: "#22c55e",
      strokeWidth: 2 * SCALE_FACTOR,
      rotation: 0,
    });
  };

  const handleDelete = () => {
    if (selectedOverlayId) deleteOverlay(selectedOverlayId);
  };

  return (
    <div className="h-12 border-b flex items-center gap-1 px-4 bg-background shrink-0">
      <Button size="sm" variant="ghost" onClick={handleAddText}>
        <Type className="h-4 w-4 mr-1.5" />
        Text
      </Button>
      <Button size="sm" variant="ghost" onClick={handleAddRect}>
        <Square className="h-4 w-4 mr-1.5" />
        Rect
      </Button>
      <Button size="sm" variant="ghost" onClick={handleAddCircle}>
        <Circle className="h-4 w-4 mr-1.5" />
        Circle
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Button size="sm" variant="ghost" onClick={undo} title="Undo">
        <Undo className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={redo} title="Redo">
        <Redo className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Button
        size="sm"
        variant="ghost"
        onClick={handleDelete}
        disabled={!selectedOverlayId}
        title="Delete selected"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      {diagramConfig && onTemplateChange && (
        <>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Button
            size="sm"
            variant={diagramConfig.templateType === "single" ? "secondary" : "ghost"}
            onClick={() => onTemplateChange("single")}
            title="Single (1 screenshot)"
          >
            <LayoutTemplate className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={diagramConfig.templateType === "row" ? "secondary" : "ghost"}
            onClick={() => onTemplateChange("row")}
            title="Row (2 side-by-side)"
          >
            <Columns2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={diagramConfig.templateType === "stacked" ? "secondary" : "ghost"}
            onClick={() => onTemplateChange("stacked")}
            title="Stacked (2 vertical)"
          >
            <Rows2 className="h-4 w-4" />
          </Button>
          {(diagramConfig.templateType === "row" ||
            diagramConfig.templateType === "stacked") &&
            onViewTypeChange && (
              <>
                {diagramConfig.slots.map((slot, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <ViewTypeToggle
                      slotIndex={i}
                      value={slot?.viewType ?? "plan"}
                      onChangeAction={(v) => onViewTypeChange(i, v)}
                    />
                    {onSlotClick && i > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSlotClick(i)}
                        className="text-xs h-7"
                        title={slot?.assetId ? `Change Slot ${i + 1}` : `Pick Slot ${i + 1}`}
                      >
                        {slot?.assetId ? (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Change
                          </>
                        ) : (
                          `Pick Slot ${i + 1}`
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </>
            )}
        </>
      )}

      <div className="flex-1" />

      <Button size="sm" variant="ghost" onClick={onCloseAction} title="Close editor">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
