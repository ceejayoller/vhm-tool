import type { TemplateOverlay } from "./template";

export interface EditorState {
  selectedAssetId: string | null;
  overlays: TemplateOverlay[];
  selectedOverlayId: string | null;
}

export interface EditorActions {
  setSelectedAsset: (id: string | null) => void;
  setOverlays: (overlays: TemplateOverlay[]) => void;
  addOverlay: (overlay: TemplateOverlay) => void;
  updateOverlay: (id: string, updates: Partial<TemplateOverlay>) => void;
  deleteOverlay: (id: string) => void;
  selectOverlay: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
}
