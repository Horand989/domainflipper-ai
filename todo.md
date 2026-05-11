# DomainFlipper AI / DomainSift — Project TODO

## Phase 1: Core Features (Complete)
- [x] Database schema (users, analysisSessions, analyzedDomains, domainRecommendations, watchlist, userSettings)
- [x] Server: db helpers (all CRUD operations)
- [x] Server: tRPC routers (analysis, watchlist, settings, pricing, user, auth)
- [x] AI OCR analysis service (extractDomainsFromImage, rankDomains)
- [x] Stripe integration (checkout, billing portal, webhook handler)
- [x] Stripe webhook Express route registered in server index
- [x] Landing page (hero, problem/solution, how-it-works, features, CTA, footer)
- [x] Navigation component (responsive, auth-aware, tier badge)
- [x] Dashboard page (stats, recent sessions, watchlist preview, upgrade CTA)
- [x] Analysis page (intake form: goal/niche/risk, image upload with drag-drop)
- [x] Analysis Results page (ranked cards, metrics, reasoning, Sherlock check, due diligence checklist, add to watchlist)
- [x] Watchlist page (list, edit notes, delete, domain metrics)
- [x] Pricing page (Free vs Pro $97/mo, Stripe checkout, FAQ)
- [x] Settings page (profile, subscription, notifications, registrar API keys: Namecheap/GoDaddy/Porkbun)
- [x] Manus OAuth authentication
- [x] Protected routes (dashboard, analysis, watchlist, settings)
- [x] Free tier hard limit: 3 analyses before upgrade prompt
- [x] FORBIDDEN error on limit exceeded
- [x] Dark professional theme (slate/indigo palette)
- [x] Google Fonts (Inter + Space Grotesk)
- [x] Responsive design
- [x] Vitest tests (auth, analysis, watchlist, settings, pricing, free-tier limit)
- [x] All 15 tests passing

## Phase 2: DomainSift Rebrand + Major Feature Update

### Schema & DB
- [x] Update users table: tier, subscriptionExpiry, subscriptionStatus, stripeCustomerId, stripeSubscriptionId, credits, analysisCount, onboardingCompleted
- [x] Add domains, priceAlerts, monitoringLogs, priceHistory tables
- [x] Add userProjects, domainSuggestions, nicheAnalysis tables
- [x] Add domainComments, savedComparisons, projectDomains tables
- [x] Add weeklyPulseChecks, pulseReports, projectKeywords tables
- [x] Add apiKeys table
- [x] Add launchPlans, launchTasks, creditTransactions tables
- [x] Add usageLog, ipRateLimits tables
- [x] Push DB migrations

### Server Services
- [x] featureGate.ts — tier/credit-based access control
- [x] creditSystem.ts — credit balance and transactions
- [x] usageTracking.ts — usage stats
- [x] affiliateIntelligence service
- [x] domainAvailability service (GoDaddy → Namecheap → WHOIS fallback, graceful degradation)
- [x] domainAvailabilityChecker (bulk)
- [x] domainParser.ts — OCR/LLM image parsing
- [x] domainAnalyzer.ts — AI domain ranking
- [x] ocrService.ts — SpamZilla screenshot OCR
- [x] apiKeyService (generate, validate, revoke)
- [x] ipRateLimiting middleware
- [x] keywordExtraction service
- [x] marketResearch service
- [x] forensicAnalyzer.ts

### Server Routers
- [x] pricingRouter (credits, checkout, tiers, createCheckout, createPortal)
- [x] domainCheckerRouter
- [x] affiliateIntelligenceRouter
- [x] enrichmentRouter (DataForSEO + Firecrawl, graceful degradation)
- [x] apiKeys router
- [x] user.getTier / checkFeatureAccess
- [x] Main routers.ts updated with all new routers

### Client Pages & Components
- [x] Rebrand: "DomainFlipper AI" → "DomainSift" across all UI
- [x] Updated index.css theme (light theme, purple primary)
- [x] Updated Navigation with all new nav items
- [x] Updated App.tsx with all new routes
- [x] AffiliateIntelligence page
- [x] DomainChecker page
- [x] Projects page
- [x] ProjectDetail page
- [x] History page
- [x] ApiKeys page (Developer page)
- [x] DomainDetail page
- [x] Domains page
- [x] Onboarding component (react-joyride tour)
- [x] UpgradeModal, UsageLimitModal, PremiumLock, CreditBadge, CreditBalanceCard components
- [x] BuyCreditsModal, CooldownTimer, ForensicHistoryModal components
- [x] Updated Pricing page
- [x] Updated Settings page (new fields, API keys section)

### Testing
- [x] Updated vitest tests for new features (pricing router, free tier limit)
- [x] All 15 tests passing, 0 TypeScript errors

### External API Integration (Optional - graceful degradation)
- [x] FIRECRAWL_API_KEY — reads process.env.FIRECRAWL_API_KEY in server/services/firecrawl.ts; add via project Secrets panel
- [x] DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD — reads process.env.DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD in server/services/dataforseo.ts; add via project Secrets panel
- [x] NAMECHEAP_USERNAME + NAMECHEAP_API_KEY + NAMECHEAP_CLIENT_IP — reads these three env vars in server/services/domainAvailability.ts; add via project Secrets panel
- [x] GODADDY_API_KEY + GODADDY_API_SECRET — reads process.env.GODADDY_API_KEY / GODADDY_API_SECRET in server/services/domainAvailability.ts; add via project Secrets panel

### App Rename
- [x] Rename app from DomainSift to FlipandSift across all client and server files

### Audit Fixes (Phase 2 Completion)
- [x] All DomainFlipper AI branding replaced with DomainSift (Home.tsx, Pricing.tsx, index.html, stripe.ts)
- [x] App.tsx updated with all 20+ routes (AffiliateIntelligence, DomainChecker, Projects, History, ApiKeys, Developer, Alerts, BulkImport, AdminDashboard, Domains, Compare)
- [x] ApiKeys page verified: consumes trpc.apiKeys.list/create/revoke end-to-end
- [x] Pricing page branding updated to DomainSift
- [x] Settings page verified with all new fields and registrar API key sections
- [x] All 15 tests passing, 0 TypeScript errors after all changes

## Phase 3: Porkbun + Hostinger Domain Providers
- [x] Schema: add porkbunApiKey, porkbunSecretKey, hostingerApiKey, porkbunAffiliateId, hostingerAffiliateId to userSettings
- [x] DB migration: pnpm db:push
- [x] Server: update domainAvailability.ts with Porkbun + Hostinger API checkers
- [x] Server: add affiliateLinks.ts service
- [x] Server: update db helpers for new settings fields
- [x] Server: update domainChecker router to pass new credentials
- [x] Client: Settings page — add Porkbun and Hostinger tabs
- [x] Client: AnalysisResults — add Porkbun purchase links
- [x] Client: Onboarding — mention Porkbun and Hostinger
- [x] Tests: add Porkbun/Hostinger availability checker tests (domain-checker.test.ts + domain-checker-enhancements.test.ts)
