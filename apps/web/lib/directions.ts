import { cacheGet, cacheSet } from "./cache";
import {
  generateCacheKey,
  formatDirectionsCacheInput,
} from "./normalize";
import { directionsRateLimiter } from "./rate-limit";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DirectionLeg {
  distance: string;
  duration: string;
  startAddress: string;
  endAddress: string;
}

export interface DirectionsResult {
  overviewPolyline: string;
  waypointOrder: number[];
  legs: DirectionLeg[];
}

async function callGoogleDirectionsAPI(
  origin: LatLng,
  destination: LatLng,
  waypoints: LatLng[]
): Promise<DirectionsResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }

  let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&key=${apiKey}`;

  if (waypoints.length > 0) {
    const waypointStr = waypoints
      .map((w) => `${w.lat},${w.lng}`)
      .join("|");
    url += `&waypoints=optimize:true|${waypointStr}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Google Directions API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== "OK" || !data.routes?.length) {
    throw new Error(
      `Directions failed: ${data.status} - ${data.error_message ?? "No routes"}`
    );
  }

  const route = data.routes[0];
  return {
    overviewPolyline: route.overview_polyline.points,
    waypointOrder: route.waypoint_order ?? [],
    legs: route.legs.map(
      (leg: {
        distance: { text: string };
        duration: { text: string };
        start_address: string;
        end_address: string;
      }) => ({
        distance: leg.distance.text,
        duration: leg.duration.text,
        startAddress: leg.start_address,
        endAddress: leg.end_address,
      })
    ),
  };
}

export async function getDirections(
  origin: LatLng,
  destination: LatLng,
  waypoints: LatLng[] = []
): Promise<DirectionsResult> {
  const cacheInput = formatDirectionsCacheInput(origin, destination, waypoints);
  const cacheKey = generateCacheKey("directions", cacheInput);

  // Check cache first
  const cached = await cacheGet<DirectionsResult>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - call API with rate limiting
  const result = await directionsRateLimiter.schedule(() =>
    callGoogleDirectionsAPI(origin, destination, waypoints)
  );

  // Store in cache
  await cacheSet(cacheKey, result);

  return result;
}
