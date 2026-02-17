"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ChildFeatureCollection } from "@/types/geo";
import { Upload, X, FileJson, AlertCircle } from "lucide-react";

interface GeoJSONUploadProps {
  geojson: ChildFeatureCollection | null;
  onGeoJSONChangeAction: (geojson: ChildFeatureCollection | null) => void;
}

export function GeoJSONUpload({ geojson, onGeoJSONChangeAction }: GeoJSONUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);

        // Accept FeatureCollection, single Feature, or array of Features
        let features;
        if (data?.type === "FeatureCollection") {
          features = data.features;
        } else if (data?.type === "Feature") {
          features = [data];
        } else if (Array.isArray(data)) {
          features = data;
        } else {
          throw new Error(
            "Must be a GeoJSON FeatureCollection, Feature, or array of Features",
          );
        }

        // Filter to Polygon and MultiPolygon geometries
        const polygonFeatures = features.filter(
          (f: GeoJSON.Feature) =>
            f.geometry &&
            (f.geometry.type === "Polygon" ||
              f.geometry.type === "MultiPolygon"),
        );

        if (polygonFeatures.length === 0) {
          throw new Error("No Polygon or MultiPolygon features found");
        }

        // Ensure each feature has a stable id
        const withIds = polygonFeatures.map(
          (f: GeoJSON.Feature, idx: number) => ({
            ...f,
            id:
              f.id ??
              f.properties?.id ??
              `feature_${idx}`,
          }),
        );

        const fc: ChildFeatureCollection = {
          type: "FeatureCollection",
          features: withIds,
        };

        onGeoJSONChangeAction(fc);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Invalid GeoJSON file",
        );
        onGeoJSONChangeAction(null);
      }
    };
    reader.readAsText(file);
  };

  const clearFile = () => {
    setFileName(null);
    setError(null);
    onGeoJSONChangeAction(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Upload GeoJSON (Optional)</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a GeoJSON file containing child polygons, or skip to draw them
          later in the workspace.
        </p>
      </div>

      {!fileName ? (
        <button
          type="button"
          className="w-full border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <FileJson className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">
            Click to upload GeoJSON file
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            .geojson or .json with FeatureCollection
          </p>
        </button>
      ) : (
        <div className="border rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <FileJson className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{fileName}</p>
                {geojson && !error && (
                  <p className="text-sm text-muted-foreground">
                    {geojson.features.length} polygon feature
                    {geojson.features.length === 1 ? "" : "s"} loaded
                  </p>
                )}
                {error && (
                  <div className="flex items-center gap-1.5 mt-1 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={clearFile}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".geojson,.json,application/json,application/geo+json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
