import type { ManifestRow, Passenger, Trip } from "./types";
import {
  HUB,
  MAX_STOPS,
  TRIP_COLORS,
  CLUSTERS,
  ADJACENCY,
} from "./constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Detect trip leg from JobID suffix. -A = pickup, -B = dropoff. */
export function classifyLeg(jobId: string): "pickup" | "dropoff" {
  const upper = jobId.trim().toUpperCase();
  if (upper.endsWith("-B")) return "dropoff";
  return "pickup"; // default to pickup (includes -A and anything else)
}

/**
 * Parse a time string like "08:30 AM" into minutes since midnight.
 * Returns 999 for empty / unparseable strings (sorts to end).
 */
export function parseTime(timeStr: string): number {
  if (!timeStr || !timeStr.trim()) return 999;

  const normalized = timeStr.trim().toUpperCase();

  // Match patterns: "8:30 AM", "08:30 AM", "8:30AM", "08:30"
  const match = normalized.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/
  );
  if (!match) return 999;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]; // AM | PM | undefined

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/** Classify a trip's time window by average passenger time. */
export function classifyTimeWindow(
  avgMinutes: number
): "Morning" | "Midday" | "Afternoon" {
  if (avgMinutes <= 600) return "Morning"; // <= 10:00 AM
  if (avgMinutes <= 780) return "Midday"; // <= 1:00 PM
  return "Afternoon";
}

/**
 * Look up which geographic cluster a zip code belongs to.
 * Returns null for unknown zip codes.
 */
