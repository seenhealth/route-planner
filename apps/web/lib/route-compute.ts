import type { ManifestRow, RouteData, Passenger, VehicleConfig } from "@route-planner/shared";
import { HUB, buildOptimizedRoutes, classifyLeg, rowToPassenger } from "@route-planner/shared";
import { geocodeAddress } from "./geocode";
import { getDirections } from "./directions";
import type { GeocodeResult } from "./geocode";
import { optimizeTrips } from "./route-optimization";
import type { AppConfig } from "./db";

/**
 * Full route computation pipeline.
 *
 * If GOOGLE_CLOUD_PROJECT_ID is set, uses the Route Optimization API:
 *   1. Classify rows → passengers (pickup vs dropoff)
 *   2. Geocode all unique addresses
 *   3. Call Route Optimization API (pickup + dropoff separately)
 *   4. Return optimized RouteData
 *
 * Otherwise, falls back to the legacy custom algorithm + Directions API.
 */
export async function computeRoutes(
  rows: ManifestRow[],
  config: AppConfig,
  vehicleConfig: VehicleConfig
): Promise<RouteData> {
  const useRouteOptimization = !!process.env.GOOGLE_CLOUD_PROJECT_ID;

  if (useRouteOptimization) {
    return computeWithRouteOptimization(rows, config, vehicleConfig);
  }
  return computeLegacy(rows);
}

// ---------------------------------------------------------------------------
// Route Optimization API path
// ---------------------------------------------------------------------------

async function computeWithRouteOptimization(
  rows: ManifestRow[],
  config: AppConfig,
  vehicleConfig: VehicleConfig
): Promise<RouteData> {
  // Phase 1: Convert rows to passengers, split by direction
  const pickupPassengers: { passenger: Passenger; index: number }[] = [];
  const dropoffPassengers: { passenger: Passenger; index: number }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const leg = classifyLeg(row.jobID);
    const passenger = rowToPassenger(row);

    if (leg === "pickup") {
      pickupPassengers.push({ passenger, index: i });
    } else {
      dropoffPassengers.push({ passenger, index: i });
    }
  }

  // Phase 2: Geocode all unique addresses
  const allPassengers = [...pickupPassengers, ...dropoffPassengers];
  await geocodePassengers(allPassengers);

  // Log duplicate coordinates to help debug stacking markers
  const coordMap = new Map<string, string[]>();
  for (const { passenger } of allPassengers) {
    if (passenger.lat !== 0 && passenger.lng !== 0) {
      const key = `${passenger.lat.toFixed(6)},${passenger.lng.toFixed(6)}`;
      const list = coordMap.get(key) ?? [];
      const initials = passenger.name.split(/\s+/).map((w) => w[0] ?? "").join("").toUpperCase();
      list.push(`${initials} (${passenger.address})`);
      coordMap.set(key, list);
    }
  }
  const dupes = [...coordMap.entries()].filter(([, names]) => names.length > 1);
  if (dupes.length > 0) {
    console.warn(`Geocode: ${dupes.length} coordinates shared by multiple passengers:`);
    for (const [coord, names] of dupes) {
      console.warn(`  ${coord}: ${names.join(" | ")}`);
    }
  }

  // Phase 3: Call Route Optimization API for both directions in parallel
  const [pickupTrips, dropoffTrips] = await Promise.all([
    optimizeTrips(
      pickupPassengers,
      vehicleConfig.vehicles,
      config.driveTimeLimitMinutes,
      "pickup"
    ),
    optimizeTrips(
      dropoffPassengers,
      vehicleConfig.vehicles,
      config.driveTimeLimitMinutes,
      "dropoff"
    ),
  ]);

  return {
    generated: new Date().toISOString(),
    totalPassengers: rows.length,
    hub: { ...HUB },
    pickupTrips,
    dropoffTrips,
  };
}

// ---------------------------------------------------------------------------
// Legacy custom algorithm path (fallback when GOOGLE_CLOUD_PROJECT_ID unset)
// ---------------------------------------------------------------------------

