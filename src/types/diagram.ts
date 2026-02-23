import type { Asset } from "@/db/db";

export type DiagramTemplateType = "single" | "row" | "stacked";
export type DiagramViewType = "plan" | "side";

export interface DiagramSlot {
  assetId?: string;
  viewType: DiagramViewType;
}

export interface DiagramConfig {
  templateType: DiagramTemplateType;
  title: string;
  slots: DiagramSlot[];
}

const DEFAULT_TITLE = "Untitled";

/**
 * Get diagram config from asset's editState, with defaults.
 * Slot 0 uses current asset when assetId is undefined.
 */
export function getDiagramConfig(
  asset: Asset,
  parentName: string,
): DiagramConfig {
  const raw = asset?.editState?.diagram;
  if (raw && typeof raw === "object" && "templateType" in raw) {
    const r = raw as Record<string, unknown>;
    const templateType = (r.templateType as DiagramTemplateType) ?? "single";
    const title = (r.title as string) ?? parentName ?? DEFAULT_TITLE;
    let slots = (r.slots as DiagramSlot[]) ?? [];

    if (templateType === "single" && slots.length > 1) {
      slots = slots.slice(0, 1);
    }
    if (templateType === "row" || templateType === "stacked") {
      if (slots.length < 2) {
        slots = [
          ...slots,
          ...Array.from({ length: 2 - slots.length }, () => ({
            viewType: "plan" as DiagramViewType,
          })),
        ];
      }
      slots = slots.slice(0, 2);
    }
    if (templateType === "single" && slots.length === 0) {
      slots = [{ viewType: "plan" }];
    }
    return {
      templateType,
      title,
      slots: slots.map((s) => ({
        assetId: typeof s?.assetId === "string" ? s.assetId : undefined,
        viewType: s?.viewType === "side" ? "side" : "plan",
      })),
    };
  }

  return {
    templateType: "single",
    title: parentName ?? DEFAULT_TITLE,
    slots: [{ viewType: "plan" }],
  };
}

/**
 * Merge diagram config into editState, preserving other editState fields.
 */
export function buildEditStateWithDiagram(
  editState: Record<string, unknown> | undefined,
  config: DiagramConfig,
): Record<string, unknown> {
  return {
    ...editState,
    diagram: config,
  };
}
