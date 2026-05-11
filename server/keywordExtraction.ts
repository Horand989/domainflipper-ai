import axios from "axios";
import { invokeLLM } from "./_core/llm";
import { getCachedValue, setCachedValue, CACHE_TTL } from "./cacheService";

interface KeywordResult {
  keywords: string[];
  longTailKeywords: string[];
  relevanceScores: Record<string, number>;
  historicalContent: string;
  snapshotDate?: string;
}

export interface PainPoint {
  painPoint: string;
  description: string;
  searchIntent: "informational" | "commercial" | "transactional";
}

export interface BlogTitle {
  title: string;
  type: "how-to" | "listicle" | "question" | "comparison" | "case-study" | "opinion";
  targetKeyword: string;
}

export interface ContentIntelligenceResult {
  domain: string;
  niche: string;
  targetAudience: string;
  keywords: string[];
  longTailKeywords: string[];
  relevanceScores: Record<string, number>;
  painPoints: PainPoint[];
  blogTitles: BlogTitle[];
  historicalContent: string;
  snapshotDate?: string;
}

/**
 * Fetch historical content from Archive.org Wayback Machine
 */
export async function fetchArchiveContent(domain: string): Promise<{ content: string; date?: string }> {
  try {
    // Get available snapshots
    const availabilityUrl = `https://archive.org/wayback/available?url=${domain}`;
    const availabilityResponse = await axios.get(availabilityUrl);
    
    if (!availabilityResponse.data.archived_snapshots?.closest?.url) {
      throw new Error("No archived snapshots found for this domain");
    }

    const snapshotUrl = availabilityResponse.data.archived_snapshots.closest.url;
    const snapshotDate = availabilityResponse.data.archived_snapshots.closest.timestamp;
    
    // Fetch the archived page content
    const contentResponse = await axios.get(snapshotUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DomainAnalyzer/1.0)",
      },
      timeout: 30000,
    });

    // Extract text content (remove HTML tags)
    let textContent = contentResponse.data
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Limit content length for processing
    textContent = textContent.substring(0, 10000);

    return {
      content: textContent,
      date: snapshotDate,
    };
  } catch (error: any) {
    throw new Error(`Failed to fetch archive content: ${error.message}`);
  }
}

/**
 * Extract keywords using AI analysis
 */
