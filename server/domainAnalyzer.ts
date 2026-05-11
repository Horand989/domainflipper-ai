import { invokeLLM } from "./_core/llm";
import type { ParsedDomain } from "./domainParser";

export interface DomainScore {
  domain: ParsedDomain;
  score: number;
  metrics: {
    trustFlowScore: number;
    trustRatioScore: number;
    topicalRelevanceScore: number;
    ageScore: number;
    linkQualityScore: number;
  };
  qualitySignal: 'quality' | 'trap' | 'neutral';
  szScoreLevel: 'safe' | 'caution' | 'danger';
}

export interface DomainRecommendation {
  domain: ParsedDomain;
  rank: number;
  score: number;
  reasoning: string;
  sherlockAnalysis: string;
  dueDiligenceChecklist: string[];
  category?: 'hidden_gem' | 'power_play' | 'trap' | 'standard';
  categoryLabel?: string;
}

export interface IntakeAnswers {
  goal: 'money_site' | '301_redirect' | 'pbn';
  niche: string;
  riskTolerance: 'premium' | 'high_power';
}

/**
 * Calculate domain quality score based on metrics
 */
export function scoreDomain(domain: ParsedDomain): DomainScore {
  let totalScore = 0;
  const metrics = {
    trustFlowScore: 0,
    trustRatioScore: 0,
    topicalRelevanceScore: 0,
    ageScore: 0,
    linkQualityScore: 0,
  };

  // Trust Flow Score (0-30 points)
  if (domain.trustFlow) {
    metrics.trustFlowScore = Math.min(domain.trustFlow * 0.6, 30);
    totalScore += metrics.trustFlowScore;
  }

  // Trust Ratio Score (0-25 points)
  if (domain.trustFlow && domain.citationFlow && domain.citationFlow > 0) {
    const ratio = domain.trustFlow / domain.citationFlow;
    if (ratio >= 0.8) {
      metrics.trustRatioScore = 25;
    } else if (ratio >= 0.6) {
      metrics.trustRatioScore = 20;
    } else if (ratio >= 0.4) {
      metrics.trustRatioScore = 15;
    } else {
      metrics.trustRatioScore = 5;
    }
    totalScore += metrics.trustRatioScore;
  }

  // Topical Relevance (0-20 points)
  if (domain.majTopics) {
    // More specific topics are better
    const topicCount = domain.majTopics.split(",").length;
    if (topicCount <= 2) {
      metrics.topicalRelevanceScore = 20;
    } else if (topicCount <= 4) {
      metrics.topicalRelevanceScore = 15;
    } else {
      metrics.topicalRelevanceScore = 10;
    }
    totalScore += metrics.topicalRelevanceScore;
  }

  // Age Score (0-15 points)
  if (domain.age) {
    metrics.ageScore = Math.min(domain.age * 1.5, 15);
    totalScore += metrics.ageScore;
  }

  // Link Quality Score (0-10 points)
  if (domain.outLinksExternal !== undefined && domain.outLinksInternal !== undefined) {
    const totalLinks = domain.outLinksExternal + domain.outLinksInternal;
    if (totalLinks < 10) {
      metrics.linkQualityScore = 10; // Low spam indicators
    } else if (totalLinks < 50) {
      metrics.linkQualityScore = 7;
    } else {
      metrics.linkQualityScore = 3; // High spam risk
    }
    totalScore += metrics.linkQualityScore;
  }

  // --- Quality Signal: TF > CF = reputable links (quality), DA high + TF low = hollow domain (trap) ---
  let qualitySignal: 'quality' | 'trap' | 'neutral' = 'neutral';
  if (domain.trustFlow && domain.citationFlow) {
    if (domain.trustFlow > domain.citationFlow) {
      qualitySignal = 'quality'; // TF > CF: links from reputable sources
    } else if (domain.citationFlow > domain.trustFlow * 3) {
      qualitySignal = 'trap'; // CF >> TF: toxic spam / automated link pattern
      totalScore = Math.max(0, totalScore - 15); // Penalise spam pattern
    }
  }
  // DA vs TF mismatch: high DA (>20) with very low TF (<5) = hollow building / junk links
  if (domain.domainAuthority && domain.domainAuthority > 20 && (domain.trustFlow || 0) < 5) {
    qualitySignal = 'trap';
    totalScore = Math.max(0, totalScore - 20); // Penalise trap domains
  }
  // Drops penalty: each drop is a pump-and-dump signal
  if (domain.drops && domain.drops > 0) {
    totalScore = Math.max(0, totalScore - domain.drops * 3);
  }

  // --- SZ Score Level ---
  let szScoreLevel: 'safe' | 'caution' | 'danger' = 'safe';
  if (domain.szScore !== undefined) {
    if (domain.szScore > 35) szScoreLevel = 'danger';
    else if (domain.szScore >= 25) szScoreLevel = 'caution';
    else szScoreLevel = 'safe';
  }

  // Attach computed signals back to domain object for frontend use
  domain.qualitySignal = qualitySignal;
  domain.szScoreLevel = szScoreLevel;

  return {
    domain,
    score: Math.round(totalScore),
    metrics,
    qualitySignal,
    szScoreLevel,
  };
}

/**
 * Analyze domains and generate top 5 recommendations with AI reasoning
 */
