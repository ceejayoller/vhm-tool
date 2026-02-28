export interface StorageEstimateResult {
  usage: number;
  quota: number;
  usagePercent: number;
  /** Chrome-only: IndexedDB usage in bytes, when available */
  indexedDBUsage?: number;
}

export async function getStorageEstimate(): Promise<StorageEstimateResult> {
  if ("storage" in navigator && "estimate" in navigator.storage) {
    const estimate = (await navigator.storage.estimate()) as {
      usage?: number;
      quota?: number;
      usageDetails?: { indexedDB?: number; indexeddb?: number };
    };
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const details = estimate.usageDetails;
    const indexedDBUsage =
      details?.indexedDB ?? details?.indexeddb ?? undefined;
    return {
      usage,
      quota,
      usagePercent: quota > 0 ? (usage / quota) * 100 : 0,
      ...(indexedDBUsage !== undefined && { indexedDBUsage }),
    };
  }
  return { usage: 0, quota: 0, usagePercent: 0 };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  );
}
