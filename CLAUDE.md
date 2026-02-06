# Route Planner

PACE center transport routing system. Optimizes daily pickup/dropoff trips for 50-80 elderly participants in the San Gabriel Valley.

## Stack

- **Monorepo**: pnpm workspaces — `apps/web` (Next.js 15, App Router) + `packages/shared` (types, routing algo)
- **UI**: shadcn/UI, Tailwind CSS v4, @vis.gl/react-google-maps
- **Storage**: Vercel Blob only — no database. Manifests stored as raw CSV, geocode/directions cached as JSON blobs. Local `.cache/` fallback when `BLOB_READ_WRITE_TOKEN` is unset.
- **CSV parsing**: Client-side with papaparse
- **Routing**: Google Route Optimization API (primary) with legacy custom algorithm fallback
- **Auth**: Google service account (OAuth2 via `google-auth-library`)

## Key Commands

```bash
pnpm dev              # Start dev server (from root)
pnpm --filter web build   # Production build
pnpm --filter web dev     # Dev server for web only
```

## Architecture

```
Upload CSV → Blob (manifests/{id}/{file})
           → Frontend parses CSV client-side
           → GET /api/routes?manifestId=X triggers:
               1. Check Blob cache (routes/{manifestId}/{configHash}/route_data.json) → return if hit
               2. Parse CSV → classify pickup/dropoff → geocode addresses
               3. Call Route Optimization API (pickup + dropoff in parallel)
               4. Cache result keyed by manifestId + configHash
```

**Routing pipeline** (Route Optimization API path):
1. Classify manifest rows into pickup vs dropoff passengers
2. Geocode all unique addresses (cached 30-day TTL)
3. Build shipments (1 per passenger) + virtual vehicles (multiple trips per physical vehicle)
4. Call `routeoptimization.googleapis.com/v1/projects/{PROJECT}:optimizeTours`
5. Map response → Trip[] with passengers in driving order

**Drive time semantics**: The `routeDurationLimit` only covers passenger-carrying time. Deadhead legs (empty vehicle traveling) are excluded by omitting the start/end location:
- Pickup: hub→first passenger is deadhead (omit `startLocation`)
- Dropoff: last passenger→hub is deadhead (omit `endLocation`)

**Virtual vehicles**: Each physical vehicle (Van, Sedan) gets N copies so it can make multiple trips. N = `ceil(passengers / totalFleetCapacity) + 1`. The API only uses what it needs.

**No relational DB.** Vercel Blob stores everything: CSV manifests, computed route JSON, geocode cache, config.

## Important Files

| File | Purpose |
|------|---------|
| `apps/web/lib/route-optimization.ts` | Route Optimization API client — builds shipments, virtual vehicles, OAuth2 auth |
| `apps/web/lib/route-compute.ts` | Pipeline: classify → geocode → optimize (or legacy fallback) |
| `packages/shared/src/routing.ts` | Legacy 3-phase algo + `rowToPassenger`, `classifyLeg` |
| `packages/shared/src/constants.ts` | Hub address, geographic clusters, adjacency map, trip colors |
| `packages/shared/src/types.ts` | Trip, Passenger, Vehicle, VehicleConfig, RouteData, ManifestRow |
| `apps/web/lib/db/index.ts` | Blob storage: manifests, routes, configs (drive time + vehicles) |
| `apps/web/lib/cache.ts` | Blob-backed geocode/directions cache (30-day TTL) |
| `apps/web/lib/geocode.ts` | Google Geocoding API with cache |
| `apps/web/lib/directions.ts` | Google Directions API with cache (legacy path only) |
| `apps/web/app/routes/page.tsx` | Main UI: manifest selector, map, trip list, vehicle filters |
| `apps/web/app/settings/page.tsx` | Settings: drive time slider + vehicle fleet config |
| `apps/web/app/api/routes/route.ts` | Routes API — config-aware with SHA256 configHash |
| `apps/web/hooks/use-map-interactions.ts` | Map hover/select state management |
| `apps/web/components/map/route-visualization.tsx` | Polyline + marker visualization layer |
| `apps/web/components/routes/trip-detail.tsx` | Trip detail panel with stop-by-stop itinerary |
| `apps/web/components/routes/vehicle-filter.tsx` | Vehicle multi-select filter chips (Np Nd counts) |

## Env Vars

```
BLOB_READ_WRITE_TOKEN            # Vercel Blob (auto-set when linked)
GOOGLE_MAPS_API_KEY              # Server-side geocoding/directions/route optimization
GOOGLE_CLOUD_PROJECT_ID          # Route Optimization API project (enables optimized routing)
GOOGLE_APPLICATION_CREDENTIALS   # Path to service account JSON key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY  # Client-side map rendering
```

Both Google Maps keys and the service account key are in 1Password (Engineering vault).

## Settings & Config

- **Drive time**: `config/settings.json` in Blob — max passenger ride time (15-120 min, default 45)
- **Vehicles**: `config/vehicles.json` in Blob — default fleet: 1 Van (10 seats) + 4 Sedans (4 seats)
- Changing either setting auto-invalidates route cache via `configHash` = SHA256(driveTime + vehicles)

## Constraints

- **30-day TTL** on geocode/directions cache (Google TOS)
- **Rate limiting**: 100ms between geocode calls, 200ms between directions calls
- CSV Notes field can contain newlines — papaparse handles this
- Hub: 1839 W Valley Blvd, Alhambra, CA 91803
- Legacy fallback: max 10 stops per trip (only applies when Route Optimization API is not configured)
