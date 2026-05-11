import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  domains,
  InsertDomain,
  priceAlerts,
  InsertPriceAlert,
  monitoringLogs,
  InsertMonitoringLog,
  priceHistory,
  InsertPriceHistory,
  analysisSessions,
  InsertAnalysisSession,
  analyzedDomains,
  InsertAnalyzedDomain,
  domainRecommendations,
  InsertDomainRecommendation,
  userProjects,
  InsertUserProject,
  domainSuggestions,
  InsertDomainSuggestion,
  nicheAnalysis,
  InsertNicheAnalysis,
  watchlist,
  domainComments,
  InsertDomainComment,
  userSettings,
  InsertUserSettings,
  savedComparisons,
  InsertSavedComparison,
  projectDomains,
  InsertProjectDomain,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Domain management functions
export async function getAllDomains() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(domains).orderBy(domains.name);
}

export async function getDomainById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(domains).where(eq(domains.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createDomain(domain: InsertDomain) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(domains).values(domain);
  return Number(result[0].insertId);
}

export async function updateDomain(id: number, updates: Partial<InsertDomain>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(domains).set(updates).where(eq(domains.id, id));
}

export async function deleteDomain(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(domains).where(eq(domains.id, id));
}

// Price alert management functions
export async function getUserAlerts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select({
      alert: priceAlerts,
      domain: domains,
    })
    .from(priceAlerts)
    .leftJoin(domains, eq(priceAlerts.domainId, domains.id))
    .where(eq(priceAlerts.userId, userId))
    .orderBy(priceAlerts.createdAt);
}

export async function getActiveAlerts() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select({
      alert: priceAlerts,
      domain: domains,
    })
    .from(priceAlerts)
    .leftJoin(domains, eq(priceAlerts.domainId, domains.id))
    .where(eq(priceAlerts.isActive, 1));
}

export async function createPriceAlert(alert: InsertPriceAlert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(priceAlerts).values(alert);
  return Number(result[0].insertId);
}

export async function updatePriceAlert(id: number, updates: Partial<InsertPriceAlert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(priceAlerts).set(updates).where(eq(priceAlerts.id, id));
}

export async function deletePriceAlert(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(priceAlerts).where(eq(priceAlerts.id, id));
}

// Monitoring log functions
export async function createMonitoringLog(log: InsertMonitoringLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(monitoringLogs).values(log);
  return Number(result[0].insertId);
}

export async function getRecentLogs(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(monitoringLogs)
    .orderBy(monitoringLogs.createdAt)
    .limit(limit);
}

export async function getTriggeredLogs(limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(monitoringLogs)
    .where(eq(monitoringLogs.triggered, 1))
    .orderBy(monitoringLogs.createdAt)
    .limit(limit);
}

// Price monitoring function
export async function checkPriceAlerts() {
  const db = await getDb();
  if (!db) return { triggered: [], checked: 0 };

  const activeAlerts = await getActiveAlerts();
  const triggered = [];

  for (const item of activeAlerts) {
    const { alert, domain } = item;
    if (!domain) continue;

    const isTriggered = domain.currentPrice <= alert.targetPrice;

    if (isTriggered) {
      triggered.push({
        alertId: alert.id,
        domainName: domain.name,
        currentPrice: domain.currentPrice,
        targetPrice: alert.targetPrice,
      });
    }

    // Update lastChecked timestamp
    await updatePriceAlert(alert.id, { lastChecked: new Date() });
  }

  return { triggered, checked: activeAlerts.length };
}

// Price history functions
export async function recordPriceHistory(domainId: number, price: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(priceHistory).values({
    domainId,
    price,
    recordedAt: new Date(),
  });
  return Number(result[0].insertId);
}

export async function getPriceHistory(domainId: number, limit: number = 30) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(priceHistory)
    .where(eq(priceHistory.domainId, domainId))
    .orderBy(priceHistory.recordedAt)
    .limit(limit);
}


// ===== Domain Analysis Functions =====

export async function createAnalysisSession(session: InsertAnalysisSession): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(analysisSessions).values(session);
  return Number(result[0].insertId);
}

