import { create } from "zustand";

interface SelectionState {
  selectedParentId: string | null;
  selectedAssetId: string | null;
  editorOpen: boolean;
}

interface SelectionActions {
  selectParent: (id: string | null) => void;
  selectAsset: (id: string | null) => void;
  openEditor: (assetId: string) => void;
  closeEditor: () => void;
}

export const useSelectionStore = create<SelectionState & SelectionActions>(
  (set) => ({
    selectedParentId: null,
    selectedAssetId: null,
    editorOpen: false,

    selectParent: (id) => set({ selectedParentId: id }),
    selectAsset: (id) => set({ selectedAssetId: id }),
    openEditor: (assetId) =>
      set({ selectedAssetId: assetId, editorOpen: true }),
    closeEditor: () => set({ editorOpen: false }),
  }),
);
