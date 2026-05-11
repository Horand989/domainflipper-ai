import { COOKIE_NAME } from "@shared/const";
import { eq } from "drizzle-orm";
import { analysisSessions, domainRecommendations } from "../drizzle/schema";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { performMarketResearch, generateDomainSuggestions, generateSpamZillaQuery } from "./marketResearch";
import { notifyOwner } from "./_core/notification";
import { storagePut } from "./storage";
import { parseDomainMetricsFromImage } from "./domainParser";
import { processSpamZillaScreenshot } from "./ocrService";
import { analyzeDomains } from "./domainAnalyzer";
import { checkDomainAvailability } from "./domainAvailability";
import { extractDomainKeywords } from "./keywordExtraction";
import { pricingRouter } from "./pricingRouter";
import { weeklyPulseRouter } from "./routers/weeklyPulse";
import { domainCheckerRouter } from "./routers/domainChecker";
import { affiliateIntelligenceRouter } from "./routers/affiliateIntelligence";
import { enrichmentRouter } from "./routers/enrichment";
import { logUsage } from "./usageTracking";
import { logIpRequest, extractIpAddress } from "./ipRateLimiting";

export const appRouter = router({
  analytics: router({
    mostSearchedDomains: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const limit = input?.limit || 20;
        return await db.getMostSearchedDomains(limit);
      }),
    popularNiches: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const limit = input?.limit || 10;
        return await db.getPopularNiches(limit);
      }),
    userActivity: protectedProcedure.query(async () => {
      return await db.getUserActivityMetrics();
    }),
    keywordTrends: protectedProcedure
      .input(z.object({ days: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const days = input?.days || 30;
        return await db.getKeywordTrends(days);
      }),
  }),
  keywords: router({ 
    extract: protectedProcedure
      .input(z.object({ domain: z.string() }))
      .mutation(async ({ input }) => {
        return await extractDomainKeywords(input.domain);
      }),
    analyzeOpportunity: protectedProcedure
      .input(z.object({ keywords: z.array(z.string()) }))
      .mutation(async ({ input }) => {
        const { batchAnalyzeKeywords } = await import('./competitorAnalysisScraper');
        const { batchCalculateOpportunityScores } = await import('./opportunityScorer');
        const competitorAnalysisMap = await batchAnalyzeKeywords(input.keywords);
        const opportunityScores = batchCalculateOpportunityScores(competitorAnalysisMap);
        return Array.from(opportunityScores.values());
      }),
    // Keyword management procedures (list, add, delete, enrich, getEnrichmentCost)
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const { getDb } = await import('./db');
        const { projectKeywords } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const db2 = await getDb();
        if (!db2) throw new Error('Database unavailable');
        const keywords = await db2.select().from(projectKeywords).where(eq(projectKeywords.projectId, input.projectId));
        return { keywords, total: keywords.length, enriched: keywords.filter((k: any) => k.isEnriched === 1).length };
      }),
    add: protectedProcedure
      .input(z.object({ projectId: z.number(), keywords: z.array(z.string()).min(1), source: z.enum(['manual','competitor_analysis','ai_generated']).optional().default('manual') }))
      .mutation(async ({ input }) => {
        const { getDb } = await import('./db');
        const { projectKeywords } = await import('../drizzle/schema');
        const { eq, and, inArray } = await import('drizzle-orm');
        const db2 = await getDb();
        if (!db2) throw new Error('Database unavailable');
        const existing = await db2.select().from(projectKeywords).where(and(eq(projectKeywords.projectId, input.projectId), inArray(projectKeywords.keyword, input.keywords)));
        const existingSet = new Set(existing.map((k: any) => k.keyword));
        const newKws = input.keywords.filter((k) => !existingSet.has(k));
        if (newKws.length === 0) return { success: true, added: 0, skipped: input.keywords.length };
        await db2.insert(projectKeywords).values(newKws.map((keyword) => ({ projectId: input.projectId, keyword, source: input.source })));
        return { success: true, added: newKws.length, skipped: input.keywords.length - newKws.length };
      }),
    delete: protectedProcedure
      .input(z.object({ keywordIds: z.array(z.number()).min(1) }))
      .mutation(async ({ input }) => {
        const { getDb } = await import('./db');
        const { projectKeywords } = await import('../drizzle/schema');
        const { inArray } = await import('drizzle-orm');
        const db2 = await getDb();
        if (!db2) throw new Error('Database unavailable');
        await db2.delete(projectKeywords).where(inArray(projectKeywords.id, input.keywordIds));
        return { success: true, deleted: input.keywordIds.length };
      }),
    enrich: protectedProcedure
      .input(z.object({ keywordIds: z.array(z.number()).min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import('./db');
        const { projectKeywords } = await import('../drizzle/schema');
        const { eq, inArray } = await import('drizzle-orm');
        const { requireFeatureAccess, FEATURES, deductCredits } = await import('./featureGate');
        const { getKeywordData } = await import('./services/dataforseo');
        const db2 = await getDb();
        if (!db2) throw new Error('Database unavailable');
        await requireFeatureAccess(ctx.user.id, FEATURES.DATAFORSEO_METRICS);
        const keywords = await db2.select().from(projectKeywords).where(inArray(projectKeywords.id, input.keywordIds));
        if (keywords.length === 0) throw new Error('No keywords found');
        await deductCredits(ctx.user.id, FEATURES.DATAFORSEO_METRICS);
        const keywordTexts = keywords.map((k: any) => k.keyword);
        const metricsData = await getKeywordData(keywordTexts);
        const metricsMap = new Map(metricsData.map((m) => [m.keyword.toLowerCase(), m]));
        const now = new Date();
        await Promise.all(keywords.map(async (keyword: any) => {
          const metrics = metricsMap.get(keyword.keyword.toLowerCase());
          return db2.update(projectKeywords).set({ isEnriched: 1, enrichedAt: now, searchVolume: metrics?.searchVolume ?? null, difficulty: metrics?.difficulty ?? null, cpc: metrics?.cpc ? String(metrics.cpc) : null, competition: metrics?.competition ? String(metrics.competition) : null }).where(eq(projectKeywords.id, keyword.id));
        }));
        return { success: true, enriched: keywords.length, creditsUsed: keywords.length * 10 };
      }),
    getEnrichmentCost: protectedProcedure
      .input(z.object({ keywordCount: z.number().min(1).max(100) }))
      .query(async ({ input }) => {
        return { costPerKeyword: 10, totalCost: input.keywordCount * 10, keywordCount: input.keywordCount };
      }),
  }),
  
  domainAvailability: router({
    check: protectedProcedure
      .input(z.object({ domain: z.string() }))
      .query(async ({ input, ctx }) => {
        const settings = await db.getUserSettings(ctx.user.id);
        if (!settings) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Please configure API keys in settings first',
          });
        }
        
        return await checkDomainAvailability(input.domain, {
          namecheapApiKey: settings.namecheapApiKey || undefined,
          namecheapUsername: settings.namecheapUsername || undefined,
          godaddyApiKey: settings.godaddyApiKey || undefined,
          godaddyApiSecret: settings.godaddyApiSecret || undefined,
        });
      }),
    checkTlds: protectedProcedure
      .input(z.object({
        baseDomain: z.string(),
        tlds: z.array(z.string()).optional(),
      }))
      .query(async ({ input, ctx }) => {
        const { checkTldAvailability, getPopularTlds } = await import('./tldAvailability');
        
        // Get user to check plan
        const user = await db.getUserById(ctx.user.id);
        if (!user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        }

        const tlds = input.tlds || getPopularTlds();
        return await checkTldAvailability(input.baseDomain, tlds, user.plan);
      }),
    getPurchaseLinks: protectedProcedure
      .input(z.object({ domain: z.string() }))
      .query(async ({ input, ctx }) => {
        const { generateAffiliatePurchaseLinks } = await import('./affiliateLinks');
        
        // Get user settings for affiliate IDs
        const settings = await db.getUserSettings(ctx.user.id);
        
        return generateAffiliatePurchaseLinks(input.domain, {
          namecheapAffiliateId: settings?.namecheapAffiliateId,
          godaddyAffiliateId: settings?.godaddyAffiliateId,
          porkbunAffiliateId: settings?.porkbunAffiliateId,
          hostingerAffiliateId: settings?.hostingerAffiliateId,
        });
      }),
    checkBulk: protectedProcedure
      .input(z.object({ domains: z.array(z.string()) }))
      .query(async ({ input }) => {
        const { checkBulkDomainAvailability } = await import('./domainAvailabilityChecker');
        return await checkBulkDomainAvailability(input.domains);
      }),
  }),
  
  settings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserSettings(ctx.user.id);
    }),
    
    update: protectedProcedure
      .input(z.object({
        companyName: z.string().optional(),
        companyLogoUrl: z.string().optional(),
        namecheapApiKey: z.string().optional(),
        namecheapUsername: z.string().optional(),
        godaddyApiKey: z.string().optional(),
        godaddyApiSecret: z.string().optional(),
         porkbunApiKey: z.string().optional(),
        porkbunSecretKey: z.string().optional(),
        hostingerApiKey: z.string().optional(),
        onboardingCompleted: z.number().optional(),
        priceAlertsEnabled: z.number().optional(),
        notificationsEnabled: z.number().optional(),
        namecheapAffiliateId: z.string().optional(),
        godaddyAffiliateId: z.string().optional(),
        porkbunAffiliateId: z.string().optional(),
        hostingerAffiliateId: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { onboardingCompleted, priceAlertsEnabled, notificationsEnabled, ...restInput } = input;
        await db.upsertUserSettings({
          userId: ctx.user.id,
          ...restInput,
          ...(onboardingCompleted !== undefined && { onboardingCompleted: onboardingCompleted ? 1 : 0 }),
          ...(priceAlertsEnabled !== undefined && { priceAlertsEnabled }),
          ...(notificationsEnabled !== undefined && { notificationsEnabled }),
        });
        return { success: true };
      }),
  }),
  
  collaboration: router({
    generateShareLink: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const token = await db.generateShareToken(input.sessionId);
        return { token, shareUrl: `${process.env.VITE_FRONTEND_FORGE_API_URL || ''}/share/${token}` };
      }),
    
    revokeShareLink: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input }) => {
        await db.revokeShareToken(input.sessionId);
        return { success: true };
      }),
    
    getSharedSession: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const session = await db.getSessionByShareToken(input.token);
        if (!session || !session.isPublic) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found or not public' });
        }
        
        // Get domains and recommendations for this session
        const domains = await db.getAnalyzedDomainsByIds([session.id]);
        // Recommendations are stored separately, fetch them
        const database = await db.getDb();
        const recommendations = database ? await database.select().from(domainRecommendations).where(eq(domainRecommendations.sessionId, session.id)) : [];
        
        return { session, domains, recommendations };
      }),
    
    addComment: protectedProcedure
      .input(z.object({
        domainId: z.number(),
        comment: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const commentId = await db.createDomainComment({
          domainId: input.domainId,
          userId: ctx.user.id,
          comment: input.comment,
        });
        return { commentId, success: true };
      }),
    
    getComments: publicProcedure
      .input(z.object({ domainId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDomainComments(input.domainId);
      }),
    
    updateComment: protectedProcedure
      .input(z.object({
        commentId: z.number(),
        comment: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateDomainComment(input.commentId, input.comment);
        return { success: true };
      }),
    
    deleteComment: protectedProcedure
      .input(z.object({ commentId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDomainComment(input.commentId);
        return { success: true };
      }),
  }),
  watchlist: router({
    add: protectedProcedure
      .input(z.object({
        domainId: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.addToWatchlist({
          userId: ctx.user.id,
          domainId: input.domainId,
          notes: input.notes,
        });
        return { success: true };
      }),
    remove: protectedProcedure
      .input(z.object({ domainId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.removeFromWatchlist(ctx.user.id, input.domainId);
        return { success: true };
      }),
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserWatchlist(ctx.user.id);
    }),
    check: protectedProcedure
      .input(z.object({ domainId: z.number() }))
      .query(async ({ ctx, input }) => {
        const isInList = await db.isInWatchlist(ctx.user.id, input.domainId);
        return { isInWatchlist: isInList };
      }),
    updateNotes: protectedProcedure
      .input(z.object({
        domainId: z.number(),
        notes: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateWatchlistNotes(ctx.user.id, input.domainId, input.notes);
        return { success: true };
      }),
    addByName: protectedProcedure
      .input(z.object({
        domainName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get or create domain entry in analyzedDomains table
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const { analyzedDomains } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        let domainEntry = await dbInstance
          .select()
          .from(analyzedDomains)
          .where(eq(analyzedDomains.domainName, input.domainName))
          .limit(1);

        let domainId: number;
        if (domainEntry.length === 0) {
          // Create a basic analyzed domain entry
          const newDomain = await dbInstance.insert(analyzedDomains).values({
            domainName: input.domainName,
            trustFlow: 0,
            citationFlow: 0,
            trustRatio: "0",
            majTopics: "",
            source: "manual",
            age: 0,
            szScore: 0,
            redirects: 0,
            parked: 0,
            drops: 0,
            googleIndex: 0,
            outLinksInternal: 0,
            outLinksExternal: 0,
            semRank: 0,
            dateAdded: "",
            price: "0",
            expires: "",
            rawMetrics: "{}",
          });
          domainId = Number((newDomain as any).insertId);
        } else {
          domainId = domainEntry[0].id;
        }

        // Add to watchlist
        await db.addToWatchlist({
          userId: ctx.user.id,
          domainId,
        });
        
        return { success: true };
      }),
  }),
  analysis: router({
    createSession: protectedProcedure
      .input(z.object({
        imageData: z.string(), // base64 encoded image
        intakeGoal: z.enum(['money_site', '301_redirect', 'pbn']).optional(),
        intakeNiche: z.string().optional(),
        intakeRiskTolerance: z.enum(['premium', 'high_power']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Admin/owner emails bypass all rate limits
        const ADMIN_EMAILS = ["serfindah895@gmail.com"];
        const isAdmin = ADMIN_EMAILS.includes(ctx.user.email?.toLowerCase() || "");

        if (!isAdmin) {
          // Check IP rate limiting first
          const { checkIpRateLimit, logIpRequest, extractIpAddress } = await import("./ipRateLimiting");
          const ipAddress = extractIpAddress(ctx.req.headers as Record<string, string | string[] | undefined>);
          const ipLimitCheck = await checkIpRateLimit(ipAddress, "analysis");
          
          if (!ipLimitCheck.allowed) {
            throw new TRPCError({
              code: "TOO_MANY_REQUESTS",
              message: ipLimitCheck.reason || "Too many requests from this IP address",
              cause: { resetAt: ipLimitCheck.resetAt },
            });
          }
          
          // Check tier limits before processing
          const { checkFreeTierLimit, logUsage } = await import("./usageTracking");
          const limitCheck = await checkFreeTierLimit(ctx.user.id);
          
          if (!limitCheck.allowed) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: limitCheck.reason || "Usage limit exceeded",
              cause: { nextAvailableAt: limitCheck.nextAvailableAt },
            });
          }
        }
        
        // Create analysis session
        const sessionId = await db.createAnalysisSession({
          userId: ctx.user.id,
          status: "pending",
        });

        try {
          // Upload image to S3
          const imageBuffer = Buffer.from(input.imageData.split(",")[1] || input.imageData, "base64");
          const imageKey = `analysis/${ctx.user.id}/${sessionId}-${Date.now()}.png`;
          const { url: imageUrl } = await storagePut(imageKey, imageBuffer, "image/png");

          // Update session with image URL and status
          await db.updateAnalysisSessionStatus(sessionId, "processing");
          const dbInstance = await db.getDb();
          if (dbInstance) {
            await dbInstance
              .update(analysisSessions)
              .set({ uploadedImageUrl: imageUrl })
              .where(eq(analysisSessions.id, sessionId));
          }

          // Parse domains from image using real OCR
          console.log("[Analysis] Starting OCR processing for image:", imageUrl);
          const ocrResult = await processSpamZillaScreenshot(imageUrl);
          console.log("[Analysis] OCR result:", { success: ocrResult.success, domainCount: ocrResult.domains?.length || 0, error: ocrResult.error });
          
          let parsedDomains;
          if (ocrResult.success && ocrResult.domains.length > 0) {
            // Use OCR results - convert null to undefined for type compatibility
            parsedDomains = ocrResult.domains.map(d => ({
              domainName: d.domainName,
              trustFlow: d.trustFlow ?? undefined,
              citationFlow: d.citationFlow ?? undefined,
              trustRatio: d.trustFlow && d.citationFlow ? (d.trustFlow / d.citationFlow).toFixed(2) : undefined,
              majTopics: d.majTopics,
              source: d.source ?? undefined,
              age: d.age ?? undefined,
              szScore: d.szScore ?? undefined,
              redirects: d.redirects ?? undefined,
              parked: d.parked ?? undefined,
              drops: d.drops ?? undefined,
              googleIndex: d.googleIndex ?? undefined,
              outLinksInternal: d.outLinksInternal ?? undefined,
              outLinksExternal: d.outLinksExternal ?? undefined,
              semRank: d.semRank ?? undefined,
              dateAdded: d.dateAdded ?? undefined,
              price: d.price !== null ? String(d.price) : undefined,
              expires: d.expires ?? undefined,
            }));
          } else {
            // Fallback to mock parser
            console.warn("[Analysis] OCR failed, using fallback parser:", ocrResult.error);
            parsedDomains = await parseDomainMetricsFromImage(imageUrl);
            console.log("[Analysis] Fallback parser result:", { domainCount: parsedDomains.length });
          }

          console.log("[Analysis] Final parsed domains:", parsedDomains.length, "domains");
          if (parsedDomains.length === 0) {
            console.error("[Analysis] WARNING: No domains extracted from screenshot!");
          }

          // Store parsed domains
          const domainIds: number[] = [];
          for (const domain of parsedDomains) {
            const domainId = await db.createAnalyzedDomain({
              sessionId,
              domainName: domain.domainName,
              trustFlow: domain.trustFlow,
              citationFlow: domain.citationFlow,
              trustRatio: domain.trustRatio,
              majTopics: domain.majTopics,
              source: domain.source,
              age: domain.age,
              szScore: domain.szScore,
              redirects: domain.redirects,
              parked: domain.parked,
              drops: domain.drops,
              googleIndex: domain.googleIndex,
              outLinksInternal: domain.outLinksInternal,
              outLinksExternal: domain.outLinksExternal,
              semRank: domain.semRank,
              dateAdded: domain.dateAdded,
              price: domain.price,
              expires: domain.expires,
              rawMetrics: JSON.stringify(domain),
            });
            domainIds.push(domainId);
          }

          // Analyze and rank domains
          console.log("[Analysis] Analyzing", parsedDomains.length, "domains");
          const intake = input.intakeGoal && input.intakeNiche && input.intakeRiskTolerance
            ? { goal: input.intakeGoal, niche: input.intakeNiche, riskTolerance: input.intakeRiskTolerance }
            : undefined;
          const recommendations = await analyzeDomains(parsedDomains, intake);
          console.log("[Analysis] Generated", recommendations.length, "recommendations");

          // Store recommendations
          for (const rec of recommendations) {
            const domainId = domainIds[parsedDomains.findIndex(d => d.domainName === rec.domain.domainName)];
            if (domainId) {
              await db.createDomainRecommendation({
                sessionId,
                domainId,
                rank: rec.rank,
                score: rec.score,
                reasoning: rec.reasoning,
                sherlockAnalysis: rec.sherlockAnalysis,
                dueDiligenceChecklist: JSON.stringify(rec.dueDiligenceChecklist),
              });
            }
          }

          // Mark session as completed
          await db.updateAnalysisSessionStatus(sessionId, "completed");
          
          // Log usage for Free tier tracking
          await logUsage(ctx.user.id, "analysis", parsedDomains.length, {
            sessionId,
            domainCount: parsedDomains.length,
          });
          
          // Log IP request for rate limiting
          const ipAddress = extractIpAddress(ctx.req.headers as Record<string, string | string[] | undefined>);
          await logIpRequest(ipAddress, "analysis", {
            userId: ctx.user.id,
            sessionId,
            domainCount: parsedDomains.length,
          });

          return { sessionId, domainCount: parsedDomains.length, recommendationCount: recommendations.length };
        } catch (error: any) {
          await db.updateAnalysisSessionStatus(sessionId, "failed");
          throw new Error(`Analysis failed: ${error.message}`);
        }
      }),
    getSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAnalysisSession(input.sessionId);
      }),
    getRecommendations: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        const recommendations = await db.getRecommendationWithDomain(input.sessionId);
        return recommendations.map(rec => ({
          ...rec,
          dueDiligenceChecklist: JSON.parse(rec.dueDiligenceChecklist),
        }));
      }),
    listSessions: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUserAnalysisSessions(ctx.user.id);
      }),
    deleteSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Verify session belongs to user
        const session = await db.getAnalysisSession(input.sessionId);
        if (!session || session.userId !== ctx.user.id) {
          throw new Error("Session not found or unauthorized");
        }
        await db.deleteAnalysisSession(input.sessionId);
        return { success: true };
      }),
    getDomainsById: protectedProcedure
      .input(z.object({ domainIds: z.array(z.number()) }))
      .query(async ({ input }) => {
        return await db.getAnalyzedDomainsByIds(input.domainIds);
      }),
    exportPDF: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Verify session belongs to user
        const session = await db.getAnalysisSession(input.sessionId);
        if (!session || session.userId !== ctx.user.id) {
          throw new Error("Session not found or unauthorized");
        }
        
        // Get recommendations for PDF generation
        const recommendations = await db.getRecommendationWithDomain(input.sessionId);
        
        // Generate PDF (placeholder - would use a PDF library in production)
        // For now, return a placeholder URL
        return {
          url: `/api/export/pdf/${input.sessionId}`,
          success: true,
        };
      }),
  }),

  projects: router({
    create: protectedProcedure
      .input(
        z.object({
          projectName: z.string(),
          niche: z.string().optional(),
          industry: z.string().optional(),
          keywords: z.string().optional(),
          targetAudience: z.string().optional(),
          description: z.string().optional(),
          goals: z.string().optional(),
          preferredExtensions: z.array(z.string()).optional(),
          namingStyle: z.string().optional(),
          competitorUrl: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const projectId = await db.createUserProject({
          userId: ctx.user.id,
          ...input,
          preferredExtensions: input.preferredExtensions ? JSON.stringify(input.preferredExtensions) : null,
        });
        return { projectId };
      }),
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserProjects(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getUserProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new Error("Project not found or unauthorized");
        }
        return project;
      }),
    delete: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getUserProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new Error("Project not found or unauthorized");
        }
        await db.deleteUserProject(input.projectId);
        return { success: true };
      }),
    update: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          projectName: z.string(),
          keywords: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const project = await db.getUserProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new Error("Project not found or unauthorized");
        }
        await db.updateUserProject(input.projectId, {
          projectName: input.projectName,
          keywords: input.keywords,
        });
        return { success: true };
      }),
    generateSuggestions: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getUserProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new Error("Project not found or unauthorized");
        }

        // Parse keywords
        const keywords = project.keywords
          ? project.keywords.split(",").map((k) => k.trim())
          : [];

        // Perform market research
        const marketResearch = await performMarketResearch(
          project.niche || "",
          project.industry || "",
          keywords,
          project.targetAudience || ""
        );

        // Store niche analysis
        await db.createNicheAnalysis({
          projectId: project.id,
          detectedIndustry: marketResearch.detectedIndustry,
          nicheData: JSON.stringify(marketResearch.nicheData),
          tldRecommendations: JSON.stringify(marketResearch.tldRecommendations),
          competitorAnalysis: JSON.stringify(marketResearch.competitorAnalysis),
          marketInsights: marketResearch.marketInsights,
          buyerPersona: JSON.stringify(marketResearch.buyerPersona),
          monetization: JSON.stringify(marketResearch.monetization),
        });

        // Generate domain suggestions
        const suggestions = await generateDomainSuggestions(
          project.projectName,
          keywords,
          project.niche || "",
          project.industry || "",
          marketResearch
        );

        // Check availability and only save confirmed-available domains
        const { calculateBrandabilityScore } = await import('./brandabilityScorer');
        const { checkBulkDomainAvailability } = await import('./domainAvailabilityChecker');
        const fullDomains = suggestions.map((s) => `${s.domain}${s.tld}`);
        let availableSet = new Set<string>();
        try {
          const availResults = await checkBulkDomainAvailability(fullDomains);
          availableSet = new Set(
            availResults
              .filter((r) => r.available)
              .map((r) => r.domain.toLowerCase())
          );
          console.log(`[Projects] ${availableSet.size}/${suggestions.length} suggestions are available at standard price`);
        } catch (err) {
          console.warn('[Projects] Availability check failed, saving all suggestions:', err);
          // Fall back to saving all if check fails
          suggestions.forEach((s) => availableSet.add(`${s.domain}${s.tld}`.toLowerCase()));
        }
        let savedCount = 0;
        for (const suggestion of suggestions) {
          const fullDomain = `${suggestion.domain}${suggestion.tld}`.toLowerCase();
          if (!availableSet.has(fullDomain)) continue; // skip taken domains
          const brandScore = calculateBrandabilityScore(suggestion.domain);
          await db.createDomainSuggestion({
            projectId: project.id,
            suggestedDomain: suggestion.domain,
            tld: suggestion.tld,
            reasoning: suggestion.reasoning,
            namingPattern: suggestion.namingPattern,
            confidence: suggestion.confidence,
            brandScore: brandScore.totalScore,
          });
          savedCount++;
        }
        return {
          success: true,
          marketResearch,
          suggestionCount: savedCount,
        };;
      }),
    getSuggestions: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getUserProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new Error("Project not found or unauthorized");
        }

        const suggestions = await db.getProjectSuggestions(input.projectId);
        const analysis = await db.getProjectNicheAnalysis(input.projectId);

        return {
          suggestions,
          analysis: analysis
            ? {
                detectedIndustry: analysis.detectedIndustry,
                nicheData: JSON.parse(analysis.nicheData || "{}"),
                tldRecommendations: JSON.parse(analysis.tldRecommendations || "[]"),
                competitorAnalysis: JSON.parse(analysis.competitorAnalysis || "{}"),
                marketInsights: analysis.marketInsights,
                buyerPersona: JSON.parse(analysis.buyerPersona || "{}"),
                monetization: JSON.parse(analysis.monetization || "{}"),
              }
            : null,
        };
      }),
    getSpamZillaQuery: protectedProcedure
      .input(
        z.object({
          domain: z.string(),
          tld: z.string(),
          keywords: z.array(z.string()),
        })
      )
      .query(({ input }) => {
        const query = generateSpamZillaQuery(input.domain, input.tld, input.keywords);
        return { query };
      }),
    addDomain: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        domainName: z.string(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getUserProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Project not found or unauthorized" });
        }
        await db.addDomainToProject(input.projectId, input.domainName, input.notes);
        return { success: true };
      }),
    getDomains: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getUserProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Project not found or unauthorized" });
        }
        return await db.getProjectDomains(input.projectId);
      }),
    removeDomain: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        domainName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getUserProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Project not found or unauthorized" });
        }
        await db.removeDomainFromProject(input.projectId, input.domainName);
        return { success: true };
      }),
    chooseDomain: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        domainName: z.string(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getUserProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Project not found or unauthorized" });
        }
        await db.chooseDomainForProject(input.projectId, input.domainName, input.notes);
        return { success: true };
      }),
    updateTlds: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        tlds: z.array(z.string()),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getUserProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Project not found or unauthorized" });
        }
        await db.updateUserProject(input.projectId, {
          preferredExtensions: JSON.stringify(input.tlds),
        });
        return { success: true };
      }),
    analyzeCompetitor: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getUserProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Project not found or unauthorized" });
        }
        
        if (!project.competitorUrl) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No competitor URL provided" });
        }

        // Import scraper
        const { scrapeCompetitorUrl, analyzeDomainGaps } = await import("./competitorScraper");
        
        // Scrape competitor
        const competitorData = await scrapeCompetitorUrl(project.competitorUrl);
        
        // Get user's existing keywords
        const userKeywords = project.keywords ? project.keywords.split(",").map(k => k.trim()) : [];
        
        // Find gaps
        const gaps = analyzeDomainGaps(competitorData.extractedKeywords, userKeywords);
        
        // Auto-append gap keywords to project with "Competitor Source" tag
        if (gaps.length > 0) {
          const taggedKeywords = gaps.map(keyword => `${keyword} [Competitor]`);
          const updatedKeywords = userKeywords.length > 0
            ? [...userKeywords, ...taggedKeywords].join(", ")
            : taggedKeywords.join(", ");
          
          await db.updateUserProject(input.projectId, {
            keywords: updatedKeywords,
          });
        }
        
        return {
          competitorData,
          domainGaps: gaps,
          gapCount: gaps.length,
        };
      }),
  }),

  // if you need to use socket.ioo, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  domains: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllDomains();
    }),
    getDetails: protectedProcedure
      .input(z.object({ domainName: z.string() }))
      .query(async ({ input }) => {
        return await db.getDomainDetailsByName(input.domainName);
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        currentPrice: z.number().int().positive(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createDomain({
          name: input.name,
          currentPrice: input.currentPrice,
          lastChecked: new Date(),
        });
        // Record initial price in history
        await db.recordPriceHistory(id, input.currentPrice);
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        currentPrice: z.number().int().positive(),
      }))
      .mutation(async ({ input }) => {
        // Get old price to check if it changed
        const oldDomain = await db.getDomainById(input.id);
        
        await db.updateDomain(input.id, {
          currentPrice: input.currentPrice,
          lastChecked: new Date(),
        });
        
        // Record price history if price changed
        if (oldDomain && oldDomain.currentPrice !== input.currentPrice) {
          await db.recordPriceHistory(input.id, input.currentPrice);
        }
        
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDomain(input.id);
        return { success: true };
      }),
    priceHistory: protectedProcedure
      .input(z.object({
        domainId: z.number(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getPriceHistory(input.domainId, input.limit);
      }),
    generateKeywords: protectedProcedure
      .input(z.object({
        domainName: z.string(),
        niche: z.string().optional(),
        existingTopics: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { generateKeywordsFromDomain } = await import("./keywordGenerator");
        const keywords = await generateKeywordsFromDomain(
          input.domainName,
          input.niche,
          input.existingTopics
        );
        
        // Update or create the analyzedDomains entry with generated keywords
        const dbInstance = await db.getDb();
        if (dbInstance) {
          const { analyzedDomains } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const keywordStrings = keywords.map(k => k.keyword).join(", ");
          
          // Check if domain exists
          const existing = await dbInstance
            .select()
            .from(analyzedDomains)
            .where(eq(analyzedDomains.domainName, input.domainName))
            .limit(1);
          
          if (existing.length > 0) {
            // Update existing
            await dbInstance
              .update(analyzedDomains)
              .set({ majTopics: keywordStrings })
              .where(eq(analyzedDomains.domainName, input.domainName));
          } else {
            // Create new entry
            await dbInstance
              .insert(analyzedDomains)
              .values({
                domainName: input.domainName,
                majTopics: keywordStrings,
                sessionId: null,
              });
          }
        }
        
        return { keywords };
      }),
    generateLongTailKeywords: protectedProcedure
      .input(z.object({
        domainName: z.string(),
        primaryKeywords: z.array(z.string()),
        niche: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { generateLongTailKeywords } = await import("./keywordGenerator");
        const longTailKeywords = await generateLongTailKeywords(
          input.domainName,
          input.primaryKeywords,
          input.niche
        );
        
        // Update or create the analyzedDomains entry with long-tail keywords
        const dbInstance = await db.getDb();
        if (dbInstance) {
          const { analyzedDomains } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          
          // Check if domain exists
          const existing = await dbInstance
            .select()
            .from(analyzedDomains)
            .where(eq(analyzedDomains.domainName, input.domainName))
            .limit(1);
          
          if (existing.length > 0) {
            // Update existing
            await dbInstance
              .update(analyzedDomains)
              .set({ longTailKeywords: JSON.stringify(longTailKeywords) })
              .where(eq(analyzedDomains.domainName, input.domainName));
          } else {
            // Create new entry
            await dbInstance
              .insert(analyzedDomains)
              .values({
                domainName: input.domainName,
                longTailKeywords: JSON.stringify(longTailKeywords),
                sessionId: null,
              });
          }
        }
        
        return { longTailKeywords };
      }),
    generateKeywordsFromArchive: protectedProcedure
      .input(z.object({
        domainName: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { generateKeywordsFromArchive } = await import("./keywordGenerator");
        const keywords = await generateKeywordsFromArchive(input.domainName);
        
        // Update or create the analyzedDomains entry with generated keywords
        const dbInstance = await db.getDb();
        if (dbInstance) {
          const { analyzedDomains } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const keywordStrings = keywords.map(k => k.keyword).join(", ");
          
          // Check if domain exists
          const existing = await dbInstance
            .select()
            .from(analyzedDomains)
            .where(eq(analyzedDomains.domainName, input.domainName))
            .limit(1);
          
          if (existing.length > 0) {
            // Update existing
            await dbInstance
              .update(analyzedDomains)
              .set({ majTopics: keywordStrings })
              .where(eq(analyzedDomains.domainName, input.domainName));
          } else {
            // Create new entry
            await dbInstance
              .insert(analyzedDomains)
              .values({
                domainName: input.domainName,
                majTopics: keywordStrings,
                sessionId: null,
              });
          }
        }
        
        return { keywords };
      }),
  }),

  alerts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserAlerts(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({
        domainId: z.number(),
        targetPrice: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createPriceAlert({
          userId: ctx.user.id,
          domainId: input.domainId,
          targetPrice: input.targetPrice,
          isActive: 1,
        });
        return { id };
      }),
    toggle: protectedProcedure
      .input(z.object({
        id: z.number(),
        isActive: z.number().int().min(0).max(1),
      }))
      .mutation(async ({ input }) => {
        await db.updatePriceAlert(input.id, { isActive: input.isActive });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePriceAlert(input.id);
        return { success: true };
      }),
  }),

  bulkImport: router({
    domains: protectedProcedure
      .input(z.object({
        domains: z.array(z.object({
          name: z.string().min(1),
          currentPrice: z.number().int().positive(),
        })),
      }))
      .mutation(async ({ input }) => {
        const results = { success: 0, failed: 0, errors: [] as string[] };
        
        for (const domain of input.domains) {
          try {
            const id = await db.createDomain({
              name: domain.name,
              currentPrice: domain.currentPrice,
              lastChecked: new Date(),
            });
            // Record initial price in history
            await db.recordPriceHistory(id, domain.currentPrice);
            results.success++;
          } catch (error: any) {
            results.failed++;
            results.errors.push(`${domain.name}: ${error.message || "Unknown error"}`);
          }
        }
        
        return results;
      }),
    alerts: protectedProcedure
      .input(z.object({
        alerts: z.array(z.object({
          domainName: z.string().min(1),
          targetPrice: z.number().int().positive(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const results = { success: 0, failed: 0, errors: [] as string[] };
        
        // Get all domains to match by name
        const allDomains = await db.getAllDomains();
        const domainMap = new Map(allDomains.map(d => [d.name.toLowerCase(), d.id]));
        
        for (const alert of input.alerts) {
          try {
            const domainId = domainMap.get(alert.domainName.toLowerCase());
            if (!domainId) {
              results.failed++;
              results.errors.push(`${alert.domainName}: Domain not found`);
              continue;
            }
            
            await db.createPriceAlert({
              userId: ctx.user.id,
              domainId,
              targetPrice: alert.targetPrice,
              isActive: 1,
            });
            results.success++;
          } catch (error: any) {
            results.failed++;
            results.errors.push(`${alert.domainName}: ${error.message || "Unknown error"}`);
          }
        }
        
        return results;
      }),
  }),

  monitoring: router({
    checkPrices: protectedProcedure.mutation(async () => {
      const { triggered, checked } = await db.checkPriceAlerts();

      // Send notifications for triggered alerts
      for (const alert of triggered) {
        const priceFormatted = (alert.currentPrice / 100).toFixed(2);
        const targetFormatted = (alert.targetPrice / 100).toFixed(2);
        
        const notificationSent = await notifyOwner({
          title: "Price Alert Triggered",
          content: `Domain ${alert.domainName} is now $${priceFormatted}, below your target of $${targetFormatted}`,
        });

        // Log the monitoring result
        await db.createMonitoringLog({
          alertId: alert.alertId,
          domainName: alert.domainName,
          currentPrice: alert.currentPrice,
          targetPrice: alert.targetPrice,
          triggered: 1,
          notificationSent: notificationSent ? 1 : 0,
          message: notificationSent 
            ? "Alert triggered and notification sent successfully" 
            : "Alert triggered but notification failed",
        });
      }

      return { triggered: triggered.length, checked };
    }),
    logs: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.getRecentLogs(input.limit);
      }),
    triggeredLogs: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.getTriggeredLogs(input.limit);
      }),
  }),

  // domainBuilder: router({
  //   generate: protectedProcedure
  //     .input(z.object({
  //       sitePurpose: z.string(),
  //       businessType: z.string(),
  //       targetAudience: z.string().optional(),
  //       desiredAction: z.string().optional(),
  //       keywords: z.string(),
  //       brandPersonality: z.string().optional(),
  //     }))
  //     .mutation(async ({ input, ctx }) => {
  //       // TODO: Implement domain builder AI generation
  //       return {
  //         sessionId: "temp",
  //         domains: [],
  //         keywords: [],
  //         seoStrategy: "",
  //         plan: "free",
  //       };
  //     }),
  // }),

  savedComparisons: router({
    save: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        domainIds: z.array(z.number()),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.saveComparison({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          domainIds: JSON.stringify(input.domainIds),
        });
        return { success: true };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getSavedComparisons(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const comparison = await db.getSavedComparisonById(input.id, ctx.user.id);
        if (!comparison) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Comparison not found" });
        }

        // Parse domain IDs and fetch domain data
        const domainIds = JSON.parse(comparison.domainIds) as number[];
        const domains = await db.getComparisonDomains(domainIds);

        return {
          ...comparison,
          domains,
        };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteSavedComparison(input.id, ctx.user.id);
        return { success: true };
      }),
   }),
  
  forensicAnalysis: router({
    analyze: protectedProcedure
      .input(z.object({ domainName: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { performForensicAnalysis } = await import('./forensicAnalyzer');
        const result = await performForensicAnalysis(input.domainName);
        
        // Store result in database
        const { getDb } = await import('./db');
        const dbInstance = await getDb();
        const { forensicAnalysisResults } = await import('../drizzle/schema');
        
        if (!dbInstance) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });
        }
        
        await dbInstance.insert(forensicAnalysisResults).values({
          domainName: input.domainName,
          finalTier: result.finalTier,
          riskLevel: result.riskLevel,
          primaryIdentity: result.primaryIdentity,
          badges: JSON.stringify(result.badges),
          reasoning: result.reasoning,
          evidence: result.evidence,
          historicalSnapshots: JSON.stringify(result.historicalSnapshots),
          userId: ctx.user.id,
        });
        
        return result;
      }),
    
    getHistory: protectedProcedure
      .input(z.object({ domainName: z.string() }))
      .query(async ({ input }) => {
        const { getDb } = await import('./db');
        const dbInstance = await getDb();
        const { forensicAnalysisResults } = await import('../drizzle/schema');
        const { eq, desc } = await import('drizzle-orm');
        
        if (!dbInstance) {
          return null;
        }
        
        const results = await dbInstance
          .select()
          .from(forensicAnalysisResults)
          .where(eq(forensicAnalysisResults.domainName, input.domainName))
          .orderBy(desc(forensicAnalysisResults.analyzedAt))
          .limit(1);
        
        if (results.length === 0) {
          return null;
        }
        
        const result = results[0];
        return {
          ...result,
          badges: JSON.parse(result.badges),
          historicalSnapshots: JSON.parse(result.historicalSnapshots),
        };
      }),
  }),
  
  launchStrategy: router({
    generate: protectedProcedure
      .input(z.object({
        domain: z.string(),
        projectId: z.number().optional(),
        keywords: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { generateLaunchBrief } = await import('./launchBriefGenerator');
        const { getDb } = await import('./db');
        const dbInstance = await getDb();
        const { launchPlans, launchTasks } = await import('../drizzle/schema');
        
        if (!dbInstance) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });
        }
        
        // Generate launch brief
        const brief = await generateLaunchBrief(input.domain, input.keywords || []);
        
        // Store in database
        const allTasks = [
          ...brief.zombiePageTasks,
          ...brief.keywordContentTasks,
          ...brief.technicalTasks,
          ...brief.marketingTasks,
        ];
        
        const [insertedPlan] = await dbInstance.insert(launchPlans).values({
          userId: ctx.user.id,
          projectId: input.projectId,
          domain: input.domain,
          summary: brief.summary,
          estimatedCompletionDays: brief.estimatedCompletionDays,
          totalTasksCount: allTasks.length,
        });
        
        const planId = insertedPlan.insertId;
        
        // Insert all tasks
        for (const task of allTasks) {
          await dbInstance.insert(launchTasks).values({
            planId,
            taskId: task.id,
            title: task.title,
            description: task.description,
            action: task.action,
            priority: task.priority,
            category: task.category,
            estimatedTime: task.estimatedTime,
            url: task.url,
            keyword: task.keyword,
            targetWordCount: task.targetWordCount,
            completed: 0,
          });
        }
        
        return { planId, brief };
      }),
    
    get: protectedProcedure
      .input(z.object({ planId: z.number() }))
      .query(async ({ input, ctx }) => {
        const { getDb } = await import('./db');
        const dbInstance = await getDb();
        const { launchPlans, launchTasks } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        
        if (!dbInstance) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });
        }
        
        const [plan] = await dbInstance
          .select()
          .from(launchPlans)
          .where(and(
            eq(launchPlans.id, input.planId),
            eq(launchPlans.userId, ctx.user.id)
          ));
        
        if (!plan) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Launch plan not found' });
        }
        
        const tasks = await dbInstance
          .select()
          .from(launchTasks)
          .where(eq(launchTasks.planId, input.planId));
        
        return { plan, tasks };
      }),
    
    toggleTask: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        completed: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import('./db');
        const dbInstance = await getDb();
        const { launchTasks, launchPlans } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        if (!dbInstance) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });
        }
        
        // Update task completion status
        await dbInstance
          .update(launchTasks)
          .set({
            completed: input.completed ? 1 : 0,
            completedAt: input.completed ? new Date() : null,
          })
          .where(eq(launchTasks.id, input.taskId));
        
        // Get task to find plan ID
        const [task] = await dbInstance
          .select()
          .from(launchTasks)
          .where(eq(launchTasks.id, input.taskId));
        
        if (task) {
          // Update plan's completed tasks count
          const allTasks = await dbInstance
            .select()
            .from(launchTasks)
            .where(eq(launchTasks.planId, task.planId));
          
          const completedCount = allTasks.filter(t => t.completed === 1).length;
          
          await dbInstance
            .update(launchPlans)
            .set({ completedTasksCount: completedCount })
            .where(eq(launchPlans.id, task.planId));
        }
        
        return { success: true };
      }),
    
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        const { getDb } = await import('./db');
        const dbInstance = await getDb();
        const { launchPlans } = await import('../drizzle/schema');
        const { eq, and, desc } = await import('drizzle-orm');
        
        if (!dbInstance) {
          return [];
        }
        
        return await dbInstance
          .select()
          .from(launchPlans)
          .where(and(
            eq(launchPlans.projectId, input.projectId),
            eq(launchPlans.userId, ctx.user.id)
          ))
          .orderBy(desc(launchPlans.generatedAt));
      }),
  }),
  
  user: router({
    getTier: protectedProcedure.query(async ({ ctx }) => {
      const { getUserTier } = await import('./featureGate');
      return await getUserTier(ctx.user.id);
    }),
    checkFeatureAccess: protectedProcedure
      .input(z.object({ feature: z.string() }))
      .query(async ({ ctx, input }) => {
        const { checkFeatureAccess } = await import('./featureGate');
        return await checkFeatureAccess(ctx.user.id, input.feature as any);
      }),
  }),
  pricing: pricingRouter,
  // weeklyPulse: weeklyPulseRouter,
  domainChecker: domainCheckerRouter,
  affiliateIntelligence: affiliateIntelligenceRouter,
  
  // Data enrichment (DataForSEO + Firecrawl)
  enrichment: enrichmentRouter,

  // Public API key management
  apiKeys: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { listApiKeys } = await import('./services/apiKeyService');
      return listApiKeys(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        const { listApiKeys, generateApiKey } = await import('./services/apiKeyService');
        const existing = await listApiKeys(ctx.user.id);
        if (existing.length >= 10) throw new Error('Maximum of 10 API keys allowed per account');
        const result = await generateApiKey(ctx.user.id, input.name);
        return {
          id: result.id,
          fullKey: result.fullKey, // shown ONCE to the user
          prefix: result.prefix,
          name: input.name,
        };
      }),
    revoke: protectedProcedure
      .input(z.object({ keyId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { revokeApiKey } = await import('./services/apiKeyService');
        const success = await revokeApiKey(ctx.user.id, input.keyId);
        if (!success) throw new Error('Key not found or already revoked');
        return { success: true };
      }),
  }),
});
// Note: keywords router is merged into the main keywords key above to avoid duplicates
export type AppRouter = typeof appRouter;
