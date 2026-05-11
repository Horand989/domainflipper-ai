import { invokeLLM } from "./_core/llm";

export interface MarketResearchResult {
  detectedIndustry: string; // AI-detected industry from keywords
  nicheData: {
    marketSize: string;
    competition: string;
    trends: string[];
    keyPlayers: string[];
  };
  tldRecommendations: Array<{
    tld: string;
    reasoning: string;
    confidence: number;
    examples: string[];
  }>;
  competitorAnalysis: {
    commonPatterns: string[];
    namingStyles: string[];
    avgDomainAge: string;
  };
  marketInsights: string;
  buyerPersona: {
    role: string;
    painPoint: string;
    trigger: string;
    willingnessToPay: string;
  };
  monetization: {
    primaryModel: string;
    secondaryModel: string;
    estimatedCPC: string;
    revenueType: string;
  };
}

/**
 * Perform AI-powered market research for a given niche/industry
 */
export async function performMarketResearch(
  niche: string,
  industry: string,
  keywords: string[],
  targetAudience: string
): Promise<MarketResearchResult> {
  const prompt = `You are a domain name and market research expert. Analyze the following business concept and provide detailed insights:

Niche: ${niche}
Industry: ${industry}
Keywords: ${keywords.join(", ")}
Target Audience: ${targetAudience}

Please provide a comprehensive market analysis in the following JSON format:
{
  "detectedIndustry": "Auto-detected industry category based on keywords (e.g., 'SaaS / SEO Tools', 'E-commerce', 'Digital Marketing')",
  "nicheData": {
    "marketSize": "Brief description of market size and potential",
    "competition": "Level of competition (Low/Medium/High) with explanation",
    "trends": ["trend1", "trend2", "trend3"],
    "keyPlayers": ["example1.com", "example2.com", "example3.com"]
  },
  "tldRecommendations": [
    {
      "tld": ".com",
      "reasoning": "Why this TLD is recommended for this niche",
      "confidence": 95,
      "examples": ["example1.com", "example2.com"]
    },
    {
      "tld": ".io",
      "reasoning": "Why this TLD might work",
      "confidence": 75,
      "examples": ["example1.io", "example2.io"]
    }
  ],
  "competitorAnalysis": {
    "commonPatterns": ["pattern1", "pattern2"],
    "namingStyles": ["descriptive", "brandable", "compound"],
    "avgDomainAge": "Typical age range of successful domains in this niche"
  },
  "marketInsights": "2-3 paragraph summary of key insights and recommendations for domain selection",
  "buyerPersona": {
    "role": "Primary buyer role (e.g., 'SEO Agency Owner', 'Domain Flipper', 'SaaS Founder')",
    "painPoint": "Main problem they are trying to solve",
    "trigger": "What motivates them to buy (e.g., 'Needs high-authority backlinks fast')",
    "willingnessToPay": "Price range they are willing to pay (e.g., '$500-$2000', 'High Ticket $5000+')"
  },
  "monetization": {
    "primaryModel": "Main revenue model (e.g., 'B2B Subscription', 'High-Ticket Affiliate', 'AdSense')",
    "secondaryModel": "Secondary revenue stream",
    "estimatedCPC": "Estimated cost-per-click range (e.g., '$2.50 - $5.00')",
    "revenueType": "Revenue category (e.g., 'B2B', 'B2C', 'High Ticket', 'Volume Play')"
  }
}

Focus on:
1. Which TLDs (.com, .io, .net, .org, .co, etc.) are most commonly used in this niche
2. What makes a domain successful in this market
3. Current trends and opportunities
4. Naming patterns that resonate with the target audience
5. Who would buy domains in this niche and what they value
6. How domains in this niche typically generate revenue`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a domain name expert and market researcher. Provide detailed, actionable insights in valid JSON format only. Do not include any text outside the JSON structure.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "market_research",
          strict: true,
          schema: {
            type: "object",
            properties: {
              detectedIndustry: { type: "string" },
              nicheData: {
                type: "object",
                properties: {
                  marketSize: { type: "string" },
                  competition: { type: "string" },
                  trends: { type: "array", items: { type: "string" } },
                  keyPlayers: { type: "array", items: { type: "string" } },
                },
                required: ["marketSize", "competition", "trends", "keyPlayers"],
                additionalProperties: false,
              },
              tldRecommendations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    tld: { type: "string" },
                    reasoning: { type: "string" },
                    confidence: { type: "number" },
                    examples: { type: "array", items: { type: "string" } },
                  },
                  required: ["tld", "reasoning", "confidence", "examples"],
                  additionalProperties: false,
                },
              },
              competitorAnalysis: {
                type: "object",
                properties: {
                  commonPatterns: { type: "array", items: { type: "string" } },
                  namingStyles: { type: "array", items: { type: "string" } },
                  avgDomainAge: { type: "string" },
                },
                required: ["commonPatterns", "namingStyles", "avgDomainAge"],
                additionalProperties: false,
              },
              marketInsights: { type: "string" },
              buyerPersona: {
                type: "object",
                properties: {
                  role: { type: "string" },
                  painPoint: { type: "string" },
                  trigger: { type: "string" },
                  willingnessToPay: { type: "string" },
                },
                required: ["role", "painPoint", "trigger", "willingnessToPay"],
                additionalProperties: false,
              },
              monetization: {
                type: "object",
                properties: {
                  primaryModel: { type: "string" },
                  secondaryModel: { type: "string" },
                  estimatedCPC: { type: "string" },
                  revenueType: { type: "string" },
                },
                required: ["primaryModel", "secondaryModel", "estimatedCPC", "revenueType"],
                additionalProperties: false,
              },
            },
            required: [
              "detectedIndustry",
              "nicheData",
              "tldRecommendations",
              "competitorAnalysis",
              "marketInsights",
              "buyerPersona",
              "monetization",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("No response from AI");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Market research error:", error);
    // Return fallback data
    return {
      detectedIndustry: industry || "General Business",
      nicheData: {
        marketSize: "Unable to analyze at this time",
        competition: "Medium",
        trends: ["Digital transformation", "Mobile-first approach"],
        keyPlayers: [],
      },
      tldRecommendations: [
        {
          tld: ".com",
          reasoning:
            "Most trusted and widely recognized TLD for general business",
          confidence: 90,
          examples: [],
        },
        {
          tld: ".io",
          reasoning: "Popular for tech startups and SaaS products",
          confidence: 70,
          examples: [],
        },
      ],
      competitorAnalysis: {
        commonPatterns: ["Short and memorable", "Descriptive names"],
        namingStyles: ["brandable", "descriptive"],
        avgDomainAge: "5-10 years",
      },
      marketInsights:
        "Based on the provided information, focus on finding a domain that clearly communicates your value proposition while being memorable and easy to spell.",
      buyerPersona: {
        role: "Business Owner",
        painPoint: "Finding a memorable domain name",
        trigger: "Starting a new online venture",
        willingnessToPay: "$100-$1000",
      },
      monetization: {
        primaryModel: "Direct Sales",
        secondaryModel: "Advertising",
        estimatedCPC: "$1.00 - $3.00",
        revenueType: "B2C",
      },
    };
  }
}

