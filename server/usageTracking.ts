import { getDb } from "./db";
import { users, usageLog, type User } from "../drizzle/schema";
import { eq, and, gte, sql } from "drizzle-orm";

/**
 * Check if a Free tier user has exceeded their scan cooldown (1 per 5 minutes)
 */
export async function checkFreeTierLimit(userId: number): Promise<{
  allowed: boolean;
  reason?: string;
  nextAvailableAt?: Date;
}> {
  const dbInstance = await getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  // Get user to check tier
  const [user] = await dbInstance
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { allowed: false, reason: "User not found" };
  }

  // Pro tier users have no limits
  if (user.tier === "PRO") {
    return { allowed: true };
  }

  // Check usage in last 5 minutes for Free tier
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  const recentUsage = await dbInstance
    .select()
    .from(usageLog)
    .where(
      and(
        eq(usageLog.userId, userId),
        eq(usageLog.action, "analysis"),
        gte(usageLog.timestamp, fiveMinutesAgo)
      )
    );

  if (recentUsage.length > 0) {
    const lastUsage = recentUsage[0];
    const nextAvailable = new Date(lastUsage.timestamp.getTime() + 5 * 60 * 1000);
    
    return {
      allowed: false,
      reason: "Free tier limit reached (1 scan per 5 minutes)",
      nextAvailableAt: nextAvailable,
    };
  }

  return { allowed: true };
}

/**
 * Log usage for tracking Free tier limits
 */
export async function logUsage(
  userId: number,
  action: string,
  resourceCount: number = 1,
  metadata?: Record<string, any>
): Promise<void> {
  const dbInstance = await getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  await dbInstance.insert(usageLog).values({
    userId,
    action,
    resourceCount,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
}

/**
 * Get usage statistics for a user
 */
export async function getUserUsageStats(userId: number, days: number = 30): Promise<{
  totalScans: number;
  totalDomains: number;
  recentUsage: Array<{
    action: string;
    resourceCount: number;
    timestamp: Date;
  }>;
}> {
  const dbInstance = await getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const usage = await dbInstance
    .select()
    .from(usageLog)
    .where(
      and(
        eq(usageLog.userId, userId),
        gte(usageLog.timestamp, startDate)
      )
    )
    .orderBy(sql`${usageLog.timestamp} DESC`)
    .limit(50);

  const totalScans = usage.filter((u: typeof usageLog.$inferSelect) => u.action === "analysis").length;
  const totalDomains = usage.reduce((sum: number, u: typeof usageLog.$inferSelect) => sum + u.resourceCount, 0);

  return {
    totalScans,
    totalDomains,
    recentUsage: usage.map((u: typeof usageLog.$inferSelect) => ({
      action: u.action,
      resourceCount: u.resourceCount,
      timestamp: u.timestamp,
    })),
  };
}

/**
 * Check if user can perform an action based on tier and limits
 */
export async function canPerformAction(
  userId: number,
  action: string,
  resourceCount: number = 1
): Promise<{
  allowed: boolean;
  reason?: string;
  requiresCredits?: boolean;
  creditsNeeded?: number;
}> {
  const dbInstance = await getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  const [user] = await dbInstance
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { allowed: false, reason: "User not found" };
  }

  // For analysis action, check Free tier limits
  if (action === "analysis" && user.tier === "FREE") {
    return await checkFreeTierLimit(userId);
  }

  // For bulk uploads, check credits
  if (action === "bulk_upload") {
    if (user.credits < resourceCount) {
      return {
        allowed: false,
        reason: "Insufficient credits",
        requiresCredits: true,
        creditsNeeded: resourceCount - user.credits,
      };
    }
  }

  return { allowed: true };
}