export async function extractKeywordsWithAI(content: string, domainName: string): Promise<KeywordResult> {
  try {
    const prompt = `Analyze the following website content from the expired domain "${domainName}" and extract SEO keywords.

Content:
${content}

Please provide:
1. 50 primary keywords (single words or short 2-word phrases) that represent the main topics and themes
2. 50 long-tail keywords (3-5 word phrases) that could drive targeted traffic
3. Relevance scores (0-100) for the top 20 keywords

Format your response as JSON:
{
  "keywords": ["keyword1", "keyword2", ...],
  "longTailKeywords": ["long tail phrase 1", "long tail phrase 2", ...],
  "relevanceScores": {
    "keyword1": 95,
    "keyword2": 88,
    ...
  }
}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are an SEO expert specializing in keyword research and content analysis. Provide accurate, relevant keywords based on the content provided.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "keyword_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              keywords: {
                type: "array",
                items: { type: "string" },
                description: "Array of 50 primary keywords",
              },
              longTailKeywords: {
                type: "array",
                items: { type: "string" },
                description: "Array of 50 long-tail keyword phrases",
              },
              relevanceScores: {
                type: "object",
                additionalProperties: { type: "number" },
                description: "Relevance scores for top keywords",
              },
            },
            required: ["keywords", "longTailKeywords", "relevanceScores"],
            additionalProperties: false,
          },
        },
      },
    });

    const messageContent = response.choices[0]?.message?.content;
    if (!messageContent || typeof messageContent !== "string") {
      throw new Error("Invalid response from LLM");
    }

    const result = JSON.parse(messageContent);

    return {
      keywords: result.keywords.slice(0, 50),
      longTailKeywords: result.longTailKeywords.slice(0, 50),
      relevanceScores: result.relevanceScores,
      historicalContent: content.substring(0, 500) + "...",
    };
  } catch (error: any) {
    throw new Error(`Failed to extract keywords: ${error.message}`);
  }
}

/**
 * Generate full content intelligence: keywords + pain points + blog titles
 * Works backwards from the domain name and its historical content.
 */
export async function generateContentIntelligence(
  domain: string,
  historicalContent: string,
  snapshotDate?: string
): Promise<ContentIntelligenceResult> {
  const prompt = `You are a veteran content strategist and SEO expert. Analyze the domain "${domain}" and its historical content to produce a complete content intelligence report.

Historical content from Archive.org (may be empty if domain is fresh):
${historicalContent || "No historical content available — work backwards from the domain name itself."}

Your task:
1. Identify the niche and target audience this domain serves (1-2 sentences each)
2. Extract 30 primary SEO keywords (1-3 word phrases)
3. Extract 30 long-tail keywords (4-7 word phrases with clear search intent)
4. Identify 10 specific audience pain points — real problems the target audience faces that this domain could address with blog content. For each pain point include a short description and the search intent type.
5. Generate 20 ready-to-publish blog post titles that directly address those pain points. Mix formats: how-to guides, listicles, questions, comparisons, case studies, and opinion pieces. For each title include the primary target keyword and the title format type.

Return ONLY valid JSON in this exact structure:
{
  "niche": "string",
  "targetAudience": "string",
  "keywords": ["string"],
  "longTailKeywords": ["string"],
  "relevanceScores": { "keyword": number },
  "painPoints": [
    {
      "painPoint": "string",
      "description": "string",
      "searchIntent": "informational" | "commercial" | "transactional"
    }
  ],
  "blogTitles": [
    {
      "title": "string",
      "type": "how-to" | "listicle" | "question" | "comparison" | "case-study" | "opinion",
      "targetKeyword": "string"
    }
  ]
}`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a senior content strategist and SEO expert. You work backwards from domain names and historical content to produce actionable content intelligence reports. Always return valid JSON.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "content_intelligence",
        strict: true,
        schema: {
          type: "object",
          properties: {
            niche: { type: "string" },
            targetAudience: { type: "string" },
            keywords: { type: "array", items: { type: "string" } },
            longTailKeywords: { type: "array", items: { type: "string" } },
            relevanceScores: { type: "object", additionalProperties: { type: "number" } },
            painPoints: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  painPoint: { type: "string" },
                  description: { type: "string" },
                  searchIntent: { type: "string", enum: ["informational", "commercial", "transactional"] },
                },
                required: ["painPoint", "description", "searchIntent"],
                additionalProperties: false,
              },
            },
            blogTitles: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  type: { type: "string", enum: ["how-to", "listicle", "question", "comparison", "case-study", "opinion"] },
                  targetKeyword: { type: "string" },
                },
                required: ["title", "type", "targetKeyword"],
                additionalProperties: false,
              },
            },
          },
          required: ["niche", "targetAudience", "keywords", "longTailKeywords", "relevanceScores", "painPoints", "blogTitles"],
          additionalProperties: false,
        },
      },
    },
  });

  const messageContent = response.choices[0]?.message?.content;
  if (!messageContent || typeof messageContent !== "string") {
    throw new Error("Invalid response from LLM");
  }

  const result = JSON.parse(messageContent);

  return {
    domain,
    niche: result.niche,
    targetAudience: result.targetAudience,
    keywords: result.keywords.slice(0, 30),
    longTailKeywords: result.longTailKeywords.slice(0, 30),
    relevanceScores: result.relevanceScores,
    painPoints: result.painPoints.slice(0, 10),
    blogTitles: result.blogTitles.slice(0, 20),
    historicalContent: historicalContent.substring(0, 500) + (historicalContent.length > 500 ? "..." : ""),
    snapshotDate,
  };
}

/**
 * Main function to extract keywords from expired domain
 */
export async function extractDomainKeywords(domain: string): Promise<KeywordResult> {
  // Check cache first
  const cacheKey = `keywords:${domain}`;
  const cached = await getCachedValue(cacheKey);
  if (cached) {
    return JSON.parse(cached) as KeywordResult;
  }

  // Fetch historical content from Archive.org
  const { content, date } = await fetchArchiveContent(domain);

  // Extract keywords using AI
  const result = await extractKeywordsWithAI(content, domain);

  const finalResult = {
    ...result,
    snapshotDate: date,
  };

  // Cache the result
  await setCachedValue(cacheKey, JSON.stringify(finalResult), CACHE_TTL.KEYWORDS);

  return finalResult;
}

/**
 * Main function to run full content intelligence on a domain.
 * Tries Archive.org first; falls back to domain-name-only analysis.
 */
export async function getDomainContentIntelligence(domain: string): Promise<ContentIntelligenceResult> {
  const cacheKey = `content-intelligence:${domain}`;
  const cached = await getCachedValue(cacheKey);
  if (cached) {
    return JSON.parse(cached) as ContentIntelligenceResult;
  }

  // Try to fetch historical content; fall back gracefully
  let historicalContent = "";
  let snapshotDate: string | undefined;
  try {
    const archiveResult = await fetchArchiveContent(domain);
    historicalContent = archiveResult.content;
    snapshotDate = archiveResult.date;
  } catch {
    // No archive content — AI will work from domain name alone
    historicalContent = "";
  }

  const result = await generateContentIntelligence(domain, historicalContent, snapshotDate);

  await setCachedValue(cacheKey, JSON.stringify(result), CACHE_TTL.KEYWORDS);

  return result;
}
