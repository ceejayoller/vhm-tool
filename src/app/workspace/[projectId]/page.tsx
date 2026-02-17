"use client";

import { use } from "react";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  return <WorkspaceShell projectId={projectId} />;
}
