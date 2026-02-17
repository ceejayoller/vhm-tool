import Dexie, { type Table } from "dexie";
import type { FeatureCollection, Polygon, MultiPolygon } from "geojson";
import type { TemplateSpec } from "@/types/template";

// ── Table interfaces ──

export interface Project {
  id: string;
  name: string;
  description?: string;
  overlayBlobId: string;
  overlayBounds: [[number, number], [number, number]];
  childGeojson?: FeatureCollection<Polygon | MultiPolygon>;
  createdAt: number;
  updatedAt: number;
}

export interface Parent {
  id: string;
  projectId: string;
  name: string;
  geometry: Polygon;
  color: string;
  createdAt: number;
}

export interface Asset {
  id: string;
  projectId: string;
  parentId: string;
  childId: string;
  childGeometry: Polygon | MultiPolygon;
  previewBlobId?: string;
  workingBlobId?: string;
  finalBlobId?: string;
  editState?: Record<string, unknown>;
  status: "generated" | "editing" | "final";
  updatedAt: number;
}

export interface Template {
  id: string;
  name: string;
  templateSpec: TemplateSpec;
  updatedAt: number;
}

export interface BlobRecord {
  id: string;
  kind: "overlayImage" | "base" | "preview" | "working" | "final";
  mime: string;
  blob: Blob;
  createdAt: number;
}

// ── Database class ──

class GeoScreenshotDB extends Dexie {
  projects!: Table<Project, string>;
  parents!: Table<Parent, string>;
  assets!: Table<Asset, string>;
  templates!: Table<Template, string>;
  blobs!: Table<BlobRecord, string>;

  constructor() {
    super("geojson_screenshot_editor_v1");

    this.version(1).stores({
      projects: "id, name, createdAt, updatedAt",
      parents: "id, projectId, createdAt",
      assets: "id, projectId, parentId, childId, status, updatedAt",
      templates: "id, name, updatedAt",
      blobs: "id, kind, createdAt",
    });
  }
}

export const db = new GeoScreenshotDB();
