import { getDb } from "./db";
import { ipRateLimits } from "../drizzle/schema";
import { eq, and, gte } from "drizzle-orm";

const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_REQUESTS_PER_WINDOW = 10; // 10 scans per IP per hour

/**
 * Check if an IP address has exceeded rate limits
 */
export async function checkIpRateLimit(
  ipAddress: string,
  action: string = "analysis"
): Promise<{
  allowed: boolean;
  reason?: string;
  remainingRequests?: number;
  resetAt?: Date;
}> {
  const dbInstance = await getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW);

  // Find existing rate limit record for this IP and action
  const [existing] = await dbInstance
    .select()
    .from(ipRateLimits)
    .where(
      and(
        eq(ipRateLimits.ipAddress, ipAddress),
        eq(ipRateLimits.action, action),
        gte(ipRateLimits.windowStart, windowStart)
      )
    )
    .limit(1);

  if (!existing) {
    // No recent activity, allow request
    return {
      allowed: true,
      remainingRequests: MAX_REQUESTS_PER_WINDOW - 1,
    };
  }

  // Check if window has expired
  const windowAge = now.getTime() - existing.windowStart.getTime();
  if (windowAge >= RATE_LIMIT_WINDOW) {
    // Window expired, reset counter
    return {
      allowed: true,
      remainingRequests: MAX_REQUESTS_PER_WINDOW - 1,
    };
  }

  // Check if limit exceeded
  if (existing.requestCount >= MAX_REQUESTS_PER_WINDOW) {
    const resetAt = new Date(existing.windowStart.getTime() + RATE_LIMIT_WINDOW);
    return {
      allowed: false,
      reason: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_WINDOW} requests per hour from this IP address.`,
      remainingRequests: 0,
      resetAt,
    };
  }

  // Within limits
  return {
    allowed: true,
    remainingRequests: MAX_REQUESTS_PER_WINDOW - existing.requestCount - 1,
  };
}

/**
 * Log an IP request and update rate limit counter
 */
export async function logIpRequest(
  ipAddress: string,
  action: string = "analysis",
  metadata?: Record<string, any>
): Promise<void> {
  const dbInstance = await getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW);

  // Find existing rate limit record
  const [existing] = await dbInstance
    .select()
    .from(ipRateLimits)
    .where(
      and(
        eq(ipRateLimits.ipAddress, ipAddress),
        eq(ipRateLimits.action, action),
        gte(ipRateLimits.windowStart, windowStart)
      )
    )
    .limit(1);

  if (!existing) {
    // Create new rate limit record
    await dbInstance.insert(ipRateLimits).values({
      ipAddress,
      action,
      requestCount: 1,
      windowStart: now,
      lastRequest: now,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
  } else {
    // Check if window has expired
    const windowAge = now.getTime() - existing.windowStart.getTime();
    
    if (windowAge >= RATE_LIMIT_WINDOW) {
      // Reset counter for new window
      await dbInstance
        .update(ipRateLimits)
        .set({
          requestCount: 1,
          windowStart: now,
          lastRequest: now,
          blocked: 0,
          metadata: metadata ? JSON.stringify(metadata) : null,
        })
        .where(eq(ipRateLimits.id, existing.id));
    } else {
      // Increment counter
      await dbInstance
        .update(ipRateLimits)
        .set({
          requestCount: existing.requestCount + 1,
          lastRequest: now,
          blocked: existing.requestCount + 1 >= MAX_REQUESTS_PER_WINDOW ? 1 : 0,
          metadata: metadata ? JSON.stringify(metadata) : null,
        })
        .where(eq(ipRateLimits.id, existing.id));
    }
  }
}

/**
 * Get IP rate limit statistics
 */
export async function getIpRateLimitStats(ipAddress: string): Promise<{
  requestCount: number;
  remainingRequests: number;
  resetAt: Date;
  isBlocked: boolean;
}> {
  const dbInstance = await getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW);

  const [existing] = await dbInstance
    .select()
    .from(ipRateLimits)
    .where(
      and(
        eq(ipRateLimits.ipAddress, ipAddress),
        gte(ipRateLimits.windowStart, windowStart)
      )
    )
    .limit(1);

  if (!existing) {
    return {
      requestCount: 0,
      remainingRequests: MAX_REQUESTS_PER_WINDOW,
      resetAt: new Date(now.getTime() + RATE_LIMIT_WINDOW),
      isBlocked: false,
    };
  }

  const resetAt = new Date(existing.windowStart.getTime() + RATE_LIMIT_WINDOW);
  
  return {
    requestCount: existing.requestCount,
    remainingRequests: Math.max(0, MAX_REQUESTS_PER_WINDOW - existing.requestCount),
    resetAt,
    isBlocked: existing.blocked === 1,
  };
}

/**
 * Extract IP address from request headers
 */
export function extractIpAddress(headers: Record<string, string | string[] | undefined>): string {
  // Check common proxy headers first
  const forwardedFor = headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }

  const realIp = headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  const cfConnectingIp = headers['cf-connecting-ip'];
  if (cfConnectingIp) {
    return Array.isArray(cfConnectingIp) ? cfConnectingIp[0] : cfConnectingIp;
  }

  // Fallback to unknown
  return 'unknown';
}
