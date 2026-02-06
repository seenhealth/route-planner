import type { Passenger, Trip, TripDirections, Vehicle } from "@route-planner/shared";
import { HUB, TRIP_COLORS, parseTime } from "@route-planner/shared";
import { GoogleAuth } from "google-auth-library";

const ROUTE_OPTIMIZATION_URL = "https://routeoptimization.googleapis.com/v1";
const SCOPES = ["https://www.googleapis.com/auth/cloud-platform"];

let authClient: GoogleAuth | null = null;

/** Get an OAuth2 access token for the Route Optimization API. */
async function getAccessToken(): Promise<string> {
  if (!authClient) {
    authClient = new GoogleAuth({ scopes: SCOPES });
  }
  const client = await authClient.getClient();
  const tokenResponse = await client.getAccessToken();
  if (!tokenResponse.token) {
    throw new Error("Failed to obtain access token for Route Optimization API");
  }
  return tokenResponse.token;
}

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

interface LatLng {
  latitude: number;
  longitude: number;
}

interface TimeWindow {
  startTime: string;
  endTime: string;
}

interface ShipmentVisit {
  arrivalLocation: LatLng;
  duration: string;
  timeWindows?: TimeWindow[];
}

interface Shipment {
  pickups?: ShipmentVisit[];
  deliveries?: ShipmentVisit[];
  loadDemands?: Record<string, { amount: string }>;
  label?: string;
  penaltyCost?: number;
}

interface VehicleDef {
  displayName?: string;
  startLocation?: LatLng;
  endLocation?: LatLng;
  startTimeWindows?: TimeWindow[];
  endTimeWindows?: TimeWindow[];
  loadLimits?: Record<string, { maxLoad: string }>;
  routeDurationLimit?: { maxDuration: string };
  costPerHour?: number;
  costPerKilometer?: number;
}

