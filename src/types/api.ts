export interface LayoutSummary {
  id: string;
  name: string;
}

export interface VesselWithLayouts {
  id: string;
  name: string;
  imo_number: string;
  layouts: LayoutSummary[];
}

export interface LayoutDetail {
  id: string;
  name: string;
  vessel_name: string;
  use_mercator: boolean;
  ga_plan_url: string;
  geojson: {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      geometry: { type: string; coordinates: number[][][] };
      properties: { id: string; name?: string; [key: string]: unknown };
    }>;
  };
}
