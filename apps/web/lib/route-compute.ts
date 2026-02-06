import type { ManifestRow, RouteData, Trip, Passenger } from "@route-planner/shared";
import { HUB, buildOptimizedRoutes } from "@route-planner/shared";
import { geocodeAddress } from "./geocode";
import { getDirections } from "./directions";
import type { GeocodeResult } from "./geocode";

/**
 * Full route computation pipeline — mirrors the Python geocode_routes.py script.
 *
 * 1. Build optimized trips (clustering + packing)
 * 2. Geocode all unique passenger addresses
 * 3. Populate lat/lng on each passenger
 * 4. For each trip, compute driving directions via Google Maps
 * 5. Return complete RouteData ready for display
 */
export async function computeRoutes(rows: ManifestRow[]): Promise<RouteData> {
  // Phase 1: Build optimized trips
  const { pickupTrips, dropoffTrips } = buildOptimizedRoutes(rows);

  // Phase 2: Collect all unique addresses and geocode them
  const addressSet = new Set<string>();
  const allTrips = [...pickupTrips, ...dropoffTrips];

  for (const trip of allTrips) {
    for (const p of trip.passengers) {
      if (p.address) addressSet.add(p.address);
      if (p.destAddress) addressSet.add(p.destAddress);
    }
  }

  const geocoded = new Map<string, GeocodeResult>();
  const failures: string[] = [];

  for (const addr of addressSet) {
    try {
      const result = await geocodeAddress(addr);
      geocoded.set(addr, result);
    } catch {
      failures.push(addr);
    }
  }

  if (failures.length > 0) {
    console.warn(
      `Route compute: ${failures.length}/${addressSet.size} addresses failed to geocode`
    );
  }

  // Phase 3: Populate lat/lng on passengers
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

  // Phase 4: Compute directions for each trip
  for (const trip of allTrips) {
    trip.directions = await computeTripDirections(trip);
  }

  return {
    generated: new Date().toISOString(),
    totalPassengers: rows.length,
    hub: { ...HUB },
    pickupTrips,
    dropoffTrips,
  };
}

/**
 * Compute driving directions for a single trip.
 *
 * Pickup trips:  first passenger home → other homes (waypoints) → hub
 * Dropoff trips: hub → other homes (waypoints) → last passenger home
 *
 * This matches the Python script's direction-building logic.
 */
async function computeTripDirections(
  trip: Trip
): Promise<Trip["directions"]> {
  const geocodedPassengers = trip.passengers.filter(
    (p) => p.lat !== 0 && p.lng !== 0
  );

  if (geocodedPassengers.length < 1) return null;

  const coords = geocodedPassengers.map((p) => ({ lat: p.lat, lng: p.lng }));

  try {
    if (trip.type === "pickup") {
      // Pickup: home₁ → home₂ → … → homeₙ → facility
      // Origin: first passenger's home
      // Destination: hub (or first passenger's dest if available)
      const destination = findDestination(geocodedPassengers) ?? {
        lat: HUB.lat,
        lng: HUB.lng,
      };
      const origin = coords[0];
      const waypoints = coords.slice(1);

      return await getDirections(origin, destination, waypoints);
    } else {
      // Dropoff: facility → home₁ → home₂ → … → homeₙ
      // Origin: hub (or first passenger's pickup origin if available)
      const origin = findOrigin(geocodedPassengers) ?? {
        lat: HUB.lat,
        lng: HUB.lng,
      };
      const destination = coords[coords.length - 1];
      const waypoints = coords.slice(0, -1);

      return await getDirections(origin, destination, waypoints);
    }
  } catch (err) {
    console.warn(
      `Directions failed for trip ${trip.id}: ${err instanceof Error ? err.message : err}`
    );
    return null;
  }
}

/** For pickup trips, find the facility destination from passenger dest coords. */
function findDestination(
  passengers: Passenger[]
): { lat: number; lng: number } | null {
  for (const p of passengers) {
    if (p.destLat !== 0 && p.destLng !== 0) {
      return { lat: p.destLat, lng: p.destLng };
    }
  }
  return null;
}

/** For dropoff trips, find the facility origin from passenger dest coords. */
function findOrigin(
  passengers: Passenger[]
): { lat: number; lng: number } | null {
  for (const p of passengers) {
    if (p.destLat !== 0 && p.destLng !== 0) {
      return { lat: p.destLat, lng: p.destLng };
    }
  }
  return null;
}