export async function updateAnalysisSessionStatus(
  sessionId: number,
  status: "pending" | "processing" | "completed" | "failed"
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(analysisSessions).set({ status }).where(eq(analysisSessions.id, sessionId));
}

export async function getAnalysisSession(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(analysisSessions).where(eq(analysisSessions.id, sessionId));
  return result[0];
}

export async function getUserAnalysisSessions(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(analysisSessions).where(eq(analysisSessions.userId, userId)).orderBy(analysisSessions.createdAt);
}

export async function createAnalyzedDomain(domain: InsertAnalyzedDomain): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(analyzedDomains).values(domain);
  return Number(result[0].insertId);
}

export async function getSessionDomains(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(analyzedDomains).where(eq(analyzedDomains.sessionId, sessionId));
}

export async function createDomainRecommendation(recommendation: InsertDomainRecommendation): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(domainRecommendations).values(recommendation);
  return Number(result[0].insertId);
}

export async function getSessionRecommendations(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(domainRecommendations)
    .where(eq(domainRecommendations.sessionId, sessionId))
    .orderBy(domainRecommendations.rank);
}

export async function getRecommendationWithDomain(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const recommendations = await db
    .select()
    .from(domainRecommendations)
    .where(eq(domainRecommendations.sessionId, sessionId))
    .orderBy(domainRecommendations.rank);

  const results = [];
  for (const rec of recommendations) {
    const domain = await db
      .select()
      .from(analyzedDomains)
      .where(eq(analyzedDomains.id, rec.domainId))
      .limit(1);

    if (domain[0]) {
      results.push({
        ...rec,
        domain: domain[0],
      });
    }
  }

  return results;
}

export async function deleteAnalysisSession(sessionId: number): Promise<void> {
  const dbInstance = await getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  // Delete recommendations first (foreign key constraint)
  await dbInstance.delete(domainRecommendations).where(eq(domainRecommendations.sessionId, sessionId));
  
  // Delete analyzed domains
  await dbInstance.delete(analyzedDomains).where(eq(analyzedDomains.sessionId, sessionId));
  
  // Delete session
  await dbInstance.delete(analysisSessions).where(eq(analysisSessions.id, sessionId));
}

export async function getAnalyzedDomainsByIds(domainIds: number[]) {
  const dbInstance = await getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  return await dbInstance
    .select()
    .from(analyzedDomains)
    .where(inArray(analyzedDomains.id, domainIds));
}

// ============= User Projects =============

export async function createUserProject(project: InsertUserProject): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(userProjects).values(project);
  return Number(result[0].insertId);
}

export async function getUserProjects(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(userProjects)
    .where(eq(userProjects.userId, userId))
    .orderBy(userProjects.createdAt);
}

export async function getUserProject(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(userProjects)
    .where(eq(userProjects.id, projectId))
    .limit(1);

  return result[0];
}

export async function updateUserProject(projectId: number, updates: Partial<InsertUserProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(userProjects)
    .set(updates)
    .where(eq(userProjects.id, projectId));
}

export async function deleteUserProject(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(userProjects).where(eq(userProjects.id, projectId));
}

// ============= Domain Suggestions =============

export async function createDomainSuggestion(suggestion: InsertDomainSuggestion): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(domainSuggestions).values(suggestion);
  return Number(result[0].insertId);
}

export async function getProjectSuggestions(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(domainSuggestions)
    .where(eq(domainSuggestions.projectId, projectId))
    .orderBy(domainSuggestions.confidence);
}

export async function deleteDomainSuggestion(suggestionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(domainSuggestions).where(eq(domainSuggestions.id, suggestionId));
}

// ============= Niche Analysis =============

export async function createNicheAnalysis(analysis: InsertNicheAnalysis): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(nicheAnalysis).values(analysis);
  return Number(result[0].insertId);
}

export async function getProjectNicheAnalysis(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(nicheAnalysis)
    .where(eq(nicheAnalysis.projectId, projectId))
    .limit(1);

  return result[0];
}


// ===== Watchlist Functions =====

export async function addToWatchlist(data: {
  userId: number;
  domainId: number;
  notes?: string;
}): Promise<number> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const result = await database.insert(watchlist).values(data);
  return Number(result[0].insertId);
}

