import { invokeLLM } from "./_core/llm";

export interface ParsedDomain {
  domainName: string;
  trustFlow?: number;
  citationFlow?: number;
  trustRatio?: string;
  majTopics?: string;
  majLang?: string;  // Language code e.g. "EN", "JA", "RU"
  source?: string;
  age?: number;
  szScore?: number;
  domainAuthority?: number;  // DA field from some marketplaces
  redirects?: number;
  parked?: number;
  drops?: number;
  googleIndex?: number;
  outLinksInternal?: number;
  outLinksExternal?: number;
  semRank?: number;
  dateAdded?: string;
  price?: string;
  expires?: string;
  // Computed quality signals (added by scorer)
  qualitySignal?: 'quality' | 'trap' | 'neutral';
  szScoreLevel?: 'safe' | 'caution' | 'danger';
}

/**
 * Parse domain metrics from an image using AI vision
 * @param imageUrl - URL to the SpamZilla screenshot
 * @returns Array of parsed domain objects
 */
export async function parseDomainMetricsFromImage(imageUrl: string): Promise<ParsedDomain[]> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting structured data from SpamZilla domain marketplace screenshots. 
Extract ALL visible domains and their metrics from the table.

Return a JSON array of domain objects with these fields:
- domainName (string, required)
- trustFlow (number)
- citationFlow (number)
- trustRatio (string, e.g., "1.2")
- majTopics (string, comma-separated topic names from colored badges)
- majLang (string, language code e.g. "EN", "JA", "RU", "ZH" — extract if visible)
- domainAuthority (number, DA field if visible)
- source (string, e.g., "M", "A")
- age (number, in years)
- szScore (number)
- redirects (number)
- parked (number)
- drops (number)
- googleIndex (number)
- outLinksInternal (number)
- outLinksExternal (number)
- semRank (number)
- dateAdded (string)
- price (string)
- expires (string)

Extract as many fields as visible. If a field is not visible or empty, omit it from the object.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please extract all domain data from this SpamZilla screenshot. Return only the JSON array, no additional text.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "domain_metrics",
          strict: true,
          schema: {
            type: "object",
            properties: {
              domains: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    domainName: { type: "string" },
                    trustFlow: { type: "number" },
                    citationFlow: { type: "number" },
                    trustRatio: { type: "string" },
                    majTopics: { type: "string" },
                    source: { type: "string" },
                    age: { type: "number" },
                    szScore: { type: "number" },
                    redirects: { type: "number" },
                    parked: { type: "number" },
                    drops: { type: "number" },
                    googleIndex: { type: "number" },
                    outLinksInternal: { type: "number" },
                    outLinksExternal: { type: "number" },
                    semRank: { type: "number" },
                    dateAdded: { type: "string" },
                    price: { type: "string" },
                    expires: { type: "string" },
                  },
                  required: ["domainName"],
                  additionalProperties: false,
                },
              },
            },
            required: ["domains"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const contentString = typeof content === 'string' ? content : JSON.stringify(content);
    const parsed = JSON.parse(contentString);
    return parsed.domains || [];
  } catch (error) {
    console.error("Error parsing domain metrics:", error);
    throw new Error(`Failed to parse domain metrics: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
