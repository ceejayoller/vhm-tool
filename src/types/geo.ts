import type { Feature, Polygon, MultiPolygon, FeatureCollection } from "geojson";

export type LatLngBounds = [[number, number], [number, number]];

export interface ChildFeature extends Feature<Polygon | MultiPolygon> {
  id: string | number;
  properties: Record<string, unknown>;
}

export type ChildFeatureCollection = FeatureCollection<Polygon | MultiPolygon>;

export interface ProjectSetupData {
  name: string;
  description?: string;
  baseImage: File;
  baseImageBounds: LatLngBounds;
  childGeoJSON?: ChildFeatureCollection;
}
