export interface TextOverlay {
  type: "text";
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  rotation: number;
}

export interface ShapeOverlay {
  type: "shape";
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shapeType: "rect" | "circle" | "ellipse";
  fill: string;
  stroke: string;
  strokeWidth: number;
  rotation: number;
}

export interface ImageOverlayItem {
  type: "image";
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  blobId: string;
  rotation: number;
}

export type TemplateOverlay = TextOverlay | ShapeOverlay | ImageOverlayItem;

export interface TemplateSpec {
  overlays: Array<{
    type: string;
    props: Record<string, unknown>;
  }>;
}
