"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/state/authStore";
import { fetchVhmVessels, fetchLayoutDetail } from "@/lib/api";
import { createProject } from "@/db/crud";
import { computeImageBounds } from "@/utils/bounds";
import type { VesselWithLayouts } from "@/types/api";
import type { ChildFeatureCollection } from "@/types/geo";
import type { Polygon, MultiPolygon } from "geojson";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Ship,
  Search,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Layout,
} from "lucide-react";

type LoadingState = "idle" | "loading" | "error";

export function VesselLayoutPicker() {
  const router = useRouter();
  const { token } = useAuthStore();

  const [vessels, setVessels] = useState<VesselWithLayouts[]>([]);
  const [fetchState, setFetchState] = useState<LoadingState>("loading");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [importingLayoutId, setImportingLayoutId] = useState<string | null>(
    null,
  );

  const loadVessels = useCallback(async () => {
    if (!token) return;
    setFetchState("loading");
    setFetchError(null);
    try {
      const data = await fetchVhmVessels(token);
      setVessels(data);
      setFetchState("idle");
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : "Failed to load vessels",
      );
      setFetchState("error");
    }
  }, [token]);

  useEffect(() => {
    void loadVessels();
  }, [loadVessels]);

  const handleSelectLayout = async (
    vesselName: string,
    layoutId: string,
    layoutName: string,
  ) => {
    if (!token || importingLayoutId) return;
    setImportingLayoutId(layoutId);

    try {
      const detail = await fetchLayoutDetail(token, layoutId);

      const imageResponse = await fetch(detail.ga_plan_url);
      if (!imageResponse.ok) {
        throw new Error(
          `Failed to download GA plan image: ${imageResponse.status}`,
        );
      }
      const imageBlob = await imageResponse.blob();

      const img = await createImageBitmap(imageBlob);
      const bounds = computeImageBounds(img.width, img.height);
      img.close();

      const geojson: ChildFeatureCollection = {
        type: "FeatureCollection",
        features: detail.geojson.features.map((f, idx) => ({
          type: "Feature" as const,
          id: f.properties.id || `feature_${idx}`,
          geometry: f.geometry as Polygon | MultiPolygon,
          properties: { id: f.properties.id, name: f.properties.name },
        })),
      };

      const project = await createProject({
        name: `${vesselName} — ${layoutName}`,
        baseImageBlob: imageBlob,
        baseImageBounds: bounds,
        childGeoJSON: geojson,
      });

      router.push(`/workspace/${project.id}`);
    } catch (err) {
      console.error("Failed to import layout:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Failed to import layout. See console for details.",
      );
      setImportingLayoutId(null);
    }
  };

  const filteredVessels = vessels.filter((v) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      v.imo_number.includes(q) ||
      v.layouts.some((l) => l.name.toLowerCase().includes(q))
    );
  });

  if (fetchState === "loading") {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-4 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (fetchState === "error") {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-medium">Failed to load vessels</p>
              <p className="text-sm text-muted-foreground">{fetchError}</p>
              <Button variant="outline" size="sm" onClick={loadVessels}>
                Try again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (vessels.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Ship className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">No vessels found</h3>
            <p className="text-sm text-muted-foreground">
              No vessels with VHM enabled are associated with your account.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search vessels or layouts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredVessels.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No vessels match your search.
        </p>
      ) : (
        filteredVessels.map((vessel) => (
          <Card key={vessel.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Ship className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">{vessel.name}</CardTitle>
                <span className="text-xs text-muted-foreground ml-auto">
                  IMO {vessel.imo_number}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {vessel.layouts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No layouts available
                </p>
              ) : (
                <ul className="space-y-1">
                  {vessel.layouts.map((layout) => {
                    const isImporting = importingLayoutId === layout.id;
                    return (
                      <li key={layout.id}>
                        <button
                          type="button"
                          disabled={importingLayoutId !== null}
                          onClick={() =>
                            handleSelectLayout(
                              vessel.name,
                              layout.id,
                              layout.name,
                            )
                          }
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left
                            hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {isImporting ? (
                            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                          ) : (
                            <Layout className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className="text-sm font-medium">
                            {layout.name}
                          </span>
                          {isImporting && (
                            <span className="text-xs text-muted-foreground ml-auto">
                              Importing...
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
