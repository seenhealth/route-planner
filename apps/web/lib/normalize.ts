import { createHash } from "crypto";

const ABBREVIATIONS: Record<string, string> = {
  st: "street",
  ave: "avenue",
  blvd: "boulevard",
  dr: "drive",
  rd: "road",
  ln: "lane",
  ct: "court",
  pkwy: "parkway",
  pl: "place",
  cir: "circle",
  hwy: "highway",
  apt: "apartment",
  ste: "suite",
  fl: "floor",
  n: "north",
  s: "south",
  e: "east",
  w: "west",
  ne: "northeast",
  nw: "northwest",
  se: "southeast",
  sw: "southwest",
};

export function normalizeAddress(address: string): string {
  let normalized = address.toLowerCase().trim();

  // Remove unit/apt designators like "#E" or "# E"
  normalized = normalized.replace(/#\s*\w+/g, "");

  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, " ");

  // Expand abbreviations (word-boundary aware)
  normalized = normalized.replace(/\b(\w+)\b/g, (match) => {
    return ABBREVIATIONS[match] ?? match;
  });

  // Remove trailing periods after abbreviations
  normalized = normalized.replace(/\.\s/g, " ");
  normalized = normalized.replace(/\.$/, "");

  // Collapse spaces again after transformations
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
}

export function generateCacheKey(
  type: "geocode" | "directions",
  input: string
): string {
  const hash = createHash("sha256").update(input).digest("hex").slice(0, 16);
  return `${type}:${hash}`;
}

export function formatDirectionsCacheInput(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  waypoints: { lat: number; lng: number }[]
): string {
  const waypointStr = waypoints.map((w) => `${w.lat},${w.lng}`).join("|");
  const base = `${origin.lat},${origin.lng}>${destination.lat},${destination.lng}`;
  return waypointStr ? `${base}|${waypointStr}` : base;
}
