"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useProject } from "@/db/hooks";
import { Topbar } from "./Topbar";
import { ParentSidebar } from "@/components/library/ParentSidebar";

const LeafletMap = dynamic(() => import("@/components/map/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-muted">
      <p className="text-muted-foreground">Loading map...</p>
    </div>
  ),
});

const KonvaEditor = dynamic(
  () => import("@/components/editor/KonvaEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-muted">
        <p className="text-muted-foreground">Loading editor...</p>
      </div>
    ),
  },
);

interface WorkspaceShellProps {
  projectId: string;
}

export function WorkspaceShell({ projectId }: WorkspaceShellProps) {
  const project = useProject(projectId);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(
    null,
  );
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);

  if (project === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading project...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Project not found</h2>
          <p className="text-muted-foreground">
            This project may have been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Topbar project={project} />
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          {editingAssetId ? (
            <KonvaEditor
              assetId={editingAssetId}
              onClose={() => setEditingAssetId(null)}
            />
          ) : (
            <LeafletMap projectId={projectId} />
          )}
        </div>
        <ParentSidebar
          projectId={projectId}
          selectedParentId={selectedParentId}
          onSelectParent={setSelectedParentId}
          onEditAsset={setEditingAssetId}
        />
      </div>
    </div>
  );
}
