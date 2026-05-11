import crypto from "crypto";
import { getDb } from "../db";
import { apiKeys } from "../../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";

const PREFIX = "ds_";
const KEY_BYTES = 32; // 256-bit random key

/**
 * Generate a new API key for a user.
 * Returns the full plaintext key ONCE — it is never stored in plain text.
 */
export async function generateApiKey(
  userId: number,
  name: string
): Promise<{ fullKey: string; prefix: string; id: number }> {
  const randomBytes = crypto.randomBytes(KEY_BYTES).toString("hex"); // 64 hex chars
  const fullKey = `${PREFIX}${randomBytes}`;
  const keyPrefix = fullKey.slice(0, 10); // "ds_" + first 7 chars, shown in UI
  const keyHash = hashKey(fullKey);

  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(apiKeys).values({ userId, name, keyPrefix, keyHash });
  const insertId = (result as unknown as [{ insertId: number }])[0]?.insertId ?? 0;

  return { fullKey, prefix: keyPrefix, id: insertId };
}

/**
 * Hash a full API key with SHA-256 for safe storage.
 */
export function hashKey(fullKey: string): string {
  return crypto.createHash("sha256").update(fullKey).digest("hex");
}

/**
 * Validate an incoming API key and return the associated userId if valid.
 * Returns null if the key is invalid or revoked.
 */
export async function validateApiKey(
  fullKey: string
): Promise<{ userId: number; keyId: number } | null> {
  if (!fullKey.startsWith(PREFIX)) return null;

  const keyHash = hashKey(fullKey);
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select({ id: apiKeys.id, userId: apiKeys.userId })
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
    .limit(1);

  if (!rows.length) return null;

  // Update lastUsedAt asynchronously (don't await to keep latency low)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, rows[0].id))
    .catch((err: unknown) => console.error("[ApiKey] Failed to update lastUsedAt:", err));

  return { userId: rows[0].userId, keyId: rows[0].id };
}

/**
 * List all active (non-revoked) API keys for a user.
 * Never returns the keyHash — only safe display fields.
 */
export async function listApiKeys(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
    .orderBy(apiKeys.createdAt);
}

/**
 * Revoke an API key by setting revokedAt.
 * Only the owning user can revoke their own key.
 */
export async function revokeApiKey(userId: number, keyId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)));

  return (result as unknown as [{ affectedRows: number }])[0]?.affectedRows > 0;
}
