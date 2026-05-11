import { invokeLLM } from "./_core/llm";
import type { InsertAnalyzedDomain } from "../drizzle/schema";

export interface ParsedDomainData {
  domainName: string;
  trustFlow: number | null;
  citationFlow: number | null;
  majTopics: string | null;
  age: number | null;
  szScore: number | null;
  redirects: number | null;
  parked: number | null;
  drops: number | null;
  googleIndex: number | null;
  outLinksExternal: number | null;
  semRank: number | null;
  price: string | null;
}

export interface DomainRanking {
  domainName: string;
  rank: number;
  score: number;
  reasoning: string;
  sherlockAnalysis: string;
  dueDiligenceChecklist: string[];
}

/**
 * Extract domain table data from a SpamZilla screenshot using LLM vision.
 */
export async function extractDomainsFromImage(
  imageDataUrl: string
): Promise<ParsedDomainData[]> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert at reading SpamZilla domain list screenshots and extracting structured data.
Extract ALL domain rows from the table. Return a JSON array of domain objects.
Each object must have these fields (use null if not visible):
- domainName: string (the full domain like "example.com")
- trustFlow: number or null
- citationFlow: number or null
- majTopics: string or null (comma-separated topics)
- age: number or null (domain age in years)
- szScore: number or null (SpamZilla score)
- redirects: number or null
- parked: number or null (0 or 1)
- drops: number or null
- googleIndex: number or null
- outLinksExternal: number or null
- semRank: number or null
- price: string or null (e.g. "$49")
Return ONLY valid JSON array, no markdown, no explanation.`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract all domain data from this SpamZilla screenshot. Return a JSON array.",
          },
          {
            type: "image_url",
            image_url: {
              url: imageDataUrl,
              detail: "high",
            },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from OCR analysis");

  let parsed: unknown;
  try {
    const text = typeof content === "string" ? content : JSON.stringify(content);
    // Try to extract JSON array from the response
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      const obj = JSON.parse(text);
      // Handle wrapped responses like { domains: [...] }
      parsed = Array.isArray(obj) ? obj : (obj.domains ?? obj.data ?? obj.results ?? []);
    }
  } catch {
    throw new Error("Failed to parse domain data from OCR response");
  }

  if (!Array.isArray(parsed)) throw new Error("OCR did not return an array");

  return (parsed as Record<string, unknown>[])
    .filter((d) => typeof d.domainName === "string" && d.domainName.includes("."))
    .map((d) => ({
      domainName: String(d.domainName),
      trustFlow: toInt(d.trustFlow),
      citationFlow: toInt(d.citationFlow),
      majTopics: d.majTopics ? String(d.majTopics) : null,
      age: toInt(d.age),
      szScore: toInt(d.szScore),
      redirects: toInt(d.redirects),
      parked: toInt(d.parked),
      drops: toInt(d.drops),
      googleIndex: toInt(d.googleIndex),
      outLinksExternal: toInt(d.outLinksExternal),
      semRank: toInt(d.semRank),
      price: d.price ? String(d.price) : null,
    }));
}

function toInt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : Math.round(n);
}

/**
 * Rank the top 5 domains using AI, generating scores, reasoning,
 * Sherlock spam check analysis, and due diligence checklists.
 */
export async function rankDomains(
  domains: ParsedDomainData[],
  context?: {
    goal?: string;
    niche?: string;
    riskTolerance?: string;
  }
): Promise<DomainRanking[]> {
  if (domains.length === 0) return [];

  const contextStr = context
    ? `User context: Goal=${context.goal ?? "money_site"}, Niche=${context.niche ?? "general"}, Risk tolerance=${context.riskTolerance ?? "medium"}.`
    : "";

  const domainList = domains
    .map(
      (d, i) =>
        `${i + 1}. ${d.domainName} | TF:${d.trustFlow ?? "?"} CF:${d.citationFlow ?? "?"} SZ:${d.szScore ?? "?"} Age:${d.age ?? "?"}yr Topics:${d.majTopics ?? "?"} Price:${d.price ?? "?"}`
    )
    .join("\n");

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a world-class expired domain analyst specializing in domain flipping. 
${contextStr}
Analyze the provided domain list and select the TOP 5 best opportunities for domain flipping.
For each selected domain, provide:
1. A score (0-100) based on: Trust Flow (weight 30%), Citation Flow (15%), SZ Score (25%), Age (15%), Topical relevance (15%)
2. Clear reasoning (2-3 sentences) explaining why this domain is valuable
3. A "Sherlock Analysis" — a spam/risk check covering: penalty history risk, PBN risk, topic consistency, redirect history risk
4. A due diligence checklist of 6-8 specific action items the buyer should complete before purchasing

Return ONLY a JSON array of exactly 5 objects with this structure:
{
  "domainName": "example.com",
  "rank": 1,
  "score": 87,
  "reasoning": "...",
  "sherlockAnalysis": "...",
  "dueDiligenceChecklist": ["Check item 1", "Check item 2", ...]
}`,
      },
      {
        role: "user",
        content: `Rank these domains and return the top 5:\n\n${domainList}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI ranker");

  let parsed: unknown;
  try {
    const text = typeof content === "string" ? content : JSON.stringify(content);
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      const obj = JSON.parse(text);
      parsed = Array.isArray(obj) ? obj : (obj.rankings ?? obj.domains ?? obj.results ?? []);
    }
  } catch {
    throw new Error("Failed to parse AI ranking response");
  }

  if (!Array.isArray(parsed)) throw new Error("AI ranker did not return an array");

  return (parsed as Record<string, unknown>[])
    .slice(0, 5)
    .map((r, i) => ({
      domainName: String(r.domainName ?? ""),
      rank: toInt(r.rank) ?? i + 1,
      score: Math.min(100, Math.max(0, toInt(r.score) ?? 50)),
      reasoning: String(r.reasoning ?? ""),
      sherlockAnalysis: String(r.sherlockAnalysis ?? ""),
      dueDiligenceChecklist: Array.isArray(r.dueDiligenceChecklist)
        ? (r.dueDiligenceChecklist as unknown[]).map(String)
        : [],
    }));
}
