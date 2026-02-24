# AGENTS.md

VHM Tool -- a GeoJSON polygon screenshot automation and positioning diagram editor.
Fully client-side Next.js app with IndexedDB persistence; no backend.

## Setup Commands

```bash
npm install                    # Install dependencies
npm run dev                    # Dev server (localhost:3000)
npm run build                  # Production build + type check
npm run lint                   # ESLint
npx shadcn add <component>    # Add shadcn/ui components
```

## Tech Stack

- Next.js 16 + React 19 + TypeScript 5 (strict mode)
- Tailwind CSS 4 + shadcn/ui (New York style, Lucide icons)
- Leaflet + react-leaflet + Leaflet Geoman (map interaction)
- Turf.js (geospatial computations)
- Konva + react-konva (canvas editor)
- Zustand (editor state with undo/redo)
- Dexie / IndexedDB (client-side persistence)

## Project Structure

```
src/
├── app/              # Next.js App Router routes
├── components/       # Domain-organized UI components
│   ├── ui/           # shadcn/ui primitives (managed by CLI -- do not edit directly)
│   ├── map/          # LeafletMap (polygon drawing)
│   ├── editor/       # KonvaEditor (canvas editing)
│   ├── diagram/      # DiagramRenderer (layout + compositing)
│   ├── generation/   # CanvasRenderer + GenerationEngine (screenshot pipeline)
│   └── ...           # shell/, library/, setup/, templates/, export/, projects/
├── db/               # Dexie schema (db.ts), CRUD ops (crud.ts), React hooks (hooks.ts)
├── state/            # Zustand stores (editorStore.ts, selectionStore.ts)
├── types/            # TypeScript type definitions
├── config/           # Constants (diagramConfig.ts -- CANVAS_SIZE = 1080)
├── utils/            # Utility functions (id, bounds, overlays, debounce)
└── lib/              # Shared helpers (cn() for Tailwind class merging)
```

## Architecture Notes

- **No backend** -- all data in IndexedDB via Dexie. No API routes, no server state.
- **Blob storage** -- images stored as Blobs in `blobs` table, referenced by ID. Always cascade-delete blobs when removing parent records (pattern in `src/db/crud.ts`).
- **Rendering pipeline** -- `CanvasRenderer` projects GeoJSON via linear mercator -> `DiagramRenderer` composites with overlays -> `KonvaEditor` for interactive editing. Rendering constants in `src/config/diagramConfig.ts` must be respected.
- **Path alias** -- `@/*` maps to `src/*` (configured in `tsconfig.json`).
- **Database schema** -- 5 tables: `projects`, `parents`, `assets`, `templates`, `blobs` (see `src/db/db.ts`). Schema changes require a Dexie version migration.

## Code Style & Conventions

**TypeScript:**
- Strict mode enabled; never use `any` -- prefer `unknown` with type guards
- Use `interface` for object shapes, `type` for unions/intersections
- Use `@ts-expect-error` (not `@ts-ignore`) with explanatory comment if suppression is unavoidable
- Use `as const` for literal types and readonly data
- Leverage type inference; don't annotate what TS can infer

**React / Next.js:**
- Function components only; no class components
- Named exports only (no default exports)
- `"use client"` only on the smallest leaf components that need interactivity
- Colocate related logic; keep state close to where it's used
- Use `next/image` with explicit dimensions, `next/font` for fonts

**UI & Styling:**
- Use shadcn/ui components from `@/components/ui/` before creating custom ones
- Add new shadcn components via `npx shadcn add` (never edit `src/components/ui/` directly)
- Icons: Lucide React only (`lucide-react`)
- Tailwind utility classes + CSS variables for theming
- Use `cn()` from `@/lib/utils` to merge class names
- Minimum touch target: 44x44px for interactive elements
- Respect `prefers-reduced-motion` for animations
- Color contrast: minimum 4.5:1 (normal text), 3:1 (large text)

**State & Data:**
- Zustand for editor state (undo/redo history in `editorStore`)
- Dexie `useLiveQuery` hooks for reactive database queries
- IDs generated via `uuid` (see `src/utils/id.ts`)

**Security:**
- Never use `dangerouslySetInnerHTML` without DOMPurify sanitization
- Validate external data (user input, file uploads) at the boundary
- Never commit `.env` files, API keys, or credentials
- Only `NEXT_PUBLIC_*` env vars are safe for client code

## Testing

- Test behavior, not implementation details
- Query by role/label (`getByRole`, `getByLabelText`), not by class/id
- Use `userEvent` (not `fireEvent`) for realistic interactions
- Colocate test files next to their module (`Component.test.tsx`)
- Run `npm run build` to verify TypeScript compilation before submitting changes

## Git Workflow

**Commits:**
- Format: `type(scope): description` (conventional commits, imperative mood, lowercase)
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`
- Breaking changes: append `!` after type, e.g., `feat!: remove deprecated API`
- One logical change per commit; never mix refactoring with feature work

**Pull Requests:**
- Keep PRs under 400 lines of changed code; break larger work into stacked PRs
- Title: under 70 characters, follows conventional commit format
- Description must include: summary, motivation, testing instructions, screenshots for UI changes
- CI (lint + type check + build) must pass before requesting review
- At least 1 approval required before merge

**Branches:**
- Feature branches off `main`; never commit directly to `main`
- Delete branch after merge

## Performance

- Default to Server Components to minimize client bundle
- Use `next/dynamic` for heavy components not needed on initial render
- Use named imports for tree-shaking
- Target Core Web Vitals: LCP <= 2.5s, INP <= 200ms, CLS < 0.1
- Set explicit dimensions on images/canvas to prevent layout shift

## Boundaries

**Always:**
- Use existing shadcn/ui components before creating custom ones
- Follow the domain-based component directory structure
- Cascade-delete blob references when removing records
- Use the `@/` path alias for all imports
- Run `npm run build` to verify before completing work
- Use semantic HTML elements before reaching for ARIA attributes
- Keep every interactive element keyboard-accessible with visible focus indicators

**Ask First:**
- Adding new npm dependencies
- Changing the Dexie database schema (requires version migration)
- Modifying rendering constants in `src/config/diagramConfig.ts`
- Restructuring component directories
- Refactoring more than 3 files at once
- Modifying CI/CD configuration

**Never:**
- Add a backend/server -- this is intentionally client-only
- Commit `node_modules/`, `.next/`, or `.env` files
- Edit files in `src/components/ui/` directly (managed by shadcn CLI)
- Use `any` type -- use `unknown` and narrow instead
- Use `@ts-ignore` -- use `@ts-expect-error` with explanation
- Use `eval()` or `new Function()`
- Push directly to `main` without a PR
- Delete or modify test fixtures without explanation