export async function removeFromWatchlist(userId: number, domainId: number): Promise<void> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  await database
    .delete(watchlist)
    .where(and(eq(watchlist.userId, userId), eq(watchlist.domainId, domainId)));
}

export async function getUserWatchlist(userId: number) {
  const database = await getDb();
  if (!database) return [];

  const result = await database
    .select({
      id: watchlist.id,
      domainId: watchlist.domainId,
      notes: watchlist.notes,
      createdAt: watchlist.createdAt,
      domain: {
        id: analyzedDomains.id,
        domainName: analyzedDomains.domainName,
        trustFlow: analyzedDomains.trustFlow,
        citationFlow: analyzedDomains.citationFlow,
        majTopics: analyzedDomains.majTopics,
        age: analyzedDomains.age,
        szScore: analyzedDomains.szScore,
        price: analyzedDomains.price,
        expires: analyzedDomains.expires,
      },
    })
    .from(watchlist)
    .innerJoin(analyzedDomains, eq(watchlist.domainId, analyzedDomains.id))
    .where(eq(watchlist.userId, userId))
    .orderBy(desc(watchlist.createdAt));

  return result;
}

export async function isInWatchlist(userId: number, domainId: number): Promise<boolean> {
  const database = await getDb();
  if (!database) return false;

  const result = await database
    .select()
    .from(watchlist)
    .where(and(eq(watchlist.userId, userId), eq(watchlist.domainId, domainId)))
    .limit(1);

  return result.length > 0;
}

export async function updateWatchlistNotes(
  userId: number,
  domainId: number,
  notes: string
): Promise<void> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  await database
    .update(watchlist)
    .set({ notes })
    .where(and(eq(watchlist.userId, userId), eq(watchlist.domainId, domainId)));
}


// ============================================
// Collaboration Functions
// ============================================

export async function generateShareToken(sessionId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Generate unique token
  const token = Array.from({ length: 32 }, () => 
    Math.random().toString(36).charAt(2)
  ).join('');
  
  await db
    .update(analysisSessions)
    .set({ shareToken: token, isPublic: 1 })
    .where(eq(analysisSessions.id, sessionId));
  
  return token;
}

export async function getSessionByShareToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(analysisSessions)
    .where(eq(analysisSessions.shareToken, token))
    .limit(1);
  
  return result[0] || null;
}

export async function revokeShareToken(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(analysisSessions)
    .set({ shareToken: null, isPublic: 0 })
    .where(eq(analysisSessions.id, sessionId));
}

export async function createDomainComment(comment: InsertDomainComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(domainComments).values(comment);
  return Number(result[0].insertId);
}

export async function getDomainComments(domainId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      id: domainComments.id,
      comment: domainComments.comment,
      createdAt: domainComments.createdAt,
      updatedAt: domainComments.updatedAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(domainComments)
    .leftJoin(users, eq(domainComments.userId, users.id))
    .where(eq(domainComments.domainId, domainId))
    .orderBy(domainComments.createdAt);
}

export async function updateDomainComment(id: number, comment: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(domainComments)
    .set({ comment, updatedAt: new Date() })
    .where(eq(domainComments.id, id));
}

export async function deleteDomainComment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(domainComments).where(eq(domainComments.id, id));
}


// ============================================
// User Settings Functions
// ============================================

export async function getUserSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  
  return result[0] || null;
}

export async function upsertUserSettings(settings: InsertUserSettings) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getUserSettings(settings.userId);
  
  if (existing) {
    await db
      .update(userSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(userSettings.userId, settings.userId));
  } else {
    await db.insert(userSettings).values(settings);
  }
}


/**
 * Analytics functions for admin dashboard
 */

export async function getMostSearchedDomains(limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  // Count analyzed domains by name
  const result = await db
    .select({
      domainName: analyzedDomains.domainName,
      searchCount: sql<number>`COUNT(*)`.as('searchCount'),
    })
    .from(analyzedDomains)
    .groupBy(analyzedDomains.domainName)
    .orderBy(sql`searchCount DESC`)
    .limit(limit);

  return result;
}

