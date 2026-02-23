import type {
  DiagramTemplateType,
  DiagramViewType,
  DiagramSlot,
} from "@/types/diagram";

const CANVAS_SIZE = 360;
const TITLE_HEIGHT = 28;
const CONTENT_PADDING = 6;
const SLOT_GAP = 6;
const LABEL_MARGIN = 14;
const LABEL_FONT_SIZE = 10;

export interface LabelSpec {
  text: string;
  x: number;
  y: number;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
}

export interface SlotLayout {
  slotRect: { x: number; y: number; width: number; height: number };
  imageRect: { x: number; y: number; width: number; height: number };
  labels: LabelSpec[];
}

export interface LayoutResult {
  titleRect: { x: number; y: number; width: number; height: number };
  slotLayouts: SlotLayout[];
}

function labelsForViewType(
  viewType: DiagramViewType,
  slotRect: { x: number; y: number; width: number; height: number },
): LabelSpec[] {
  const { x, y, width, height } = slotRect;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const m = LABEL_MARGIN;

  if (viewType === "plan") {
    return [
      { text: "Port", x: cx, y: y + m / 2, textAlign: "center", textBaseline: "middle" },
      { text: "Stbd", x: cx, y: y + height - m / 2, textAlign: "center", textBaseline: "middle" },
      { text: "Fwd", x: x + width - m / 2, y: cy, textAlign: "center", textBaseline: "middle" },
      { text: "Aft", x: x + m / 2, y: cy, textAlign: "center", textBaseline: "middle" },
    ];
  }
  // side view: Fwd (right), Aft (left) only
  return [
    { text: "Fwd", x: x + width - m / 2, y: cy, textAlign: "center", textBaseline: "middle" },
    { text: "Aft", x: x + m / 2, y: cy, textAlign: "center", textBaseline: "middle" },
  ];
}

export function computeLayout(
  templateType: DiagramTemplateType,
  slots: DiagramSlot[],
): LayoutResult {
  const titleRect = {
    x: 0,
    y: 0,
    width: CANVAS_SIZE,
    height: TITLE_HEIGHT,
  };

  const contentTop = TITLE_HEIGHT + CONTENT_PADDING;
  const contentWidth = CANVAS_SIZE - CONTENT_PADDING * 2;
  const contentHeight = CANVAS_SIZE - contentTop - CONTENT_PADDING;

  const slotLayouts: SlotLayout[] = [];

  const n = templateType === "single" ? 1 : 2;

  if (templateType === "single") {
    const slotW = contentWidth;
    const slotH = contentHeight;
    const slotRect = {
      x: CONTENT_PADDING,
      y: contentTop,
      width: slotW,
      height: slotH,
    };
    const viewType = slots[0]?.viewType ?? "plan";
    slotLayouts.push({
      slotRect,
      imageRect: {
        x: slotRect.x + LABEL_MARGIN,
        y: slotRect.y + LABEL_MARGIN,
        width: slotRect.width - LABEL_MARGIN * 2,
        height: slotRect.height - LABEL_MARGIN * 2,
      },
      labels: labelsForViewType(viewType, slotRect),
    });
  } else if (templateType === "row") {
    const slotW = (contentWidth - SLOT_GAP) / 2;
    const slotH = contentHeight;
    for (let i = 0; i < n; i++) {
      const slotRect = {
        x: CONTENT_PADDING + i * (slotW + SLOT_GAP),
        y: contentTop,
        width: slotW,
        height: slotH,
      };
      const viewType = slots[i]?.viewType ?? "plan";
      slotLayouts.push({
        slotRect,
        imageRect: {
          x: slotRect.x + LABEL_MARGIN,
          y: slotRect.y + LABEL_MARGIN,
          width: slotRect.width - LABEL_MARGIN * 2,
          height: slotRect.height - LABEL_MARGIN * 2,
        },
        labels: labelsForViewType(viewType, slotRect),
      });
    }
  } else if (templateType === "stacked") {
    const slotW = contentWidth;
    const slotH = (contentHeight - SLOT_GAP) / 2;
    for (let i = 0; i < n; i++) {
      const slotRect = {
        x: CONTENT_PADDING,
        y: contentTop + i * (slotH + SLOT_GAP),
        width: slotW,
        height: slotH,
      };
      const viewType = slots[i]?.viewType ?? "plan";
      slotLayouts.push({
        slotRect,
        imageRect: {
          x: slotRect.x + LABEL_MARGIN,
          y: slotRect.y + LABEL_MARGIN,
          width: slotRect.width - LABEL_MARGIN * 2,
          height: slotRect.height - LABEL_MARGIN * 2,
        },
        labels: labelsForViewType(viewType, slotRect),
      });
    }
  }

  return { titleRect, slotLayouts };
}

export function getLabelFontSize(): number {
  return LABEL_FONT_SIZE;
}
