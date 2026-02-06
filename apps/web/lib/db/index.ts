import { put, list, del } from "@vercel/blob";
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, readdirSync } from "fs";
import { join } from "path";
import type { RouteData, VehicleConfig } from "@route-planner/shared";
import { DEFAULT_VEHICLES } from "@route-planner/shared";

const MANIFEST_PREFIX = "manifests/";
const LOCAL_MANIFEST_DIR = join(process.cwd(), ".cache", "manifests");

const ROUTES_PREFIX = "routes/";
const LOCAL_ROUTES_DIR = join(process.cwd(), ".cache", "routes");

function isBlobAvailable(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export interface ManifestMeta {
  id: string;
  fileName: string;
  jobDate: string;
  uploadedAt: string;
  blobUrl: string;
  size: number; // file size in bytes
}

export async function uploadManifest(
  id: string,
  fileName: string,
  jobDate: string,
  csvContent: string
): Promise<ManifestMeta> {
  const uploadedAt = new Date().toISOString();

  if (isBlobAvailable()) {
    const blob = await put(`${MANIFEST_PREFIX}${id}/${fileName}`, csvContent, {
      contentType: "text/csv",
      access: "public",
      addRandomSuffix: false,
    });
    return { id, fileName, jobDate, uploadedAt, blobUrl: blob.url, size: Buffer.byteLength(csvContent, "utf-8") };
  }

  // Local fallback
  const dir = join(LOCAL_MANIFEST_DIR, id);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, fileName), csvContent, "utf-8");
  const meta: ManifestMeta = { id, fileName, jobDate, uploadedAt, blobUrl: `/api/manifests/${id}/csv`, size: Buffer.byteLength(csvContent, "utf-8") };
  writeFileSync(join(dir, "_meta.json"), JSON.stringify(meta), "utf-8");
  return meta;
}

