/**
 * Affiliate Product Intelligence Service
 *
 * Accepts a product URL or description from ClickBank/JVZoo/Digistore24
 * and extracts:
 * - Domain name ideas with brandability scores
 * - Primary + long-tail keywords with DataForSEO metrics
 * - Hook-Story-Offer funnel outline
 * - Backdoor/sideway traffic angles
 */

import { invokeLLM } from "../_core/llm";
import { scrapeCompetitor } from "./firecrawl";
import { getKeywordData } from "./dataforseo";
import { checkBatchAvailability } from "./domainAvailability";

export interface DomainIdea {
  name: string;
  tld: string;
  full: string;
  brandScore: number;
  rationale: string;
  available?: boolean;
  price?: number;
  currency?: string;
  availabilityChecked?: boolean;
}

export interface KeywordResult {
  keyword: string;
  searchVolume: number | null;
  difficulty: number | null;
  cpc: number | null;
  type: "primary" | "longtail";
}

export interface FunnelOutline {
  hook: {
    headline: string;
    subheadline: string;
    angle: string;
    trafficSource: string;
  };
  story: {
    narrative: string;
    painPoints: string[];
    transformation: string;
    bridgePageIdea: string;
  };
  offer: {
    callToAction: string;
    bonusIdeas: string[];
    urgencyTrigger: string;
    affiliateAngle: string;
  };
}

export interface BackdoorAngle {
  angle: string;
  targetAudience: string;
  searchIntent: string;
  exampleKeywords: string[];
  contentIdea: string;
  whyItWorks: string;
}

export interface AffiliateIntelligenceResult {
  productName: string;
  niche: string;
  targetAudience: string;
  domainIdeas: DomainIdea[];
  primaryKeywords: KeywordResult[];
  longtailKeywords: KeywordResult[];
  funnelOutline: FunnelOutline;
  backdoorAngles: BackdoorAngle[];
  scrapedContent?: string;
  scrapedTitle?: string;
}

/**
 * Calculate brandability score for a domain name
 */
function calcBrandScore(name: string): number {
  let score = 100;
  if (name.length > 15) score -= 20;
  else if (name.length > 12) score -= 10;
  if (name.includes("-")) score -= 30;
  const consonantRun = name.match(/[bcdfghjklmnpqrstvwxyz]{4,}/i);
  if (consonantRun) score -= 15;
  if (name.length <= 8) score += 10;
  return Math.max(0, Math.min(100, score));
}

/**
 * Scrape product page using Firecrawl if URL is provided
 */
async function scrapeProductPage(url: string): Promise<{ content: string; title: string | null }> {
  try {
    const result = await scrapeCompetitor(url);
    return {
      content: result.content.slice(0, 4000), // Limit to 4000 chars for AI prompt
      title: result.title,
    };
  } catch (error) {
    console.warn("[AffiliateIntelligence] Firecrawl scrape failed, using empty content:", error);
    return { content: "", title: null };
  }
}

/**
 * Use AI to extract intelligence from product description
 */
