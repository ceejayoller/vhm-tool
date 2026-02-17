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
} from "lucide-react";
import { useEditorStore } from "@/state/editorStore";
import { generateId } from "@/utils/id";

interface EditorToolbarProps {
  onCloseAction: () => void;
}

export function EditorToolbar({ onCloseAction }: EditorToolbarProps) {
  const { addOverlay, deleteOverlay, selectedOverlayId, undo, redo } =
    useEditorStore();

  const handleAddText = () => {
    addOverlay({
      type: "text",
      id: generateId("text"),
      x: 50,
      y: 50,
      text: "New Text",
      fontSize: 24,
      fontFamily: "Arial",
      fill: "#000000",
      rotation: 0,
    });
  };

  const handleAddRect = () => {
    addOverlay({
      type: "shape",
      id: generateId("shape"),
      x: 50,
      y: 50,
      width: 100,
      height: 80,
      shapeType: "rect",
      fill: "rgba(59, 130, 246, 0.3)",
      stroke: "#3b82f6",
      strokeWidth: 2,
      rotation: 0,
    });
  };

  const handleAddCircle = () => {
    addOverlay({
      type: "shape",
      id: generateId("shape"),
      x: 100,
      y: 100,
      width: 80,
      height: 80,
      shapeType: "circle",
      fill: "rgba(34, 197, 94, 0.3)",
      stroke: "#22c55e",
      strokeWidth: 2,
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

      <div className="flex-1" />

      <Button size="sm" variant="ghost" onClick={onCloseAction} title="Close editor">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
