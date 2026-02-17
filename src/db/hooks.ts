"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import type { Project, Parent, Asset, Template, BlobRecord } from "./db";

export function useProjects(): Project[] | undefined {
  return useLiveQuery(() =>
    db.projects.orderBy("updatedAt").reverse().toArray(),
  );
}

export function useProject(id: string | undefined): Project | undefined {
  return useLiveQuery(() => (id ? db.projects.get(id) : undefined), [id]);
}

export function useParents(projectId: string | undefined): Parent[] | undefined {
  return useLiveQuery(
    () =>
      projectId
        ? db.parents.where("projectId").equals(projectId).toArray()
        : [],
    [projectId],
  );
}

export function useAssets(parentId: string | undefined): Asset[] | undefined {
  return useLiveQuery(
    () =>
      parentId
        ? db.assets.where("parentId").equals(parentId).toArray()
        : [],
    [parentId],
  );
}

export function useProjectAssets(
  projectId: string | undefined,
): Asset[] | undefined {
  return useLiveQuery(
    () =>
      projectId
        ? db.assets.where("projectId").equals(projectId).toArray()
        : [],
    [projectId],
  );
}

export function useTemplates(): Template[] | undefined {
  return useLiveQuery(() =>
    db.templates.orderBy("updatedAt").reverse().toArray(),
  );
}

export function useBlobRecord(
  blobId: string | undefined,
): BlobRecord | undefined {
  return useLiveQuery(
    () => (blobId ? db.blobs.get(blobId) : undefined),
    [blobId],
  );
}

export function useBlobUrl(blobId: string | undefined): string | undefined {
  const blobRecord = useBlobRecord(blobId);
  if (!blobRecord) return undefined;
  return URL.createObjectURL(blobRecord.blob);
}
