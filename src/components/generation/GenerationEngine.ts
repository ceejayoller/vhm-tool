import { db } from "@/db/db";
import { createAsset } from "@/db/crud";
import * as turf from "@turf/turf";
import { CanvasRenderer } from "./CanvasRenderer";
import type { Polygon } from "geojson";

export interface GenerationProgress {
  parentId: string;
  parentName: string;
  current: number;
  total: number;
  phase: "detecting" | "rendering" | "done" | "error";
  error?: string;
}

export interface GenerationOptions {
  projectId: string;
  parentId: string;
  onProgress?: (progress: GenerationProgress) => void;
}

/**
 * Generate screenshot assets for all child polygons inside a given parent polygon.
 */
export async function generateAssetsForParent(
  options: GenerationOptions,
): Promise<number> {
  const { projectId, parentId, onProgress } = options;

  const project = await db.projects.get(projectId);
  if (!project) throw new Error("Project not found");

  const parent = await db.parents.get(parentId);
  if (!parent) throw new Error("Parent not found");

  const baseBlob = await db.blobs.get(project.overlayBlobId);
  if (!baseBlob) throw new Error("Base image blob not found");

  const report = (partial: Partial<GenerationProgress>) => {
    onProgress?.({
      parentId,
      parentName: parent.name,
      current: 0,
      total: 0,
      phase: "detecting",
      ...partial,
    });
  };

  report({ phase: "detecting" });

  // Load base image
  const imageBitmap = await createImageBitmap(baseBlob.blob);
  const renderer = new CanvasRenderer(imageBitmap, project.overlayBounds);

  try {
    // Find child polygons fully contained within the parent
    const childFeatures = project.childGeojson?.features ?? [];
    const parentPolygon = turf.polygon(parent.geometry.coordinates);

    const contained = childFeatures.filter((child) => {
      try {
        if (child.geometry.type === "Polygon") {
          const childPoly = turf.polygon(child.geometry.coordinates);
          return turf.booleanWithin(childPoly, parentPolygon);
        }
        if (child.geometry.type === "MultiPolygon") {
          const childMulti = turf.multiPolygon(child.geometry.coordinates);
          return turf.booleanWithin(childMulti, parentPolygon);
        }
        return false;
      } catch {
        return false;
      }
    });

    const total = contained.length;
    report({ phase: "rendering", current: 0, total });

    if (total === 0) {
      report({ phase: "done", current: 0, total: 0 });
      return 0;
    }

    // Delete existing assets for this parent to regenerate
    const existingAssets = await db.assets
      .where("parentId")
      .equals(parentId)
      .toArray();
    for (const asset of existingAssets) {
      if (asset.previewBlobId) await db.blobs.delete(asset.previewBlobId);
      if (asset.workingBlobId) await db.blobs.delete(asset.workingBlobId);
      if (asset.finalBlobId) await db.blobs.delete(asset.finalBlobId);
    }
    await db.assets.where("parentId").equals(parentId).delete();

    // Generate assets
    for (let i = 0; i < contained.length; i++) {
      const child = contained[i];
      const childId = String(
        child.id ?? child.properties?.id ?? `child_${i}`,
      );

      // For MultiPolygon, use first polygon for now
      let childGeom: Polygon;
      if (child.geometry.type === "MultiPolygon") {
        childGeom = {
          type: "Polygon",
          coordinates: child.geometry.coordinates[0],
        };
      } else {
        childGeom = child.geometry as Polygon;
      }

      const previewBlob = await renderer.renderChildAsset(
        parent.geometry,
        childGeom,
      );

      await createAsset({
        projectId,
        parentId,
        childId,
        childGeometry: child.geometry as Polygon,
        previewBlob,
      });

      report({ phase: "rendering", current: i + 1, total });

      // Yield to UI thread every 5 iterations
      if ((i + 1) % 5 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    report({ phase: "done", current: total, total });
    return total;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    report({ phase: "error", error: message });
    throw err;
  } finally {
    renderer.dispose();
  }
}

/**
 * Generate assets for all parents in a project.
 */
export async function generateAllParents(
  projectId: string,
  onProgress?: (progress: GenerationProgress) => void,
): Promise<number> {
  const parents = await db.parents
    .where("projectId")
    .equals(projectId)
    .toArray();

  let totalGenerated = 0;

  for (const parent of parents) {
    const count = await generateAssetsForParent({
      projectId,
      parentId: parent.id,
      onProgress,
    });
    totalGenerated += count;
  }

  return totalGenerated;
}
