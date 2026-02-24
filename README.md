# VHM Tool

VHM Tool is a client-side GeoJSON polygon screenshot automation and editing
platform. Upload a base image, define parent/child polygons, and generate
per-child image assets with a clean editing workspace.

## Key Features

- Project wizard with image + GeoJSON import
- Leaflet + Geoman polygon drawing on the base image
- Automated child-polygon asset generation with Turf.js containment checks
- Konva-based editor for per-asset adjustments
- IndexedDB persistence (no backend required)

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## How To Use

1. **Create a project**: Click **New Project** on the home screen.
2. **Project details**: Enter a project name and optional description.
3. **Upload base image**: Choose a PNG/JPG image. Bounds are computed from
   the image size for consistent projection.
4. **Upload child polygons (optional)**: Add a GeoJSON FeatureCollection (or
   a single Feature / array of Features). Only Polygon/MultiPolygon features
   are accepted. You can skip this step and draw later.
5. **Confirm**: Review settings and create the project to enter the workspace.
6. **Workspace**: Draw parent polygons on the map, generate child assets, and
   open assets in the Konva editor for fine-tuning.

## Tech Stack

- Next.js 16 + React 19 (App Router)
- TypeScript 5 (strict)
- Tailwind CSS 4 + shadcn/ui
- Leaflet + react-leaflet + Leaflet Geoman
- Konva + react-konva
- Turf.js for geospatial analysis
- Dexie + IndexedDB for local persistence
- Zustand for client-side state management

## Architecture Notes

- **Client-only**: All data lives in the browser via IndexedDB; there is no
  backend or server persistence.
- **Routes**:
  - `/` shows the project list and creation entry point.
  - `/project/new` runs the setup wizard (details, image, GeoJSON).
  - `/workspace/[projectId]` hosts the map + editor workspace.
- **Generation pipeline**:
  - `CanvasRenderer` projects polygons directly onto the uploaded image.
  - `GenerationEngine` detects contained child polygons and generates assets.
- **Data model**: Projects, parents, assets, templates, and blobs are stored in
  Dexie tables with blob references for images.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build + type check
- `npm run start` — run the production server
- `npm run lint` — run ESLint

## Deployment

This is a client-only Next.js app. Build with `npm run build` and deploy using
your preferred Next.js hosting platform.