export async function getPopularNiches(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  // Get most common industries from user projects
  const result = await db
    .select({
      industry: userProjects.industry,
      projectCount: sql<number>`COUNT(*)`.as('projectCount'),
    })
    .from(userProjects)
    .groupBy(userProjects.industry)
    .orderBy(sql`projectCount DESC`)
    .limit(limit);

  return result;
}

export async function getUserActivityMetrics() {
  const db = await getDb();
  if (!db) return null;

  const totalUsers = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
  const totalProjects = await db.select({ count: sql<number>`COUNT(*)` }).from(userProjects);
  const totalAnalyses = await db.select({ count: sql<number>`COUNT(*)` }).from(analysisSessions);
  const totalDomains = await db.select({ count: sql<number>`COUNT(*)` }).from(domains);

  return {
    totalUsers: totalUsers[0]?.count || 0,
    totalProjects: totalProjects[0]?.count || 0,
    totalAnalyses: totalAnalyses[0]?.count || 0,
    totalDomains: totalDomains[0]?.count || 0,
  };
}

export async function getKeywordTrends(days: number = 30) {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get analysis sessions created in the last N days
  const result = await db
    .select({
      date: sql<string>`DATE(${analysisSessions.createdAt})`.as('date'),
      analysisCount: sql<number>`COUNT(*)`.as('analysisCount'),
    })
    .from(analysisSessions)
    .where(sql`${analysisSessions.createdAt} >= ${startDate}`)
    .groupBy(sql`DATE(${analysisSessions.createdAt})`)
    .orderBy(sql`date ASC`);

  return result;
}

/**
 * Save a domain comparison
 */
export async function saveComparison(data: InsertSavedComparison) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(savedComparisons).values(data);
  return result;
}

/**
 * Get all saved comparisons for a user
 */
export async function getSavedComparisons(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(savedComparisons)
    .where(eq(savedComparisons.userId, userId))
    .orderBy(desc(savedComparisons.createdAt));

  return result;
}

/**
 * Get a single saved comparison by ID
 */
export async function getSavedComparisonById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(savedComparisons)
    .where(and(eq(savedComparisons.id, id), eq(savedComparisons.userId, userId)))
    .limit(1);

  return result[0] || null;
}

/**
 * Delete a saved comparison
 */
export async function deleteSavedComparison(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(savedComparisons)
    .where(and(eq(savedComparisons.id, id), eq(savedComparisons.userId, userId)));
}

/**
 * Get domain recommendations for a saved comparison
 */
export async function getComparisonDomains(domainIds: number[]) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(domainRecommendations)
    .where(sql`${domainRecommendations.id} IN (${sql.join(domainIds.map(id => sql`${id}`), sql`, `)})`)
    .orderBy(domainRecommendations.rank);

  return result;
}

/**
 * Get user by ID with plan information
 */
export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result[0] || null;
}

/**
 * Reset user's monthly usage counter
 */
