import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  plan: mysqlEnum("plan", ["free", "pro", "enterprise"]).default("free").notNull(),
  tier: mysqlEnum("tier", ["FREE", "PRO"]).default("FREE").notNull(),
  subscriptionExpiry: timestamp("subscriptionExpiry"), // null = lifetime/free, date = pro expiry
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["ACTIVE", "CANCELED", "PAST_DUE", "TRIALING", "NONE"]).default("NONE").notNull(),
  subscriptionId: varchar("subscriptionId", { length: 255 }), // Stripe subscription ID
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }), // Stripe customer ID
  credits: int("credits").default(0).notNull(),
  analysisCount: int("analysisCount").default(0).notNull(),
  lastResetDate: timestamp("lastResetDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Domains table for storing domain information and current prices
 */
export const domains = mysqlTable("domains", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  currentPrice: int("currentPrice").notNull(), // Price in cents to avoid floating point issues
  lastChecked: timestamp("lastChecked").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Domain = typeof domains.$inferSelect;
export type InsertDomain = typeof domains.$inferInsert;

/**
 * Price alerts table for user-defined price monitoring
 */
export const priceAlerts = mysqlTable("priceAlerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  domainId: int("domainId").notNull().references(() => domains.id, { onDelete: "cascade" }),
  targetPrice: int("targetPrice").notNull(), // Price in cents
  isActive: int("isActive").notNull().default(1), // 1 = active, 0 = inactive
  lastChecked: timestamp("lastChecked"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PriceAlert = typeof priceAlerts.$inferSelect;
export type InsertPriceAlert = typeof priceAlerts.$inferInsert;

/**
 * Monitoring logs table for tracking price check runs and results
 */
export const monitoringLogs = mysqlTable("monitoringLogs", {
  id: int("id").autoincrement().primaryKey(),
  alertId: int("alertId").references(() => priceAlerts.id, { onDelete: "set null" }),
  domainName: varchar("domainName", { length: 255 }).notNull(),
  currentPrice: int("currentPrice").notNull(),
  targetPrice: int("targetPrice").notNull(),
  triggered: int("triggered").notNull(), // 1 = triggered, 0 = not triggered
  notificationSent: int("notificationSent").notNull().default(0), // 1 = sent, 0 = failed
  message: text("message"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MonitoringLog = typeof monitoringLogs.$inferSelect;
export type InsertMonitoringLog = typeof monitoringLogs.$inferInsert;

/**
 * Price history table for tracking domain price changes over time
 */
export const priceHistory = mysqlTable("priceHistory", {
  id: int("id").autoincrement().primaryKey(),
  domainId: int("domainId").notNull().references(() => domains.id, { onDelete: "cascade" }),
  price: int("price").notNull(), // Price in cents
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = typeof priceHistory.$inferInsert;

/**
 * Analysis sessions for tracking domain analysis requests
 */
export const analysisSessions = mysqlTable("analysisSessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  uploadedImageUrl: text("uploadedImageUrl"),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  shareToken: varchar("shareToken", { length: 64 }).unique(),
  isPublic: int("isPublic").default(0).notNull(), // 0 = private, 1 = public
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnalysisSession = typeof analysisSessions.$inferSelect;
export type InsertAnalysisSession = typeof analysisSessions.$inferInsert;

/**
 * Analyzed domains extracted from screenshots
 */
export const analyzedDomains = mysqlTable("analyzedDomains", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").references(() => analysisSessions.id, { onDelete: "cascade" }),
  domainName: varchar("domainName", { length: 255 }).notNull(),
  trustFlow: int("trustFlow"),
  citationFlow: int("citationFlow"),
  trustRatio: varchar("trustRatio", { length: 10 }),
  majTopics: text("majTopics"),
  source: varchar("source", { length: 50 }),
  age: int("age"),
  szScore: int("szScore"),
  redirects: int("redirects"),
  parked: int("parked"),
  drops: int("drops"),
  googleIndex: int("googleIndex"),
  outLinksInternal: int("outLinksInternal"),
  outLinksExternal: int("outLinksExternal"),
  semRank: int("semRank"),
  dateAdded: varchar("dateAdded", { length: 50 }),
  price: varchar("price", { length: 50 }),
  expires: varchar("expires", { length: 50 }),
  rawMetrics: text("rawMetrics"),
  longTailKeywords: text("longTailKeywords"), // JSON array of long-tail keyword suggestions
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnalyzedDomain = typeof analyzedDomains.$inferSelect;
export type InsertAnalyzedDomain = typeof analyzedDomains.$inferInsert;

/**
 * AI-generated domain recommendations
 */
export const domainRecommendations = mysqlTable("domainRecommendations", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").references(() => analysisSessions.id, { onDelete: "cascade" }),
  domainId: int("domainId").notNull().references(() => analyzedDomains.id, { onDelete: "cascade" }),
  rank: int("rank").notNull(),
  score: int("score").notNull(),
  reasoning: text("reasoning").notNull(),
  sherlockAnalysis: text("sherlockAnalysis").notNull(),
  dueDiligenceChecklist: text("dueDiligenceChecklist").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DomainRecommendation = typeof domainRecommendations.$inferSelect;
export type InsertDomainRecommendation = typeof domainRecommendations.$inferInsert;


// User Projects - capture user intent and objectives
export const userProjects = mysqlTable("userProjects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectName: varchar("projectName", { length: 255 }).notNull(),
  niche: varchar("niche", { length: 255 }),
  industry: varchar("industry", { length: 255 }),
  keywords: text("keywords"), // Comma-separated keywords
  targetAudience: text("targetAudience"),
  description: text("description"),
  goals: text("goals"),
  preferredExtensions: text("preferredExtensions"), // JSON array of extensions like [".com", ".io"]
  namingStyle: varchar("namingStyle", { length: 50 }), // keyword, brandable, action
  competitorUrl: varchar("competitorUrl", { length: 500 }), // Competitor URL for analysis
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProject = typeof userProjects.$inferSelect;
export type InsertUserProject = typeof userProjects.$inferInsert;

// Domain Suggestions - AI-generated domain recommendations
export const domainSuggestions = mysqlTable("domainSuggestions", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => userProjects.id, { onDelete: "cascade" }),
  suggestedDomain: varchar("suggestedDomain", { length: 255 }).notNull(),
  tld: varchar("tld", { length: 20 }).notNull(), // .com, .io, .net, etc.
  reasoning: text("reasoning"), // Why this domain was suggested
  namingPattern: varchar("namingPattern", { length: 50 }), // brandable, descriptive, compound, etc.
  confidence: int("confidence"), // 0-100 confidence score
  brandScore: int("brandScore"), // 0-100 brandability score (length, hyphens, pronounceability)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DomainSuggestion = typeof domainSuggestions.$inferSelect;
export type InsertDomainSuggestion = typeof domainSuggestions.$inferInsert;

// Niche Analysis - market research and TLD recommendations
export const nicheAnalysis = mysqlTable("nicheAnalysis", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => userProjects.id, { onDelete: "cascade" }),
  detectedIndustry: text("detectedIndustry"), // AI-detected industry from keywords
  nicheData: text("nicheData"), // JSON: market trends, competitor info
  tldRecommendations: text("tldRecommendations"), // JSON: recommended TLDs with reasoning
  competitorAnalysis: text("competitorAnalysis"), // JSON: competitor domain patterns
  marketInsights: text("marketInsights"), // AI-generated insights
  buyerPersona: text("buyerPersona"), // JSON: buyer persona (role, painPoint, trigger, willingnessToPay)
  monetization: text("monetization"), // JSON: monetization model (primaryModel, secondaryModel, estimatedCPC, revenueType)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NicheAnalysis = typeof nicheAnalysis.$inferSelect;
export type InsertNicheAnalysis = typeof nicheAnalysis.$inferInsert;


export const watchlist = mysqlTable("watchlist", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  domainId: int("domainId").notNull().references(() => analyzedDomains.id, { onDelete: "cascade" }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Watchlist = typeof watchlist.$inferSelect;
export type InsertWatchlist = typeof watchlist.$inferInsert;


/**
 * Domain comments for collaboration
 */
export const domainComments = mysqlTable("domainComments", {
  id: int("id").autoincrement().primaryKey(),
  domainId: int("domainId").notNull().references(() => analyzedDomains.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  comment: text("comment").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DomainComment = typeof domainComments.$inferSelect;
export type InsertDomainComment = typeof domainComments.$inferInsert;


/**
 * User settings for branding and configuration
 */
export const userSettings = mysqlTable("userSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  companyName: varchar("companyName", { length: 255 }),
  companyLogoUrl: text("companyLogoUrl"),
  namecheapApiKey: text("namecheapApiKey"),
  namecheapUsername: varchar("namecheapUsername", { length: 255 }),
  godaddyApiKey: text("godaddyApiKey"),
  godaddyApiSecret: text("godaddyApiSecret"),
  porkbunApiKey: text('porkbunApiKey'),
  porkbunSecretKey: text('porkbunSecretKey'),
  hostingerApiKey: text('hostingerApiKey'),
  onboardingCompleted: int('onboardingCompleted').default(0),
  // Notification & monitoring toggles
  priceAlertsEnabled: int('priceAlertsEnabled').default(1).notNull(),  // 1 = on, 0 = off
  notificationsEnabled: int('notificationsEnabled').default(1).notNull(), // 1 = on, 0 = off
  // Affiliate tracking IDs
  namecheapAffiliateId: text('namecheapAffiliateId'),
  godaddyAffiliateId: text('godaddyAffiliateId'),
  porkbunAffiliateId: text('porkbunAffiliateId'),
  hostingerAffiliateId: text('hostingerAffiliateId'),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;


/**
 * Cache table for storing API results with TTL
 */
export const cache = mysqlTable("cache", {
  id: int("id").autoincrement().primaryKey(),
  cacheKey: varchar("cacheKey", { length: 512 }).notNull().unique(),
  cacheValue: text("cacheValue").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Cache = typeof cache.$inferSelect;
export type InsertCache = typeof cache.$inferInsert;

/**
 * Saved comparisons table for bookmarking domain comparisons
 */
export const savedComparisons = mysqlTable("savedComparisons", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  domainIds: text("domainIds").notNull(), // JSON array of domain recommendation IDs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SavedComparison = typeof savedComparisons.$inferSelect;
export type InsertSavedComparison = typeof savedComparisons.$inferInsert;

/**
 * Project domains table for tracking domains added to projects
 */
export const projectDomains = mysqlTable("projectDomains", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => userProjects.id, { onDelete: "cascade" }),
  domainName: varchar("domainName", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).default("added").notNull(), // 'added' or 'chosen'
  availableTlds: text("availableTlds"), // JSON array of alternative TLDs
  availabilityChecked: int("availabilityChecked").default(0).notNull(), // 0 = not checked, 1 = checked
  notes: text("notes"),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});

export type ProjectDomain = typeof projectDomains.$inferSelect;
export type InsertProjectDomain = typeof projectDomains.$inferInsert;

/**
 * Usage log table for tracking Free tier daily scan limits
 */
export const usageLog = mysqlTable("usageLog", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 50 }).notNull(), // 'analysis', 'bulk_upload', 'keyword_generation', etc.
  resourceCount: int("resourceCount").default(1).notNull(), // Number of domains/items processed
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: text("metadata"), // JSON for additional context
});

export type UsageLog = typeof usageLog.$inferSelect;
export type InsertUsageLog = typeof usageLog.$inferInsert;

/**
 * Credit transactions table for tracking credit purchases and usage
 */
export const creditTransactions = mysqlTable("creditTransactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: mysqlEnum("type", ["purchase", "deduction", "refund", "bonus"]).notNull(),
  amount: int("amount").notNull(), // Positive for purchases/bonuses, negative for deductions
  balance: int("balance").notNull(), // Balance after this transaction
  description: text("description").notNull(), // "Purchased 50 credits", "Bulk upload (10 domains)", etc.
  relatedAction: varchar("relatedAction", { length: 50 }), // 'bulk_upload', 'keyword_generation', etc.
  metadata: text("metadata"), // JSON for additional context (session ID, payment ID, etc.)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = typeof creditTransactions.$inferInsert;

/**
 * IP rate limiting table for tracking requests by IP address
 */
export const ipRateLimits = mysqlTable("ipRateLimits", {
  id: int("id").autoincrement().primaryKey(),
  ipAddress: varchar("ipAddress", { length: 45 }).notNull(), // IPv4 or IPv6
  action: varchar("action", { length: 50 }).notNull(), // 'analysis', 'bulk_upload', etc.
  requestCount: int("requestCount").default(1).notNull(),
  windowStart: timestamp("windowStart").defaultNow().notNull(), // Start of current rate limit window
  lastRequest: timestamp("lastRequest").defaultNow().notNull(),
  blocked: int("blocked").default(0).notNull(), // 0 = not blocked, 1 = blocked
  metadata: text("metadata"), // JSON for additional context
});

export type IpRateLimit = typeof ipRateLimits.$inferSelect;
export type InsertIpRateLimit = typeof ipRateLimits.$inferInsert;


/**
 * Forensic analysis results table for storing domain history analysis
 */
export const forensicAnalysisResults = mysqlTable("forensicAnalysisResults", {
  id: int("id").autoincrement().primaryKey(),
  domainName: varchar("domainName", { length: 255 }).notNull(),
  finalTier: mysqlEnum("finalTier", ["Tier 1", "Tier 2", "Tier 3", "Tier 4"]).notNull(),
  riskLevel: mysqlEnum("riskLevel", ["Safe", "Moderate", "Critical"]).notNull(),
  primaryIdentity: varchar("primaryIdentity", { length: 255 }).notNull(),
  badges: text("badges").notNull(), // JSON array of badge strings
  reasoning: text("reasoning").notNull(),
  evidence: text("evidence").notNull(),
  historicalSnapshots: text("historicalSnapshots").notNull(), // JSON array of {year, content}
  analyzedAt: timestamp("analyzedAt").defaultNow().notNull(),
  userId: int("userId").references(() => users.id, { onDelete: "cascade" }), // Optional: track who requested analysis
});

export type ForensicAnalysisResult = typeof forensicAnalysisResults.$inferSelect;
export type InsertForensicAnalysisResult = typeof forensicAnalysisResults.$inferInsert;


/**
 * Launch plans table for storing 30-day resurrection strategies
 */
export const launchPlans = mysqlTable("launchPlans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  projectId: int("projectId").references(() => userProjects.id, { onDelete: "cascade" }),
  domain: varchar("domain", { length: 255 }).notNull(),
  summary: text("summary").notNull(),
  estimatedCompletionDays: int("estimatedCompletionDays").default(30).notNull(),
  completedTasksCount: int("completedTasksCount").default(0).notNull(),
  totalTasksCount: int("totalTasksCount").notNull(),
  status: mysqlEnum("status", ["active", "completed", "archived"]).default("active").notNull(),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type LaunchPlan = typeof launchPlans.$inferSelect;
export type InsertLaunchPlan = typeof launchPlans.$inferInsert;

/**
 * Launch tasks table for storing individual action items
 */
export const launchTasks = mysqlTable("launchTasks", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("planId").references(() => launchPlans.id, { onDelete: "cascade" }).notNull(),
  taskId: varchar("taskId", { length: 50 }).notNull(), // e.g., "zombie-1", "keyword-2"
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  action: text("action").notNull(),
  priority: mysqlEnum("priority", ["high", "medium", "low"]).notNull(),
  category: mysqlEnum("category", ["zombie_page", "keyword_content", "technical", "marketing"]).notNull(),
  estimatedTime: varchar("estimatedTime", { length: 50 }).notNull(),
  url: varchar("url", { length: 500 }),
  keyword: varchar("keyword", { length: 255 }),
  targetWordCount: int("targetWordCount"),
  completed: int("completed").default(0).notNull(), // 0 = not completed, 1 = completed
  completedAt: timestamp("completedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LaunchTask = typeof launchTasks.$inferSelect;
export type InsertLaunchTask = typeof launchTasks.$inferInsert;

/**
 * Weekly pulse checks table for tracking index status and rank positions
 * Runs once per week (every Friday) to check if pages are indexed and ranking
 */
export const weeklyPulseChecks = mysqlTable("weeklyPulseChecks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").references(() => userProjects.id, { onDelete: "cascade" }).notNull(),
  domainName: varchar("domainName", { length: 255 }).notNull(),
  checkDate: timestamp("checkDate").defaultNow().notNull(),
  
  // Home page tracking
  homePageIndexed: int("homePageIndexed").default(0).notNull(), // 0 = not indexed, 1 = indexed
  homePageUrl: varchar("homePageUrl", { length: 500 }),
  
  // Zombie page tracking
  zombiePageUrl: varchar("zombiePageUrl", { length: 500 }),
  zombiePageIndexed: int("zombiePageIndexed").default(0).notNull(), // 0 = pending, 1 = indexed
  
  // Rank tracking (only checked if indexed)
  primaryKeyword: varchar("primaryKeyword", { length: 255 }),
  rank: int("rank"), // null = not ranked, 1-100 = position
  
  // Status: 'pending' (not indexed), 'indexed' (found but not ranked), 'ranking' (in top 100), 'building_trust' (indexed but >100)
  status: mysqlEnum("status", ["pending", "indexed", "ranking", "building_trust"]).default("pending").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WeeklyPulseCheck = typeof weeklyPulseChecks.$inferSelect;
export type InsertWeeklyPulseCheck = typeof weeklyPulseChecks.$inferInsert;

/**
 * Pulse reports table for storing weekly progress summaries
 * Generates Friday email reports with stats like "3 New Pages Indexed, 1 Keyword in Top 100"
 */
export const pulseReports = mysqlTable("pulseReports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  projectId: int("projectId").references(() => userProjects.id, { onDelete: "cascade" }).notNull(),
  reportDate: timestamp("reportDate").defaultNow().notNull(),
  
  // Summary stats for email
  newPagesIndexed: int("newPagesIndexed").default(0).notNull(), // Count of pages that became indexed this week
  keywordsInTop100: int("keywordsInTop100").default(0).notNull(), // Count of keywords that entered top 100
  totalPagesIndexed: int("totalPagesIndexed").default(0).notNull(), // Total indexed pages for this project
  totalKeywordsRanking: int("totalKeywordsRanking").default(0).notNull(), // Total keywords in top 100
  
  // Email delivery tracking
  emailSent: int("emailSent").default(0).notNull(), // 0 = not sent, 1 = sent successfully
  emailSentAt: timestamp("emailSentAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PulseReport = typeof pulseReports.$inferSelect;
export type InsertPulseReport = typeof pulseReports.$inferInsert;

/**
 * Project keywords table for individual keyword tracking with enrichment status
 * Supports pay-to-reveal enrichment model where users select specific keywords to enrich
 */
export const projectKeywords = mysqlTable("projectKeywords", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => userProjects.id, { onDelete: "cascade" }),
  keyword: varchar("keyword", { length: 255 }).notNull(),
  
  // Enrichment status
  isEnriched: int("isEnriched").default(0).notNull(), // 0 = not enriched, 1 = enriched with real data
  enrichedAt: timestamp("enrichedAt"),
  
  // DataForSEO metrics (null until enriched)
  searchVolume: int("searchVolume"),
  difficulty: int("difficulty"), // 0-100
  cpc: decimal("cpc", { precision: 10, scale: 2 }), // Cost per click in USD
  competition: decimal("competition", { precision: 3, scale: 2 }), // 0-1
  
  // Metadata
  source: varchar("source", { length: 50 }).default("manual").notNull(), // 'manual', 'competitor_analysis', 'ai_generated'
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectKeyword = typeof projectKeywords.$inferSelect;
export type InsertProjectKeyword = typeof projectKeywords.$inferInsert;


/**
 * API Keys table — lets users generate personal API keys to call DomainSift
 * from external AI tools (ChatGPT, Claude, Gemini, Perplexity, etc.)
 */
export const apiKeys = mysqlTable("apiKeys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 100 }).notNull(), // user-given label e.g. "My ChatGPT Key"
  keyPrefix: varchar("keyPrefix", { length: 12 }).notNull(), // first 8 chars shown in UI e.g. "ds_abc123"
  keyHash: varchar("keyHash", { length: 64 }).notNull(), // SHA-256 hash of the full key
  lastUsedAt: timestamp("lastUsedAt"),
  revokedAt: timestamp("revokedAt"), // null = active, set = revoked
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;
