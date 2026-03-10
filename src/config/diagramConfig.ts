import type { DiagramTemplateType } from "@/types/diagram";

export const LEGACY_CANVAS_SIZE = 360;
export const CANVAS_SIZE = 1080;
export const SCALE_FACTOR = CANVAS_SIZE / LEGACY_CANVAS_SIZE;

export const THUMBNAIL_CANVAS_SIZE = 360;

/** Diagram dimensions by layout: Single=box, Row=4:3, Stacked=3:4 */
export function getDiagramDimensions(
  templateType: DiagramTemplateType,
): { width: number; height: number } {
  switch (templateType) {
    case "row":
      return { width: 1440, height: 1080 };
    case "stacked":
      return { width: 1080, height: 1440 };
    default:
      return { width: CANVAS_SIZE, height: CANVAS_SIZE };
  }
}

// Layout (legacy, used by KonvaEditor / templates)
export const TITLE_HEIGHT = 28 * SCALE_FACTOR;
export const CONTENT_PADDING = 6 * SCALE_FACTOR;
export const SLOT_GAP = 6 * SCALE_FACTOR;
export const LABEL_MARGIN = 14 * SCALE_FACTOR;
export const LABEL_FONT_SIZE = 10 * SCALE_FACTOR;
export const SEPARATOR_LINE_WIDTH = 1 * SCALE_FACTOR;
export const SLOT_BORDER_WIDTH = 1 * SCALE_FACTOR;
export const TITLE_TEXT_OFFSET_X = 4 * SCALE_FACTOR;
export const TITLE_TEXT_OFFSET_Y = 6 * SCALE_FACTOR;

// ---------------------------------------------------------------------------
// Inspection-sheet design tokens (Satori diagram export)
// ---------------------------------------------------------------------------

// Layout
export const INSPECTION_OUTER_PAD = 48;
export const INSPECTION_PANEL_GAP = 22;
/** Gap between panels for row/stacked layouts (more boundary between images) */
export const INSPECTION_PANEL_GAP_MULTI = 48;
export const INSPECTION_PANEL_PADDING = 18;

/** Panel gap for a given layout (single vs multi-panel) */
export function getInspectionPanelGap(templateType: DiagramTemplateType): number {
  return templateType === "single" ? INSPECTION_PANEL_GAP : INSPECTION_PANEL_GAP_MULTI;
}

// Colors (neutral UI + accent)
export const COLOR_BG = "#FFFFFF";
export const COLOR_PANEL_BG = "#F8FAFC";
export const COLOR_BORDER = "#E5E7EB";
export const COLOR_TEXT = "#111827";
export const COLOR_SUBTEXT = "#6B7280";
export const COLOR_ACCENT = "#EF4444";
export const COLOR_EMPTY_SLOT_BG = "#F8FAFC";
export const COLOR_EMPTY_SLOT_TEXT = "#6B7280";

// Typography
export const INSPECTION_TITLE_FONT_SIZE = 44;
export const INSPECTION_TITLE_FONT_WEIGHT = 800;
export const INSPECTION_SUBTITLE_FONT_SIZE = 18;
export const INSPECTION_SUBTITLE_FONT_WEIGHT = 600;
export const INSPECTION_PANEL_LABEL_FONT_SIZE = 13;
export const INSPECTION_PANEL_LABEL_FONT_WEIGHT = 800;
export const INSPECTION_PANEL_LABEL_LETTER_SPACING = 1;
export const INSPECTION_COMPASS_FONT_SIZE = 18;
export const INSPECTION_COMPASS_FONT_WEIGHT = 600;