export function getCluster(zipCode: string): string | null {
  const zip = zipCode?.trim();
  if (!zip) return null;
  for (const [cluster, zips] of Object.entries(CLUSTERS)) {
    if (zips.includes(zip)) return cluster;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Row → Passenger conversion
// ---------------------------------------------------------------------------

function isHubBound(row: ManifestRow): boolean {
  const leg = classifyLeg(row.jobID);
  if (leg === "pickup") {
    // Pickup: home → facility. Dest is the facility.
    return normalizeAddr(row.doAddr).includes("1839") &&
      normalizeAddr(row.doAddr).toLowerCase().includes("valley");
  }
  // Dropoff: facility → home. Pickup addr is the facility.
  return normalizeAddr(row.puAddr).includes("1839") &&
    normalizeAddr(row.puAddr).toLowerCase().includes("valley");
}

function normalizeAddr(addr: string): string {
  return (addr || "").replace(/\s+/g, " ").trim();
}

function rowToPassenger(row: ManifestRow): Passenger {
  const leg = classifyLeg(row.jobID);
  const time = leg === "pickup" ? row.aptTime : row.schPU;

  const puFull = [row.puAddr, row.puUnit, row.pickupCity, row.puState, row.pickZip]
    .map((s) => (s || "").trim())
    .filter(Boolean)
    .join(", ");

  const doFull = [row.doAddr, row.doUnit, row.dropCity, row.doState, row.dropZip]
    .map((s) => (s || "").trim())
    .filter(Boolean)
    .join(", ");

  return {
    name: row.custName || "",
    address: puFull,
    destAddress: doFull,
    time: time || "",
    purpose: row.bookingPurpose || "",
    phone: row.phone || "",
    lat: 0, // populated later by geocoding
    lng: 0,
    destLat: 0,
    destLng: 0,
  };
}

// ---------------------------------------------------------------------------
// Core algorithm
// ---------------------------------------------------------------------------

/**
 * Pack a map of cluster→passengers into trips, respecting MAX_STOPS.
 *
 * Phase 3: large clusters (>= 5) get their own trips, small ones are merged
 * with adjacent clusters.
 */
export function packTrips(
  clustered: Map<string, ManifestRow[]>,
  maxStops: number = MAX_STOPS
): { area: string; rows: ManifestRow[] }[] {
  const trips: { area: string; rows: ManifestRow[] }[] = [];

  // Sort clusters largest-first for deterministic output
  const sorted = [...clustered.entries()].sort(
    (a, b) => b[1].length - a[1].length
  );

  const remaining: { cluster: string; rows: ManifestRow[] }[] = [];

  // Phase 3a: large clusters get their own trip(s)
  for (const [cluster, rows] of sorted) {
    if (rows.length >= 5) {
      // Split into chunks of maxStops
      for (let i = 0; i < rows.length; i += maxStops) {
        trips.push({
          area: cluster,
          rows: rows.slice(i, i + maxStops),
        });
      }
    } else {
      remaining.push({ cluster, rows });
    }
  }

  // Phase 3b: merge small clusters with adjacent ones
  const merged = new Set<string>();

  for (const item of remaining) {
    if (merged.has(item.cluster)) continue;
    merged.add(item.cluster);

    const tripRows = [...item.rows];
    const areaNames = [item.cluster];

    const neighbors = ADJACENCY[item.cluster] || [];
    for (const neighbor of neighbors) {
      if (merged.has(neighbor)) continue;
      const neighborItem = remaining.find((r) => r.cluster === neighbor);
      if (!neighborItem) continue;
      if (tripRows.length + neighborItem.rows.length <= maxStops) {
        tripRows.push(...neighborItem.rows);
        areaNames.push(neighbor);
        merged.add(neighbor);
      }
    }

    if (tripRows.length > 0) {
      trips.push({
        area: areaNames.join(" / "),
        rows: tripRows,
      });
    }
  }

  return trips;
}

/**
 * Main entry point: takes raw manifest rows and produces optimized trips.
 */
export function buildOptimizedRoutes(rows: ManifestRow[]): {
  pickupTrips: Trip[];
  dropoffTrips: Trip[];
} {
  // Separate pickup vs dropoff rows
  const pickupRows: ManifestRow[] = [];
  const dropoffRows: ManifestRow[] = [];

  for (const row of rows) {
    const leg = classifyLeg(row.jobID);
    if (leg === "pickup") pickupRows.push(row);
    else dropoffRows.push(row);
  }

  const pickupTrips = buildTripsForDirection(pickupRows, "pickup");
  const dropoffTrips = buildTripsForDirection(dropoffRows, "dropoff");

  return { pickupTrips, dropoffTrips };
}

function buildTripsForDirection(
  rows: ManifestRow[],
  type: "pickup" | "dropoff"
): Trip[] {
  // Phase 1: Hub separation
  const hubRows: ManifestRow[] = [];
  const nonHubRows: ManifestRow[] = [];

  for (const row of rows) {
    if (isHubBound(row)) {
      hubRows.push(row);
    } else {
      nonHubRows.push(row);
    }
  }

  // Phase 2: Geographic clustering for hub-bound passengers
  // For pickup: cluster by pickup zip. For dropoff: cluster by dropoff zip.
  const clustered = new Map<string, ManifestRow[]>();

  for (const row of hubRows) {
    const zip = type === "pickup" ? row.pickZip : row.dropZip;
    const cluster = getCluster(zip) || "Other";
    if (!clustered.has(cluster)) clustered.set(cluster, []);
    clustered.get(cluster)!.push(row);
  }

  // Phase 3: Pack trips
  const packed = packTrips(clustered);

  // Build Trip objects
  const trips: Trip[] = [];
  let colorIdx = 0;

  for (const pack of packed) {
    // Sort passengers by time within each trip
    const timeField = type === "pickup" ? "aptTime" : "schPU";
    const sortedRows = [...pack.rows].sort(
      (a, b) => parseTime(a[timeField]) - parseTime(b[timeField])
    );

    const passengers = sortedRows.map(rowToPassenger);
    const times = sortedRows.map((r) => parseTime(r[timeField]));
    const validTimes = times.filter((t) => t < 999);
    const avgTime =
      validTimes.length > 0
        ? validTimes.reduce((s, t) => s + t, 0) / validTimes.length
        : 999;
    const timeLabel = avgTime < 999 ? classifyTimeWindow(avgTime) : "";

    const tripId = `${type}-${trips.length + 1}`;

    trips.push({
      id: tripId,
      type,
      area: timeLabel ? `${pack.area} (${timeLabel})` : pack.area,
      color: TRIP_COLORS[colorIdx % TRIP_COLORS.length],
      passengerCount: passengers.length,
      passengers,
      directions: null, // populated later by directions API
    });

    colorIdx++;
  }

  // Handle non-hub passengers
  if (nonHubRows.length > 0) {
    for (let i = 0; i < nonHubRows.length; i += MAX_STOPS) {
      const chunk = nonHubRows.slice(i, i + MAX_STOPS);
      const timeField = type === "pickup" ? "aptTime" : "schPU";
      const sortedChunk = [...chunk].sort(
        (a, b) => parseTime(a[timeField]) - parseTime(b[timeField])
      );
      const passengers = sortedChunk.map(rowToPassenger);

      trips.push({
        id: `${type}-${trips.length + 1}`,
        type,
        area: "Various Destinations",
        color: TRIP_COLORS[colorIdx % TRIP_COLORS.length],
        passengerCount: passengers.length,
        passengers,
        directions: null,
      });
      colorIdx++;
    }
  }

  return trips;
}
