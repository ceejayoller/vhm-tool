"use client";

import { Button } from "@/components/ui/button";
import type { DiagramViewType } from "@/types/diagram";

interface ViewTypeToggleProps {
  value: DiagramViewType;
  onChange: (value: DiagramViewType) => void;
  slotIndex: number;
}

export function ViewTypeToggle({
  value,
  onChange,
  slotIndex,
}: ViewTypeToggleProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground mr-1">
        Slot {slotIndex + 1}:
      </span>
      <Button
        size="sm"
        variant={value === "plan" ? "secondary" : "ghost"}
        className="h-7 text-xs"
        onClick={() => onChange("plan")}
      >
        Plan
      </Button>
      <Button
        size="sm"
        variant={value === "side" ? "secondary" : "ghost"}
        className="h-7 text-xs"
        onClick={() => onChange("side")}
      >
        Side
      </Button>
    </div>
  );
}