/**
 * Generate domain name suggestions based on project details and market research
 */
export async function generateDomainSuggestions(
  projectName: string,
  keywords: string[],
  niche: string,
  industry: string,
  marketResearch: MarketResearchResult
): Promise<
  Array<{
    domain: string;
    tld: string;
    reasoning: string;
    namingPattern: string;
    confidence: number;
  }>
> {
  const tldList = marketResearch.tldRecommendations
    .map((t) => t.tld)
    .join(", ");
  const patterns = marketResearch.competitorAnalysis.namingStyles.join(", ");

  const prompt = `Generate 15 domain name suggestions for a project with these details:

Project Name: ${projectName}
Keywords: ${keywords.join(", ")}
Niche: ${niche}
Industry: ${industry}

Market Research Insights:
- Recommended TLDs: ${tldList}
- Common Naming Patterns: ${patterns}
- Key Trends: ${marketResearch.nicheData.trends.join(", ")}

Generate domain suggestions that:
1. Are memorable and easy to spell
2. Reflect the niche/industry
3. Use the recommended TLDs
4. Follow successful naming patterns
5. Are likely to be available as expired domains

Provide response in this JSON format:
{
  "suggestions": [
    {
      "domain": "examplename",
      "tld": ".com",
      "reasoning": "Why this domain works well",
      "namingPattern": "brandable|descriptive|compound|keyword",
      "confidence": 85
    }
  ]
}`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a creative domain name expert. Generate unique, memorable domain names that match the user's requirements. Return only valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "domain_suggestions",
          strict: true,
          schema: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    domain: { type: "string" },
                    tld: { type: "string" },
                    reasoning: { type: "string" },
                    namingPattern: { type: "string" },
                    confidence: { type: "number" },
                  },
                  required: [
                    "domain",
                    "tld",
                    "reasoning",
                    "namingPattern",
                    "confidence",
                  ],
                  additionalProperties: false,
                },
              },
            },
            required: ["suggestions"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(content);
    return parsed.suggestions;
  } catch (error) {
    console.error("Domain suggestion error:", error);
    // Return fallback suggestions
    return [
      {
        domain: keywords[0] || "example",
        tld: ".com",
        reasoning: "Based on your primary keyword",
        namingPattern: "keyword",
        confidence: 70,
      },
    ];
  }
}

/**
 * Generate SpamZilla search query based on domain suggestions
 */
export function generateSpamZillaQuery(
  domain: string,
  tld: string,
  keywords: string[]
): string {
  // Remove TLD from domain if present
  const cleanDomain = domain.replace(/\.(com|net|org|io|co|ai|app)$/i, "");

  // Build search terms
  const searchTerms = [cleanDomain, ...keywords.slice(0, 3)]
    .filter(Boolean)
    .join(" OR ");

  // SpamZilla URL format (example - adjust based on actual SpamZilla URL structure)
  const encodedSearch = encodeURIComponent(searchTerms);
  return `https://www.spamzilla.io/search?q=${encodedSearch}&tld=${tld.replace(".", "")}&sort=score`;
}
