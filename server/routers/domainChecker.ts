/**
 * Domain Checker Router
 * Handles domain availability checking and brandability scoring
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc.js';
import { checkDomainAvailability, checkBatchAvailability, getEstimatedPricing } from '../services/domainAvailability.js';
import { calculateBrandabilityScore } from '../services/brandabilityScorer.js';
import { parseUploadedDomainList, parseDomainNamesFromText } from '../services/pdfDomainParser.js';
import { getDb, getUserSettings } from '../db.js';
import { analyzedDomains, watchlist } from '../../drizzle/schema.js';
import { eq, and } from 'drizzle-orm';

export const domainCheckerRouter = router({
  /**
   * Check availability of a single domain
   */
  checkAvailability: protectedProcedure
    .input(z.object({
      domain: z.string(),
      keywords: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { domain, keywords = [] } = input;
      
      // Fetch user settings for registrar credentials
      const settings = await getUserSettings(ctx.user.id);
      const credentials = settings ? {
        porkbunApiKey: settings.porkbunApiKey ?? undefined,
        porkbunSecretKey: settings.porkbunSecretKey ?? undefined,
        hostingerApiKey: settings.hostingerApiKey ?? undefined,
      } : undefined;

      // Check availability
      const availability = await checkDomainAvailability(domain, credentials);
      
      // Calculate brandability score
      const brandability = calculateBrandabilityScore(domain, keywords);
      
      // Get estimated pricing
      const pricing = getEstimatedPricing(domain);
      
      return {
        ...availability,
        brandability,
        pricing,
      };
    }),
  
  /**
   * Check availability of multiple domains
   */
  checkBatchAvailability: protectedProcedure
    .input(z.object({
      domains: z.array(z.string()),
      keywords: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { domains, keywords = [] } = input;
      
      // Fetch user settings for registrar credentials
      const settings = await getUserSettings(ctx.user.id);
      const credentials = settings ? {
        porkbunApiKey: settings.porkbunApiKey ?? undefined,
        porkbunSecretKey: settings.porkbunSecretKey ?? undefined,
        hostingerApiKey: settings.hostingerApiKey ?? undefined,
      } : undefined;

      // Check availability for all domains (with user credentials)
      const availabilityResults = await Promise.all(
        domains.map(domain => checkDomainAvailability(domain, credentials))
      );
      
      // Add brandability scores and pricing
      const results = availabilityResults.map(result => ({
        ...result,
        brandability: calculateBrandabilityScore(result.domain, keywords),
        pricing: getEstimatedPricing(result.domain),
      }));
      
      return results;
    }),
  
  /**
   * Parse domain list from uploaded file (PDF, TXT, CSV)
   */
  parseDomainList: protectedProcedure
    .input(z.object({
      filePath: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { filePath } = input;
      
      // Parse domains from file
      const domains = await parseUploadedDomainList(filePath);
      
      return {
        domains,
        count: domains.length,
      };
    }),
  
  /**
   * Analyze file content directly (for frontend file upload)
   */
  analyzeFile: protectedProcedure
    .input(z.object({
      fileContent: z.string(),
      fileName: z.string(),
      keywords: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { fileContent, fileName, keywords = [] } = input;
      
      // Parse domains from text content
      const parsedDomains = parseDomainNamesFromText(fileContent);
      
      if (parsedDomains.length === 0) {
        return {
          total: 0,
          checked: 0,
          results: [],
        };
      }
      
      // Check availability for all domains
      const domainNames = parsedDomains.map(d => d.fullDomain);
      const availabilityResults = await checkBatchAvailability(domainNames);
      
      // Add brandability scores
      const results = availabilityResults.map(result => {
        const brandability = calculateBrandabilityScore(result.domain, keywords);
        
        return {
          domain: result.domain,
          available: result.available,
          brandabilityScore: brandability.score,
          registrar: result.registrar,
          status: result.status,
          pricing: result.pricing,
          error: result.error,
        };
      });
      
      // Sort by: Available first, then by brandability score
      results.sort((a, b) => {
        if (a.available && !b.available) return -1;
        if (!a.available && b.available) return 1;
        return b.brandabilityScore - a.brandabilityScore;
      });
      
      return {
        total: parsedDomains.length,
        checked: results.length,
        results,
      };
    }),
  
  /**
   * Full analysis: Parse file + Check availability + Score brandability
   */
  analyzeUploadedList: protectedProcedure
    .input(z.object({
      filePath: z.string(),
      keywords: z.array(z.string()).optional(),
      limit: z.number().optional(), // Limit number of domains to check (for FREE tier)
    }))
    .mutation(async ({ input, ctx }) => {
      const { filePath, keywords = [], limit } = input;
      
      // Parse domains from file
      const parsedDomains = await parseUploadedDomainList(filePath);
      
      // Apply limit for FREE users
      const domainsToCheck = limit 
        ? parsedDomains.slice(0, limit)
        : parsedDomains;
      
      // Check availability for all domains
      const domainNames = domainsToCheck.map(d => d.fullDomain);
      const availabilityResults = await checkBatchAvailability(domainNames);
      
      // Add brandability scores and pricing
      const results = availabilityResults.map(result => ({
        ...result,
        brandability: calculateBrandabilityScore(result.domain, keywords),
        pricing: getEstimatedPricing(result.domain),
      }));
      
      // Sort by: Available first, then by brandability score
      results.sort((a, b) => {
        if (a.available && !b.available) return -1;
        if (!a.available && b.available) return 1;
        return b.brandability.score - a.brandability.score;
      });
      
      return {
        total: parsedDomains.length,
        checked: results.length,
        results,
        limitApplied: limit !== undefined && parsedDomains.length > limit,
      };
    }),
  
  /**
   * Save domain to watchlist
   */
  saveDomainToWatchlist: protectedProcedure
    .input(z.object({
      domain: z.string(),
      brandabilityScore: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { domain, brandabilityScore } = input;
      const userId = ctx.user.id;
      
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      // First, create or find the domain in analyzedDomains
      const [existingDomain] = await db
        .select()
        .from(analyzedDomains)
        .where(eq(analyzedDomains.domainName, domain))
        .limit(1);
      
      let domainId: number;
      
      if (existingDomain) {
        domainId = existingDomain.id;
      } else {
        // Create new analyzed domain entry
        const [newDomain] = await db
          .insert(analyzedDomains)
          .values({
            sessionId: 0, // Special session ID for Domain Checker
            domainName: domain,
            source: 'domain_checker',
            rawMetrics: JSON.stringify({ brandabilityScore }),
          });
        
        domainId = Number(newDomain.insertId);
      }
      
      // Check if already in watchlist
      const [existing] = await db
        .select()
        .from(watchlist)
        .where(
          and(
            eq(watchlist.userId, userId),
            eq(watchlist.domainId, domainId)
          )
        )
        .limit(1);
      
      if (existing) {
        return {
          success: true,
          message: 'Domain already in watchlist',
          domainId,
        };
      }
      
      // Add to watchlist
      await db.insert(watchlist).values({
        userId,
        domainId,
        notes: `Brandability Score: ${brandabilityScore}`,
      });
      
      return {
        success: true,
        message: 'Domain saved to watchlist',
        domainId,
      };
    }),
});