async function extractIntelligenceFromDescription(
  description: string,
  productName: string
): Promise<{
  niche: string;
  targetAudience: string;
  domainIdeas: Array<{ name: string; tld: string; rationale: string }>;
  primaryKeywordSuggestions: string[];
  longtailKeywordSuggestions: string[];
  funnelOutline: FunnelOutline;
  backdoorAngles: BackdoorAngle[];
}> {
  const prompt = `You are an expert affiliate marketer and SEO strategist. Analyze this product description and extract actionable intelligence for building an affiliate marketing campaign.

PRODUCT NAME: ${productName}
PRODUCT DESCRIPTION:
${description}

Provide a comprehensive analysis in JSON format. Be specific, practical, and focus on what actually converts.

For domain ideas: suggest 12 short, brandable .com names (no hyphens preferred, under 12 chars). Mix approaches: problem-aware (e.g., "fixmyback.com"), outcome-aware (e.g., "slimdown90.com"), and curiosity-based (e.g., "thefatswitch.com").

For the Hook-Story-Offer funnel: use Russell Brunson's framework. Hook = pattern interrupt that stops the scroll. Story = relatable struggle + transformation. Offer = the bridge to the product.

For backdoor angles: find NON-OBVIOUS traffic angles that competitors ignore. Think symptom-aware searches, comparison searches, "why does X happen" queries, lifestyle angles, and related-problem audiences.`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are an expert affiliate marketer, SEO strategist, and copywriter. Provide detailed, actionable intelligence in valid JSON format only.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "affiliate_intelligence",
        strict: true,
        schema: {
          type: "object",
          properties: {
            niche: { type: "string" },
            targetAudience: { type: "string" },
            domainIdeas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  tld: { type: "string" },
                  rationale: { type: "string" },
                },
                required: ["name", "tld", "rationale"],
                additionalProperties: false,
              },
            },
            primaryKeywordSuggestions: {
              type: "array",
              items: { type: "string" },
            },
            longtailKeywordSuggestions: {
              type: "array",
              items: { type: "string" },
            },
            funnelOutline: {
              type: "object",
              properties: {
                hook: {
                  type: "object",
                  properties: {
                    headline: { type: "string" },
                    subheadline: { type: "string" },
                    angle: { type: "string" },
                    trafficSource: { type: "string" },
                  },
                  required: ["headline", "subheadline", "angle", "trafficSource"],
                  additionalProperties: false,
                },
                story: {
                  type: "object",
                  properties: {
                    narrative: { type: "string" },
                    painPoints: { type: "array", items: { type: "string" } },
                    transformation: { type: "string" },
                    bridgePageIdea: { type: "string" },
                  },
                  required: ["narrative", "painPoints", "transformation", "bridgePageIdea"],
                  additionalProperties: false,
                },
                offer: {
                  type: "object",
                  properties: {
                    callToAction: { type: "string" },
                    bonusIdeas: { type: "array", items: { type: "string" } },
                    urgencyTrigger: { type: "string" },
                    affiliateAngle: { type: "string" },
                  },
                  required: ["callToAction", "bonusIdeas", "urgencyTrigger", "affiliateAngle"],
                  additionalProperties: false,
                },
              },
              required: ["hook", "story", "offer"],
              additionalProperties: false,
            },
            backdoorAngles: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  angle: { type: "string" },
                  targetAudience: { type: "string" },
                  searchIntent: { type: "string" },
                  exampleKeywords: { type: "array", items: { type: "string" } },
                  contentIdea: { type: "string" },
                  whyItWorks: { type: "string" },
                },
                required: ["angle", "targetAudience", "searchIntent", "exampleKeywords", "contentIdea", "whyItWorks"],
                additionalProperties: false,
              },
            },
          },
          required: [
            "niche",
            "targetAudience",
            "domainIdeas",
            "primaryKeywordSuggestions",
            "longtailKeywordSuggestions",
            "funnelOutline",
            "backdoorAngles",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const rawContent = response.choices[0]?.message?.content;
  const contentStr = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
  return JSON.parse(contentStr);
}

/**
 * Enrich keyword suggestions with DataForSEO metrics
 * Falls back gracefully if DataForSEO is unavailable
 */
async function enrichKeywordsWithMetrics(
  primarySuggestions: string[],
  longtailSuggestions: string[]
): Promise<{ primary: KeywordResult[]; longtail: KeywordResult[] }> {
  const allKeywords = [...primarySuggestions.slice(0, 15), ...longtailSuggestions.slice(0, 15)];

  try {
    const metrics = await getKeywordData(allKeywords);
    const metricsMap = new Map(metrics.map((m) => [m.keyword.toLowerCase(), m]));

    const mapKeyword = (kw: string, type: "primary" | "longtail"): KeywordResult => {
      const m = metricsMap.get(kw.toLowerCase());
      return {
        keyword: kw,
        searchVolume: m?.searchVolume ?? null,
        difficulty: m?.difficulty ?? null,
        cpc: m?.cpc ?? null,
        type,
      };
    };

    return {
      primary: primarySuggestions.slice(0, 15).map((kw) => mapKeyword(kw, "primary")),
      longtail: longtailSuggestions.slice(0, 15).map((kw) => mapKeyword(kw, "longtail")),
    };
  } catch (error) {
    console.warn("[AffiliateIntelligence] DataForSEO enrichment failed, returning without metrics:", error);
    return {
      primary: primarySuggestions.slice(0, 15).map((kw) => ({
        keyword: kw,
        searchVolume: null,
        difficulty: null,
        cpc: null,
        type: "primary" as const,
      })),
      longtail: longtailSuggestions.slice(0, 15).map((kw) => ({
        keyword: kw,
        searchVolume: null,
        difficulty: null,
        cpc: null,
        type: "longtail" as const,
      })),
    };
  }
}

