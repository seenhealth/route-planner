import { kv } from "@vercel/kv";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const TTL_SECONDS = 2592000; // 30 days
const LOCAL_CACHE_DIR = join(process.cwd(), ".cache");

function isVercelKVAvailable(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function getLocalCachePath(key: string): string {
  // Replace colons with underscores for filesystem safety
  const safeKey = key.replace(/:/g, "_");
  return join(LOCAL_CACHE_DIR, `${safeKey}.json`);
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (isVercelKVAvailable()) {
    return kv.get<T>(key);
  }

  // Local file-based fallback
  const filePath = getLocalCachePath(key);
  if (!existsSync(filePath)) return null;

  try {
    const raw = readFileSync(filePath, "utf-8");
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      return null; // Expired
    }
    return entry.data;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T): Promise<void> {
  if (isVercelKVAvailable()) {
    await kv.set(key, value, { ex: TTL_SECONDS });
    return;
  }

  // Local file-based fallback
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
