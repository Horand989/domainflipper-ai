/**
 * Affiliate Intelligence Router
 *
 * Provides tRPC endpoints for the Affiliate Product Intelligence feature.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { analyzeAffiliateProduct } from "../services/affiliateIntelligence";
import { findAvailableDomains } from "../services/findAvailableDomains";
import { getDb } from "../db";
import { userProjects, domainSuggestions, projectKeywords } from "../../drizzle/schema";

export const affiliateIntelligenceRouter = router({
  /**
   * Analyze an affiliate product from URL or description.
   * Extracts domain ideas, keywords, funnel outline, and backdoor angles.
   */
  analyze: protectedProcedure
    .input(
      z.object({
        productName: z.string().min(1, "Product name is required"),
        description: z.string().optional(),
        url: z.string().url().optional(),
      }).refine(
        (data) => data.description || data.url,
        { message: "Please provide either a product URL or description" }
      )
    )
    .mutation(async ({ input }) => {
      const result = await analyzeAffiliateProduct({
        productName: input.productName,
        description: input.description,
        url: input.url,
      });
      return result;
    }),

  /**
   * Save an affiliate analysis result as a new Project.
   * Creates the project, domain suggestions, and keywords in one transaction.
   */
  saveToProject: protectedProcedure
    .input(
      z.object({
        productName: z.string().min(1),
        niche: z.string(),
        targetAudience: z.string(),
        domainIdeas: z.array(z.object({
          name: z.string(),
          tld: z.string(),
          full: z.string(),
          brandScore: z.number(),
          rationale: z.string(),
        })),
        primaryKeywords: z.array(z.object({
          keyword: z.string(),
          searchVolume: z.number().nullable(),
          difficulty: z.number().nullable(),
          cpc: z.number().nullable(),
          type: z.enum(["primary", "longtail"]),
        })),
        longtailKeywords: z.array(z.object({
          keyword: z.string(),
          searchVolume: z.number().nullable(),
          difficulty: z.number().nullable(),
          cpc: z.number().nullable(),
          type: z.enum(["primary", "longtail"]),
        })),
        funnelHook: z.string(),
        backdoorAngles: z.array(z.object({
          angle: z.string(),
          targetAudience: z.string(),
          searchIntent: z.string(),
          exampleKeywords: z.array(z.string()),
          contentIdea: z.string(),
          whyItWorks: z.string(),
        })),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 1. Create the project
      const [project] = await db.insert(userProjects).values({
        userId: ctx.user.id,
        projectName: input.productName,
        niche: input.niche,
        targetAudience: input.targetAudience,
        description: `Affiliate Intelligence analysis for "${input.productName}". Niche: ${input.niche}. Funnel hook: ${input.funnelHook}`,
        keywords: [...input.primaryKeywords, ...input.longtailKeywords].map(k => k.keyword).join(", "),
      });

      const projectId = (project as any).insertId as number;

      // 2. Save domain ideas as domain suggestions
      if (input.domainIdeas.length > 0) {
        await db.insert(domainSuggestions).values(
          input.domainIdeas.map((d) => ({
            projectId,
            suggestedDomain: d.name,
            tld: d.tld,
            reasoning: d.rationale,
            namingPattern: "brandable",
            confidence: d.brandScore,
            brandScore: d.brandScore,
          }))
        );
      }

      // 3. Save keywords
      const allKeywords = [...input.primaryKeywords, ...input.longtailKeywords];
      if (allKeywords.length > 0) {
        await db.insert(projectKeywords).values(
          allKeywords.map((k) => ({
            projectId,
            keyword: k.keyword,
            isEnriched: k.searchVolume !== null ? 1 : 0,
            searchVolume: k.searchVolume ?? undefined,
            difficulty: k.difficulty ?? undefined,
            cpc: k.cpc !== null ? String(k.cpc) : undefined,
          }))
        );
      }

      return { projectId, message: `Project "${input.productName}" created successfully with ${input.domainIdeas.length} domains and ${allKeywords.length} keywords.` };
    }),

  /**
   * Find real purchasable domains for a given niche and keywords.
   * Searches GoDaddy Auctions, Namecheap Marketplace, and generates verified-available variations.
   */
  findAvailable: protectedProcedure
    .input(
      z.object({
        keywords: z.array(z.string()).min(1, "At least one keyword is required"),
        niche: z.string().min(1, "Niche is required"),
        maxResults: z.number().min(1).max(50).optional().default(20),
      })
    )
    .mutation(async ({ input }) => {
      const results = await findAvailableDomains({
        keywords: input.keywords,
        niche: input.niche,
        maxResults: input.maxResults,
      });
      return { domains: results, total: results.length };
    }),
});
