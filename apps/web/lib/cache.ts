import { put, list, del } from "@vercel/blob";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";

const TTL_SECONDS = 2592000; // 30 days
const LOCAL_CACHE_DIR = join(process.cwd(), ".cache");
const CACHE_BLOB_PREFIX = "cache/";

function isBlobAvailable(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

function getLocalCachePath(key: string): string {
  const safeKey = key.replace(/:/g, "_");
  return join(LOCAL_CACHE_DIR, `${safeKey}.json`);
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (isBlobAvailable()) {
    const safeKey = key.replace(/:/g, "_");
    const blobPath = `${CACHE_BLOB_PREFIX}${safeKey}.json`;
    try {
      const { blobs } = await list({ prefix: blobPath, limit: 1 });
      if (blobs.length === 0) return null;
      const blob = blobs[0];
      // Check TTL: if uploaded more than 30 days ago, treat as expired
      const age = Date.now() - new Date(blob.uploadedAt).getTime();
      if (age > TTL_SECONDS * 1000) return null;
      const response = await fetch(blob.url);
      if (!response.ok) return null;
      return (await response.json()) as T;
    } catch {
      return null;
    }
  }
  // Local file fallback
  const filePath = getLocalCachePath(key);
  if (!existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, "utf-8");
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T): Promise<void> {
  if (isBlobAvailable()) {
    const safeKey = key.replace(/:/g, "_");
    const blobPath = `${CACHE_BLOB_PREFIX}${safeKey}.json`;
    await put(blobPath, JSON.stringify(value), {
      contentType: "application/json",
      access: "public",
      addRandomSuffix: false,
    });
    return;
  }
  // Local file fallback
  if (!existsSync(LOCAL_CACHE_DIR)) {
    mkdirSync(LOCAL_CACHE_DIR, { recursive: true });
  }
  const entry: CacheEntry<T> = {
    data: value,
    expiresAt: Date.now() + TTL_SECONDS * 1000,
  };
  const filePath = getLocalCachePath(key);
  writeFileSync(filePath, JSON.stringify(entry), "utf-8");
}

/** Delete all cache entries whose key starts with a given prefix (e.g. "geocode"). */
export async function cacheClearByPrefix(prefix: string): Promise<number> {
  let deleted = 0;

  if (isBlobAvailable()) {
    // Blob: list all blobs under the cache prefix and delete matching ones
    const safePrefix = prefix.replace(/:/g, "_");
    let cursor: string | undefined;
    do {
      const result = await list({
        prefix: `${CACHE_BLOB_PREFIX}${safePrefix}`,
        limit: 100,
        cursor,
      });
      if (result.blobs.length > 0) {
        await del(result.blobs.map((b) => b.url));
        deleted += result.blobs.length;
      }
      cursor = result.hasMore ? result.cursor : undefined;
    } while (cursor);
  }

  // Also clear local cache
  if (existsSync(LOCAL_CACHE_DIR)) {
    const safePrefix = prefix.replace(/:/g, "_");
    for (const file of readdirSync(LOCAL_CACHE_DIR)) {
      if (file.startsWith(safePrefix)) {
        unlinkSync(join(LOCAL_CACHE_DIR, file));
        deleted++;
      }
    }
  }

  return deleted;
}
