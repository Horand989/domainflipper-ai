/**
 * Feature Gating System
 * 
 * Controls access to premium features based on user subscription tier.
 * Protects expensive API calls and enforces freemium limits.
 */

import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Feature definitions with their access requirements
 */
export const FEATURES = {
  // Free tier features (available to all users)
  FORENSIC_AUDIT: "forensic_audit",
  ZOMBIE_PAGE_DISCOVERY: "zombie_page_discovery",
  KEYWORD_LISTS: "keyword_lists",
  BASIC_PROJECT: "basic_project",
  HISTORY_VIEW: "history_view",
  
  // Pro tier features (require subscription or credits)
  DATAFORSEO_METRICS: "dataforseo_metrics", // Volume, KD, CPC
  DOMAIN_AUTHORITY: "domain_authority",
  TRUST_FLOW: "trust_flow",
  BACKLINK_COUNT: "backlink_count",
  WEEKLY_TRACKING: "weekly_tracking",
  UNLIMITED_PROJECTS: "unlimited_projects",
  PDF_EXPORT: "pdf_export",
  ADVANCED_ANALYTICS: "advanced_analytics",
} as const;

export type FeatureName = typeof FEATURES[keyof typeof FEATURES];

/**
 * Feature access rules by tier
 */
const FEATURE_ACCESS: Record<string, FeatureName[]> = {
  FREE: [
    FEATURES.FORENSIC_AUDIT,
    FEATURES.ZOMBIE_PAGE_DISCOVERY,
    FEATURES.KEYWORD_LISTS,
    FEATURES.BASIC_PROJECT,
    FEATURES.HISTORY_VIEW,
  ],
  PRO: [
    // Pro users get everything
    ...Object.values(FEATURES),
  ],
};

/**
 * Feature costs in credits (for pay-as-you-go users)
 */
export const FEATURE_COSTS: Record<string, number> = {
  [FEATURES.DATAFORSEO_METRICS]: 10, // 10 credits per keyword batch
  [FEATURES.DOMAIN_AUTHORITY]: 5,    // 5 credits per domain check
  [FEATURES.TRUST_FLOW]: 5,
  [FEATURES.BACKLINK_COUNT]: 5,
  [FEATURES.WEEKLY_TRACKING]: 20,    // 20 credits per weekly check
};

/**
 * Project limits by tier
 */
export const PROJECT_LIMITS = {
  FREE: 1,
  PRO: Infinity,
};

/**
 * Check if a user has access to a specific feature
 * 
 * @param userId - The user's ID
 * @param featureName - The feature to check access for
 * @returns Object with hasAccess boolean and reason if denied
 */
export async function checkFeatureAccess(
  userId: number,
  featureName: FeatureName
): Promise<{ hasAccess: boolean; reason?: string; tier?: string }> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database unavailable");
  }

  // Get user's subscription tier
  const userList = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userList[0];

  if (!user) {
    return {
      hasAccess: false,
      reason: "User not found",
    };
  }

  const userTier = user.tier || "FREE";
  const userCredits = user.credits || 0;

  // Check if feature is available for user's tier
  const tierFeatures = FEATURE_ACCESS[userTier] || FEATURE_ACCESS.FREE;
  const hasAccessByTier = tierFeatures.includes(featureName);

  if (hasAccessByTier) {
    return {
      hasAccess: true,
      tier: userTier,
    };
  }

  // If not available by tier, check if user has enough credits
  const featureCost = FEATURE_COSTS[featureName] || 0;
  if (userCredits >= featureCost) {
    return {
      hasAccess: true,
      tier: userTier,
      reason: `Will use ${featureCost} credits`,
    };
  }

  // Access denied
  return {
    hasAccess: false,
    tier: userTier,
    reason: `Requires PRO plan or ${featureCost} credits`,
  };
}

/**
 * Require feature access or throw TRPC error
 * Use this in tRPC procedures to protect routes
 * 
 * @param userId - The user's ID
 * @param featureName - The feature being accessed
 * @throws TRPCError if access is denied
 */
export async function requireFeatureAccess(
  userId: number,
  featureName: FeatureName
): Promise<void> {
  const access = await checkFeatureAccess(userId, featureName);

  if (!access.hasAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: access.reason || "This feature requires a PRO subscription",
    });
  }
}

/**
 * Deduct credits from user account after using a paid feature
 * 
 * @param userId - The user's ID
 * @param featureName - The feature that was used
 * @returns New credit balance
 */
export async function deductCredits(
  userId: number,
  featureName: FeatureName
): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database unavailable");
  }

  const featureCost = FEATURE_COSTS[featureName] || 0;
  if (featureCost === 0) {
    return 0; // Free feature, no deduction
  }

  // Get current credits
  const userList = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userList[0];

  if (!user) {
    throw new Error("User not found");
  }

  const currentCredits = user.credits || 0;
  const newCredits = Math.max(0, currentCredits - featureCost);

  // Update user credits
  await db.update(users).set({ credits: newCredits }).where(eq(users.id, userId));

  return newCredits;
}

/**
 * Check if user can create another project
 * 
 * @param userId - The user's ID
 * @param currentProjectCount - Number of projects user currently has
 * @returns Object with canCreate boolean and reason if denied
 */
export async function checkProjectLimit(
  userId: number,
  currentProjectCount: number
): Promise<{ canCreate: boolean; reason?: string; limit: number }> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database unavailable");
  }

  const userList = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userList[0];

  if (!user) {
    return {
      canCreate: false,
      reason: "User not found",
      limit: 0,
    };
  }

  const userTier = user.tier || "FREE";
  const limit = PROJECT_LIMITS[userTier] || PROJECT_LIMITS.FREE;

  if (currentProjectCount >= limit) {
    return {
      canCreate: false,
      reason: `${userTier} plan allows ${limit} project${limit === 1 ? "" : "s"}. Upgrade to PRO for unlimited projects.`,
      limit,
    };
  }

  return {
    canCreate: true,
    limit,
  };
}

/**
 * Get user's current tier and subscription status
 * 
 * @param userId - The user's ID
 * @returns User tier information
 */
export async function getUserTier(userId: number): Promise<{
  tier: string;
  plan: string;
  subscriptionStatus: string;
  credits: number;
  subscriptionExpiry: Date | null;
}> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database unavailable");
  }

  const userList = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userList[0];

  if (!user) {
    throw new Error("User not found");
  }

  return {
    tier: user.tier || "FREE",
    plan: user.plan || "free",
    subscriptionStatus: user.subscriptionStatus || "NONE",
    credits: user.credits || 0,
    subscriptionExpiry: user.subscriptionExpiry,
  };
}

/**
 * Helper to check if user is on PRO tier
 */
export async function isProUser(userId: number): Promise<boolean> {
  const tierInfo = await getUserTier(userId);
  return tierInfo.tier === "PRO" && 
         (tierInfo.subscriptionStatus === "ACTIVE" || tierInfo.subscriptionStatus === "TRIALING");
}

/**
 * Helper to check if user has active subscription
 */
export async function hasActiveSubscription(userId: number): Promise<boolean> {
  const tierInfo = await getUserTier(userId);
  
  // Check if subscription is active
  if (tierInfo.subscriptionStatus !== "ACTIVE" && tierInfo.subscriptionStatus !== "TRIALING") {
    return false;
  }

  // Check if subscription hasn't expired
  if (tierInfo.subscriptionExpiry) {
    return tierInfo.subscriptionExpiry > new Date();
  }

  return true;
}
