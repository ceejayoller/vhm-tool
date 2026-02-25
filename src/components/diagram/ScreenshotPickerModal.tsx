"use client";

import Image from "next/image";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProjectAssets, useParents } from "@/db/hooks";
import { db } from "@/db/db";
import type { Asset } from "@/db/db";

interface ScreenshotPickerModalProps {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  projectId: string;
  excludeAssetId: string;
  onSelectAction: (assetId: string) => void;
}

export function ScreenshotPickerModal({
  open,
  onOpenChangeAction,
  projectId,
  excludeAssetId,
  onSelectAction,
}: ScreenshotPickerModalProps) {
  const assets = useProjectAssets(projectId);
  const parents = useParents(projectId);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>(
    () => ({})
  );
  const urlsRef = useRef<Record<string, string>>({});

  const filtered = useMemo(
    () => assets?.filter((a) => a.id !== excludeAssetId) ?? [],
    [assets, excludeAssetId]
  );
  const byParent = new Map<string, Asset[]>();
  for (const a of filtered) {
    const list = byParent.get(a.parentId) ?? [];
    list.push(a);
    byParent.set(a.parentId, list);
  }

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => setExpandedParents({}));
    return () => cancelAnimationFrame(id);
  }, [open]);

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
  }, [open, filtered]);

  const handleSelect = (assetId: string) => {
    onSelectAction(assetId);
    onOpenChangeAction(false);
  };

  const toggleParent = (parentId: string) => {
    setExpandedParents((prev) => ({
      ...prev,
      [parentId]: !prev[parentId],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="flex max-h-[80vh] max-w-md flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Choose screenshot for slot</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-2 pr-4 pb-4">
            {parents?.map((parent) => {
              const parentAssets = byParent.get(parent.id) ?? [];
              if (parentAssets.length === 0) return null;

              const isExpanded = expandedParents[parent.id];
              const contentId = `screenshot-picker-content-${parent.id}`;

              return (
                <div key={parent.id}>
                  <button
                    type="button"
                    onClick={() => toggleParent(parent.id)}
                    aria-expanded={isExpanded}
                    aria-controls={contentId}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-base font-semibold text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 shrink-0" aria-hidden />
                    ) : (
                      <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />
                    )}
                    <span className="truncate">{parent.name}</span>
                  </button>
                  {isExpanded && (
                    <div
                      id={contentId}
                      role="region"
                      aria-label={`${parent.name} screenshots`}
                      className="grid grid-cols-3 gap-2 pl-7 pt-1"
                    >
                      {parentAssets.map((asset) => (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => handleSelect(asset.id)}
                          className="relative aspect-square rounded-md overflow-hidden border bg-muted hover:ring-2 hover:ring-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                        >
                          {thumbUrls[asset.id] ? (
                            <Image
                              src={thumbUrls[asset.id]}
                              alt={asset.childId}
                              fill
                              sizes="(max-width: 768px) 33vw, 160px"
                              className="object-contain"
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
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