export async function resetUserUsage(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(users)
    .set({
      analysisCount: 0,
      lastResetDate: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Increment user's analysis count
 */
export async function incrementAnalysisCount(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(users)
    .set({
      analysisCount: sql`${users.analysisCount} + 1`,
    })
    .where(eq(users.id, userId));
}


/**
 * Add domain to project
 */
export async function addDomainToProject(projectId: number, domainName: string, notes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if domain already exists in project
  const existing = await db
    .select()
    .from(projectDomains)
    .where(and(
      eq(projectDomains.projectId, projectId),
      eq(projectDomains.domainName, domainName)
    ))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("Domain already added to this project");
  }

  const result = await db.insert(projectDomains).values({
    projectId,
    domainName,
    status: "added",
    notes: notes || null,
  });

  return result;
}

/**
 * Choose domain for project (marks as "chosen" status)
 */
export async function chooseDomainForProject(projectId: number, domainName: string, notes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if domain already exists in project
  const existing = await db
    .select()
    .from(projectDomains)
    .where(and(
      eq(projectDomains.projectId, projectId),
      eq(projectDomains.domainName, domainName)
    ))
    .limit(1);

  if (existing.length > 0) {
    // Update existing domain to "chosen" status
    await db
      .update(projectDomains)
      .set({ status: "chosen", notes: notes || existing[0].notes })
      .where(and(
        eq(projectDomains.projectId, projectId),
        eq(projectDomains.domainName, domainName)
      ));
    return { updated: true };
  }

  // Add new domain with "chosen" status
  const result = await db.insert(projectDomains).values({
    projectId,
    domainName,
    status: "chosen",
    notes: notes || null,
  });

  return result;
}

/**
 * Update domain TLDs
 */
export async function updateDomainTlds(projectId: number, domainName: string, tlds: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(projectDomains)
    .set({ availableTlds: JSON.stringify(tlds) })
    .where(and(
      eq(projectDomains.projectId, projectId),
      eq(projectDomains.domainName, domainName)
    ));

  return { success: true };
}

/**
 * Get domains for a project
 */
export async function getProjectDomains(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(projectDomains)
    .where(eq(projectDomains.projectId, projectId))
    .orderBy(desc(projectDomains.addedAt));

  return result;
}

/**
 * Remove domain from project
 */
export async function removeDomainFromProject(projectId: number, domainName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(projectDomains)
    .where(and(
      eq(projectDomains.projectId, projectId),
      eq(projectDomains.domainName, domainName)
    ));
}

/**
 * Get detailed information about a domain by name
 */
export async function getDomainDetailsByName(domainName: string) {
  const db = await getDb();
  if (!db) return null;

  // Try to find in analyzedDomains first
  const analyzed = await db
    .select()
    .from(analyzedDomains)
    .where(eq(analyzedDomains.domainName, domainName))
    .limit(1);

  if (analyzed.length > 0) {
    const domain = analyzed[0];
    // Parse longTailKeywords from JSON if it exists
    let parsedLongTailKeywords: string[] = [];
    if (domain.longTailKeywords) {
      try {
        parsedLongTailKeywords = JSON.parse(domain.longTailKeywords);
      } catch (e) {
        console.error("Failed to parse longTailKeywords:", e);
      }
    }

    return {
      domainName: domain.domainName,
      keywords: domain.majTopics, // Using majTopics as keywords
      longTailKeywords: parsedLongTailKeywords,
      domainAge: domain.age,
      backlinks: domain.outLinksExternal,
      referringDomains: null, // Not in current schema
      trustFlow: domain.trustFlow,
      domainAuthority: domain.szScore, // Using szScore as DA
      pageAuthority: null, // Not in current schema
      spamScore: null, // Not in current schema
      previousOwners: null, // Not in current schema
      spamzillaScreenshot: null, // Not in current schema
    };
  }

  // If not in analyzedDomains, check projectDomains
  const projectDomain = await db
    .select()
    .from(projectDomains)
    .where(eq(projectDomains.domainName, domainName))
    .limit(1);

  if (projectDomain.length > 0) {
    // Return basic info from projectDomains
    return {
      domainName: projectDomain[0].domainName,
      keywords: null,
      longTailKeywords: [],
      domainAge: null,
      backlinks: null,
      referringDomains: null,
      trustFlow: null,
      domainAuthority: null,
      pageAuthority: null,
      spamScore: null,
      previousOwners: null,
      spamzillaScreenshot: null,
    };
  }

  return null;
}



// Credit Management
export async function addCredits(userId: number, amount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(users)
    .set({ credits: sql`${users.credits} + ${amount}` })
    .where(eq(users.id, userId));
}

export async function deductCredits(userId: number, amount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(users)
    .set({ credits: sql`${users.credits} - ${amount}` })
    .where(eq(users.id, userId));
}

export async function updateUserTier(
  userId: number,
  tier: "free" | "pro",
  stripeCustomerId?: string,
  subscriptionId?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = {
    tier: tier === "pro" ? "PRO" : "FREE",
    plan: tier,
    subscriptionStatus: tier === "pro" ? "ACTIVE" : "NONE",
  };
  if (stripeCustomerId) updateData.stripeCustomerId = stripeCustomerId;
  if (subscriptionId) updateData.subscriptionId = subscriptionId;
  await db.update(users).set(updateData).where(eq(users.id, userId));
}

export async function getUserByStripeCustomerId(stripeCustomerId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, stripeCustomerId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}
