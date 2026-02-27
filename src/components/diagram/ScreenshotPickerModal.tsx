"use client";

import Image from "next/image";
import { MapPin } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarProvider,
} from "@/components/ui/sidebar";
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
  const [userSelectedParentId, setUserSelectedParentId] = useState<
    string | null
  >(null);
  const urlsRef = useRef<Record<string, string>>({});

  const filtered = useMemo(
    () => assets?.filter((a) => a.id !== excludeAssetId) ?? [],
    [assets, excludeAssetId]
  );

  const byParent = useMemo(() => {
    const map = new Map<string, Asset[]>();
    for (const a of filtered) {
      const list = map.get(a.parentId) ?? [];
      list.push(a);
      map.set(a.parentId, list);
    }
    return map;
  }, [filtered]);

  const parentsWithAssets = useMemo(
    () => (parents ?? []).filter((p) => (byParent.get(p.id)?.length ?? 0) > 0),
    [parents, byParent]
  );

  // Derive effective selection: use user pick if valid, otherwise first parent
  const selectedParentId = useMemo(() => {
    if (!open) return null;
    const userPickValid =
      userSelectedParentId !== null &&
      parentsWithAssets.some((p) => p.id === userSelectedParentId);
    if (userPickValid) return userSelectedParentId;
    return parentsWithAssets[0]?.id ?? null;
  }, [open, userSelectedParentId, parentsWithAssets]);

  const selectedParent = parentsWithAssets.find(
    (p) => p.id === selectedParentId
  );
  const activeParentAssets = selectedParentId
    ? (byParent.get(selectedParentId) ?? [])
    : [];

  // Load blob URLs for thumbnails.
  // Old URLs are kept valid until new ones are ready (deferred revocation)
  // to avoid ERR_FILE_NOT_FOUND from rendering stale revoked URLs.
  useEffect(() => {
    if (!open || !filtered.length) return;

    let cancelled = false;
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
      if (!cancelled) {
        // Atomically swap: revoke old URLs only after new ones exist
        Object.values(urlsRef.current).forEach(URL.revokeObjectURL);
        urlsRef.current = urls;
        setThumbUrls(urls);
      } else {
        // Load was cancelled — discard the URLs we just created
        Object.values(urls).forEach(URL.revokeObjectURL);
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [open, filtered]);

  // Revoke all remaining URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(urlsRef.current).forEach(URL.revokeObjectURL);
      urlsRef.current = {};
    };
  }, []);

  const handleSelect = (assetId: string) => {
    onSelectAction(assetId);
    onOpenChangeAction(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
        <DialogTitle className="sr-only">
          Choose screenshot for slot
        </DialogTitle>
        <DialogDescription className="sr-only">
          Select a screenshot from one of the parent regions.
        </DialogDescription>
        <SidebarProvider className="items-start">
          <Sidebar collapsible="none" className="hidden md:flex">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {!parents ? (
                      <>
                        <SidebarMenuSkeleton showIcon />
                        <SidebarMenuSkeleton showIcon />
                        <SidebarMenuSkeleton showIcon />
                      </>
                    ) : (
                      parentsWithAssets.map((parent) => (
                        <SidebarMenuItem key={parent.id}>
                          <SidebarMenuButton
                            isActive={parent.id === selectedParentId}
                            onClick={() => setUserSelectedParentId(parent.id)}
                          >
                            <MapPin className="size-4" />
                            <span>{parent.name}</span>
                          </SidebarMenuButton>
                          <SidebarMenuBadge>
                            {byParent.get(parent.id)?.length ?? 0}
                          </SidebarMenuBadge>
                        </SidebarMenuItem>
                      ))
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          <main className="flex h-[480px] flex-1 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              {/* Mobile: parent selector dropdown */}
              <div className="flex flex-1 items-center gap-2 md:hidden">
                <MapPin className="size-4 shrink-0 text-muted-foreground" />
                <select
                  value={selectedParentId ?? ""}
                  onChange={(e) => setUserSelectedParentId(e.target.value)}
                  className="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Select parent region"
                >
                  {parentsWithAssets.map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.name} ({byParent.get(parent.id)?.length ?? 0})
                    </option>
                  ))}
                </select>
              </div>
              {/* Desktop: breadcrumb */}
              <div className="hidden items-center gap-2 md:flex">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="#">Screenshots</BreadcrumbLink>
                    </BreadcrumbItem>
                    {selectedParent && (
                      <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbPage>
                            {selectedParent.name}
                          </BreadcrumbPage>
                        </BreadcrumbItem>
                      </>
                    )}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
              {activeParentAssets.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No screenshots available.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {activeParentAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => handleSelect(asset.id)}
                      className="relative aspect-square overflow-hidden rounded-md border bg-muted transition-all hover:ring-2 hover:ring-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {thumbUrls[asset.id] ? (
                        <Image
                          src={thumbUrls[asset.id]}
                          alt={asset.childId}
                          fill
                          sizes="(max-width: 768px) 50vw, 200px"
                          className="object-contain"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                          Loading
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                        <p className="truncate text-[10px] text-white">
                          {asset.childId}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
}