export async function analyzeDomains(domains: ParsedDomain[], intake?: IntakeAnswers): Promise<DomainRecommendation[]> {
  // If no domains provided, return empty array
  if (!domains || domains.length === 0) {
    return [];
  }

  // Score all domains
  const scoredDomains = domains.map(scoreDomain);

  // Sort by score and take top 15
  const top15 = scoredDomains.sort((a, b) => b.score - a.score).slice(0, 15);

  // If all scores are 0 or very low, create basic recommendations without AI
  const maxScore = Math.max(...top15.map(d => d.score));
  if (maxScore < 10) {
    console.warn("[Analysis] All domains scored very low, creating basic recommendations");
    return top15.slice(0, 5).map((sd, idx) => ({
      domain: sd.domain,
      rank: idx + 1,
      score: sd.score,
      reasoning: "This domain was extracted from your screenshot. Consider checking its history on Archive.org and verifying metrics on SpamZilla.",
      sherlockAnalysis: "Limited data available. Manual verification recommended.",
      dueDiligenceChecklist: [
        "Check domain history on Archive.org",
        "Verify Trust Flow and Citation Flow metrics",
        "Research previous website content and niche",
        "Check for Google penalties or spam history",
        "Verify backlink quality"
      ]
    }));
  }

  // Use AI to analyze top 15 and narrow to top 5 with reasoning
  const aiAnalysis = await generateAIRecommendations(top15, intake);

  return aiAnalysis;
}

/**
 * Generate AI-powered recommendations with narrative and due diligence
 */
async function generateAIRecommendations(scoredDomains: DomainScore[], intake?: IntakeAnswers): Promise<DomainRecommendation[]> {
  const domainsData = scoredDomains.map((sd, idx) => ({
    rank: idx + 1,
    domainName: sd.domain.domainName,
    trustFlow: sd.domain.trustFlow,
    citationFlow: sd.domain.citationFlow,
    majTopics: sd.domain.majTopics,
    age: sd.domain.age,
    score: sd.score,
    metrics: sd.metrics,
  }));

  const intakeContext = intake
    ? `\n\nUSER CONTEXT:\n- Goal: ${intake.goal === 'money_site' ? 'Building a Money Site (needs clean history, topical relevance)' : intake.goal === '301_redirect' ? '301 Redirect (needs raw link power, topic less critical)' : 'PBN Domain (needs high metrics, history less critical)'}
- Niche: ${intake.niche}
- Risk Tolerance: ${intake.riskTolerance === 'premium' ? 'Premium/Clean History (safer, more expensive)' : 'High-Power Burner Domain (riskier, cheaper)'}

Tailor ALL recommendations to this specific context. A domain perfect for a PBN may be wrong for a Money Site.`
    : '';

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a veteran Domain Investor and SEO Strategist with 15+ years of experience. You act as a mentor. Your goal is not just to read data, but to help the user make profitable, safe business decisions. You speak in a professional, insightful, and human tone — using analogies, assessing risk, and explaining the WHY behind every number.

Your task is to analyze the top 15 domains and select exactly 3 domains using this MANDATORY framework:

1. THE HIDDEN GEM: The best overall match for the user's specific niche and goal. Explain why it wins (e.g., "This has the perfect balance of power and relevance"). This should be a domain that might be overlooked but is actually the safest, most profitable choice.

2. THE POWER PLAY: A domain with high metrics (high TF, high CF) that might require some cleanup or carries some risk. Ideal for users with higher risk tolerance or PBN use.

3. THE TRAP: A domain that LOOKS good on paper (high metrics) but is actually dangerous. Could be: high DA but very low TF (hollow building of junk links), CF far exceeds TF (spam network), domain name vs Maj Topics mismatch (repurposed spam site), or SZ Score > 25 with high Drops (pump and dump history). Explain CLEARLY why they should avoid it.

Key rules:
- TF/CF ratio near 1.0 is gold. High CF with low TF is TOXIC spam.
- SZ Score > 25 = flag as risky. Check Drops — frequent drops = pump and dump history.
- Domain name vs Maj Topics mismatch = repurposed spam site (e.g., BestPlumber.com with Recreation/Travel topics).
- Always explain the WHY behind every number using analogies.
${intakeContext}`,
      },
      {
        role: "user",
        content: `Analyze these domains and identify the Hidden Gem, Power Play, and Trap:\n\n${JSON.stringify(domainsData, null, 2)}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "domain_recommendations",
        strict: true,
        schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  domainName: { type: "string" },
                  rank: { type: "number" },
                  category: { type: "string", enum: ["hidden_gem", "power_play", "trap", "standard"] },
                  categoryLabel: { type: "string" },
                  reasoning: { type: "string" },
                  sherlockAnalysis: { type: "string" },
                  dueDiligenceSteps: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["domainName", "rank", "category", "categoryLabel", "reasoning", "sherlockAnalysis", "dueDiligenceSteps"],
                additionalProperties: false,
              },
            },
          },
          required: ["recommendations"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  const contentString = typeof content === "string" ? content : JSON.stringify(content);
  const parsed = JSON.parse(contentString);

  // Map AI recommendations back to full domain data
  const recommendations: DomainRecommendation[] = [];
  for (const aiRec of parsed.recommendations) {
    const scoredDomain = scoredDomains.find((sd) => sd.domain.domainName === aiRec.domainName);
    if (scoredDomain) {
      // Merge computed quality signals with AI category
      const domain = scoredDomain.domain;
      // If AI says trap, override qualitySignal
      if (aiRec.category === 'trap') {
        domain.qualitySignal = 'trap';
      }
      recommendations.push({
        domain,
        rank: aiRec.rank,
        score: scoredDomain.score,
        reasoning: aiRec.reasoning,
        sherlockAnalysis: aiRec.sherlockAnalysis,
        dueDiligenceChecklist: aiRec.dueDiligenceSteps,
        category: aiRec.category,
        categoryLabel: aiRec.categoryLabel,
      });
    }
  }

  return recommendations;
}
