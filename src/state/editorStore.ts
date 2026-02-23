import { create } from "zustand";
import type { TemplateOverlay } from "@/types/template";

interface EditorState {
  selectedAssetId: string | null;
  overlays: TemplateOverlay[];
  selectedOverlayId: string | null;
  history: TemplateOverlay[][];
  historyIndex: number;
}

interface EditorActions {
  setSelectedAsset: (id: string | null, initialOverlays?: TemplateOverlay[]) => void;
  setOverlays: (overlays: TemplateOverlay[]) => void;
  addOverlay: (overlay: TemplateOverlay) => void;
  updateOverlay: (id: string, updates: Partial<TemplateOverlay>) => void;
  deleteOverlay: (id: string) => void;
  selectOverlay: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
}

const initialState: EditorState = {
  selectedAssetId: null,
  overlays: [],
  selectedOverlayId: null,
  history: [[]],
  historyIndex: 0,
};

function pushHistory(
  state: EditorState,
  newOverlays: TemplateOverlay[],
): Partial<EditorState> {
  const trimmed = state.history.slice(0, state.historyIndex + 1);
  return {
    overlays: newOverlays,
    history: [...trimmed, newOverlays],
    historyIndex: trimmed.length,
  };
}

export const useEditorStore = create<EditorState & EditorActions>(
  (set) => ({
    ...initialState,

    setSelectedAsset: (id, initialOverlays) =>
      set({
        selectedAssetId: id,
        overlays: initialOverlays ?? [],
        selectedOverlayId: null,
        history: [initialOverlays ?? []],
        historyIndex: 0,
      }),

    setOverlays: (overlays) =>
      set((state) => pushHistory(state, overlays)),

    addOverlay: (overlay) =>
      set((state) => {
        const newOverlays = [...state.overlays, overlay];
        return pushHistory(state, newOverlays);
      }),

    updateOverlay: (id, updates) =>
      set((state) => {
        const newOverlays = state.overlays.map((o) =>
          o.id === id ? ({ ...o, ...updates } as TemplateOverlay) : o,
        );
        return pushHistory(state, newOverlays);
      }),

    deleteOverlay: (id) =>
      set((state) => {
        const newOverlays = state.overlays.filter((o) => o.id !== id);
        return {
          ...pushHistory(state, newOverlays),
          selectedOverlayId:
            state.selectedOverlayId === id
              ? null
              : state.selectedOverlayId,
        };
      }),

    selectOverlay: (id) => set({ selectedOverlayId: id }),

    undo: () =>
      set((state) => {
        if (state.historyIndex <= 0) return state;
        return {
          overlays: state.history[state.historyIndex - 1],
          historyIndex: state.historyIndex - 1,
        };
      }),

    redo: () =>
      set((state) => {
        if (state.historyIndex >= state.history.length - 1) return state;
        return {
          overlays: state.history[state.historyIndex + 1],
          historyIndex: state.historyIndex + 1,
        };
      }),

    reset: () => set(initialState),
  }),
);
