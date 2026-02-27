# VHM Tool

VHM Tool is a client-side GeoJSON polygon screenshot automation and editing
platform. Upload a base image, define parent/child polygons, and generate
per-child image assets with a clean editing workspace.

## Key Features

- Project wizard with image + GeoJSON import
- Leaflet + Geoman polygon drawing on the base image
- Automated child-polygon asset generation with Turf.js containment checks
- Konva-based editor for per-asset adjustments
- Text overlay editing — add and edit text overlays (font, size, color, rotation)
  via the editor toolbar and properties panel
- Position Diagram templates — single, row, and stacked layouts with
  configurable slots
- Screenshot picker modal — select alternate project assets for diagram slots
  (expandable parent groups)
- Drag-and-drop ordering — reorder parents and assets in sidebars via
  kanban-style lists; `sortOrder` persisted in IndexedDB
- Satori-based diagram renderer — SVG inspection-sheet layout with compass,
  panel labels, and design tokens (1080px output)
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
   open assets in the Konva editor for fine-tuning. Reorder parents and assets
   via drag handles. Add text overlays and shapes in the editor toolbar. Choose
   diagram templates (single, row, stacked) and pick alternate screenshots for
   slots via the screenshot picker modal.

## Tech Stack

- Next.js 16 + React 19 (App Router)
- TypeScript 5 (strict)
- Tailwind CSS 4 + shadcn/ui
- Leaflet + react-leaflet + Leaflet Geoman
- Konva + react-konva
- Satori for SVG-based inspection-sheet diagram rendering
- Turf.js for geospatial analysis
- @dnd-kit for drag-and-drop sortable parent/asset lists
- Lucide React for icons
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
- **Diagram pipeline**: `SatoriDiagramRenderer` produces inspection-sheet
  diagrams (1080px) via Satori SVG; overlays are composited; `KonvaEditor`
  enables interactive editing.
- **Data model**: Projects, parents, assets, templates, and blobs are stored in
  Dexie tables with blob references for images. Parents and assets include
  `sortOrder` (Dexie v2). The `templates` table stores Position Diagram
  layouts; each asset's `editState.diagram` holds template choice, title, and
  slot config.

## Project Structure

Key directories: `src/components/diagram/` (SatoriDiagramRenderer,
ScreenshotPickerModal), `src/components/templates/` (TemplatePanel,
TemplateSidebar), `src/config/diagramConfig.ts` (inspection-sheet design
tokens, `CANVAS_SIZE`).
See [AGENTS.md](AGENTS.md) for full structure.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build + type check
- `npm run start` — run the production server
- `npm run lint` — run ESLint

## Deployment

This is a client-only Next.js app. Build with `npm run build` and deploy using
your preferred Next.js hosting platform.
