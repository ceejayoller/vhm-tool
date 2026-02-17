const activeBlobUrls = new Set<string>();

export function createBlobUrl(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  activeBlobUrls.add(url);
  return url;
}

export function revokeBlobUrl(url: string): void {
  URL.revokeObjectURL(url);
  activeBlobUrls.delete(url);
}

export function revokeAllBlobUrls(): void {
  activeBlobUrls.forEach((url) => URL.revokeObjectURL(url));
  activeBlobUrls.clear();
}
