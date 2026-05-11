import { eq, lt } from "drizzle-orm";
import { cache } from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Cache service for storing and retrieving API results with TTL
 */

export async function getCachedValue(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const result = await db
    .select()
    .from(cache)
    .where(eq(cache.cacheKey, key))
    .limit(1);

  if (result.length === 0) return null;

  const cached = result[0];
  
  // Check if expired
  if (cached && cached.expiresAt < now) {
    // Delete expired entry
    await db.delete(cache).where(eq(cache.cacheKey, key));
    return null;
  }

  return cached?.cacheValue || null;
}

export async function setCachedValue(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  // Upsert: insert or update if key exists
  await db
    .insert(cache)
    .values({
      cacheKey: key,
      cacheValue: value,
      expiresAt,
    })
    .onDuplicateKeyUpdate({
      set: {
        cacheValue: value,
        expiresAt,
      },
    });
}

export async function deleteCachedValue(key: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(cache).where(eq(cache.cacheKey, key));
}

export async function clearExpiredCache(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const now = new Date();
  await db.delete(cache).where(lt(cache.expiresAt, now));
  
  return 0; // Return 0 as we can't get affected rows count
}

/**
 * Cache TTL constants (in seconds)
 */
export const CACHE_TTL = {
  ARCHIVE_CONTENT: 24 * 60 * 60, // 24 hours
  DOMAIN_AVAILABILITY: 60 * 60, // 1 hour
  KEYWORDS: 24 * 60 * 60, // 24 hours
  MARKET_RESEARCH: 7 * 24 * 60 * 60, // 7 days
} as const;
