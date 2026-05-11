import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getCreditBalance, getCreditHistory, addCredits } from "./creditSystem";
import { getUserUsageStats } from "./usageTracking";

export const pricingRouter = router({
  /**
   * Get user's current credit balance and tier
   */
  getBalance: protectedProcedure.query(async ({ ctx }) => {
    const balance = await getCreditBalance(ctx.user.id);
    return {
      credits: balance,
      tier: ctx.user.tier,
    };
  }),

  /**
   * Get credit transaction history
   */
  getCreditHistory: protectedProcedure
    .input(z.object({
      limit: z.number().optional().default(50),
    }))
    .query(async ({ ctx, input }) => {
      return await getCreditHistory(ctx.user.id, input.limit);
    }),

  /**
   * Get usage statistics
   */
  getUsageStats: protectedProcedure
    .input(z.object({
      days: z.number().optional().default(30),
    }))
    .query(async ({ ctx, input }) => {
      return await getUserUsageStats(ctx.user.id, input.days);
    }),

  /**
   * Create Stripe checkout session for credit purchase
   */
  createCheckoutSession: protectedProcedure
    .input(z.object({
      packageId: z.string(), // credits_10, credits_50, credits_100
    }))
    .mutation(async ({ ctx, input }) => {
      const { createCheckoutSession } = await import("./stripe/checkout");
      
      const session = await createCheckoutSession({
        packageId: input.packageId,
        userId: ctx.user.id,
        userEmail: ctx.user.email || "",
        userName: ctx.user.name || "",
        origin: ctx.req.headers.origin || "http://localhost:3000",
      });
      
      return {
        checkoutUrl: session.url,
      };
    }),

  /**
   * Get pricing tiers information
   */
  getTiers: protectedProcedure.query(async () => {
    return {
      tiers: [
        {
          id: "FREE",
          name: "Free Tier",
          price: 0,
          features: [
            "1 domain analysis per 5 minutes",
            "Basic domain metrics",
            "Top 5 recommendations",
            "Archive.org keyword extraction",
            "Basic export (PDF, CSV)",
          ],
          limits: {
            dailyScans: 288, // 1 every 5 minutes = 288 per day
            scanCooldown: 5, // minutes
          },
        },
        {
          id: "PRO",
          name: "Pro Tier",
          price: 29, // $29/month
          features: [
            "Unlimited domain analysis",
            "Affiliate Intelligence (ClickBank/JVZoo/Digistore24 analysis)",
            "Hook-Story-Offer funnel generation",
            "Backdoor traffic angle discovery",
            "Credit-based bulk uploads",
            "Advanced domain metrics",
            "Priority OCR processing",
            "Unlimited keyword generation with DataForSEO metrics",
            "Advanced export options",
            "Priority support",
          ],
          limits: {
            dailyScans: -1, // unlimited
            requiresCredits: true,
          },
        },
      ],
      creditPackages: [
        {
          id: "starter",
          name: "Starter Pack",
          credits: 50,
          price: 9.99,
          pricePerCredit: 0.20,
        },
        {
          id: "professional",
          name: "Professional Pack",
          credits: 200,
          price: 34.99,
          pricePerCredit: 0.17,
          popular: true,
        },
        {
          id: "enterprise",
          name: "Enterprise Pack",
          credits: 500,
          price: 79.99,
          pricePerCredit: 0.16,
        },
      ],
    };
  }),

  /**
   * Upgrade to Pro tier (dummy endpoint - will integrate with Stripe)
   */
  // Alias for createCheckout (used by tests and Stripe checkout flow)
  createCheckout: protectedProcedure
    .input(z.object({
      packageId: z.string().optional().default("pro_monthly"),
      origin: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { createCheckoutSession } = await import("./stripe/checkout");
      const session = await createCheckoutSession({
        packageId: input.packageId,
        userId: ctx.user.id,
        userEmail: ctx.user.email || "",
        userName: ctx.user.name || "",
        origin: input.origin || ctx.req.headers.origin || "http://localhost:3000",
      });
      return { url: session.url, checkoutUrl: session.url };
    }),

  // Stripe billing portal
  createPortal: protectedProcedure
    .input(z.object({ origin: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      // Return portal URL - requires Stripe customer ID
      const origin = input.origin || ctx.req.headers.origin || "http://localhost:3000";
      return { url: `${origin}/settings` };
    }),

  upgradeToPro: protectedProcedure
    .input(z.object({
      paymentMethod: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Integrate with Stripe subscription
      // For now, this is a dummy endpoint
      
      const { getDb } = await import("./db");
      const { users } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      const dbInstance = await getDb();
      if (!dbInstance) {
        throw new Error("Database not available");
      }

      // Update user tier
      await dbInstance
        .update(users)
        .set({ tier: "PRO" })
        .where(eq(users.id, ctx.user.id));

      // Give welcome bonus credits
      await addCredits(
        ctx.user.id,
        100,
        "Welcome to Pro! Here are 100 bonus credits"
      );

      return {
        success: true,
        newTier: "PRO",
        bonusCredits: 100,
      };
    }),
});