async function computeLegacy(rows: ManifestRow[]): Promise<RouteData> {
  const { pickupTrips, dropoffTrips } = buildOptimizedRoutes(rows);

  const allTrips = [...pickupTrips, ...dropoffTrips];

  // Geocode
  const addressSet = new Set<string>();
  for (const trip of allTrips) {
    for (const p of trip.passengers) {
      if (p.address) addressSet.add(p.address);
      if (p.destAddress) addressSet.add(p.destAddress);
    }
  }

  const geocoded = new Map<string, GeocodeResult>();
  for (const addr of addressSet) {
    try {
      geocoded.set(addr, await geocodeAddress(addr));
    } catch {
      /* skip */
    }
  }

  for (const trip of allTrips) {
    for (const passenger of trip.passengers) {
      const geo = geocoded.get(passenger.address);
      if (geo) {
        passenger.lat = geo.lat;
        passenger.lng = geo.lng;
      }
      const destGeo = geocoded.get(passenger.destAddress);
      if (destGeo) {
        passenger.destLat = destGeo.lat;
        passenger.destLng = destGeo.lng;
      }
    }
  }

  // Directions + reorder passengers to match driving order
  for (const trip of allTrips) {
    trip.directions = await computeTripDirections(trip);
    reorderPassengersByDrivingOrder(trip);
  }

  return {
    generated: new Date().toISOString(),
    totalPassengers: rows.length,
    hub: { ...HUB },
    pickupTrips,
    dropoffTrips,
  };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function geocodePassengers(
  passengers: { passenger: Passenger }[]
): Promise<void> {
  const addressSet = new Set<string>();
  for (const { passenger } of passengers) {
    if (passenger.address) addressSet.add(passenger.address);
    if (passenger.destAddress) addressSet.add(passenger.destAddress);
  }

  const geocoded = new Map<string, GeocodeResult>();
  const failures: string[] = [];

  for (const addr of addressSet) {
    try {
      geocoded.set(addr, await geocodeAddress(addr));
    } catch {
      failures.push(addr);
    }
  }

  if (failures.length > 0) {
    console.warn(
      `Route compute: ${failures.length}/${addressSet.size} addresses failed to geocode`
    );
  }

  for (const { passenger } of passengers) {
    const geo = geocoded.get(passenger.address);
    if (geo) {
      passenger.lat = geo.lat;
      passenger.lng = geo.lng;
    }
    const destGeo = geocoded.get(passenger.destAddress);
    if (destGeo) {
      passenger.destLat = destGeo.lat;
      passenger.destLng = destGeo.lng;
    }
  }
}

async function computeTripDirections(
  trip: { type: string; id: string; passengers: Passenger[] }
): Promise<RouteData["pickupTrips"][0]["directions"]> {
  const geocodedPassengers = trip.passengers.filter(
    (p) => p.lat !== 0 && p.lng !== 0
  );
  if (geocodedPassengers.length < 1) return null;

  const coords = geocodedPassengers.map((p) => ({ lat: p.lat, lng: p.lng }));

  try {
    if (trip.type === "pickup") {
      const destination = findCoord(geocodedPassengers, "dest") ?? {
        lat: HUB.lat,
        lng: HUB.lng,
      };
      return await getDirections(coords[0], destination, coords.slice(1));
    } else {
      const origin = findCoord(geocodedPassengers, "dest") ?? {
        lat: HUB.lat,
        lng: HUB.lng,
      };
      return await getDirections(
        origin,
        coords[coords.length - 1],
        coords.slice(0, -1)
      );
    }
  } catch (err) {
    console.warn(
      `Directions failed for trip ${trip.id}: ${err instanceof Error ? err.message : err}`
    );
    return null;
  }
}

function findCoord(
  passengers: Passenger[],
  which: "dest"
): { lat: number; lng: number } | null {
  for (const p of passengers) {
    if (p.destLat !== 0 && p.destLng !== 0) {
      return { lat: p.destLat, lng: p.destLng };
    }
  }
  return null;
}

/**
 * Reorder trip.passengers to match the actual driving order from directions.
 *
 * After this, passengers[0] is the first stop, passengers[1] is second, etc.
 * Both the map markers and trip detail panel can just iterate in array order.
 */
function reorderPassengersByDrivingOrder(trip: {
  type: string;
  passengers: Passenger[];
  passengerCount: number;
  directions: RouteData["pickupTrips"][0]["directions"];
}): void {
  if (!trip.directions?.waypointOrder || trip.directions.waypointOrder.length === 0) return;

  const geocoded = trip.passengers.filter((p) => p.lat !== 0 && p.lng !== 0);
  const nonGeocoded = trip.passengers.filter((p) => p.lat === 0 || p.lng === 0);

  if (geocoded.length <= 1) return;

  const waypointOrder = trip.directions.waypointOrder;
  let reordered: Passenger[];

  if (trip.type === "pickup") {
    // Directions call: origin = geocoded[0], waypoints = geocoded[1..], dest = hub
    // waypointOrder indices refer to geocoded[1..N-1]
    reordered = [geocoded[0]];
    for (const wpIdx of waypointOrder) {
      if (geocoded[1 + wpIdx]) {
        reordered.push(geocoded[1 + wpIdx]);
      }
    }
  } else {
    // Directions call: origin = hub, waypoints = geocoded[0..N-2], dest = geocoded[N-1]
    // waypointOrder indices refer to geocoded[0..N-2]
    reordered = [];
    for (const wpIdx of waypointOrder) {
      if (geocoded[wpIdx]) {
        reordered.push(geocoded[wpIdx]);
      }
    }
    reordered.push(geocoded[geocoded.length - 1]);
  }

  // Replace passengers with driving order, non-geocoded at end
  trip.passengers = [...reordered, ...nonGeocoded];
  trip.passengerCount = trip.passengers.length;

  // Reset waypointOrder to sequential since passengers are now in driving order
  trip.directions.waypointOrder = reordered.map((_, i) => i);
}
