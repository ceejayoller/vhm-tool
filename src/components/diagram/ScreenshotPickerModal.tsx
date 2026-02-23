"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProjectAssets, useParents } from "@/db/hooks";
import { db } from "@/db/db";
import type { Asset } from "@/db/db";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ScreenshotPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  excludeAssetId: string;
  onSelect: (assetId: string) => void;
}

export function ScreenshotPickerModal({
  open,
  onOpenChange,
  projectId,
  excludeAssetId,
  onSelect,
}: ScreenshotPickerModalProps) {
  const assets = useProjectAssets(projectId);
  const parents = useParents(projectId);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const urlsRef = useRef<Record<string, string>>({});

  const filtered = assets?.filter((a) => a.id !== excludeAssetId) ?? [];
  const byParent = new Map<string, Asset[]>();
  for (const a of filtered) {
    const list = byParent.get(a.parentId) ?? [];
    list.push(a);
    byParent.set(a.parentId, list);
  }

  useEffect(() => {
    if (!open || !filtered.length) return;

    let mounted = true;
    Object.values(urlsRef.current).forEach(URL.revokeObjectURL);
    urlsRef.current = {};

    const load = async () => {
      const urls: Record<string, string> = {};
      for (const asset of filtered) {
        const blobId =
          asset.previewBlobId ?? asset.workingBlobId ?? asset.finalBlobId;
        if (!blobId) continue;
        const record = await db.blobs.get(blobId);
        if (!record) continue;
        urls[asset.id] = URL.createObjectURL(record.blob);
      }
      urlsRef.current = urls;
      if (mounted) setThumbUrls(urls);
    };
    load();

    return () => {
      mounted = false;
      Object.values(urlsRef.current).forEach(URL.revokeObjectURL);
      urlsRef.current = {};
    };
  }, [open, filtered.map((a) => a.id).join(",")]);

  const handleSelect = (assetId: string) => {
    onSelect(assetId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose screenshot for slot</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {parents?.map((parent) => {
              const parentAssets = byParent.get(parent.id) ?? [];
              if (parentAssets.length === 0) return null;

              return (
                <div key={parent.id}>
                  <h4 className="text-sm font-medium mb-2 truncate">
                    {parent.name}
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {parentAssets.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => handleSelect(asset.id)}
                        className="relative aspect-square rounded-md overflow-hidden border bg-muted hover:ring-2 hover:ring-primary transition-all"
                      >
                        {thumbUrls[asset.id] ? (
                          <img
                            src={thumbUrls[asset.id]}
                            alt={asset.childId}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                            Loading
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                          <p className="text-[10px] text-white truncate">
                            {asset.childId}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
