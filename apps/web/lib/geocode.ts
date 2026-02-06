import { cacheGet, cacheSet } from "./cache";
import { normalizeAddress, generateCacheKey } from "./normalize";
import { geocodeRateLimiter } from "./rate-limit";

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId: string;
}

async function callGoogleGeocodeAPI(address: string): Promise<GeocodeResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Google Geocoding API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== "OK" || !data.results?.length) {
    throw new Error(
      `Geocoding failed for "${address}": ${data.status} - ${data.error_message ?? "No results"}`
    );
  }

  const result = data.results[0];
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
    placeId: result.place_id,
  };
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const normalized = normalizeAddress(address);
  const cacheKey = generateCacheKey("geocode", normalized);

  // Check cache first
  const cached = await cacheGet<GeocodeResult>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - call API with rate limiting
  const result = await geocodeRateLimiter.schedule(() =>
    callGoogleGeocodeAPI(address)
  );

  // Store in cache
  await cacheSet(cacheKey, result);

  return result;
}

export async function batchGeocodeAddresses(
  addresses: string[]
): Promise<{ address: string; result: GeocodeResult | null; error?: string }[]> {
  const results = [];

  for (const address of addresses) {
    try {
      const result = await geocodeAddress(address);
      results.push({ address, result });
    } catch (error) {
      results.push({
        address,
        result: null,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}