interface OptimizeToursRequest {
  model: {
    shipments: Shipment[];
    vehicles: VehicleDef[];
    globalStartTime?: string;
    globalEndTime?: string;
  };
  populatePolylines?: boolean;
  populateTransitionPolylines?: boolean;
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface VisitResponse {
  shipmentIndex?: number;
  isPickup?: boolean;
  startTime?: string;
  shipmentLabel?: string;
}

interface TransitionResponse {
  travelDuration?: string;
  travelDistanceMeters?: number;
  routePolyline?: { points: string };
}

interface RouteResponse {
  vehicleIndex?: number;
  vehicleLabel?: string;
  visits?: VisitResponse[];
  transitions?: TransitionResponse[];
  metrics?: {
    travelDuration?: string;
    totalDuration?: string;
    travelDistanceMeters?: number;
  };
  routePolyline?: { points: string };
}

interface OptimizeToursResponse {
  routes?: RouteResponse[];
  metrics?: unknown;
  skippedShipments?: { index: number; label?: string }[];
}

// ---------------------------------------------------------------------------
// Core API call
// ---------------------------------------------------------------------------

/**
 * Call the Google Route Optimization API to optimize trips for one direction.
 *
 * Approach 1 (Pickup-Only/Delivery-Only):
 * - Pickups: each passenger = shipment with 1 pickup at home. Vehicles start/end at hub.
 * - Dropoffs: each passenger = shipment with 1 delivery at home. Vehicles start/end at hub.
 *
 * The API assigns passengers to vehicles and sequences stops optimally.
 */
export async function optimizeTrips(
  passengers: { passenger: Passenger; index: number }[],
  vehicles: Vehicle[],
  driveTimeLimitMinutes: number,
  timeWindowBufferMinutes: number,
  type: "pickup" | "dropoff"
): Promise<Trip[]> {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

  if (!projectId) {
    throw new Error(
      "GOOGLE_CLOUD_PROJECT_ID is required for route optimization"
    );
  }

  // Filter to passengers with valid geocoded coordinates
  // Pickup: home address is in lat/lng. Dropoff: home address is in destLat/destLng.
  const geocoded = passengers.filter(({ passenger }) =>
    type === "pickup"
      ? passenger.lat !== 0 && passenger.lng !== 0
      : passenger.destLat !== 0 && passenger.destLng !== 0
  );

  if (geocoded.length === 0) return [];

  const driveTimeLimitSeconds = driveTimeLimitMinutes * 60;

  // Build shipments — one per passenger
  // Use today's date as the reference for time windows
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayStartISO = today.toISOString(); // midnight
  const dayEndISO = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const TIME_WINDOW_BUFFER_MIN = timeWindowBufferMinutes;

  const shipments: Shipment[] = geocoded.map(({ passenger }, i) => {
    // For pickups, the home is the pickup address (lat/lng).
    // For dropoffs, the home is the dest address (destLat/destLng).
    const location: LatLng =
      type === "pickup"
        ? { latitude: passenger.lat, longitude: passenger.lng }
        : { latitude: passenger.destLat, longitude: passenger.destLng };

    const visit: ShipmentVisit = {
      arrivalLocation: location,
      duration: "120s", // 2-minute stop time per passenger
    };

    // Add time windows based on the passenger's scheduled time.
    // This ensures the API groups passengers with similar times together
    // and doesn't mix 8:30am pickups with 2:30pm pickups.
    const timeMinutes = parseTime(passenger.time);
    if (timeMinutes < 999) {
      const windowStart = Math.max(0, timeMinutes - TIME_WINDOW_BUFFER_MIN);
      const windowEnd = Math.min(24 * 60, timeMinutes + TIME_WINDOW_BUFFER_MIN);
      visit.timeWindows = [{
        startTime: new Date(today.getTime() + windowStart * 60 * 1000).toISOString(),
        endTime: new Date(today.getTime() + windowEnd * 60 * 1000).toISOString(),
      }];
    }

    return {
      ...(type === "pickup" ? { pickups: [visit] } : { deliveries: [visit] }),
      loadDemands: { seats: { amount: "1" } },
      label: passenger.name || `passenger-${i}`,
      penaltyCost: 100000, // high penalty = effectively mandatory
    };
  });

  // Build vehicles from fleet config.
  // Each physical vehicle can make multiple trips, so we create virtual copies.
  // The API treats each virtual vehicle as an independent route — it will only
  // use as many as needed and leave the rest empty.
  const hubLocation: LatLng = { latitude: HUB.lat, longitude: HUB.lng };

  const totalCapacity = vehicles.reduce((sum, v) => sum + v.capacity, 0);
  const tripsPerVehicle = Math.max(
    2,
    Math.ceil(geocoded.length / Math.max(totalCapacity, 1)) + 1
  );

  // Drive-time limit only covers the passenger-carrying portion of the trip.
  // Deadhead legs (empty vehicle) don't count:
  //   Pickup:  Hub→P1 is deadhead, P1→…→Pn→Hub is passenger time
  //   Dropoff: Hub→P1→…→Pn is passenger time, Pn→Hub is deadhead
  //
  // We omit the deadhead-side location so routeDurationLimit only measures
  // the passenger-carrying segment.
  const vehicleDefs: VehicleDef[] = [];
  for (const v of vehicles) {
    for (let tripNum = 1; tripNum <= tripsPerVehicle; tripNum++) {
      vehicleDefs.push({
        displayName: `${v.name} #${tripNum}`,
        ...(type === "pickup"
          ? { endLocation: hubLocation }
          : { startLocation: hubLocation }),
        loadLimits: { seats: { maxLoad: String(v.capacity) } },
        routeDurationLimit: { maxDuration: `${driveTimeLimitSeconds}s` },
        costPerHour: 30,
        costPerKilometer: 1,
      });
    }
  }

  console.log(
    `Route Optimization: ${geocoded.length} passengers, ${vehicles.length} physical vehicles × ${tripsPerVehicle} trips = ${vehicleDefs.length} virtual vehicles`
  );

  const request: OptimizeToursRequest = {
    model: {
      shipments,
      vehicles: vehicleDefs,
      globalStartTime: dayStartISO,
      globalEndTime: dayEndISO,
    },
    populatePolylines: true,
    populateTransitionPolylines: true,
  };

  const accessToken = await getAccessToken();
  const url = `${ROUTE_OPTIMIZATION_URL}/projects/${projectId}:optimizeTours`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Route Optimization API error (${response.status}): ${errorBody}`
    );
  }

  const result: OptimizeToursResponse = await response.json();

  if (result.skippedShipments && result.skippedShipments.length > 0) {
    console.warn(
      `Route Optimization: ${result.skippedShipments.length} shipments skipped:`,
      result.skippedShipments.map((s) => s.label).join(", ")
    );
  }

  return mapResponseToTrips(result, geocoded, vehicleDefs, type);
}

// ---------------------------------------------------------------------------
// Response → Trip[] mapping
// ---------------------------------------------------------------------------

function mapResponseToTrips(
  response: OptimizeToursResponse,
  passengers: { passenger: Passenger; index: number }[],
  vehicleDefs: VehicleDef[],
  type: "pickup" | "dropoff"
): Trip[] {
  if (!response.routes) return [];

  // Collect active routes (those with visits)
  // Use vehicleIndex to look up the displayName we set on the request
  const activeRoutes: { route: RouteResponse; displayName: string }[] = [];
  for (const route of response.routes) {
    if (!route.visits || route.visits.length === 0) continue;
    const idx = route.vehicleIndex ?? 0;
    const rawName = vehicleDefs[idx]?.displayName ?? `Vehicle ${idx + 1}`;
    activeRoutes.push({ route, displayName: rawName });
  }

  // Count trips per base vehicle name to decide labeling
  const baseCounts = new Map<string, number>();
  for (const { displayName } of activeRoutes) {
    const base = displayName.replace(/ #\d+$/, "");
    baseCounts.set(base, (baseCounts.get(base) ?? 0) + 1);
  }

  // Track per-base trip numbering
  const baseCounters = new Map<string, number>();

  const trips: Trip[] = [];
  let colorIdx = 0;

  for (const { route, displayName } of activeRoutes) {
    const base = displayName.replace(/ #\d+$/, "");
    const count = baseCounts.get(base) ?? 1;
    const tripNum = (baseCounters.get(base) ?? 0) + 1;
    baseCounters.set(base, tripNum);

    // Clean area label: "Van 1" if only 1 trip, "Van 1 (Trip 2)" if multiple
    const area = count > 1 ? `${base} (Trip ${tripNum})` : base;

    // Collect passengers in visit order
    const tripPassengers: Passenger[] = [];
    for (const visit of route.visits ?? []) {
      const shipmentIdx = visit.shipmentIndex ?? 0;
      const entry = passengers[shipmentIdx];
      if (entry) tripPassengers.push(entry.passenger);
    }

    if (tripPassengers.length === 0) continue;

    const directions = buildDirectionsFromRoute(route);
    const tripId = `${type}-${trips.length + 1}`;

    trips.push({
      id: tripId,
      type,
      area,
      color: TRIP_COLORS[colorIdx % TRIP_COLORS.length],
      passengerCount: tripPassengers.length,
      passengers: tripPassengers,
      directions,
    });

    colorIdx++;
  }

  return trips;
}

function buildDirectionsFromRoute(route: RouteResponse): TripDirections | null {
  if (!route.routePolyline?.points) return null;

  const legs: TripDirections["legs"] = [];

  if (route.transitions) {
    for (const transition of route.transitions) {
      const durationSec = parseDuration(transition.travelDuration);
      const distanceMeters = transition.travelDistanceMeters ?? 0;

      legs.push({
        distance: formatDistance(distanceMeters),
        duration: formatDuration(durationSec),
        startAddress: "",
        endAddress: "",
      });
    }
  }

  return {
    overviewPolyline: route.routePolyline.points,
    waypointOrder: route.visits?.map((_, i) => i) ?? [],
    legs,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseDuration(duration?: string): number {
  if (!duration) return 0;
  const match = duration.match(/^([\d.]+)s$/);
  return match ? parseFloat(match[1]) : 0;
}

function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  return `${miles.toFixed(1)} mi`;
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} mins`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours} hr ${remainMins} mins`;
}
