/**
 * Weekly Pulse tRPC Router
 * 
 * Handles weekly index checking and rank tracking for launch projects
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { weeklyPulseChecks, pulseReports, launchTasks, userProjects } from "../../drizzle/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import {
  checkIndexStatus,
  checkKeywordRank,
  determineStatus,
  getStatusMessage,
} from "../services/weeklyPulseService";

export const weeklyPulseRouter = router({
  /**
   * Run a manual pulse check for a specific project
   * Checks home page + all zombie pages from launch plan
   */
  runPulseCheck: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        domainName: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { projectId, domainName } = input;
      const userId = ctx.user.id;

      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Verify project ownership
      const projects = await db
        .select()
        .from(userProjects)
        .where(eq(userProjects.id, projectId))
        .limit(1);

      const project = projects[0];
      if (!project || project.userId !== userId) {
        throw new Error("Project not found or unauthorized");
      }

      // Get zombie pages from launch tasks
      const zombiePages = await db
        .select()
        .from(launchTasks)
        .where(
          and(
            eq(launchTasks.category, "zombie_page"),
            eq(launchTasks.planId, projectId)
          )
        );

      const results = [];

      // Check home page indexation
      const homePageUrl = `https://${domainName}`;
      const homePageIndexed = await checkIndexStatus(homePageUrl);

      await db.insert(weeklyPulseChecks).values({
        projectId,
        domainName,
        checkDate: new Date(),
        homePageIndexed: homePageIndexed ? 1 : 0,
        homePageUrl,
        status: homePageIndexed ? "indexed" : "pending",
      });

      results.push({
        url: homePageUrl,
        type: "home",
        indexed: homePageIndexed,
        status: getStatusMessage(homePageIndexed ? "indexed" : "pending"),
      });

      // Check each zombie page
      for (const zombiePage of zombiePages) {
        if (!zombiePage.url) continue;

        const zombieUrl = zombiePage.url.startsWith("http")
          ? zombiePage.url
          : `https://${domainName}${zombiePage.url}`;

        const isIndexed = await checkIndexStatus(zombieUrl);
        let rank: number | null = null;

        // Only check rank if page is indexed AND has a keyword
        if (isIndexed && zombiePage.keyword) {
          rank = await checkKeywordRank(zombiePage.keyword, zombieUrl);
        }

        const status = determineStatus(isIndexed, rank);

        await db.insert(weeklyPulseChecks).values({
          projectId,
          domainName,
          checkDate: new Date(),
          zombiePageUrl: zombieUrl,
          zombiePageIndexed: isIndexed ? 1 : 0,
          primaryKeyword: zombiePage.keyword || null,
          rank: rank,
          status,
        });

        results.push({
          url: zombieUrl,
          type: "zombie",
          indexed: isIndexed,
          rank,
          keyword: zombiePage.keyword,
          status: getStatusMessage(status, rank),
        });
      }

      return {
        success: true,
        message: `Pulse check completed for ${results.length} pages`,
        results,
      };
    }),

  /**
   * Get latest pulse check results for a project
   */
  getLatestPulse: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      const { projectId } = input;
      const userId = ctx.user.id;

      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Verify project ownership
      const projects = await db
        .select()
        .from(userProjects)
        .where(eq(userProjects.id, projectId))
        .limit(1);

      const project = projects[0];
      if (!project || project.userId !== userId) {
        throw new Error("Project not found or unauthorized");
      }

      // Get most recent pulse checks
      const pulseChecksList = await db
        .select()
        .from(weeklyPulseChecks)
        .where(eq(weeklyPulseChecks.projectId, projectId))
        .orderBy(desc(weeklyPulseChecks.checkDate))
        .limit(50);

      // Group by URL to get latest status for each page
      const latestByUrl = new Map<string, typeof pulseChecksList[0]>();

      for (const check of pulseChecksList) {
        const url = check.homePageUrl || check.zombiePageUrl || "";
        if (url && !latestByUrl.has(url)) {
          latestByUrl.set(url, check);
        }
      }

      return {
        checks: Array.from(latestByUrl.values()),
        lastCheckDate: pulseChecksList[0]?.checkDate || null,
      };
    }),

  /**
   * Get pulse history for a project (timeline view)
   */
  getPulseHistory: protectedProcedure
    .input(z.object({ projectId: z.number(), limit: z.number().default(20) }))
    .query(async ({ input, ctx }) => {
      const { projectId, limit } = input;
      const userId = ctx.user.id;

      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Verify project ownership
      const projects = await db
        .select()
        .from(userProjects)
        .where(eq(userProjects.id, projectId))
        .limit(1);

      const project = projects[0];
      if (!project || project.userId !== userId) {
        throw new Error("Project not found or unauthorized");
      }

      const history = await db
        .select()
        .from(weeklyPulseChecks)
        .where(eq(weeklyPulseChecks.projectId, projectId))
        .orderBy(desc(weeklyPulseChecks.checkDate))
        .limit(limit);

      return history;
    }),

  /**
   * Get weekly progress report for a project
   * Shows stats like "3 New Pages Indexed, 1 Keyword in Top 100"
   */
  getWeeklyReport: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      const { projectId } = input;
      const userId = ctx.user.id;

      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Verify project ownership
      const projects = await db
        .select()
        .from(userProjects)
        .where(eq(userProjects.id, projectId))
        .limit(1);

      const project = projects[0];
      if (!project || project.userId !== userId) {
        throw new Error("Project not found or unauthorized");
      }

      // Get pulse checks from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentChecks = await db
        .select()
        .from(weeklyPulseChecks)
        .where(
          and(
            eq(weeklyPulseChecks.projectId, projectId),
            gte(weeklyPulseChecks.checkDate, sevenDaysAgo)
          )
        );

      // Calculate stats
      const newPagesIndexed = recentChecks.filter(
        (check) => check.homePageIndexed === 1 || check.zombiePageIndexed === 1
      ).length;

      const keywordsInTop100 = recentChecks.filter(
        (check) => check.rank !== null && check.rank <= 100
      ).length;

      const totalPagesIndexed = recentChecks.filter(
        (check) => check.homePageIndexed === 1 || check.zombiePageIndexed === 1
      ).length;

      const totalKeywordsRanking = recentChecks.filter(
        (check) => check.rank !== null && check.rank <= 100
      ).length;

      return {
        newPagesIndexed,
        keywordsInTop100,
        totalPagesIndexed,
        totalKeywordsRanking,
        reportDate: new Date(),
      };
    }),

  /**
   * Generate and save a pulse report (for Friday email)
   */
  generateReport: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { projectId } = input;
      const userId = ctx.user.id;

      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Verify project ownership
      const projects = await db
        .select()
        .from(userProjects)
        .where(eq(userProjects.id, projectId))
        .limit(1);

      const project = projects[0];
      if (!project || project.userId !== userId) {
        throw new Error("Project not found or unauthorized");
      }

      // Get weekly stats
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentChecks = await db
        .select()
        .from(weeklyPulseChecks)
        .where(
          and(
            eq(weeklyPulseChecks.projectId, projectId),
            gte(weeklyPulseChecks.checkDate, sevenDaysAgo)
          )
        );

      const newPagesIndexed = recentChecks.filter(
        (check) => check.homePageIndexed === 1 || check.zombiePageIndexed === 1
      ).length;

      const keywordsInTop100 = recentChecks.filter(
        (check) => check.rank !== null && check.rank <= 100
      ).length;

      const totalPagesIndexed = recentChecks.filter(
        (check) => check.homePageIndexed === 1 || check.zombiePageIndexed === 1
      ).length;

      const totalKeywordsRanking = recentChecks.filter(
        (check) => check.rank !== null && check.rank <= 100
      ).length;

      // Save report to database
      await db.insert(pulseReports).values({
        userId,
        projectId,
        reportDate: new Date(),
        newPagesIndexed,
        keywordsInTop100,
        totalPagesIndexed,
        totalKeywordsRanking,
        emailSent: 0, // Will be set to 1 after email is sent
      });

      return {
        success: true,
        report: {
          newPagesIndexed,
          keywordsInTop100,
          totalPagesIndexed,
          totalKeywordsRanking,
        },
      };
    }),
});
