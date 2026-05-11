import * as db from "./db";

/**
 * Subscription tier access control
 * 
 * Free (Scout): AI estimates, Forensic Audit, basic features
 * Pro (Sniper): Real DataForSEO data, advanced metrics
 * Pay-As-You-Go: Credit-based access to Pro features
 */

export interface TierCheck {
  hasAccess: boolean;
  tier: "FREE" | "PRO";
  credits: number;
  reason?: string;
}

/**
 * Check if user has access to premium features (DataForSEO API)
 * 
 * Access granted if:
 * - User has PRO tier with valid subscription
 * - User has credits > 0 (pay-as-you-go)
 * 
 * @param userId - User ID to check
 * @returns TierCheck object with access status
 */
export async function checkPremiumAccess(userId: number): Promise<TierCheck> {
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    return {
      hasAccess: false,
      tier: "FREE",
      credits: 0,
      reason: "Database unavailable",
    };
  }

  const { users } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  const [user] = await dbInstance
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return {
      hasAccess: false,
      tier: "FREE",
      credits: 0,
      reason: "User not found",
    };
  }

  // Check if user is PRO tier
  if (user.tier === "PRO") {
    // Check if subscription is still valid
    if (user.subscriptionExpiry) {
      const now = new Date();
      const expiry = new Date(user.subscriptionExpiry);
      if (expiry < now) {
        return {
          hasAccess: false,
          tier: "PRO",
          credits: user.credits,
          reason: "Subscription expired",
        };
      }
    }
    // PRO tier with valid subscription
    return {
      hasAccess: true,
      tier: "PRO",
      credits: user.credits,
    };
  }

  // Check if user has credits (pay-as-you-go)
  if (user.credits > 0) {
    return {
      hasAccess: true,
      tier: "FREE",
      credits: user.credits,
    };
  }

  // Free tier without credits
  return {
    hasAccess: false,
    tier: "FREE",
    credits: 0,
    reason: "Free tier - upgrade to Pro or purchase credits",
  };
}

/**
 * Deduct credits from user account and log transaction
 * 
 * @param userId - User ID
 * @param amount - Number of credits to deduct
 * @param description - Description of what the credits were used for
 * @param relatedAction - Action type (e.g., 'keyword_generation', 'domain_analysis')
 * @returns New credit balance, or null if insufficient credits
 */
export async function deductCredits(
  userId: number,
  amount: number,
  description: string,
  relatedAction?: string
): Promise<number | null> {
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    throw new Error("Database unavailable");
  }

  const { users, creditTransactions } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  // Get current user
  const [user] = await dbInstance
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  // Check if user has enough credits
  if (user.credits < amount) {
    return null; // Insufficient credits
  }

  const newBalance = user.credits - amount;

  // Update user credits
  await dbInstance
    .update(users)
    .set({ credits: newBalance })
    .where(eq(users.id, userId));

  // Log transaction
  await dbInstance.insert(creditTransactions).values({
    userId,
    type: "deduction",
    amount: -amount,
    balance: newBalance,
    description,
    relatedAction: relatedAction || null,
    metadata: null,
  });

  return newBalance;
}

/**
 * Add credits to user account and log transaction
 * 
 * @param userId - User ID
 * @param amount - Number of credits to add
 * @param type - Transaction type ('purchase', 'bonus', 'refund')
 * @param description - Description of the transaction
 * @returns New credit balance
 */
export async function addCredits(
  userId: number,
  amount: number,
  type: "purchase" | "bonus" | "refund",
  description: string
): Promise<number> {
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    throw new Error("Database unavailable");
  }

  const { users, creditTransactions } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  // Get current user
  const [user] = await dbInstance
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  const newBalance = user.credits + amount;

  // Update user credits
  await dbInstance
    .update(users)
    .set({ credits: newBalance })
    .where(eq(users.id, userId));

  // Log transaction
  await dbInstance.insert(creditTransactions).values({
    userId,
    type,
    amount,
    balance: newBalance,
    description,
    relatedAction: null,
    metadata: null,
  });

  return newBalance;
}

/**
 * Get user's subscription status and credit balance
 * 
 * @param userId - User ID
 * @returns Subscription status object
 */
export async function getSubscriptionStatus(userId: number) {
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    throw new Error("Database unavailable");
  }

  const { users } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  const [user] = await dbInstance
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  const tierCheck = await checkPremiumAccess(userId);

  return {
    tier: user.tier,
    plan: user.plan,
    credits: user.credits,
    subscriptionExpiry: user.subscriptionExpiry,
    hasAccess: tierCheck.hasAccess,
    reason: tierCheck.reason,
  };
}
