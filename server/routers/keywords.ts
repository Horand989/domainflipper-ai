/**
 * Keywords Router
 * 
 * Manages project keywords with enrichment tracking.
 * Supports pay-to-reveal model where users select specific keywords to enrich.
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { projectKeywords } from "../../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireFeatureAccess, FEATURES, deductCredits } from "../featureGate";
import { getKeywordData } from "../services/dataforseo";

export const keywordsRouter = router({
  /**
   * Get all keywords for a project
   */
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const keywords = await db
        .select()
        .from(projectKeywords)
        .where(eq(projectKeywords.projectId, input.projectId));

      return {
        keywords,
        total: keywords.length,
        enriched: keywords.filter((k) => k.isEnriched === 1).length,
      };
    }),

  /**
   * Add keywords to a project
   */
  add: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        keywords: z.array(z.string()).min(1),
        source: z.enum(["manual", "competitor_analysis", "ai_generated"]).optional().default("manual"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Check if keywords already exist
      const existing = await db
        .select()
        .from(projectKeywords)
        .where(
          and(
            eq(projectKeywords.projectId, input.projectId),
            inArray(projectKeywords.keyword, input.keywords)
          )
        );

      const existingKeywords = new Set(existing.map((k) => k.keyword));
      const newKeywords = input.keywords.filter((k) => !existingKeywords.has(k));

      if (newKeywords.length === 0) {
        return {
          success: true,
          added: 0,
          skipped: input.keywords.length,
          message: "All keywords already exist",
        };
      }

      // Insert new keywords
      const insertData = newKeywords.map((keyword) => ({
        projectId: input.projectId,
        keyword,
        source: input.source,
      }));

      await db.insert(projectKeywords).values(insertData);

      return {
        success: true,
        added: newKeywords.length,
        skipped: input.keywords.length - newKeywords.length,
      };
    }),

  /**
   * Delete keywords from a project
   */
  delete: protectedProcedure
    .input(
      z.object({
        keywordIds: z.array(z.number()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      await db
        .delete(projectKeywords)
        .where(inArray(projectKeywords.id, input.keywordIds));

      return {
        success: true,
        deleted: input.keywordIds.length,
      };
    }),

  /**
   * Enrich selected keywords with DataForSEO data
   * PRO tier required, costs 10 credits per keyword
   */
  enrich: protectedProcedure
    .input(
      z.object({
        keywordIds: z.array(z.number()).min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Check PRO access
      await requireFeatureAccess(ctx.user.id, FEATURES.DATAFORSEO_METRICS);

      // Get keywords to enrich
      const keywords = await db
        .select()
        .from(projectKeywords)
        .where(inArray(projectKeywords.id, input.keywordIds));

      if (keywords.length === 0) {
        throw new Error("No keywords found");
      }

      // Deduct credits using the feature-based system (10 credits per keyword batch)
      await deductCredits(ctx.user.id, FEATURES.DATAFORSEO_METRICS);

      try {
        // Fetch data from DataForSEO
        const keywordTexts = keywords.map((k) => k.keyword);
        const metricsData = await getKeywordData(keywordTexts);

        // Create a map for quick lookup
        const metricsMap = new Map(
          metricsData.map((m) => [m.keyword.toLowerCase(), m])
        );

        // Update keywords with enriched data
        const now = new Date();
        const updatePromises = keywords.map(async (keyword) => {
          const metrics = metricsMap.get(keyword.keyword.toLowerCase());
          const db2 = await getDb();
          if (!db2) throw new Error("Database unavailable");

          if (!metrics) {
            // No data returned, mark as enriched but with null values
            return db2
              .update(projectKeywords)
              .set({
                isEnriched: 1,
                enrichedAt: now,
                searchVolume: null,
                difficulty: null,
                cpc: null,
                competition: null,
              })
              .where(eq(projectKeywords.id, keyword.id));
          }

          return db2
            .update(projectKeywords)
            .set({
              isEnriched: 1,
              enrichedAt: now,
              searchVolume: metrics.searchVolume,
              difficulty: metrics.difficulty,
              cpc: metrics.cpc ? metrics.cpc.toString() : null,
              competition: metrics.competition ? metrics.competition.toString() : null,
            })
            .where(eq(projectKeywords.id, keyword.id));
        });

        await Promise.all(updatePromises);

        return {
          success: true,
          enriched: keywords.length,
          creditsUsed: keywords.length * 10,
        };
      } catch (error: any) {
        throw new Error(`Enrichment failed: ${error.message}`);
      }
    }),

  /**
   * Get enrichment cost estimate
   */
  getEnrichmentCost: protectedProcedure
    .input(
      z.object({
        keywordCount: z.number().min(1).max(100),
      })
    )
    .query(async ({ input }) => {
      const costPerKeyword = 10;
      const totalCost = input.keywordCount * costPerKeyword;

      return {
        costPerKeyword,
        totalCost,
        keywordCount: input.keywordCount,
      };
    }),
});
