"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet";
import "@geoman-io/leaflet-geoman-free";
import { useProject, useParents, useBlobRecord } from "@/db/hooks";
import { createParent } from "@/db/crud";
import { computeImageBounds } from "@/utils/bounds";

// Fix default marker icons for Leaflet in bundled environments
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
const DefaultIcon = L.icon({
  iconUrl: icon.src ?? icon,
  shadowUrl: iconShadow.src ?? iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const PARENT_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#8b5cf6",
  "#f59e0b",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
];

interface LeafletMapProps {
  projectId: string;
}

export default function LeafletMap({ projectId }: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<L.ImageOverlay | null>(null);
  const layerGroupRef = useRef<L.FeatureGroup | null>(null);
  const childLayerRef = useRef<L.GeoJSON | null>(null);
  const parentLayersRef = useRef<Map<string, L.GeoJSON>>(new Map());
  const blobUrlRef = useRef<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const project = useProject(projectId);
  const parents = useParents(projectId);
  const overlayBlobRecord = useBlobRecord(project?.overlayBlobId);

  // Initialize map with image overlay
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || !overlayBlobRecord) return;

    let cancelled = false;

    const url = URL.createObjectURL(overlayBlobRecord.blob);
    blobUrlRef.current = url;

    const img = new Image();
    img.src = url;
    img.onload = () => {
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }

      const bounds = computeImageBounds(img.width, img.height);
      const leafletBounds: L.LatLngBoundsExpression = [
        [bounds[0][0], bounds[0][1]],
        [bounds[1][0], bounds[1][1]],
      ];

      const map = L.map(container, {
        center: [0, 0],
        zoom: 3,
        minZoom: 1,
        zoomControl: true,
        attributionControl: false,
      });

      map.fitBounds(leafletBounds);

      const layerGroup = L.featureGroup().addTo(map);

      L.imageOverlay(url, leafletBounds, {
        opacity: 0.8,
        interactive: true,
      }).addTo(map);

      mapRef.current = map;
      layerGroupRef.current = layerGroup;
      setMapReady(true);
    };

    return () => {
      cancelled = true;
      setMapReady(false);
      if (overlayRef.current) {
        overlayRef.current.remove();
        overlayRef.current = null;
      }
      if (layerGroupRef.current) {
        layerGroupRef.current.remove();
        layerGroupRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [overlayBlobRecord]);

  // Setup Geoman controls
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    map.pm.addControls({
      position: "topleft",
      drawCircle: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawMarker: false,
      drawText: false,
      drawRectangle: true,
      drawPolygon: true,
      editMode: true,
      dragMode: false,
      cutPolygon: false,
      removalMode: true,
      rotateMode: false,
    });

    const handleCreate = async (e: { layer: L.Layer }) => {
      const layer = e.layer as L.Polygon;
      const latLngs = (layer.getLatLngs()[0] as L.LatLng[]);

      const coordinates = latLngs.map((ll) => [ll.lng, ll.lat]);
      coordinates.push(coordinates[0]); // Close ring

      const geometry: GeoJSON.Polygon = {
        type: "Polygon",
        coordinates: [coordinates],
      };

      const name = prompt("Enter parent polygon name:");
      if (!name) {
        layer.remove();
        return;
      }

      const colorIdx = (parents?.length ?? 0) % PARENT_COLORS.length;
      const color = PARENT_COLORS[colorIdx];

      await createParent({
        projectId,
        name,
        geometry,
        color,
      });

      // Remove temp layer - it will re-render from DB
      layer.remove();
    };

    map.on("pm:create", handleCreate);

    return () => {
      map.pm.removeControls();
      map.off("pm:create", handleCreate);
    };
  }, [mapReady, projectId, parents?.length]);

  // Render child polygons from project GeoJSON
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !project) return;

    if (childLayerRef.current) {
      childLayerRef.current.remove();
      childLayerRef.current = null;
    }

    if (!project.childGeojson || project.childGeojson.features.length === 0) {
      return;
    }

    const layer = L.geoJSON(project.childGeojson, {
      style: () => ({
        color: "#22c55e",
        weight: 2,
        fillOpacity: 0.15,
        fillColor: "#22c55e",
      }),
      onEachFeature: (feature, featureLayer) => {
        const name =
          feature.properties?.name ||
          feature.properties?.id ||
          feature.id ||
          "Child polygon";
        (featureLayer as L.Layer).bindTooltip(String(name));
      },
    }).addTo(map);

    childLayerRef.current = layer;

    return () => {
      layer.remove();
    };
  }, [mapReady, project]);

  // Render parent polygons from DB
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    // Remove stale parent layers
    const currentIds = new Set(parents?.map((p) => p.id) ?? []);
    for (const [id, layer] of parentLayersRef.current) {
      if (!currentIds.has(id)) {
        layer.remove();
        parentLayersRef.current.delete(id);
      }
    }

    // Add/update parent layers
    for (const parent of parents ?? []) {
      if (parentLayersRef.current.has(parent.id)) continue;

      const fc: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { name: parent.name, color: parent.color },
            geometry: parent.geometry,
            id: parent.id,
          },
        ],
      };

      const layer = L.geoJSON(fc, {
        style: () => ({
          color: parent.color,
          weight: 3,
          fillOpacity: 0.08,
          fillColor: parent.color,
          dashArray: "8 4",
        }),
        onEachFeature: (_feature, featureLayer) => {
          (featureLayer as L.Layer).bindTooltip(
            `Parent: ${parent.name}`,
          );
        },
      }).addTo(map);

      parentLayersRef.current.set(parent.id, layer);
    }
  }, [mapReady, parents]);

  return (
    <div className="absolute inset-0" style={{ zIndex: 0, background: "#1a1a2e" }}>
      <div
        ref={mapContainerRef}
        className="absolute inset-0"
      />
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      )}
    </div>
  );
}
