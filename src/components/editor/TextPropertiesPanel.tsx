"use client";

import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SCALE_FACTOR } from "@/config/diagramConfig";
import type { TextOverlay } from "@/types/template";

const FONT_FAMILIES = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Courier New",
  "Georgia",
  "Verdana",
  "Impact",
] as const;

interface TextPropertiesPanelProps {
  overlay: TextOverlay;
  onUpdateAction: (updates: Partial<TextOverlay>) => void;
}

export function TextPropertiesPanel({ overlay, onUpdateAction }: TextPropertiesPanelProps) {
  const displayFontSize = overlay.fontSize / SCALE_FACTOR;

  const handleFontSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.valueAsNumber;
      if (!Number.isNaN(val) && val > 0) {
        onUpdateAction({ fontSize: val * SCALE_FACTOR });
      }
    },
    [onUpdateAction],
  );

  const handleRotationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.valueAsNumber;
      if (!Number.isNaN(val)) {
        onUpdateAction({ rotation: val });
      }
    },
    [onUpdateAction],
  );

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdateAction({ text: e.target.value });
    },
    [onUpdateAction],
  );

  const handleFontFamilyChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onUpdateAction({ fontFamily: e.target.value });
    },
    [onUpdateAction],
  );

  const handleFillChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdateAction({ fill: e.target.value });
    },
    [onUpdateAction],
  );

  return (
    <div className="w-64 shrink-0 border-l bg-background p-3">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="text-content">Text</Label>
          <Input
            id="text-content"
            value={overlay.text}
            onChange={handleTextChange}
            className="font-sans"
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="font-size">Font size</Label>
          <Input
            id="font-size"
            type="number"
            min={1}
            value={displayFontSize}
            onChange={handleFontSizeChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="font-family">Font family</Label>
          <select
            id="font-family"
            value={overlay.fontFamily}
            onChange={handleFontFamilyChange}
            className="h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            {FONT_FAMILIES.map((fam) => (
              <option key={fam} value={fam}>
                {fam}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fill-color">Fill color</Label>
          <div className="flex gap-2">
            <input
              type="color"
              id="fill-color"
              value={overlay.fill}
              onChange={handleFillChange}
              className="h-9 w-12 cursor-pointer rounded border border-input bg-transparent p-1"
            />
            <Input
              value={overlay.fill}
              onChange={handleFillChange}
              placeholder="#000000"
              className="flex-1 font-mono text-sm"
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="rotation">Rotation (deg)</Label>
          <Input
            id="rotation"
            type="number"
            value={overlay.rotation}
            onChange={handleRotationChange}
          />
        </div>
      </div>
    </div>
  );
}
