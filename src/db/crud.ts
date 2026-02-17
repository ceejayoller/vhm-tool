import { db } from "./db";
import type { Project, Parent, Asset, Template, BlobRecord } from "./db";
import type { FeatureCollection, Polygon, MultiPolygon } from "geojson";
import type { TemplateSpec } from "@/types/template";
import { generateId } from "@/utils/id";

// ── Blob operations ──

export async function storeBlob(
  blob: Blob,
  kind: BlobRecord["kind"],
  mime?: string,
): Promise<string> {
  const id = generateId("blob");
  await db.blobs.add({
    id,
    kind,
    mime: mime || blob.type,
    blob,
    createdAt: Date.now(),
  });
  return id;
}

export async function deleteBlob(id: string): Promise<void> {
  await db.blobs.delete(id);
}

// ── Project operations ──

export async function createProject(data: {
  name: string;
  description?: string;
  baseImageBlob: Blob;
  baseImageBounds: [[number, number], [number, number]];
  childGeoJSON?: FeatureCollection<Polygon | MultiPolygon>;
}): Promise<Project> {
  const overlayBlobId = await storeBlob(
    data.baseImageBlob,
    "overlayImage",
    data.baseImageBlob.type,
  );

  const now = Date.now();
  const project: Project = {
    id: generateId("project"),
    name: data.name,
    description: data.description,
    overlayBlobId,
    overlayBounds: data.baseImageBounds,
    childGeojson: data.childGeoJSON,
    createdAt: now,
    updatedAt: now,
  };

  await db.projects.add(project);
  return project;
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<Project, "id" | "createdAt">>,
): Promise<void> {
  await db.projects.update(id, { ...updates, updatedAt: Date.now() });
}

export async function deleteProject(id: string): Promise<void> {
  await db.transaction("rw", [db.projects, db.parents, db.assets, db.blobs], async () => {
    const project = await db.projects.get(id);
    if (!project) return;

    // Delete overlay image blob
    await db.blobs.delete(project.overlayBlobId);

    // Delete all assets and their blobs
    const assets = await db.assets.where("projectId").equals(id).toArray();
    for (const asset of assets) {
      if (asset.previewBlobId) await db.blobs.delete(asset.previewBlobId);
      if (asset.workingBlobId) await db.blobs.delete(asset.workingBlobId);
      if (asset.finalBlobId) await db.blobs.delete(asset.finalBlobId);
    }
    await db.assets.where("projectId").equals(id).delete();

    // Delete all parents
    await db.parents.where("projectId").equals(id).delete();

    // Delete project
    await db.projects.delete(id);
  });
}

// ── Parent operations ──

export async function createParent(data: {
  projectId: string;
  name: string;
  geometry: Polygon;
  color: string;
}): Promise<Parent> {
  const parent: Parent = {
    id: generateId("parent"),
    projectId: data.projectId,
    name: data.name,
    geometry: data.geometry,
    color: data.color,
    createdAt: Date.now(),
  };
  await db.parents.add(parent);
  return parent;
}

export async function deleteParent(id: string): Promise<void> {
  await db.transaction("rw", [db.parents, db.assets, db.blobs], async () => {
    // Delete all assets for this parent
    const assets = await db.assets.where("parentId").equals(id).toArray();
    for (const asset of assets) {
      if (asset.previewBlobId) await db.blobs.delete(asset.previewBlobId);
      if (asset.workingBlobId) await db.blobs.delete(asset.workingBlobId);
      if (asset.finalBlobId) await db.blobs.delete(asset.finalBlobId);
    }
    await db.assets.where("parentId").equals(id).delete();

    // Delete parent
    await db.parents.delete(id);
  });
}

// ── Asset operations ──

export async function createAsset(data: {
  projectId: string;
  parentId: string;
  childId: string;
  childGeometry: Polygon | MultiPolygon;
  previewBlob: Blob;
}): Promise<Asset> {
  const previewBlobId = await storeBlob(data.previewBlob, "preview", "image/png");

  const asset: Asset = {
    id: `${data.parentId}__${data.childId}`,
    projectId: data.projectId,
    parentId: data.parentId,
    childId: data.childId,
    childGeometry: data.childGeometry,
    previewBlobId,
    status: "generated",
    updatedAt: Date.now(),
  };

  await db.assets.put(asset);
  return asset;
}

export async function updateAsset(
  id: string,
  updates: Partial<Omit<Asset, "id" | "projectId" | "parentId" | "childId">>,
): Promise<void> {
  await db.assets.update(id, { ...updates, updatedAt: Date.now() });
}

// ── Template operations ──

export async function createTemplate(data: {
  name: string;
  templateSpec: TemplateSpec;
}): Promise<Template> {
  const template: Template = {
    id: generateId("template"),
    name: data.name,
    templateSpec: data.templateSpec,
    updatedAt: Date.now(),
  };
  await db.templates.add(template);
  return template;
}

export async function deleteTemplate(id: string): Promise<void> {
  await db.templates.delete(id);
}