/**
 * Main entry point: analyze an affiliate product from URL or description
 */
export async function analyzeAffiliateProduct(input: {
  productName: string;
  description?: string;
  url?: string;
}): Promise<AffiliateIntelligenceResult> {
  const { productName, description, url } = input;

  let finalDescription = description || "";
  let scrapedContent: string | undefined;
  let scrapedTitle: string | undefined;

  // If URL provided, scrape the product page with Firecrawl
  if (url) {
    console.log("[AffiliateIntelligence] Scraping product URL:", url);
    const scraped = await scrapeProductPage(url);
    scrapedContent = scraped.content;
    scrapedTitle = scraped.title || undefined;
    // Combine scraped content with any manually provided description
    finalDescription = scraped.content
      ? `${finalDescription}\n\n[Scraped from ${url}]:\n${scraped.content}`
      : finalDescription;
  }

  if (!finalDescription.trim()) {
    throw new Error("Please provide either a product URL or a description to analyze.");
  }

  console.log("[AffiliateIntelligence] Running AI analysis...");
  const aiResult = await extractIntelligenceFromDescription(finalDescription, productName);

  console.log("[AffiliateIntelligence] Enriching keywords with DataForSEO...");
  const { primary, longtail } = await enrichKeywordsWithMetrics(
    aiResult.primaryKeywordSuggestions,
    aiResult.longtailKeywordSuggestions
  );

  // Build domain ideas with brandability scores
  const rawDomainIdeas: DomainIdea[] = aiResult.domainIdeas.map((d) => ({
    name: d.name,
    tld: d.tld || ".com",
    full: `${d.name}${d.tld || ".com"}`,
    brandScore: calcBrandScore(d.name),
    rationale: d.rationale,
    availabilityChecked: false,
  }));

  // Check availability for all generated domain ideas
  console.log("[AffiliateIntelligence] Checking domain availability...");
  let domainIdeas: DomainIdea[] = rawDomainIdeas;
  try {
    const domainNames = rawDomainIdeas.map((d) => d.full);
    const availabilityResults = await checkBatchAvailability(domainNames);
    const availMap = new Map(availabilityResults.map((r) => [r.domain, r]));

    domainIdeas = rawDomainIdeas.map((d) => {
      const avail = availMap.get(d.full);
      const price = avail?.pricing?.[0]?.price;
      // Only mark as available if confirmed available AND price is standard (under $50)
      const isStandardPrice = price === undefined || price <= 50;
      return {
        ...d,
        available: avail ? (avail.available && isStandardPrice) : undefined,
        price: price,
        currency: avail?.pricing?.[0]?.currency || "USD",
        availabilityChecked: avail !== undefined,
      };
    });

    // Sort: available standard-price domains first, then unchecked, then taken/premium
    domainIdeas.sort((a, b) => {
      const aScore = a.available === true ? 2 : a.available === undefined ? 1 : 0;
      const bScore = b.available === true ? 2 : b.available === undefined ? 1 : 0;
      if (bScore !== aScore) return bScore - aScore;
      return b.brandScore - a.brandScore;
    });

    const availableCount = domainIdeas.filter((d) => d.available === true).length;
    console.log(`[AffiliateIntelligence] ${availableCount}/${domainIdeas.length} domain ideas are available at standard price`);
  } catch (err) {
    console.warn("[AffiliateIntelligence] Availability check failed, returning all domain ideas:", err);
  }

  return {
    productName,
    niche: aiResult.niche,
    targetAudience: aiResult.targetAudience,
    domainIdeas,
    primaryKeywords: primary,
    longtailKeywords: longtail,
    funnelOutline: aiResult.funnelOutline,
    backdoorAngles: aiResult.backdoorAngles,
    scrapedContent,
    scrapedTitle,
  };
}