export async function listManifests(): Promise<ManifestMeta[]> {
  if (isBlobAvailable()) {
    const { blobs } = await list({ prefix: MANIFEST_PREFIX });
    const manifests: ManifestMeta[] = [];
    for (const blob of blobs) {
      // pathname: manifests/{id}/{fileName}
      const parts = blob.pathname.replace(MANIFEST_PREFIX, "").split("/");
      if (parts.length < 2) continue;
      const [id, fileName] = parts;
      manifests.push({
        id,
        fileName,
        jobDate: "",
        uploadedAt: blob.uploadedAt.toISOString(),
        blobUrl: blob.url,
        size: blob.size,
      });
    }
    return manifests.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }

  // Local fallback
  if (!existsSync(LOCAL_MANIFEST_DIR)) return [];
  const dirs = readdirSync(LOCAL_MANIFEST_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const manifests: ManifestMeta[] = [];
  for (const id of dirs) {
    const metaPath = join(LOCAL_MANIFEST_DIR, id, "_meta.json");
    if (existsSync(metaPath)) {
      try {
        manifests.push(JSON.parse(readFileSync(metaPath, "utf-8")));
      } catch { /* skip corrupt entries */ }
    }
  }
  return manifests.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function getManifest(id: string): Promise<{ meta: ManifestMeta; csvContent: string } | null> {
  if (isBlobAvailable()) {
    const { blobs } = await list({ prefix: `${MANIFEST_PREFIX}${id}/` });
    if (blobs.length === 0) return null;
    const blob = blobs[0];
    const parts = blob.pathname.replace(MANIFEST_PREFIX, "").split("/");
    const fileName = parts[1] || "manifest.csv";
    const response = await fetch(blob.url);
    if (!response.ok) return null;
    const csvContent = await response.text();
    return {
      meta: { id, fileName, jobDate: "", uploadedAt: blob.uploadedAt.toISOString(), blobUrl: blob.url, size: blob.size },
      csvContent,
    };
  }

  // Local fallback
  const dir = join(LOCAL_MANIFEST_DIR, id);
  const metaPath = join(dir, "_meta.json");
  if (!existsSync(metaPath)) return null;
  const meta: ManifestMeta = JSON.parse(readFileSync(metaPath, "utf-8"));
  const csvPath = join(dir, meta.fileName);
  if (!existsSync(csvPath)) return null;
  return { meta, csvContent: readFileSync(csvPath, "utf-8") };
}

export async function deleteManifest(id: string): Promise<void> {
  if (isBlobAvailable()) {
    const { blobs } = await list({ prefix: `${MANIFEST_PREFIX}${id}/` });
    if (blobs.length > 0) {
      await del(blobs.map((b) => b.url));
    }
    return;
  }

  // Local fallback
  const dir = join(LOCAL_MANIFEST_DIR, id);
  if (existsSync(dir)) {
    const files = readdirSync(dir);
    for (const f of files) unlinkSync(join(dir, f));
    const { rmdirSync } = await import("fs");
    rmdirSync(dir);
  }
}

// ---------------------------------------------------------------------------
// App Config (stored in Blob / local file)
// ---------------------------------------------------------------------------

const CONFIG_PATH = "config/settings.json";
const LOCAL_CONFIG_DIR = join(process.cwd(), ".cache", "config");

export interface AppConfig {
  driveTimeLimitMinutes: number; // max time any single passenger can be in vehicle
  timeWindowBufferMinutes: number; // ± buffer around scheduled time for grouping
}

const DEFAULT_CONFIG: AppConfig = {
  driveTimeLimitMinutes: 45,
  timeWindowBufferMinutes: 60,
};

export async function getConfig(): Promise<AppConfig> {
  if (isBlobAvailable()) {
    const { blobs } = await list({ prefix: CONFIG_PATH });
    if (blobs.length === 0) return { ...DEFAULT_CONFIG };
    const response = await fetch(blobs[0].url);
    if (!response.ok) return { ...DEFAULT_CONFIG };
    try {
      const data = await response.json();
      return { ...DEFAULT_CONFIG, ...data };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  // Local fallback
  const localPath = join(LOCAL_CONFIG_DIR, "settings.json");
  if (!existsSync(localPath)) return { ...DEFAULT_CONFIG };
  try {
    const data = JSON.parse(readFileSync(localPath, "utf-8"));
    return { ...DEFAULT_CONFIG, ...data };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveConfig(config: AppConfig): Promise<void> {
  const json = JSON.stringify(config);

  if (isBlobAvailable()) {
    await put(CONFIG_PATH, json, {
      contentType: "application/json",
      access: "public",
      addRandomSuffix: false,
    });
    return;
  }

  // Local fallback
  if (!existsSync(LOCAL_CONFIG_DIR)) mkdirSync(LOCAL_CONFIG_DIR, { recursive: true });
  writeFileSync(join(LOCAL_CONFIG_DIR, "settings.json"), json, "utf-8");
}

// ---------------------------------------------------------------------------
// Vehicle Config (stored in Blob / local file)
// ---------------------------------------------------------------------------

const VEHICLES_PATH = "config/vehicles.json";

export async function getVehicleConfig(): Promise<VehicleConfig> {
  if (isBlobAvailable()) {
    const { blobs } = await list({ prefix: VEHICLES_PATH });
    if (blobs.length === 0) return { vehicles: [...DEFAULT_VEHICLES] };
    const response = await fetch(blobs[0].url);
    if (!response.ok) return { vehicles: [...DEFAULT_VEHICLES] };
    try {
      return (await response.json()) as VehicleConfig;
    } catch {
      return { vehicles: [...DEFAULT_VEHICLES] };
    }
  }

  // Local fallback
  const localPath = join(LOCAL_CONFIG_DIR, "vehicles.json");
  if (!existsSync(localPath)) return { vehicles: [...DEFAULT_VEHICLES] };
  try {
    return JSON.parse(readFileSync(localPath, "utf-8")) as VehicleConfig;
  } catch {
    return { vehicles: [...DEFAULT_VEHICLES] };
  }
}

export async function saveVehicleConfig(config: VehicleConfig): Promise<void> {
  const json = JSON.stringify(config);

  if (isBlobAvailable()) {
    await put(VEHICLES_PATH, json, {
      contentType: "application/json",
      access: "public",
      addRandomSuffix: false,
    });
    return;
  }

  // Local fallback
  if (!existsSync(LOCAL_CONFIG_DIR)) mkdirSync(LOCAL_CONFIG_DIR, { recursive: true });
  writeFileSync(join(LOCAL_CONFIG_DIR, "vehicles.json"), json, "utf-8");
}

// ---------------------------------------------------------------------------
// Cached RouteData (computed route results stored in Blob / local file)
// ---------------------------------------------------------------------------

export interface CachedRouteResult {
  data: RouteData;
  cachedAt: string; // ISO timestamp of when routes were computed
}

export async function getCachedRouteData(manifestId: string, configHash?: string): Promise<CachedRouteResult | null> {
  const hashSegment = configHash ? `${configHash}/` : "";
  const blobPath = `${ROUTES_PREFIX}${manifestId}/${hashSegment}route_data.json`;

  if (isBlobAvailable()) {
    const { blobs } = await list({ prefix: blobPath });
    if (blobs.length === 0) return null;
    const blob = blobs[0];
    const response = await fetch(blob.url);
    if (!response.ok) return null;
    return {
      data: (await response.json()) as RouteData,
      cachedAt: blob.uploadedAt.toISOString(),
    };
  }

  // Local fallback
  const hashDir = configHash ? join(manifestId, configHash) : manifestId;
  const localPath = join(LOCAL_ROUTES_DIR, hashDir, "route_data.json");
  if (!existsSync(localPath)) return null;
  try {
    const { statSync } = await import("fs");
    const stat = statSync(localPath);
    return {
      data: JSON.parse(readFileSync(localPath, "utf-8")) as RouteData,
      cachedAt: stat.mtime.toISOString(),
    };
  } catch {
    return null;
  }
}

export async function cacheRouteData(manifestId: string, data: RouteData, configHash?: string): Promise<void> {
  const hashSegment = configHash ? `${configHash}/` : "";
  const blobPath = `${ROUTES_PREFIX}${manifestId}/${hashSegment}route_data.json`;
  const json = JSON.stringify(data);

  if (isBlobAvailable()) {
    await put(blobPath, json, {
      contentType: "application/json",
      access: "public",
      addRandomSuffix: false,
    });
    return;
  }

  // Local fallback
  const hashDir = configHash ? join(manifestId, configHash) : manifestId;
  const dir = join(LOCAL_ROUTES_DIR, hashDir);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "route_data.json"), json, "utf-8");
}
