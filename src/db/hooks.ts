"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import type { Project, Parent, Asset, Template, BlobRecord } from "./db";
import { getStorageEstimate } from "@/utils/storageEstimate";

const FALLBACK_AVG_BYTES_PER_DIAGRAM = 400_000; // ~400 KB for 1080px PNG
const STORAGE_POLL_INTERVAL_MS = 30_000;

export interface StorageStatus {
  usage: number;
  quota: number;
  usagePercent: number;
  totalBlobBytes: number;
  assetCount: number;
  avgBytesPerDiagram: number;
  diagramsRemaining: number | null;
  loading: boolean;
  /** Chrome-only: IndexedDB usage from Storage API when available */
  indexedDBUsage?: number;
}

export function useStorageStatus(): StorageStatus {
  const [storage, setStorage] = useState<{
    usage: number;
    quota: number;
    usagePercent: number;
    indexedDBUsage?: number;
  } | null>(null);

  const totalBlobBytes = useLiveQuery(
    async () => {
      const records = await db.blobs.toArray();
      return records.reduce((sum, r) => sum + (r.blob?.size ?? 0), 0);
    },
    [],
  );

  const assetCount = useLiveQuery(() => db.assets.count(), []);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      const est = await getStorageEstimate();
      if (!cancelled) setStorage(est);
    };
    fetch();
    const id = setInterval(fetch, STORAGE_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const onFocus = () => getStorageEstimate().then(setStorage);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const usage = storage?.usage ?? 0;
  const quota = storage?.quota ?? 0;
  const usagePercent = storage?.usagePercent ?? 0;
  const tb = totalBlobBytes ?? 0;
  const ac = assetCount ?? 0;
  const avgBytesPerDiagram =
    ac > 0 ? tb / ac : FALLBACK_AVG_BYTES_PER_DIAGRAM;
  const remaining = Math.max(0, quota - usage);
  const diagramsRemaining =
    avgBytesPerDiagram > 0 ? Math.floor(remaining / avgBytesPerDiagram) : null;

  return {
    usage,
    quota,
    usagePercent,
    totalBlobBytes: tb,
    assetCount: ac,
    avgBytesPerDiagram,
    diagramsRemaining,
    loading: storage === null,
    ...(storage?.indexedDBUsage !== undefined && {
      indexedDBUsage: storage.indexedDBUsage,
    }),
  };
}

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
        ? db.parents.where("projectId").equals(projectId).sortBy("sortOrder")
        : [],
    [projectId],
  );
}

export function useAssets(parentId: string | undefined): Asset[] | undefined {
  return useLiveQuery(
    () =>
      parentId
        ? db.assets.where("parentId").equals(parentId).sortBy("sortOrder")
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
