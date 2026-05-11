/**
 * Data Enrichment Router
 * 
 * Provides real keyword metrics, backlink data, and competitor analysis
 * using DataForSEO and Firecrawl APIs.
 * 
 * All endpoints are PRO-tier gated to protect API costs.
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { requireFeatureAccess, FEATURES } from "../featureGate";
import {
  getKeywordData,
  getDomainMetrics,
  getKeywordRankings,
  checkIndexStatus,
} from "../services/dataforseo";
import {
  scrapeCompetitor,
  analyzeCompetitorContent,
} from "../services/firecrawl";

export const enrichmentRouter = router({
  /**
   * Get keyword metrics (search volume, difficulty, CPC)
   * PRO tier required
   */
  getKeywordMetrics: protectedProcedure
    .input(
      z.object({
        keywords: z.array(z.string()).min(1).max(100),
        location: z.number().optional().default(2840), // USA
        language: z.string().optional().default("en"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check PRO access
      await requireFeatureAccess(ctx.user.id, FEATURES.DATAFORSEO_METRICS);

      try {
        const metrics = await getKeywordData(
          input.keywords,
          input.location,
          input.language
        );

        return {
          success: true,
          metrics,
          count: metrics.length,
        };
      } catch (error: any) {
        console.error("[Enrichment] getKeywordMetrics error:", error);
        return {
          success: false,
          error: error.message,
          metrics: [],
          count: 0,
        };
      }
    }),

  /**
   * Get domain backlink metrics
   * PRO tier required
   */
  getDomainMetrics: protectedProcedure
    .input(
      z.object({
        domain: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check PRO access
      await requireFeatureAccess(ctx.user.id, FEATURES.DOMAIN_AUTHORITY);

      try {
        const metrics = await getDomainMetrics(input.domain);

        return {
          success: true,
          metrics,
        };
      } catch (error: any) {
        console.error("[Enrichment] getDomainMetrics error:", error);
        return {
          success: false,
          error: error.message,
          metrics: null,
        };
      }
    }),

  /**
   * Get keyword rankings for a domain
   * PRO tier required
   */
  getKeywordRankings: protectedProcedure
    .input(
      z.object({
        domain: z.string(),
        keywords: z.array(z.string()).min(1).max(20),
        location: z.number().optional().default(2840),
        language: z.string().optional().default("en"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check PRO access
      await requireFeatureAccess(ctx.user.id, FEATURES.WEEKLY_TRACKING);

      try {
        const rankings = await getKeywordRankings(
          input.domain,
          input.keywords,
          input.location,
          input.language
        );

        return {
          success: true,
          rankings,
          count: rankings.length,
        };
      } catch (error: any) {
        console.error("[Enrichment] getKeywordRankings error:", error);
        return {
          success: false,
          error: error.message,
          rankings: [],
          count: 0,
        };
      }
    }),

  /**
   * Check if a URL is indexed in Google
   * PRO tier required
   */
  checkIndexStatus: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check PRO access
      await requireFeatureAccess(ctx.user.id, FEATURES.WEEKLY_TRACKING);

      try {
        const isIndexed = await checkIndexStatus(input.url);

        return {
          success: true,
          url: input.url,
          isIndexed,
        };
      } catch (error: any) {
        console.error("[Enrichment] checkIndexStatus error:", error);
        return {
          success: false,
          error: error.message,
          url: input.url,
          isIndexed: false,
        };
      }
    }),

  /**
   * Scrape competitor content for analysis
   * PRO tier required
   */
  scrapeCompetitor: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check PRO access (use DATAFORSEO_METRICS as proxy for PRO tier)
      await requireFeatureAccess(ctx.user.id, FEATURES.DATAFORSEO_METRICS);

      try {
        const content = await scrapeCompetitor(input.url);

        return {
          success: true,
          ...content,
        };
      } catch (error: any) {
        console.error("[Enrichment] scrapeCompetitor error:", error);
        return {
          success: false,
          error: error.message,
          content: "",
          title: null,
          wordCount: 0,
          headings: [],
          links: [],
        };
      }
    }),

  /**
   * Analyze competitor content structure
   * PRO tier required
   */
  analyzeCompetitor: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check PRO access
      await requireFeatureAccess(ctx.user.id, FEATURES.DATAFORSEO_METRICS);

      try {
        const analysis = await analyzeCompetitorContent(input.url);

        return {
          success: true,
          ...analysis,
        };
      } catch (error: any) {
        console.error("[Enrichment] analyzeCompetitor error:", error);
        return {
          success: false,
          error: error.message,
          url: input.url,
          title: null,
          wordCount: 0,
          headingCount: 0,
          headings: [],
          topics: [],
          linkCount: 0,
          hasImages: false,
          contentQuality: "low" as const,
        };
      }
    }),

  /**
   * Batch enrich keywords with real data
   * Replaces N/A values in existing keyword lists
   * PRO tier required
   */
  batchEnrichKeywords: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        keywords: z.array(z.string()).min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check PRO access
      await requireFeatureAccess(ctx.user.id, FEATURES.DATAFORSEO_METRICS);

      try {
        const metrics = await getKeywordData(input.keywords);

        // TODO: Update database with enriched metrics
        // This would update the keywords table with real volume/difficulty data

        return {
          success: true,
          enriched: metrics.length,
          metrics,
        };
      } catch (error: any) {
        console.error("[Enrichment] batchEnrichKeywords error:", error);
        return {
          success: false,
          error: error.message,
          enriched: 0,
          metrics: [],
        };
      }
    }),
});
